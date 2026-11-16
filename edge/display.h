#pragma once
// ============================================================
// display.h — o TEXTO dos dois LCDs 20x4.
//
// Só monta o texto; quem escreve nos LCDs é o sketch.ino. Separado
// assim, o autoteste confere as telas sem precisar dos LCDs.
// Analogia: o redator escreve a manchete; a gráfica só imprime.
//
// LCD 1 — MEDICAO (endereço I2C 0x27): o que a estação mede e faz
//   TA  36.6C  LARANJA     <- valor atual e nível de risco
//   T30.0C U50% V0.0m/s    <- leituras (ou o problema, se houver)
//   Sol  50000lx Q 50      <- luz do sol e a radiação que entra na conta
//   Rele:LIGADO   02:15    <- status do atuador (REMOTO = ligado pela nuvem)
//
// LCD 2 — ORIENTACAO (endereço I2C 0x26): o que a pessoa deve fazer,
// sem depender de app (conselhos da nota técnica da SMS de POA)
//   Beba agua e descanse   <- conselho do nível
//   Va: Praca XV 24m       <- refúgio mais perto e aberto (do LARANJA para cima)
//   Hora 15:42             <- relógio da internet (NTP)
//   E1 WiFi:OK  MQTT:OK    <- estação e conexão
//
// Cada linha tem SEMPRE 20 caracteres (completa com espaços): assim
// não precisa de lcd.clear(), que faz a tela piscar a cada 2 s.
// O LCD não tem acento, por isso os textos são sem acento.
// ============================================================

#include <stdio.h>
#include "risco.h"
#include "rele.h"
#include "refugio.h"

const int LCD_COLUNAS = 20;
const int LCD_LINHAS  = 4;

struct DadosTela {
  float         ta        = NAN;
  NivelRisco    nivel     = RISCO_SEM_DADO;
  float         temp      = NAN;
  float         umid      = NAN;
  float         vento     = 0;
  bool          ventoOk   = false;
  float         lux       = 0;
  float         q         = 0;         // radiação absorvida pelo corpo (W/m²)
  bool          luzOk     = false;
  const char*   problema  = nullptr;   // texto curto do problema, ou nullptr se está tudo bem
  bool          releLigado = false;
  MotivoRele    releMotivo = RELE_CALMO;
  unsigned long releHaMs  = 0;         // há quanto tempo o relé está como está
  const char*   estacao   = "";
  bool          wifiOk    = false;
  bool          mqttOk    = false;
  int           hora      = -1;        // -1 = a estação ainda não sabe a hora (sem NTP)
  int           minuto    = -1;
  bool          noite     = false;     // pelo sol (sol.h): à noite, nada de "sombra"
  const Refugio* refugio  = nullptr;   // o refúgio mais perto e aberto, ou nullptr se não há
};

// Indica o refúgio? Só com risco alto e com dado confiável
// (SEM DADO também cobre o modo seguro: ver decidirRiscoERele).
inline bool deveOrientar(const DadosTela& d) {
  return d.nivel != RISCO_SEM_DADO && d.nivel >= RISCO_LARANJA && !isnan(d.ta);
}

// Copia o texto e completa com espaços até 20 (corta se passar).
inline void ajustarLinha(char destino[LCD_COLUNAS + 1], const char* texto) {
  snprintf(destino, LCD_COLUNAS + 1, "%-20.20s", texto);
}

