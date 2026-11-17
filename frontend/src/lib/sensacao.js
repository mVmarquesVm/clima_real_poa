// Sensação térmica: a Temperatura Aparente de Steadman, a MESMA conta da
// estação (edge/sensacao.h) e do Python (python/processamento/sensacao.py).
// Com a mesma régua nos 3 lugares, a previsão do app e a leitura da estação
// dão números comparáveis.
//
//   TA = T + 0,348·e − 0,70·v + 0,70·Q/(v + 10) − 4,25
//
//   T = temperatura do ar (°C)      e = pressão de vapor (hPa)
//   v = vento (m/s)                 Q = radiação absorvida pelo corpo (W/m²)

// Quanto vapor de água já existe no ar (hPa). O exp() mostra que o ar quente
// aguenta muito mais vapor: por isso o abafado pesa mais no calor.
export function pressaoVapor(t, ur) {
  return (ur / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t))
}

// + umidade: o suor não evapora, a sensação sobe;
// - vento: leva o calor do corpo embora, a sensação desce;
// + sol: o corpo absorve radiação, e o vento DIVIDE esse efeito.
export function temperaturaAparente(t, ur, vento = 0, q = 0) {
  return t + 0.348 * pressaoVapor(t, ur) - 0.7 * vento + (0.7 * q) / (vento + 10) - 4.25
}

// Radiação global da previsão (W/m², num plano horizontal) -> Q.
// Mesmo fator 0,12 do Python e do LDR da estação: 1000 W/m² (sol a pino) dá Q = 120.
export function radiacaoDeGlobal(wm2) {
  return 0.12 * Math.max(wm2, 0)
}
