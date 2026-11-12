#pragma once
// ============================================================
// config.h — tudo o que pode ser ajustado fica num lugar só.
// Mudar um limite aqui não exige mexer no resto do código.
// ============================================================

#include <stdint.h>

// --- Identidade da estação (o mesmo firmware serve para as 4) ---
#define ID_ESTACAO   "E1"
#define NOME_ESTACAO "Largo Glenio Peres"

// --- Pinos ---
#define PINO_DHT          15
#define PINO_ENERGIA_DHT   4   // o DHT22 é alimentado por este pino: assim o ESP32 consegue
                               // desligar e religar o sensor para destravá-lo (gasta ~2,5 mA)

// --- Tempo ---
const unsigned long INTERVALO_LEITURA_MS = 2000;  // o DHT22 só gera leitura nova a cada 2 s
const uint32_t      WATCHDOG_TIMEOUT_MS  = 8000;  // travou por 8 s -> o ESP32 reinicia sozinho

// --- Faixa que o DHT22 consegue medir (datasheet) ---
const float TEMP_MIN_C = -40.0f;
const float TEMP_MAX_C =  80.0f;
const float UMID_MIN   =   0.0f;
const float UMID_MAX   = 100.0f;

// --- Defesa da leitura ---
const float         SALTO_MAX_TEMP_C     = 5.0f;   // pulo maior que isso em 2 s é suspeito
const float         SALTO_MAX_UMID       = 20.0f;  // idem para a umidade (pontos de %)
const uint8_t       FALHAS_PARA_ALARME   = 3;      // 3 leituras ruins seguidas = sensor em FALHA
const unsigned long IDADE_MAX_LEITURA_MS = 10000;  // leitura mais velha que 10 s não serve para decidir

// --- Vigia do sensor: detectar "sensor louco" ---
const unsigned long JANELA_INSTABILIDADE_MS  = 60000;  // olha o último minuto...
const uint8_t       SUSPEITOS_PARA_INSTAVEL  = 5;      // ...5 saltos suspeitos nele = sensor instável
const bool          DETECTAR_VALOR_TRAVADO   = false;  // ligar no hardware real (no Wokwi o valor
                                                       // fica parado de propósito e daria alarme falso)
const unsigned long TEMPO_MAX_VALOR_IGUAL_MS = 30UL * 60UL * 1000UL;  // 30 min sem mudar nada = travado

// --- Vigia do sensor: recuperação em escada ---
const unsigned long ESPERA_ENTRE_TENTATIVAS_MS = 10000;   // dá tempo de cada remédio fazer efeito
const unsigned long SENSOR_DESLIGADO_MS        = 1000;    // tempo sem energia para "resetar" o DHT22
const unsigned long AQUECIMENTO_SENSOR_MS      = 2000;    // o DHT22 precisa de ~2 s após ligar
const uint32_t      MAX_REINICIOS_POR_SENSOR   = 2;       // depois disso, para de reiniciar (evita loop)
const unsigned long ESPERA_MANUTENCAO_MS       = 10UL * 60UL * 1000UL;  // em manutenção, tenta a cada 10 min
const unsigned long ESTAVEL_PARA_ZERAR_MS      = 10UL * 60UL * 1000UL;  // 10 min bem = zera os reinícios

// --- Vento: fica em 0 até o anemômetro entrar (Passo 2.3) ---
const float VENTO_SEM_SENSOR_MS = 0.0f;
