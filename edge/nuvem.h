#pragma once
// ============================================================
// nuvem.h — o que vai para o ThingSpeak e o que vem de lá.
//
// Analogia: o MQTT é um grupo de WhatsApp. A estação POSTA no
// tópico "channels/<id>/publish" e está INSCRITA no tópico do
// field8 ("channels/<id>/subscribe/fields/field8"). Quando alguém
// escreve um comando no field8, a mensagem chega na estação.
//
// Os campos do canal (um canal por estação):
//   field1 temperatura (°C)      field5 sensação térmica (°C)
//   field2 umidade (%)           field6 nível de risco (0 verde,
//   field3 vento (m/s)                  1 amarelo, 2 laranja,
//   field4 luz (lux)                    3 vermelho, 4 sem dado)
//   field7 relé (0/1)            field8 COMANDO (escrito pela nuvem,
//   status: o último aviso              nunca pela estação)
//
// Comandos aceitos no field8 (um por mensagem):
//   lim:28,33,40      -> limites do amarelo, laranja e vermelho
//   rele:on | rele:off | rele:auto
// Tudo que chega é conferido: tamanho, formato, faixa e ordem dos
// limites (limitesValidos) e frequência. O inválido é ignorado e
// registrado no Serial e no status do canal.
//
// Lógica pura (texto e números), testada no autoteste.
// ============================================================

#include <stdio.h>
#include <stdarg.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>
#include <math.h>
#include "config.h"
#include "risco.h"
#include "rele.h"

// ---------- Saída: a mensagem publicada ----------

struct Leitura {
  float       temp       = NAN;   // NAN = sem leitura confiável: o campo não é enviado
  float       umid       = NAN;
  float       vento      = NAN;
  float       lux        = NAN;
  float       ta         = NAN;
  NivelRisco  nivel      = RISCO_SEM_DADO;
  bool        releLigado = false;
  const char* status     = "";
};

// Escreve no fim do texto, sem nunca passar do tamanho do buffer.
// Devolve false se não coube.
inline bool anexar(char* destino, size_t tamanho, size_t& usado, const char* formato, ...) {
  if (usado >= tamanho) return false;
  va_list args;
  va_start(args, formato);
  int n = vsnprintf(destino + usado, tamanho - usado, formato, args);
  va_end(args);
  if (n < 0 || (size_t)n >= tamanho - usado) { usado = tamanho; return false; }
  usado += (size_t)n;
  return true;
}

// A mensagem é no formato de URL: "field1=30.0&field2=50&...".
// Um '&' ou '=' dentro do status quebraria a mensagem, então eles
// são trocados por caracteres inofensivos.
inline void limparStatus(char* destino, size_t tamanho, const char* texto) {
  size_t i = 0;
  for (; texto[i] != '\0' && i + 1 < tamanho; i++) {
    char c = texto[i];
    destino[i] = (c == '&' || c == '+' || c == '%') ? ' ' : (c == '=' ? ':' : c);
  }
  destino[i] = '\0';
}

inline bool montarMensagem(const Leitura& l, char* destino, size_t tamanho) {
  size_t usado = 0;
  bool ok = true;
  destino[0] = '\0';
  if (!isnan(l.temp))  ok &= anexar(destino, tamanho, usado, "field1=%.1f&", l.temp);
  if (!isnan(l.umid))  ok &= anexar(destino, tamanho, usado, "field2=%.0f&", l.umid);
  if (!isnan(l.vento)) ok &= anexar(destino, tamanho, usado, "field3=%.1f&", l.vento);
  if (!isnan(l.lux))   ok &= anexar(destino, tamanho, usado, "field4=%.0f&", l.lux);
  if (!isnan(l.ta))    ok &= anexar(destino, tamanho, usado, "field5=%.1f&", l.ta);
  ok &= anexar(destino, tamanho, usado, "field6=%d&field7=%d", (int)l.nivel, l.releLigado ? 1 : 0);
  if (l.status != nullptr && l.status[0] != '\0') {
    char limpo[128];
    limparStatus(limpo, sizeof(limpo), l.status);
    ok &= anexar(destino, tamanho, usado, "&status=%s", limpo);
  }
  return ok;
}

