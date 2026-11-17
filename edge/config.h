#pragma once
// ============================================================
// config.h — tudo o que pode ser ajustado fica num lugar só.
// Mudar um limite aqui não exige mexer no resto do código.
// ============================================================

#include <stdint.h>

// --- Qual estação é esta (o mesmo firmware serve para as 4) ---
// Em cada Wokwi, SÓ esta linha muda: 1, 2, 3 ou 4. O nome, o ponto
// e os refúgios de cada uma estão no bloco "Por estação", mais abaixo.
// O canal do ThingSpeak e a senha MQTT ficam no secrets.h de cada Wokwi.
// (O #ifndef deixa o teste do PC trocar a estação: g++ -DESTACAO=2.)
#ifndef ESTACAO
#define ESTACAO 1
#endif

// --- Pinos ---
#define PINO_DHT          15
#define PINO_ENERGIA_DHT   4   // o DHT22 é alimentado por este pino: assim o ESP32 consegue
                               // desligar e religar o sensor para destravá-lo (gasta ~2,5 mA)
#define PINO_ANEMOMETRO   27   // chave magnética para o GND; usa o pull-up interno do ESP32
#define PINO_LDR          34   // tem que ser do ADC1: o ADC2 para de funcionar com o WiFi ligado (Passo 4)
#define PINO_LED_VERDE    32   // LEDs de risco (evitei o GPIO 12: no ESP32 real ele
#define PINO_LED_AMARELO  33   // decide a tensão da flash no boot e pode impedir a placa de ligar)
#define PINO_LED_LARANJA  25
#define PINO_LED_VERMELHO 26
#define PINO_LED_ROXO     19   // 5º nível (roxo) da nota técnica da SMS de POA
#define PINO_RELE         18   // HIGH = relé ligado = nebulizador ligado
// O LCD usa o I2C padrão do ESP32: SDA no GPIO 21 e SCL no GPIO 22
#define LCD_ENDERECO_I2C  0x27   // LCD 1: medição
#define LCD2_ENDERECO_I2C 0x26   // LCD 2: orientação (mesmo fio I2C, outro endereço)

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

// --- Anemômetro (SparkFun SEN-15901): 1 pulso por segundo = 2,4 km/h ---
const float         MS_POR_PULSO_POR_S     = 2.4f / 3.6f;  // = 0,667 m/s
const unsigned long DEBOUNCE_ANEMOMETRO_US = 5000;   // 2 pulsos a menos de 5 ms = "tremida" da chave
                                                     // (5 ms = 200 pulsos/s = 133 m/s: nunca é vento real)
const float         VENTO_MAX_MS           = 50.0f;  // 180 km/h: acima disso é ruído, não vento

// --- LDR (módulo do Wokwi: LDR em série com 10 kΩ) ---
const float LDR_RL10_OHMS   = 50000.0f;  // resistência a 10 lux (atributo "rl10" do Wokwi)
const float LDR_GAMMA       = 0.7f;      // inclinação da curva do LDR (atributo "gamma")
const float LDR_R_FIXO_OHMS = 10000.0f;
const float ADC_VREF        = 3.3f;      // o módulo é ligado no 3V3
const int   ADC_MAX         = 4095;      // ADC de 12 bits
const int   ADC_LDR_MIN     = 5;         // grudado no 0 ou no máximo = fio solto ou curto
const int   ADC_LDR_MAX     = 4090;      // (sol forte dá ~32; noite de lua dá ~4060)

// --- Da luz para a radiação no corpo (APROXIMAÇÃO: ver README) ---
const float LUX_POR_W_M2         = 120.0f;    // luz do sol: ~120 lux = 1 W/m²
const float FATOR_ABSORCAO_CORPO = 0.12f;     // fração que o corpo absorve, na média da pele
const float LUX_MAX              = 120000.0f; // mais que o sol mais forte: corta aqui
const float Q_PIOR_CASO          = 100.0f;    // = sol forte; usado se o LDR falhar

// --- Níveis de risco (valores INICIAIS; a nuvem pode mudar com lim:) ---
// As 5 faixas da Nota Técnica nº 01/26 da Secretaria Municipal de Saúde
// de Porto Alegre (atualizada em 04/02/2026), ver risco.h:
//   < 27 verde | 27-33 amarelo | 34-39 laranja | 40-51 vermelho | > 51 roxo
// A nota usa faixas de números inteiros, então cada cor COMEÇA em
// 27, 34, 40 e 52 (51,9 °C ainda é "51": vermelho).
const float LIMITE_AMARELO_C  = 27.0f;
const float LIMITE_LARANJA_C  = 34.0f;
const float LIMITE_VERMELHO_C = 40.0f;
const float LIMITE_ROXO_C     = 52.0f;
const float HISTERESE_NIVEL_C = 0.5f;   // a cor só DESCE 0,5 °C abaixo do limite (a do DHT22 é ±0,5)
// Abaixo disto, o LCD mostra FRIO em vez de VERDE. É SÓ um aviso de
// texto: os níveis, os LEDs, o relé e o field6 continuam medindo o
// risco de CALOR (o foco do projeto). 9 °C é onde a escala UTCI começa
// o "estresse por frio leve"; é outro índice, então vale como referência.
const float LIMITE_FRIO_C     = 9.0f;
const float LIMITE_MIN_C      = 15.0f;  // faixa aceita para a config remota
const float LIMITE_MAX_C      = 60.0f;
const unsigned long PISCA_MS  = 500;    // SEM DADO: amarelo pisca 1 vez por segundo

