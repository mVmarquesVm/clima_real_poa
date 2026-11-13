#pragma once
// ============================================================
// risco.h — da sensação térmica para a cor do LED.
//
// Faixas (°C de sensação), baseadas nas categorias do índice de
// calor da NOAA. O índice da NOAA é uma regressão (Rothfusz, 1990)
// das tabelas do próprio Steadman, então as faixas valem para a TA:
//   VERDE    < 27        conforto
//   AMARELO  27 a 32     cautela: cansaço com exposição longa
//   LARANJA  32 a 41     cautela extrema: câimbra e exaustão possíveis
//   VERMELHO >= 41       perigo: risco de insolação
//
// Os limites ficam numa struct (e não em constantes) porque no
// Passo 4 eles vão poder ser mudados pela nuvem, com o ESP32 ligado.
// ============================================================

#include <math.h>
#include "config.h"

enum NivelRisco { RISCO_VERDE, RISCO_AMARELO, RISCO_LARANJA, RISCO_VERMELHO, RISCO_SEM_DADO };

inline const char* textoNivel(NivelRisco n) {
  switch (n) {
    case RISCO_VERDE:    return "VERDE";
    case RISCO_AMARELO:  return "AMARELO";
    case RISCO_LARANJA:  return "LARANJA";
    case RISCO_VERMELHO: return "VERMELHO";
    default:             return "SEM DADO";
  }
}

// Onde cada cor COMEÇA (o verde é "abaixo do amarelo").
struct LimitesRisco {
  float amarelo  = LIMITE_AMARELO_C;
  float laranja  = LIMITE_LARANJA_C;
  float vermelho = LIMITE_VERMELHO_C;
};

// Regra que a config remota (Passo 4) vai usar antes de aceitar
// limites novos: números de verdade, numa faixa razoável e em ordem,
// com pelo menos 1 °C entre um e outro.
inline bool limitesValidos(const LimitesRisco& l) {
  if (isnan(l.amarelo) || isnan(l.laranja) || isnan(l.vermelho)) return false;
  if (l.amarelo < LIMITE_MIN_C || l.vermelho > LIMITE_MAX_C) return false;
  return l.amarelo + 1.0f <= l.laranja && l.laranja + 1.0f <= l.vermelho;
}

// A cor "crua", sem memória: só olha o número.
inline NivelRisco nivelDaSensacao(float ta, const LimitesRisco& l) {
  if (isnan(ta))       return RISCO_SEM_DADO;
  if (ta >= l.vermelho) return RISCO_VERMELHO;
  if (ta >= l.laranja)  return RISCO_LARANJA;
  if (ta >= l.amarelo)  return RISCO_AMARELO;
  return RISCO_VERDE;
}

// A cor COM histerese: SOBE na hora, mas só DESCE quando a sensação
// fica "folga" °C abaixo do limite.
// Analogia: o termostato do ar-condicionado. Se ele ligasse e
// desligasse exatamente em 24,0 °C, ficaria estalando sem parar
// quando a sala está em 23,9 / 24,0 / 23,9. Com a folga, a luz não
// fica piscando entre LARANJA e AMARELO quando a TA está em 31,9/32,0.
// Subir na hora é de propósito: para avisar de perigo, não se espera.
inline NivelRisco nivelComHisterese(NivelRisco atual, float ta, const LimitesRisco& l, float folga) {
  NivelRisco novo = nivelDaSensacao(ta, l);
  if (novo == RISCO_SEM_DADO || atual == RISCO_SEM_DADO) return novo;
  if (novo >= atual) return novo;                            // subiu (ou ficou): vale já
  NivelRisco comFolga = nivelDaSensacao(ta + folga, l);      // desceu: confere com a folga
  return comFolga < atual ? comFolga : atual;
}

// Qual LED fica aceso? Um de cada vez, como num semáforo.
// SEM DADO: pisca o amarelo, como o semáforo em pane. Nunca mostra
// verde sem ter certeza, porque um "verde" falso é o pior erro possível.
inline bool ledDeveAcender(NivelRisco nivelAtual, NivelRisco corDoLed, bool fasePisca) {
  if (nivelAtual == RISCO_SEM_DADO) return corDoLed == RISCO_AMARELO && fasePisca;
  return nivelAtual == corDoLed;
}
