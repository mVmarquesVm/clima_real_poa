#pragma once
// ============================================================
// rede.h — a "espera crescente" (backoff) das reconexões.
//
// Analogia: ligar para alguém que não atende. Você não liga 100
// vezes por segundo: liga, espera 5 s, liga de novo, espera 10 s,
// depois 20 s... até um máximo. Assim a estação não gasta energia
// nem sobrecarrega o roteador ou o servidor quando a rede cai, e
// o loop() continua livre para ler os sensores e cuidar do relé.
//
// Lógica pura (só números), testada no autoteste.
// ============================================================

struct Backoff {
  bool          tentou       = false;
  unsigned long ultimaMs     = 0;   // quando foi a última tentativa
  unsigned long esperaMs     = 0;   // quanto esperar até a próxima
};

// Já pode tentar de novo? A primeira tentativa é na hora.
inline bool backoffPodeTentar(const Backoff& b, unsigned long agora) {
  return !b.tentou || agora - b.ultimaMs >= b.esperaMs;
}

// Registra uma tentativa e DOBRA a espera da próxima (até o máximo).
inline void backoffTentou(Backoff& b, unsigned long agora, unsigned long minMs, unsigned long maxMs) {
  b.tentou   = true;
  b.ultimaMs = agora;
  if (b.esperaMs == 0)            b.esperaMs = minMs;
  else if (b.esperaMs * 2 > maxMs) b.esperaMs = maxMs;
  else                            b.esperaMs = b.esperaMs * 2;
}

// Conectou: a próxima queda começa de novo pela espera mínima.
inline void backoffConectou(Backoff& b) {
  b = Backoff();
}
