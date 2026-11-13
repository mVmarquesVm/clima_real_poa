// ============================================================
// teste_chip.c — testa no PC o chip do anemômetro.
// Faz o papel do Wokwi: guarda o timer que o chip agendou, "pula" o
// relógio até ele e chama o chip de novo. Conta quantas vezes a chave
// FECHOU em 10 s simulados e compara com o datasheet da SparkFun:
//   pulsos por segundo = vento (m/s) / 0,667
// ============================================================

#include <math.h>
#include <stdio.h>
#include "../anemometro.chip.c"   // inclui o .c para chamar o aoTimer() direto

// ---------- O "simulador" falso ----------
static float    ventoDoSlider = 0.0f;
static uint32_t modoAtual     = INPUT;
static int      fechamentos   = 0;
static uint64_t relogioUs     = 0;
static uint64_t disparoUs     = 0;
static bool     timerAgendado = false;
static void   (*callback)(void *) = NULL;
static void    *dadosDoChip   = NULL;

pin_t pin_init(const char *name, uint32_t mode) { (void)name; modoAtual = mode; return 1; }

void pin_mode(pin_t pin, uint32_t mode) {
  (void)pin;
  if (mode == OUTPUT_LOW && modoAtual != OUTPUT_LOW) fechamentos++;   // a chave acabou de fechar
  modoAtual = mode;
}

uint32_t timer_init(const timer_config_t *config) {
  callback    = config->callback;
  dadosDoChip = config->user_data;
  return 1;
}

void timer_start(uint32_t timer_id, uint32_t micros, bool repeat) {
  (void)timer_id; (void)repeat;
  disparoUs     = relogioUs + micros;
  timerAgendado = true;
}

uint32_t attr_init_float(const char *name, float default_value) { (void)name; (void)default_value; return 1; }
float    attr_read_float(uint32_t attr) { (void)attr; return ventoDoSlider; }

// ---------- O teste ----------
static int contarFechamentos(float vento, double segundos) {
  ventoDoSlider = vento;
  fechamentos   = 0;
  uint64_t fimUs = relogioUs + (uint64_t)(segundos * 1e6);
  while (timerAgendado && disparoUs <= fimUs) {
    relogioUs     = disparoUs;
    timerAgendado = false;
    callback(dadosDoChip);
  }
  relogioUs = fimUs;
  return fechamentos;
}

static int falhas = 0;

static void verificar(float vento, int esperado) {
  int contados = contarFechamentos(vento, 10.0);
  int ok = abs(contados - esperado) <= 1;   // ±1: depende de onde a janela de 10 s começa
  if (!ok) falhas++;
  printf("  [%s] vento %.1f m/s: %d fechamentos em 10 s (esperado %d)\n",
         ok ? "PASSOU" : "FALHOU", vento, contados, esperado);
}

int main(void) {
  printf("== Teste do chip do anemometro ==\n");
  chip_init();
  verificar(0.0f, 0);     // parado
  verificar(2.0f, 30);    // 2 / 0,667 = 3 pulsos/s
  verificar(10.0f, 150);  // 15 pulsos/s
  verificar(40.0f, 600);  // máximo do slider: 60 pulsos/s
  verificar(0.0f, 0);     // o vento parou: a chave para de fechar
  printf("== Resultado: %d falharam ==\n", falhas);
  return falhas == 0 ? 0 : 1;
}
