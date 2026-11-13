// ============================================================
// anemometro.chip.c — chip customizado do Wokwi que imita o
// anemômetro de conchas da SparkFun (kit Weather Meter SEN-15901).
//
// Como o sensor real funciona (guia da SparkFun):
//   - um ímã gira junto com as conchas e, a cada volta, fecha uma
//     chave magnética (reed switch) entre os 2 fios;
//   - 1 fechamento por segundo = 2,4 km/h de vento.
// Analogia: é a catraca do ônibus. O ESP32 não "vê" o vento; ele só
// conta quantas vezes a catraca girou num certo tempo.
//
// Aqui a chave é imitada no pino SIG:
//   - chave FECHADA = o pino puxa a linha para o GND (OUTPUT_LOW);
//   - chave ABERTA  = o pino fica solto (INPUT) e o pull-up do ESP32
//     deixa a linha em HIGH.
// A velocidade vem do slider "Vento (m/s)" (clique no chip durante a
// simulação).
// ============================================================

#include "wokwi-api.h"
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>

#define KMH_POR_PULSO_POR_S   2.4f                        // datasheet da SparkFun
#define MS_POR_PULSO_POR_S    (KMH_POR_PULSO_POR_S / 3.6f) // = 0,667 m/s
#define ESPERA_SEM_VENTO_US   100000                      // parado: confere o slider a cada 0,1 s

typedef struct {
  pin_t    sinal;      // o fio que vai ao ESP32
  uint32_t attrVento;  // o slider "Vento (m/s)"
  uint32_t timer;
  bool     fechada;    // estado atual da chave magnética
} Anemometro;

static void mudarChave(Anemometro *a, bool fechar) {
  a->fechada = fechar;
  pin_mode(a->sinal, fechar ? OUTPUT_LOW : INPUT);
}

// Chamado pelo timer. Cada chamada vira a chave (abre ou fecha) e
// agenda a próxima virada para daqui a meio período.
// Exemplo: 2 m/s = 3 pulsos por segundo = 1 período a cada 333 ms,
// ou seja, a chave vira a cada 167 ms.
static void aoTimer(void *dados) {
  Anemometro *a = (Anemometro *)dados;
  float vento = attr_read_float(a->attrVento);

  if (vento <= 0.0f) {                     // sem vento: as conchas param, a chave fica aberta
    mudarChave(a, false);
    timer_start(a->timer, ESPERA_SEM_VENTO_US, false);
    return;
  }

  float pulsosPorSegundo = vento / MS_POR_PULSO_POR_S;
  uint32_t meioPeriodoUs = (uint32_t)(500000.0f / pulsosPorSegundo);
  if (meioPeriodoUs < 1) meioPeriodoUs = 1;

  mudarChave(a, !a->fechada);
  timer_start(a->timer, meioPeriodoUs, false);
}

void chip_init(void) {
  Anemometro *a = (Anemometro *)malloc(sizeof(Anemometro));
  a->sinal     = pin_init("SIG", INPUT);    // começa com a chave aberta
  a->attrVento = attr_init_float("vento", 0.0f);
  a->fechada   = false;

  const timer_config_t config = {
    .callback  = aoTimer,
    .user_data = a,
  };
  a->timer = timer_init(&config);
  timer_start(a->timer, ESPERA_SEM_VENTO_US, false);
}
