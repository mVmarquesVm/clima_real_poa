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

// Temperatura Aparente de Steadman, versão completa (com vento e sol):
//   TA = T + 0,348·e − 0,70·v + 0,70·Q/(v + 10) − 4,25
//   + umidade: o suor não evapora, a sensação sobe
//   - vento:   leva o calor do corpo embora, a sensação desce
//   + sol:     o corpo absorve radiação, a sensação sobe; o vento
//              DIVIDE esse efeito (carro parado no sol x carro andando
//              com a janela aberta). O "+10" evita dividir por zero.
//   vento em m/s; Q em W/m² (ver conversao.h); resultado em °C.
// Com Q = 0, fica a menos de 0,2 °C da versão de sombra
// (T + 0,33·e − 0,70·v − 4,00), menos que o erro do DHT22 (±0,5 °C).
inline float temperaturaAparente(float t, float ur, float vento, float q) {
  return t + 0.348f * pressaoVapor(t, ur) - 0.70f * vento
           + 0.70f * q / (vento + 10.0f) - 4.25f;
}