// ---------- LCD 1: MEDICAO ----------
inline void montarTela(const DadosTela& d, char linhas[LCD_LINHAS][LCD_COLUNAS + 1]) {
  char tmp[48];

  // Linha 0: sensação e nível. No frio, "VERDE" passaria a ideia de
  // "tudo bem"; então troca o texto por FRIO (só o texto: ver config.h).
  if (d.nivel == RISCO_SEM_DADO || isnan(d.ta)) snprintf(tmp, sizeof(tmp), "TA  --.-C  SEM DADO");
  else if (d.nivel == RISCO_VERDE && d.ta < LIMITE_FRIO_C)
                                                snprintf(tmp, sizeof(tmp), "TA %5.1fC  FRIO", d.ta);
  else                                          snprintf(tmp, sizeof(tmp), "TA %5.1fC  %s", d.ta, textoNivel(d.nivel));
  ajustarLinha(linhas[0], tmp);

  // Linha 1: as leituras, ou o problema (que é mais importante)
  if (d.problema != nullptr)  snprintf(tmp, sizeof(tmp), "!%s", d.problema);
  else if (d.ventoOk)         snprintf(tmp, sizeof(tmp), "T%.1fC U%.0f%% V%.1fm/s", d.temp, d.umid, d.vento);
  else                        snprintf(tmp, sizeof(tmp), "T%.1fC U%.0f%% V--", d.temp, d.umid);
  ajustarLinha(linhas[1], tmp);

  // Linha 2: o sol. Com o LDR ruim, a conta usa o pior caso (Q = 100).
  if (d.luzOk) snprintf(tmp, sizeof(tmp), "Sol %6.0flx Q%3.0f", d.lux, d.q);
  else         snprintf(tmp, sizeof(tmp), "Sol  --  Q100 pior");
  ajustarLinha(linhas[2], tmp);

  // Linha 3: o relé (ligado mostra há quanto tempo, em mm:ss)
  if (d.releLigado) {
    unsigned long s = d.releHaMs / 1000;
    snprintf(tmp, sizeof(tmp), "Rele:%-8s %02lu:%02lu",
             d.releMotivo == RELE_REMOTO_LIGADO ? "REMOTO" : "LIGADO", s / 60, s % 60);
  } else {
    const char* porque = d.releMotivo == RELE_CONFIRMANDO ? "DESL confirma"
                       : d.releMotivo == RELE_DESCANSO    ? "DESL descanso"
                       : d.releMotivo == RELE_BLOQUEADO   ? "DESL (falha)"
                       : d.releMotivo == RELE_REMOTO_DESLIGADO ? "DESL remoto"
                                                          : "desligado";
    snprintf(tmp, sizeof(tmp), "Rele:%s", porque);
  }
  ajustarLinha(linhas[3], tmp);
}

// ---------- LCD 2: ORIENTACAO ----------
// Os conselhos seguem a nota técnica da SMS de POA (hidratação e
// pausas na sombra no amarelo; evitar o sol do laranja para cima;
// suspender as atividades no roxo), em até 20 letras.
// À noite (d.noite), o que fala de SOL ou SOMBRA troca por "lugar fresco"
// ou "ventilado", como no app (conselhoNoite em frontend/src/lib/risco.js).
inline const char* conselhoDoNivel(const DadosTela& d) {
  switch (d.nivel) {
    case RISCO_ROXO:     return "SUSPENDA ATIVIDADES";
    case RISCO_VERMELHO: return d.noite ? "LUGAR FRESCO + AGUA" : "SAIA DO SOL + AGUA";
    case RISCO_LARANJA:  return "Beba agua e descanse";
    case RISCO_AMARELO:  return "Calor: beba agua";
    case RISCO_VERDE:    return (!isnan(d.ta) && d.ta < LIMITE_FRIO_C) ? "Frio: se agasalhe" : "Sem risco de calor";
    default:             return "Sem leitura agora";
  }
}

inline void montarTelaOrientacao(const DadosTela& d, char linhas[LCD_LINHAS][LCD_COLUNAS + 1]) {
  char tmp[48];
  char dist[8];

  // Linha 0: o conselho
  ajustarLinha(linhas[0], conselhoDoNivel(d));

  // Linha 1: para onde ir. Do LARANJA para cima, o refúgio mais perto
  // que está aberto; no AMARELO, pausas; sem dado, o lado seguro.
  if (deveOrientar(d) && d.refugio != nullptr) {
    textoDistancia(dist, sizeof(dist), d.refugio->distanciaM);
    snprintf(tmp, sizeof(tmp), "Va: %.10s %s", d.refugio->nome, dist);
  } else if (deveOrientar(d)) {
    // nenhum refúgio aberto agora
    snprintf(tmp, sizeof(tmp), d.noite ? "Procure lugar fresco" : "Procure uma sombra");
  } else if (d.nivel == RISCO_AMARELO) {
    snprintf(tmp, sizeof(tmp), d.noite ? "Lugar ventilado" : "Pausas na sombra");
  } else if (d.nivel == RISCO_SEM_DADO) {
    snprintf(tmp, sizeof(tmp), d.noite ? "Abafado? Beba agua" : "Na duvida: sombra");
  } else {
    tmp[0] = '\0';
  }
  ajustarLinha(linhas[1], tmp);

  // Linha 2: a hora (mostra que o relógio da internet está valendo)
  if (d.hora >= 0 && d.minuto >= 0) snprintf(tmp, sizeof(tmp), "Hora %02d:%02d", d.hora, d.minuto);
  else                              snprintf(tmp, sizeof(tmp), "Hora --:--");
  ajustarLinha(linhas[2], tmp);

  // Linha 3: estação e conexão
  snprintf(tmp, sizeof(tmp), "%s WiFi:%s  MQTT:%s", d.estacao,
           d.wifiOk ? "OK" : "--", d.mqttOk ? "OK" : "--");
  ajustarLinha(linhas[3], tmp);
}