// ---------- Entrada: o comando do field8 ----------

enum TipoComando { CMD_NADA, CMD_LIMITES, CMD_RELE, CMD_INVALIDO };

struct Comando {
  TipoComando  tipo    = CMD_NADA;
  LimitesRisco limites;
  ModoRele     modo    = MODO_AUTO;
  const char*  erro    = "";
};

inline Comando comandoInvalido(const char* motivo) {
  Comando c;
  c.tipo = CMD_INVALIDO;
  c.erro = motivo;
  return c;
}

// Lê um número e pula os espaços. Devolve false se não havia número.
inline bool lerNumero(const char*& p, float& valor) {
  char* fim;
  valor = strtof(p, &fim);
  if (fim == p) return false;
  p = fim;
  return true;
}

// dados NÃO termina com '\0' (é assim que o MQTT entrega): por isso o tamanho.
inline Comando interpretarComando(const char* dados, unsigned int tamanho) {
  if (dados == nullptr || tamanho == 0) return Comando();             // vazio: nada a fazer
  if (tamanho > CONFIG_MAX_TAMANHO) return comandoInvalido("mensagem longa demais");

  // Copia sem espaços e em minúsculas: " LIM: 28, 33 ,40 " vira "lim:28,33,40"
  char t[CONFIG_MAX_TAMANHO + 1];
  size_t n = 0;
  for (unsigned int i = 0; i < tamanho; i++) {
    char c = dados[i];
    if (c == '\0') return comandoInvalido("caractere invalido");
    if (isspace((unsigned char)c)) continue;
    t[n++] = (char)tolower((unsigned char)c);
  }
  t[n] = '\0';
  if (n == 0 || strcmp(t, "null") == 0) return Comando();              // a própria publicação da estação

  if (strncmp(t, "lim:", 4) == 0) {
    const char* p = t + 4;
    float v[3];
    for (int k = 0; k < 3; k++) {
      if (!lerNumero(p, v[k])) return comandoInvalido("numero invalido (use lim:A,B,C)");
      if (k < 2) {
        if (*p != ',') return comandoInvalido("faltou virgula (use lim:A,B,C)");
        p++;
      }
    }
    if (*p != '\0') return comandoInvalido("sobrou texto depois dos limites");
    Comando c;
    c.limites.amarelo  = v[0];
    c.limites.laranja  = v[1];
    c.limites.vermelho = v[2];
    if (!limitesValidos(c.limites)) return comandoInvalido("limites fora da faixa ou da ordem");
    c.tipo = CMD_LIMITES;
    return c;
  }

  if (strncmp(t, "rele:", 5) == 0) {
    const char* m = t + 5;
    Comando c;
    c.tipo = CMD_RELE;
    if      (strcmp(m, "on") == 0)   c.modo = MODO_LIGAR;
    else if (strcmp(m, "off") == 0)  c.modo = MODO_DESLIGAR;
    else if (strcmp(m, "auto") == 0) c.modo = MODO_AUTO;
    else return comandoInvalido("use rele:on, rele:off ou rele:auto");
    return c;
  }

  return comandoInvalido("comando desconhecido");
}

// Anti-enxurrada: no máximo 1 comando a cada CONFIG_MIN_INTERVALO_MS.
struct LimiteFrequencia {
  bool          temUltimo = false;
  unsigned long ultimoMs  = 0;
};

inline bool frequenciaOk(LimiteFrequencia& f, unsigned long agora) {
  if (f.temUltimo && agora - f.ultimoMs < CONFIG_MIN_INTERVALO_MS) return false;
  f.temUltimo = true;
  f.ultimoMs  = agora;
  return true;
}
