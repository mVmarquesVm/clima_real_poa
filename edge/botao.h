#pragma once
// ============================================================
// botao.h — o botão físico de MANUTENÇÃO da estação.
//
// Para que serve: o zelador aperta antes de limpar o bico do
// nebulizador. O relé desliga na hora e fica desligado por
// MANUTENCAO_MS (ou até apertar de novo). Assim ninguém leva névoa
// na cara durante o conserto, nem esquece o equipamento desligado:
// o tempo acaba e a estação volta ao automático sozinha.
//
// Interrupção + debounce, em 2 tempos:
//   1) a INTERRUPÇÃO (campainha) só anota "o pino caiu agora" (marcarBorda).
//      Ela não decide nada, porque o contato do botão TREME: ao apertar
//      (e também ao soltar) ele abre e fecha várias vezes em poucos ms.
//   2) o loop() CONFIRMA (confirmarAperto): se já passou DEBOUNCE_BOTAO_MS
//      desde a ÚLTIMA tremida e o pino continua em LOW, foi um aperto de
//      verdade. Se o pino voltou a HIGH, era a tremida de quem soltou.
// Analogia: a campainha tocou 3 vezes seguidas. Você não abre a porta 3
// vezes: espera o barulho parar e olha se ainda tem alguém lá.
//
// Segurar o botão apertado conta 1 vez só: o botão precisa ser solto
// (o loop ver o pino em HIGH) para valer de novo.
// Tudo aqui é lógica pura (sem pino nem millis), então roda no autoteste.
// ============================================================

struct Botao {
  bool          pendente = false;  // a interrupção viu uma borda que ainda não foi conferida
  unsigned long bordaMs  = 0;      // quando foi a última borda (cada tremida reinicia a espera)
  bool          solto    = true;   // o botão foi solto desde o último aperto aceito?
};

// Chamada pela interrupção (borda de descida). Só anota.
inline void marcarBorda(Botao& b, unsigned long agoraMs) {
  b.pendente = true;
  b.bordaMs  = agoraMs;
}

// Chamada pelo loop(). pinoEmLow = o botão está apertado AGORA.
// Devolve true uma vez só por aperto de verdade.
inline bool confirmarAperto(Botao& b, unsigned long agoraMs, bool pinoEmLow, unsigned long debounceMs) {
  if (!pinoEmLow && agoraMs - b.bordaMs >= debounceMs) b.solto = true;   // soltou e parou de tremer
  if (!b.pendente || agoraMs - b.bordaMs < debounceMs) return false;    // ainda tremendo
  b.pendente = false;
  if (pinoEmLow && b.solto) {
    b.solto = false;
    return true;
  }
  return false;   // era a tremida de quem soltou, ou o botão continua seguro desde o último aperto
}