// ============================================================
// Por estação: nome, ponto e refúgios (escolhidos por ESTACAO)
// ============================================================
// Ponto (LAT/LON): o ponto da estação na cobertura do solo (Python,
// fontes/cobertura.py). Serve para a conta do sol (sol.h).
//
// Refúgios: para onde o LCD 2 manda a pessoa com risco LARANJA ou acima.
// A estação é fixa, então a distância também: medida uma vez no
// OpenStreetMap, em linha reta, da estação até a borda da praça/bosque
// ou até a entrada do shopping (E1 em 15/11/2026; E2 a E4 em 17/11/2026).
// O LCD indica o MAIS PERTO que estiver ABERTO agora (ver refugio.h).
// Um shopping só ganha da praça se estiver mais perto; ele fica na lista
// para valer a regra quando a praça mudar (ex.: obra).
// Cada shopping usa o horário mais curto que achamos, e "vale até" é
// 1 h antes de fechar (para dar tempo de chegar). Feriado a estação
// não sabe: limitação (está no README).
#include "refugio.h"

#if ESTACAO == 1
  #define ID_ESTACAO   "E1"
  #define NOME_ESTACAO "Largo Glenio Peres"
  // Com risco VERMELHO ou ROXO, indicar o refrigerado (se aberto) no lugar
  // da sombra mais perto? Só nas estações em que a sombra é o parque
  // (E3 e E4): decisão do Matheus, 17/11/2026.
  const bool REFRIGERADO_NO_VERMELHO = false;
  const double LAT_ESTACAO = -30.0280671;
  const double LON_ESTACAO = -51.2276134;
  // Rua da Praia Shopping, pelo Instagram oficial (@ruadapraiashopping,
  // perfil ativo em 11/2026, lido em 17/11/2026): seg-sex 9h-20h, sábado
  // 9h-18h, domingo e feriado 11h-18h. A lista guarda um horário só para
  // seg-sáb, então fica o do sábado (o mais curto): vale até as 17h.
  const Refugio REFUGIOS[] = {
    // nome (até 10, sem acento)  distância (m)  seg-sáb: abre  vale até  domingo: abre  vale até  refrigerado
    { "Praca XV",                  24,           -1,            0,        0,             0  , false },  // Praça XV de Novembro: árvores, 24 h
    { "Shop.Praia",                448,          9,             17,       11,            17 , true  },  // Rua da Praia Shopping (R. dos Andradas, 1001)
  };

#elif ESTACAO == 2
  #define ID_ESTACAO   "E2"
  #define NOME_ESTACAO "Calcadao da Rua dos Andradas"
  const bool REFRIGERADO_NO_VERMELHO = false;
  const double LAT_ESTACAO = -30.0302953;
  const double LON_ESTACAO = -51.2309031;
  const Refugio REFUGIOS[] = {
    { "Pc Alfand.",                8,            -1,            0,        0,             0  , false },  // Praça da Alfândega (OSM way 206611684), 24 h
    { "Shop.Praia",                69,           9,             17,       11,            17 , true  },  // Rua da Praia Shopping, entrada principal (horário da E1)
  };

#elif ESTACAO == 3
  #define ID_ESTACAO   "E3"
  #define NOME_ESTACAO "Parque Harmonia (piso)"
  const bool REFRIGERADO_NO_VERMELHO = true;    // vermelho/roxo -> Praia de Belas Shopping, se aberto
  const double LAT_ESTACAO = -30.040690;
  const double LON_ESTACAO = -51.237354;
  // Parque Harmonia: "aberto diariamente, das 6h às 00h" (site oficial
  // parqueharmoniapoa.com.br e portal de turismo da prefeitura, lidos em
  // 17/11/2026) -> o bosque vale das 6h às 23h, todos os dias. Fora disso,
  // fica a Orla, que é aberta 24 h.
  // Praia de Belas Shopping (site oficial, lido em 17/11/2026): de segunda a
  // sábado, 10h-22h (vale até 21h). No domingo, as lojas abrem das 14h às
  // 20h, mas a praça de alimentação abre das 11h às 22h: o prédio (com
  // ar-condicionado) já está aberto às 11h -> vale das 11h às 21h.
  const Refugio REFUGIOS[] = {
    { "Bosque",                    47,           6,             23,       6,             23 , false },  // bosque dentro do Harmonia (OSM way 338078463)
    { "Orla",                      200,          -1,            0,        0,             0  , false },  // Orla do Guaíba (OSM relation 2896007), aberta
    { "Shop.Belas",                1193,         10,            21,       11,            21 , true  },  // Praia de Belas Shopping, entrada mais perto
  };

