#pragma once
// ============================================================
// rele.h — quando ligar o nebulizador/ventilador do local.
//
// Analogia: o porteiro que acende a luz da garagem. Ele não acende
// porque um carro PASSOU na frente (um pico de 2 s); acende quando o
// carro PAROU ali (risco alto por um tempo seguido). E não apaga no
// primeiro segundo de calmaria: espera a calma se confirmar.
//
// As 4 regras, todas para proteger o equipamento e as pessoas:
//   1) LIGA só com risco alto por CONFIRMAR_RISCO_MS seguidos;
//   2) DESLIGA só com a TA abaixo de (limite − HISTERESE_RELE_C)
//      por CONFIRMAR_CALMA_MS seguidos (a histerese, em °C E em tempo);
//   3) DESCANSO: depois de desligar, fica no mínimo RELE_MIN_DESLIGADO_MS
//      desligado (motor e bomba odeiam liga-desliga) e no máximo
//      RELE_MAX_LIGADO_MS ligado (não esvazia a caixa d'água);
//   4) FAIL-SAFE: sem dado confiável (sensor em falha, modo seguro),
//      DESLIGA na hora. Melhor sem névoa do que névoa sem controle.
// Tudo é lógica pura: recebe o "agora" e devolve a decisão.
// ============================================================

#include <math.h>
#include "config.h"

enum MotivoRele {
  RELE_CALMO,          // desligado: sem risco alto
  RELE_CONFIRMANDO,    // desligado: risco alto, mas ainda confirmando
  RELE_DESCANSO,       // desligado: risco alto, mas no tempo mínimo desligado
  RELE_BLOQUEADO,      // desligado: sem dado confiável (fail-safe)
  RELE_LIGADO_CALOR,   // ligado: risco alto confirmado
  RELE_LIGADO_ESFRIANDO // ligado: já esfriou, mas esperando a calma se confirmar
};

struct ControleRele {
  bool          ligado         = false;
  MotivoRele    motivo         = RELE_CALMO;
  unsigned long mudouEmMs      = 0;      // quando ligou ou desligou pela última vez
  bool          jaDesligou     = false;  // no boot não existe "descanso" para cumprir
  bool          riscoContando  = false;
  unsigned long riscoDesdeMs   = 0;
  bool          calmaContando  = false;
  unsigned long calmaDesdeMs   = 0;
};

inline const char* textoMotivoRele(MotivoRele m) {
  switch (m) {
    case RELE_CALMO:            return "calmo";
    case RELE_CONFIRMANDO:      return "confirmando";
    case RELE_DESCANSO:         return "descanso";
    case RELE_BLOQUEADO:        return "bloqueado";
    case RELE_LIGADO_CALOR:     return "calor";
    default:                    return "esfriando";
  }
}

inline void mudarRele(ControleRele& r, bool ligar, unsigned long agora) {
  r.ligado        = ligar;
  r.mudouEmMs     = agora;
  r.riscoContando = false;
  r.calmaContando = false;
  if (!ligar) r.jaDesligou = true;
}

// Chamada a cada ciclo. Devolve true se o relé deve ficar LIGADO.
//   ta         = sensação térmica atual
//   confiavel  = o dado pode ser usado para decidir?
//   limiteLiga = a partir de que TA o risco é "alto" (o início do LARANJA)
inline bool atualizarRele(ControleRele& r, float ta, bool confiavel,
                          float limiteLiga, unsigned long agora) {
  // Regra 4: fail-safe
  if (!confiavel || isnan(ta)) {
    if (r.ligado) mudarRele(r, false, agora);
    r.riscoContando = false;
    r.motivo = RELE_BLOQUEADO;
    return false;
  }

  if (r.ligado) {
    // Regra 3: tempo máximo ligado
    if (agora - r.mudouEmMs >= RELE_MAX_LIGADO_MS) {
      mudarRele(r, false, agora);
      r.motivo = RELE_DESCANSO;
      return false;
    }
    // Regra 2: histerese para desligar
    if (ta < limiteLiga - HISTERESE_RELE_C) {
      if (!r.calmaContando) { r.calmaContando = true; r.calmaDesdeMs = agora; }
      if (agora - r.calmaDesdeMs >= CONFIRMAR_CALMA_MS) {
        mudarRele(r, false, agora);
        r.motivo = RELE_CALMO;
        return false;
      }
      r.motivo = RELE_LIGADO_ESFRIANDO;
    } else {
      r.calmaContando = false;   // voltou a esquentar: a contagem da calma recomeça
      r.motivo = RELE_LIGADO_CALOR;
    }
    return true;
  }

  // Desligado: o risco está alto?
  if (ta < limiteLiga) {
    r.riscoContando = false;
    r.motivo = (r.jaDesligou && agora - r.mudouEmMs < RELE_MIN_DESLIGADO_MS) ? RELE_DESCANSO : RELE_CALMO;
    return false;
  }

  // Regra 1: o risco alto tem que durar
  if (!r.riscoContando) { r.riscoContando = true; r.riscoDesdeMs = agora; }
  if (agora - r.riscoDesdeMs < CONFIRMAR_RISCO_MS) {
    r.motivo = RELE_CONFIRMANDO;
    return false;
  }
  // Regra 3: tempo mínimo desligado
  if (r.jaDesligou && agora - r.mudouEmMs < RELE_MIN_DESLIGADO_MS) {
    r.motivo = RELE_DESCANSO;
    return false;
  }
  mudarRele(r, true, agora);
  r.motivo = RELE_LIGADO_CALOR;
  return true;
}
