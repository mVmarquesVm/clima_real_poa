#pragma once
// ============================================================
// wokwi-api.h FALSO — só para testar o anemometro.chip.c no PC.
// NÃO cole este arquivo no Wokwi: lá o simulador fornece o de verdade.
//
// Analogia: é o dublê do simulador. Declara só as funções que o chip
// usa, com as mesmas assinaturas da documentação do Wokwi
// (docs.wokwi.com/chips-api). Quem as implementa é o teste_chip.c.
// ============================================================

#include <stdbool.h>
#include <stdint.h>

typedef int32_t pin_t;

#define LOW  0
#define HIGH 1

#define INPUT          0
#define OUTPUT         1
#define INPUT_PULLUP   2
#define INPUT_PULLDOWN 3
#define ANALOG         4
#define OUTPUT_LOW     16
#define OUTPUT_HIGH    17

typedef struct {
  void *user_data;
  void (*callback)(void *user_data);
} timer_config_t;

pin_t    pin_init(const char *name, uint32_t mode);
void     pin_mode(pin_t pin, uint32_t mode);
uint32_t timer_init(const timer_config_t *config);
void     timer_start(uint32_t timer_id, uint32_t micros, bool repeat);
uint32_t attr_init_float(const char *name, float default_value);
float    attr_read_float(uint32_t attr);