#elif ESTACAO == 4
  #define ID_ESTACAO   "E4"
  #define NOME_ESTACAO "Parque Marinha do Brasil"
  const bool REFRIGERADO_NO_VERMELHO = true;    // vermelho/roxo -> Praia de Belas Shopping, se aberto
  const double LAT_ESTACAO = -30.054441;
  const double LON_ESTACAO = -51.231272;
  // A estação já fica sob as árvores (é o CONTROLE). Se mesmo assim o
  // risco subir, o LCD indica a Praça Rotary: aberta (pega mais vento) e
  // arborizada. Não indica o próprio parque ("Marinha 0m" não ajudaria).
  const Refugio REFUGIOS[] = {
    { "Pc Rotary",                 174,          -1,            0,        0,             0  , false },  // Praça Rotary (OSM way 70640036), 24 h
    { "Shop.Belas",                531,          10,            21,       11,            21 , true  },  // Praia de Belas Shopping, entrada principal
  };

#else
  #error "ESTACAO tem que ser 1, 2, 3 ou 4"
#endif
const int NUM_REFUGIOS = sizeof(REFUGIOS) / sizeof(REFUGIOS[0]);

// --- Relógio da internet (NTP): para saber se o shopping está aberto ---
#define NTP_SERVIDOR       "pool.ntp.org"
const long FUSO_HORARIO_S = -3L * 3600L;   // Brasília (UTC-3, sem horário de verão desde 2019)

// --- Dia ou noite (sol.h): muda o conselho do LCD 2 ("sombra" só de dia) ---
// O ponto da estação (LAT/LON) está no bloco "Por estação", acima.
// Sem relógio, a estação usa o LDR: abaixo disto é noite. Um poste perto dá
// ~10-20 lux; um dia nublado passa de 1.000 lux.
const float LUX_NOITE = 50.0f;

// --- Relé do nebulizador (liga a partir do LARANJA) ---
// Tempos CURTOS para dar para ver no Wokwi e no vídeo. Numa estação
// de verdade: confirmar 2 min, calma 5 min, descanso 5 min, máximo 30 min.
const float         HISTERESE_RELE_C      = 2.0f;           // desliga só 2 °C abaixo do limite
const unsigned long CONFIRMAR_RISCO_MS    = 10000;          // risco alto por 10 s seguidos para ligar
const unsigned long CONFIRMAR_CALMA_MS    = 20000;          // calma por 20 s seguidos para desligar
const unsigned long RELE_MIN_DESLIGADO_MS = 30000;          // descanso mínimo de 30 s
const unsigned long RELE_MAX_LIGADO_MS    = 10UL * 60UL * 1000UL;  // no máximo 10 min ligado direto
                                                                   // (vale também para o "rele:on" remoto)

// --- Rede: WiFi e MQTT do ThingSpeak (as senhas ficam no secrets.h) ---
#define WIFI_SSID          "Wokwi-GUEST"   // a rede do Wokwi: aberta, sem senha
#define WIFI_CANAL         6               // dizer o canal acelera a conexão no Wokwi
#define MQTT_SERVIDOR      "mqtt3.thingspeak.com"
#define MQTT_PORTA         1883
const unsigned long PUBLICAR_A_CADA_MS  = 20000;   // o ThingSpeak grátis aceita 1 gravação a cada 15 s
const unsigned long WIFI_ESPERA_MIN_MS  = 5000;    // backoff do WiFi: 5 s, 10 s, 20 s... (o WiFi leva uns segundos)
const unsigned long MQTT_ESPERA_MIN_MS  = 2000;    // backoff do MQTT: 2 s, 4 s, 8 s...
const unsigned long REDE_ESPERA_MAX_MS  = 60000;   // ...até no máximo 1 min entre tentativas
const unsigned long SIM_QUEDA_REDE_MS   = 30000;   // comandos 'd' (WiFi) e 'm' (MQTT): queda simulada de 30 s (para o vídeo)
const uint16_t      MQTT_TAMANHO_BUFFER = 512;     // a mensagem com os 7 campos e o status passa de 256 bytes

// --- Configuração remota (chega pelo field8) ---
const unsigned int  CONFIG_MAX_TAMANHO      = 40;    // mensagem maior que isso é rejeitada
const unsigned long CONFIG_MIN_INTERVALO_MS = 5000;  // no máximo 1 comando a cada 5 s (anti-enxurrada)
