#pragma once
// ============================================================
// conversao.h — traduz o que o sensor entrega em grandeza física.
//   anemômetro: pulsos contados  -> vento (m/s)
//   LDR:        número do ADC    -> luz (lux) -> radiação no corpo (Q)
// Funções puras, como as do sensacao.h: testadas no autoteste.
// ============================================================

#include <math.h>
#include "config.h"

// --- Anemômetro ---
// Pulsos por segundo vezes 0,667 m/s (= 2,4 km/h, do datasheet).
// Usa a janela de tempo REAL entre duas contagens, e não "2 s" fixo:
// se o loop atrasar um pouco, a conta continua certa.
// Janela zero devolve NaN (a defesa rejeita), para nunca dividir por zero.
inline float ventoDePulsos(uint32_t pulsos, unsigned long janelaMs) {
  if (janelaMs == 0) return NAN;
  float pulsosPorSegundo = pulsos * 1000.0f / janelaMs;
  return pulsosPorSegundo * MS_POR_PULSO_POR_S;
}

// --- LDR: do ADC para lux ---
// O módulo do Wokwi é um divisor de tensão: o LDR fica em série com
// um resistor fixo de 10 kΩ, e o ESP32 mede a tensão no LDR.
// Mais luz -> o LDR conduz mais (resistência cai) -> a tensão cai.
//   1) ADC -> tensão (V)
//   2) tensão -> resistência do LDR (Ω), pela regra do divisor
//   3) resistência -> lux, pela curva do LDR: a 10 lux ele tem
//      RL10 = 50 kΩ, e a resistência cai como uma potência da luz (gamma)
// O ldrValido() (defesa.h) deve ser chamado antes: nos extremos do ADC
// esta conta divide por zero.
inline float luxDoAdc(int adc) {
  float tensao      = adc * ADC_VREF / ADC_MAX;
  float resistencia = LDR_R_FIXO_OHMS * tensao / (ADC_VREF - tensao);
  return 10.0f * powf(LDR_RL10_OHMS / resistencia, 1.0f / LDR_GAMMA);
}

// --- Da luz para a radiação absorvida pelo corpo (Q, em W/m²) ---
// APROXIMAÇÃO (está declarada no README):
//   1) para a luz do sol, ~120 lux = 1 W/m² chegando ao chão;
//   2) o corpo absorve, em média sobre toda a pele, ~12% disso
//      (o sol bate de cima, só em parte do corpo, e parte reflete).
// Sol forte (100.000 lux) -> ~830 W/m² no chão -> Q ≈ 100 W/m².
inline float radiacaoDeLux(float lux) {
  if (!(lux > 0.0f)) return 0.0f;               // escuro (ou NaN): sem sol
  if (lux > LUX_MAX) lux = LUX_MAX;             // não deixa um número absurdo passar
  return FATOR_ABSORCAO_CORPO * (lux / LUX_POR_W_M2);
}
