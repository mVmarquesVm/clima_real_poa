#pragma once
// ============================================================
// risco.h — da sensação térmica para a cor do LED.
//
// Faixas (°C de sensação) da Nota Técnica nº 01/26 da Secretaria
// Municipal de Saúde de Porto Alegre ("calor extremo", 04/02/2026).
// A nota adapta as categorias do índice de calor da NOAA, que é uma
// regressão (Rothfusz, 1990) das tabelas do próprio Steadman:
//   VERDE    < 27        sem efeitos adversos esperados
//   AMARELO  27 a 33     possível fadiga com exposição prolongada
//   LARANJA  34 a 39     possível insolação ou fadiga
//   VERMELHO 40 a 51     provável insolação; trabalho externo desaconselhado das 13h às 17h
//   ROXO     > 51        recomendada a suspensão das atividades externas
//
// A nota usa o índice de calor NA SOMBRA. A nossa TA inclui o sol,
// então a estação é mais rigorosa que a nota quando bate sol. É de
// propósito: a pessoa no Largo está no sol (a NOAA diz que o sol
// pleno soma até 8 °C ao índice).
//
// Os limites ficam numa struct (e não em constantes) porque eles
// podem ser mudados pela nuvem, com o ESP32 ligado.
// ============================================================

#include <math.h>
#include "config.h"

// O número de cada nível é o que vai no field6 do ThingSpeak:
// 0 verde, 1 amarelo, 2 laranja, 3 vermelho, 4 roxo, 5 sem dado.
enum NivelRisco { RISCO_VERDE, RISCO_AMARELO, RISCO_LARANJA, RISCO_VERMELHO, RISCO_ROXO, RISCO_SEM_DADO };

inline const char* textoNivel(NivelRisco n) {
  switch (n) {
    case RISCO_VERDE:    return "VERDE";
    case RISCO_AMARELO:  return "AMARELO";
    case RISCO_LARANJA:  return "LARANJA";
    case RISCO_VERMELHO: return "VERMELHO";
    case RISCO_ROXO:     return "ROXO";
    default:             return "SEM DADO";
  }
}

// Onde cada cor COMEÇA (o verde é "abaixo do amarelo").
struct LimitesRisco {
  float amarelo  = LIMITE_AMARELO_C;
  float laranja  = LIMITE_LARANJA_C;
  float vermelho = LIMITE_VERMELHO_C;
  float roxo     = LIMITE_ROXO_C;
};

// Regra que a config remota usa antes de aceitar limites novos:
// números de verdade, numa faixa razoável e em ordem, com pelo
// menos 1 °C entre um e outro.
inline bool limitesValidos(const LimitesRisco& l) {
  if (isnan(l.amarelo) || isnan(l.laranja) || isnan(l.vermelho) || isnan(l.roxo)) return false;
  if (l.amarelo < LIMITE_MIN_C || l.roxo > LIMITE_MAX_C) return false;
  return l.amarelo + 1.0f <= l.laranja && l.laranja + 1.0f <= l.vermelho && l.vermelho + 1.0f <= l.roxo;
}

// A cor "crua", sem memória: só olha o número.
inline NivelRisco nivelDaSensacao(float ta, const LimitesRisco& l) {
  if (isnan(ta))       return RISCO_SEM_DADO;
  if (ta >= l.roxo)     return RISCO_ROXO;
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
