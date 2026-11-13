#pragma once
// ============================================================
// display.h — o TEXTO das 4 linhas do LCD 20x4.
//
// Só monta o texto; quem escreve no LCD é o sketch.ino. Separado
// assim, o autoteste confere a tela sem precisar do LCD.
// Analogia: o redator escreve a manchete; a gráfica só imprime.
//
//   TA  34.6C  LARANJA     <- valor atual e nível de risco
//   T30.2C U50% V2.0m/s    <- leituras (ou o problema, se houver)
//   Rele:LIGADO   02:15    <- status do atuador
//   E1 WiFi:OK  MQTT:OK    <- estação e conexão
//
// Cada linha tem SEMPRE 20 caracteres (completa com espaços): assim
// não precisa de lcd.clear(), que faz a tela piscar a cada 2 s.
// O LCD não tem acento, por isso os textos são sem acento.
// ============================================================

#include <stdio.h>
#include "risco.h"
#include "rele.h"

const int LCD_COLUNAS = 20;
const int LCD_LINHAS  = 4;

struct DadosTela {
  float         ta        = NAN;
  NivelRisco    nivel     = RISCO_SEM_DADO;
  float         temp      = NAN;
  float         umid      = NAN;
  float         vento     = 0;
  bool          ventoOk   = false;
  const char*   problema  = nullptr;   // texto curto do problema, ou nullptr se está tudo bem
  bool          releLigado = false;
  MotivoRele    releMotivo = RELE_CALMO;
  unsigned long releHaMs  = 0;         // há quanto tempo o relé está como está
  const char*   estacao   = "";
  bool          wifiOk    = false;
  bool          mqttOk    = false;
};

// Copia o texto e completa com espaços até 20 (corta se passar).
inline void ajustarLinha(char destino[LCD_COLUNAS + 1], const char* texto) {
  snprintf(destino, LCD_COLUNAS + 1, "%-20.20s", texto);
}

inline void montarTela(const DadosTela& d, char linhas[LCD_LINHAS][LCD_COLUNAS + 1]) {
  char tmp[48];

  // Linha 0: sensação e nível
  if (d.nivel == RISCO_SEM_DADO || isnan(d.ta)) snprintf(tmp, sizeof(tmp), "TA  --.-C  SEM DADO");
  else                                          snprintf(tmp, sizeof(tmp), "TA %5.1fC  %s", d.ta, textoNivel(d.nivel));
  ajustarLinha(linhas[0], tmp);

  // Linha 1: as leituras, ou o problema (que é mais importante)
  if (d.problema != nullptr)  snprintf(tmp, sizeof(tmp), "!%s", d.problema);
  else if (d.ventoOk)         snprintf(tmp, sizeof(tmp), "T%.1fC U%.0f%% V%.1fm/s", d.temp, d.umid, d.vento);
  else                        snprintf(tmp, sizeof(tmp), "T%.1fC U%.0f%% V--", d.temp, d.umid);
  ajustarLinha(linhas[1], tmp);

  // Linha 2: o relé (ligado mostra há quanto tempo, em mm:ss)
  if (d.releLigado) {
    unsigned long s = d.releHaMs / 1000;
    snprintf(tmp, sizeof(tmp), "Rele:LIGADO   %02lu:%02lu", s / 60, s % 60);
  } else {
    const char* porque = d.releMotivo == RELE_CONFIRMANDO ? "DESL confirma"
                       : d.releMotivo == RELE_DESCANSO    ? "DESL descanso"
                       : d.releMotivo == RELE_BLOQUEADO   ? "DESL (falha)"
                                                          : "desligado";
    snprintf(tmp, sizeof(tmp), "Rele:%s", porque);
  }
  ajustarLinha(linhas[2], tmp);

  // Linha 3: estação e conexão (o WiFi e o MQTT chegam no Passo 4)
  snprintf(tmp, sizeof(tmp), "%s WiFi:%s  MQTT:%s", d.estacao,
           d.wifiOk ? "OK" : "--", d.mqttOk ? "OK" : "--");
  ajustarLinha(linhas[3], tmp);
}
