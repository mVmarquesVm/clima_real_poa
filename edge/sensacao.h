#pragma once
// ============================================================
// sensacao.h — a física da sensação térmica.
// Funções "puras": recebem números e devolvem números, sem
// tocar em sensor nem em pino. Por isso dá para testá-las.
// ============================================================

#include <math.h>

// Pressão de vapor (hPa): "quanto vapor de água já existe no ar".
//   t  = temperatura do ar em °C
//   ur = umidade relativa em % (0 a 100)
// A parte com expf() mostra que o ar quente aguenta muito mais vapor.
inline float pressaoVapor(float t, float ur) {
  return (ur / 100.0f) * 6.105f * expf(17.27f * t / (237.7f + t));
}

// Temperatura Aparente de Steadman (versão na sombra, sem sol).
//   + umidade: o suor não evapora, a sensação sobe
//   - vento:   leva o calor do corpo embora, a sensação desce
//   vento em m/s; resultado em °C.
// O termo do sol entra no Passo 2.3, junto com o LDR.
inline float temperaturaAparente(float t, float ur, float vento) {
  return t + 0.33f * pressaoVapor(t, ur) - 0.70f * vento - 4.00f;
}
