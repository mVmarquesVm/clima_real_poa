#pragma once
// ============================================================
// vigia.h — o "watchdog do sensor".
// O watchdog do ESP32 pega o PROGRAMA travado. Este vigia pega
// o SENSOR com problema e tenta consertá-lo, em escada:
//
//   degrau 1: reiniciar a leitura (configurar o sensor de novo)
//   degrau 2: desligar e religar a energia do sensor
//   degrau 3: reiniciar o ESP32 inteiro (no máximo 2 vezes)
//   depois:   MANUTENÇÃO — para de reiniciar, avisa e tenta
//             religar o sensor a cada 10 min
//
// Analogia: com o Wi-Fi de casa ruim, você primeiro espera,
// depois tira o roteador da tomada e, se nada resolver, liga
// para o técnico. Ninguém fica tirando da tomada sem parar.
//
// Tudo aqui é lógica pura, testada no autoteste do boot.
// ============================================================

#include <math.h>
#include <stdint.h>
#include "config.h"

// --- Detector 1: sensor instável (muitos saltos em pouco tempo) ---
struct DetectorInstavel {
  unsigned long inicioJanelaMs = 0;
  uint8_t       suspeitos      = 0;
  bool          instavel       = false;
};

// Chame a cada leitura: fecha a janela de 1 min quando ela passa.
inline void atualizarJanela(DetectorInstavel& d, unsigned long agoraMs) {
  if (agoraMs - d.inicioJanelaMs > JANELA_INSTABILIDADE_MS) {
    d.inicioJanelaMs = agoraMs;
    d.suspeitos = 0;
    d.instavel = false;
  }
}

// Chame quando o filtro de salto segurar um valor.
inline void registrarSuspeito(DetectorInstavel& d, unsigned long agoraMs) {
  atualizarJanela(d, agoraMs);
  if (d.suspeitos < 255) d.suspeitos++;
  if (d.suspeitos >= SUSPEITOS_PARA_INSTAVEL) d.instavel = true;
}

// --- Detector 2: valor travado (o sensor repete o mesmo número) ---
struct DetectorTravado {
  bool          temValor = false;
  float         t        = 0.0f;
  float         u        = 0.0f;
  unsigned long desdeMs  = 0;
};

// Devolve true se o valor está idêntico há tempo demais.
inline bool valorTravado(DetectorTravado& d, float t, float u, unsigned long agoraMs) {
  if (!d.temValor || fabsf(t - d.t) > 0.05f || fabsf(u - d.u) > 0.05f) {
    d.temValor = true;            // mudou: recomeça a contar
    d.t = t;
    d.u = u;
    d.desdeMs = agoraMs;
    return false;
  }
  return (agoraMs - d.desdeMs) >= TEMPO_MAX_VALOR_IGUAL_MS;
}

// --- Recuperação em escada ---
enum AcaoRecuperacao {
  ACAO_NENHUMA,
  ACAO_REINICIAR_LEITURA,
  ACAO_RELIGAR_SENSOR,
  ACAO_REINICIAR_ESP32,
  ACAO_ENTRAR_MANUTENCAO
};

inline const char* textoAcao(AcaoRecuperacao a) {
  switch (a) {
    case ACAO_REINICIAR_LEITURA: return "reiniciar a leitura do sensor";
    case ACAO_RELIGAR_SENSOR:    return "desligar e religar o sensor";
    case ACAO_REINICIAR_ESP32:   return "reiniciar o ESP32";
    case ACAO_ENTRAR_MANUTENCAO: return "entrar em MANUTENCAO";
    default:                     return "nenhuma";
  }
}

struct Recuperacao {
  uint8_t       degrau       = 0;      // 0 = tudo bem
  bool          emManutencao = false;
  unsigned long ultimaAcaoMs = 0;
};

// Decide o próximo remédio. reiniciosPorSensor vem de uma memória
// que sobrevive ao reinício (ver sketch.ino).
inline AcaoRecuperacao decidirRecuperacao(Recuperacao& r, bool sensorComProblema,
                                          unsigned long agoraMs, uint32_t reiniciosPorSensor) {
  if (!sensorComProblema) {               // sensor bem: desce a escada toda
    r.degrau = 0;
    r.emManutencao = false;
    return ACAO_NENHUMA;
  }

  unsigned long espera = r.emManutencao ? ESPERA_MANUTENCAO_MS : ESPERA_ENTRE_TENTATIVAS_MS;
  if (r.degrau > 0 && (agoraMs - r.ultimaAcaoMs) < espera) {
    return ACAO_NENHUMA;                  // o último remédio ainda está fazendo efeito
  }
  r.ultimaAcaoMs = agoraMs;

  if (r.emManutencao) return ACAO_RELIGAR_SENSOR;   // de tempos em tempos, tenta de novo

  r.degrau++;
  if (r.degrau == 1) return ACAO_REINICIAR_LEITURA;
  if (r.degrau == 2) return ACAO_RELIGAR_SENSOR;
  if (reiniciosPorSensor < MAX_REINICIOS_POR_SENSOR) return ACAO_REINICIAR_ESP32;

  r.emManutencao = true;                  // já reiniciou demais: não entra em loop
  return ACAO_ENTRAR_MANUTENCAO;
}
