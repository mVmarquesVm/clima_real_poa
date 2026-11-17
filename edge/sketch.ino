// ============================================================
// Forno Alegre — estação de "calor real"
// Passo 2: a cada 2 s lê o DHT22, o anemômetro e o LDR e calcula a
// Temperatura Aparente (com vento e sol), com watchdog do programa,
// vigia do sensor, defesa da leitura e autoteste no boot.
// Passo 3: LEDs de risco, relé do nebulizador com histerese e
// fail-safe, e LCD 20x4 com o valor, o risco, o relé e a rede.
// Passo 4: WiFi + MQTT no ThingSpeak (publica a cada 20 s, reconecta
// com espera crescente) e comandos remotos pelo field8.
// ============================================================

#include <Arduino.h>
#include <esp_task_wdt.h>   // watchdog de tarefas do ESP32
#include <esp_system.h>     // motivo do último reinício
#include "DHTesp.h"
#include <Wire.h>                // I2C (SDA 21, SCL 22)
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <PubSubClient.h>        // cliente MQTT
#include <Preferences.h>         // memória flash (NVS): guarda os limites

#include "config.h"
#include "sensacao.h"
#include "conversao.h"
#include "defesa.h"
#include "vigia.h"
#include "risco.h"
#include "rele.h"
#include "botao.h"
#include "display.h"
#include "sol.h"
#include "rede.h"
#include "nuvem.h"
#include "autoteste.h"
#include "secrets.h"           // senhas do ThingSpeak: fora do Git (ver secrets.example.h)

// ---------- Estado da estação ----------
DHTesp            dht;
FiltroSalto       filtroTemp;
FiltroSalto       filtroUmid;
SaudeSensor       saude;
DetectorInstavel  instabilidade;
DetectorTravado   travamento;
Recuperacao       recuperacao;

float tempC     = NAN;   // últimos valores ACEITOS
float umid      = NAN;
float sensacaoC = NAN;

// Vento e luz: se a leitura vier ruim, o cálculo usa o pior caso (defesa.h)
float ventoMs        = 0.0f;
bool  ventoOk        = false;
bool  haviaErroVento = false;
float luxAtual       = 0.0f;
float radiacaoQ      = 0.0f;
bool  luzOk          = false;
bool  haviaErroLuz   = false;
int   ultimoAdcLdr   = 0;

// ---------- Anemômetro: contagem de pulsos por interrupção ----------
// Analogia: a interrupção é a campainha. O ESP32 não fica olhando o
// pino o tempo todo; quando a chave fecha, a campainha toca, ele marca
// +1 e volta ao que estava fazendo. Assim nenhum pulso se perde, nem
// quando o loop está ocupado lendo o DHT22.
// volatile: avisa o compilador que essa variável muda "por fora"
// (na interrupção), então ele tem que ler da memória toda vez.
volatile uint32_t pulsosVento   = 0;
volatile uint32_t ultimoPulsoUs = 0;
portMUX_TYPE      travaVento    = portMUX_INITIALIZER_UNLOCKED;
unsigned long     inicioJanelaVentoMs = 0;

// IRAM_ATTR: a função fica na RAM interna, que responde na hora
// (uma interrupção não pode esperar a memória flash).
void IRAM_ATTR aoPulsoDoAnemometro() {
  uint32_t agora = micros();
  portENTER_CRITICAL_ISR(&travaVento);
  if (agora - ultimoPulsoUs >= DEBOUNCE_ANEMOMETRO_US) {   // ignora a "tremida" da chave
    pulsosVento = pulsosVento + 1;   // (o "++" em volatile é obsoleto no C++20)
    ultimoPulsoUs = agora;
  }
  portEXIT_CRITICAL_ISR(&travaVento);
}

// ---------- Botão de manutenção: interrupção + debounce (botao.h) ----------
// A interrupção só ANOTA a borda; quem decide se foi um aperto de verdade
// é o loop (cuidarDoBotao), depois de 50 ms sem tremida.
Botao        botao;
portMUX_TYPE travaBotao = portMUX_INITIALIZER_UNLOCKED;

void IRAM_ATTR aoApertarBotao() {
  unsigned long agora = millis();
  portENTER_CRITICAL_ISR(&travaBotao);
  // O mesmo que marcarBorda(botao, agora), escrito aqui dentro: a
  // interrupção só pode chamar código que está na RAM (IRAM).
  botao.pendente = true;
  botao.bordaMs  = agora;
  portEXIT_CRITICAL_ISR(&travaBotao);
}

// Pega o total e zera, sem deixar a interrupção mexer no meio.
// Analogia: o caixa do banco fecha a porta enquanto conta o dinheiro.
uint32_t pegarEZerarPulsos() {
  portENTER_CRITICAL(&travaVento);
  uint32_t n = pulsosVento;
  pulsosVento = 0;
  portEXIT_CRITICAL(&travaVento);
  return n;
}

unsigned long proximoCicloMs   = INTERVALO_LEITURA_MS;
bool          modoSeguro       = false;
bool          sensorTravado    = false;
bool          haviaProblema    = false;
unsigned long ultimoProblemaMs = 0;

// Energia do sensor (para o degrau "desligar e religar")
bool          sensorDesligado  = false;
unsigned long religarEmMs      = 0;
unsigned long sensorProntoEmMs = 0;

// Último aviso: vai aparecer no display (Passo 3) e no MQTT (Passo 4)
char ultimoAlerta[96] = "nenhum";

// ---------- Atuadores e display (Passo 3) ----------
LiquidCrystal_I2C lcd(LCD_ENDERECO_I2C, LCD_COLUNAS, LCD_LINHAS);     // LCD 1: medição
LiquidCrystal_I2C lcd2(LCD2_ENDERECO_I2C, LCD_COLUNAS, LCD_LINHAS);   // LCD 2: orientação
char telaAnterior2[LCD_LINHAS][LCD_COLUNAS + 1] = {"", "", "", ""};
LimitesRisco limites;                    // no Passo 4, a nuvem pode mudar
NivelRisco   nivelAtual = RISCO_SEM_DADO;
ControleRele rele;
bool wifiOk = false;
bool mqttOk = false;
char telaAnterior[LCD_LINHAS][LCD_COLUNAS + 1] = {"", "", "", ""};

// ---------- Nuvem (Passo 4) ----------
WiFiClient       clienteTcp;
PubSubClient     mqtt(clienteTcp);
Preferences      memoria;
Backoff          backoffWifi;
Backoff          backoffMqtt;
LimiteFrequencia freqComandos;
bool             wifiEstavaOk        = false;
bool             mqttEstavaOk        = false;
unsigned long    proximaPublicacaoMs = 0;
bool             redeDerrubada       = false;   // comando 'd' (simulação para o vídeo)
unsigned long    redeVoltaEmMs       = 0;
bool             mqttDerrubado       = false;   // comando 'm' (simulação para o vídeo)
unsigned long    mqttVoltaEmMs       = 0;
char             ultimoComando[72]   = "nenhum";

// "channels/<id>/..." montado na compilação (o C junta textos vizinhos)
const char* TOPICO_PUBLICAR = "channels/" SECRET_CANAL_ID "/publish";
const char* TOPICO_COMANDO  = "channels/" SECRET_CANAL_ID "/subscribe/fields/field8";

// Simulação de defeito, para testar e gravar o vídeo
enum Simulacao { SIM_NENHUMA, SIM_FALHA, SIM_LOUCO };
Simulacao     simulacao     = SIM_NENHUMA;
unsigned long simulacaoAteMs = 0;

// RTC_NOINIT_ATTR: memória que NÃO é apagada num reinício por software
// ou por watchdog. Só zera quando a energia é ligada.
RTC_NOINIT_ATTR uint32_t contadorReinicios;
RTC_NOINIT_ATTR uint32_t reiniciosPorSensor;
RTC_NOINIT_ATTR uint32_t marcaReinicioDoVigia;
const uint32_t MARCA_VIGIA = 0x5E50A0FFUL;   // "assinatura" de que fomos nós que reiniciamos

// ---------- Avisos ----------
void alertar(const char* nivel, const char* mensagem) {
  snprintf(ultimoAlerta, sizeof(ultimoAlerta), "%s: %s", nivel, mensagem);
  Serial.printf("[%s][%s] %s\n", nivel, ID_ESTACAO, mensagem);
}

// ---------- Watchdog do programa ----------
// Analogia: é o "botão do homem morto" do maquinista. Se ele parar de
// apertar (o loop travou), o trem freia sozinho (o ESP32 reinicia).
void iniciarWatchdog() {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  esp_task_wdt_config_t cfg = {};
  cfg.timeout_ms     = WATCHDOG_TIMEOUT_MS;
  cfg.idle_core_mask = 0;      // vigia só a nossa tarefa (o loop)
  cfg.trigger_panic  = true;   // estourou o tempo -> reinicia
  if (esp_task_wdt_reconfigure(&cfg) != ESP_OK) {
    esp_task_wdt_init(&cfg);   // se ainda não existia, cria
  }
#else
  esp_task_wdt_init(WATCHDOG_TIMEOUT_MS / 1000, true);  // API antiga (core 2.x)
#endif
  esp_task_wdt_add(NULL);      // NULL = "a tarefa atual", ou seja, o loop()
}

const char* textoMotivoReinicio(esp_reset_reason_t motivo) {
  switch (motivo) {
    case ESP_RST_POWERON:  return "energia ligada";
    case ESP_RST_SW:       return "reinicio pelo software";
    case ESP_RST_PANIC:    return "erro grave (panic)";
    case ESP_RST_INT_WDT:  return "watchdog de interrupcao";
    case ESP_RST_TASK_WDT: return "WATCHDOG: o programa travou";
    case ESP_RST_WDT:      return "watchdog";
    case ESP_RST_BROWNOUT: return "queda de tensao";
    case ESP_RST_EXT:      return "botao de reset";
    default:               return "desconhecido";
  }
}

// ---------- Energia do sensor ----------
void ligarSensor(unsigned long agora) {
  digitalWrite(PINO_ENERGIA_DHT, HIGH);
  dht.setup(PINO_DHT, DHTesp::DHT22);
  sensorDesligado  = false;
  sensorProntoEmMs = agora + AQUECIMENTO_SENSOR_MS;   // não lê antes de ele "acordar"
}

// Desliga agora e agenda o religamento. Nada de delay(): o loop segue livre.
void desligarSensorPorUmInstante(unsigned long agora) {
  digitalWrite(PINO_ENERGIA_DHT, LOW);
  sensorDesligado = true;
  religarEmMs     = agora + SENSOR_DESLIGADO_MS;
}

void cuidarDaEnergiaDoSensor(unsigned long agora) {
  if (sensorDesligado && (long)(agora - religarEmMs) >= 0) {
    ligarSensor(agora);
    Serial.println("  sensor religado, aguardando aquecimento");
  }
}

bool sensorPronto(unsigned long agora) {
  return !sensorDesligado && (long)(agora - sensorProntoEmMs) >= 0;
}

// ---------- Comandos pelo Serial (para testes e para o vídeo) ----------
//   w = trava o programa (testa o watchdog)
//   f = sensor em FALHA por 60 s (testa a escada de recuperação)
//   x = sensor LOUCO por 60 s (valores aleatórios: testa a instabilidade)
//   n = volta ao normal
//   d = derruba o WiFi por 30 s (testa a reconexão e o display)
//   m = derruba só o MQTT (testa a reconexão do MQTT)
void verificarComandosSerial(unsigned long agora) {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == 'w' || c == 'W') {
      Serial.println(">> Simulando travamento: o watchdog deve reiniciar em ~8 s...");
      while (true) { }   // trava de propósito: ninguém mais "alimenta" o watchdog
    } else if (c == 'f' || c == 'F') {
      simulacao = SIM_FALHA;
      simulacaoAteMs = agora + 60000;
      Serial.println(">> Simulando sensor em FALHA por 60 s");
    } else if (c == 'x' || c == 'X') {
      simulacao = SIM_LOUCO;
      simulacaoAteMs = agora + 60000;
      Serial.println(">> Simulando sensor LOUCO por 60 s");
    } else if (c == 'n' || c == 'N') {
      simulacao = SIM_NENHUMA;
      Serial.println(">> Simulacao desligada");
    } else if (c == 'd' || c == 'D') {
      Serial.println(">> Simulando queda do WiFi por 30 s");
      mqtt.disconnect();
      WiFi.disconnect();
      redeDerrubada = true;
      redeVoltaEmMs = agora + SIM_QUEDA_REDE_MS;
    } else if (c == 'm' || c == 'M') {
      Serial.println(">> Simulando queda do MQTT por 30 s (o WiFi continua)");
      mqtt.disconnect();
      mqttDerrubado = true;
      mqttVoltaEmMs = agora + SIM_QUEDA_REDE_MS;
    }
  }
  if (simulacao != SIM_NENHUMA && (long)(agora - simulacaoAteMs) >= 0) {
    simulacao = SIM_NENHUMA;
    Serial.println(">> Fim da simulacao");
  }
}

// ---------- Leitura com as 3 barreiras de defesa ----------
void lerSensor(unsigned long agora) {
  TempAndHumidity d = dht.getTempAndHumidity();
  bool respondeu = dht.getStatus() == DHTesp::ERROR_NONE;

  if (simulacao == SIM_FALHA) {            // finge fio solto
    d.temperature = NAN;
    respondeu = false;
  } else if (simulacao == SIM_LOUCO) {     // finge sensor doido, mas dentro da faixa
    d.temperature = random(10, 70);
    d.humidity    = random(0, 100);
  }

  // Barreira 1: o sensor respondeu e o número faz sentido?
  if (!respondeu || !leituraValida(d.temperature, d.humidity)) {
    registrarFalha(saude);
    Serial.printf("  aviso: leitura invalida (%s)\n", simulacao == SIM_FALHA ? "simulada" : dht.getStatusString());
    return;
  }

  // Barreira 2: pulo grande precisa se confirmar na próxima leitura
  bool tempOk = aceitarSemSalto(filtroTemp, d.temperature, SALTO_MAX_TEMP_C);
  bool umidOk = aceitarSemSalto(filtroUmid, d.humidity, SALTO_MAX_UMID);
  if (!tempOk || !umidOk) {
    registrarFalha(saude);
    registrarSuspeito(instabilidade, agora);   // conta para o detector de "sensor louco"
    Serial.println("  aviso: salto suspeito, aguardando confirmacao na proxima leitura");
    return;
  }

  // Passou por tudo: agora sim vira o valor oficial da estação
  tempC     = d.temperature;
  umid      = d.humidity;
  registrarSucesso(saude, agora);   // Barreira 3: zera o contador de falhas

  sensorTravado = DETECTAR_VALOR_TRAVADO && valorTravado(travamento, tempC, umid, agora);
}

// ---------- Vento: pulsos contados desde a última leitura ----------
void lerVento(unsigned long agora) {
  uint32_t pulsos = pegarEZerarPulsos();
  unsigned long janela = agora - inicioJanelaVentoMs;   // tempo REAL desde a última contagem
  inicioJanelaVentoMs = agora;

  float v = ventoDePulsos(pulsos, janela);
  ventoOk = ventoValido(v);
  if (ventoOk) ventoMs = v;

  if (!ventoOk && !haviaErroVento) alertar("ALERTA", "anemometro com leitura impossivel. Usando vento 0 (pior caso).");
  if (ventoOk && haviaErroVento)   alertar("OK", "anemometro voltou ao normal");
  haviaErroVento = !ventoOk;
}

// ---------- Luz: LDR -> lux -> radiação no corpo (Q) ----------
void lerLuz() {
  ultimoAdcLdr = analogRead(PINO_LDR);
  luzOk = ldrValido(ultimoAdcLdr);
  if (luzOk) {
    luxAtual  = luxDoAdc(ultimoAdcLdr);
    radiacaoQ = radiacaoDeLux(luxAtual);
  }

  if (!luzOk && !haviaErroLuz) alertar("ALERTA", "LDR com leitura impossivel (fio solto ou curto). Usando sol forte (pior caso).");
  if (luzOk && haviaErroLuz)   alertar("OK", "LDR voltou ao normal");
  haviaErroLuz = !luzOk;
}

// ---------- Sensação térmica: junta os 4 valores ----------
// Só existe se o DHT22 tem leitura aceita. Vento ou luz com defeito
// entram como pior caso (ventoSeguro / radiacaoSegura, em defesa.h).
void calcularSensacao() {
  if (isnan(tempC) || isnan(umid)) return;
  sensacaoC = temperaturaAparente(tempC, umid,
                                  ventoSeguro(ventoOk, ventoMs),
                                  radiacaoSegura(luzOk, radiacaoQ));
}

// O dado pode ser usado para DECIDIR (relé, alerta ao público)?
bool dadoConfiavel(unsigned long agora) {
  return leituraConfiavel(saude, agora) && !instabilidade.instavel && !sensorTravado;
}

// ---------- Vigia do sensor: detecta, conserta e avisa ----------
void vigiarSensor(unsigned long agora) {
  bool problema = saude.estado == SENSOR_FALHA || instabilidade.instavel || sensorTravado;

  // Avisa só quando o estado MUDA (sem encher o Serial de mensagens repetidas)
  if (problema && !haviaProblema) {
    const char* motivo = saude.estado == SENSOR_FALHA ? "falhas seguidas"
                       : instabilidade.instavel       ? "valores instaveis"
                                                      : "valor travado";
    char msg[80];
    snprintf(msg, sizeof(msg), "sensor com problema (%s). Iniciando recuperacao.", motivo);
    alertar("ALERTA", msg);
  } else if (!problema && haviaProblema) {
    alertar("OK", "sensor voltou ao normal");
  }
  haviaProblema = problema;

  if (problema) ultimoProblemaMs = agora;

  // 10 min funcionando bem: esquece os reinícios antigos
  if (!problema && reiniciosPorSensor > 0 && (agora - ultimoProblemaMs) >= ESTAVEL_PARA_ZERAR_MS) {
    reiniciosPorSensor = 0;
    Serial.println("  sensor estavel ha 10 min: contador de reinicios zerado");
  }

  AcaoRecuperacao acao = decidirRecuperacao(recuperacao, problema, agora, reiniciosPorSensor);
  if (acao == ACAO_NENHUMA) return;

  Serial.printf("  vigia: %s\n", textoAcao(acao));
  switch (acao) {
    case ACAO_REINICIAR_LEITURA:
      dht.setup(PINO_DHT, DHTesp::DHT22);
      break;
    case ACAO_RELIGAR_SENSOR:
      desligarSensorPorUmInstante(agora);
      break;
    case ACAO_REINICIAR_ESP32:
      reiniciosPorSensor++;
      marcaReinicioDoVigia = MARCA_VIGIA;
      alertar("ALERTA", "reiniciando o ESP32 para recuperar o sensor");
      Serial.flush();
      esp_restart();
      break;
    case ACAO_ENTRAR_MANUTENCAO:
      alertar("MANUTENCAO", "sensor nao se recuperou. Precisa de tecnico. Tentando religar a cada 10 min.");
      break;
    default:
      break;
  }
}

// ---------- Risco e relé: a decisão tomada NA BORDA ----------
// O ESP32 decide sozinho, sem esperar a nuvem: se a internet cair,
// o nebulizador continua funcionando (critério do Edge: "atuador com
// lógica processada na borda").
void decidirRiscoERele(unsigned long agora) {
  bool podeDecidir = !modoSeguro && dadoConfiavel(agora);

  NivelRisco antes = nivelAtual;
  nivelAtual = podeDecidir ? nivelComHisterese(nivelAtual, sensacaoC, limites, HISTERESE_NIVEL_C)
                           : RISCO_SEM_DADO;
  if (nivelAtual != antes) Serial.printf("  risco: %s -> %s\n", textoNivel(antes), textoNivel(nivelAtual));

  bool estavaLigado     = rele.ligado;
  bool estavaManutencao = rele.manutencao;
  bool ligar = atualizarRele(rele, sensacaoC, podeDecidir, limites.laranja, agora);
  digitalWrite(PINO_RELE, ligar ? HIGH : LOW);
  if (ligar != estavaLigado) {
    Serial.printf("  rele %s (%s)\n", ligar ? "LIGADO" : "DESLIGADO", textoMotivoRele(rele.motivo));
  }
  if (estavaManutencao && !rele.manutencao) {
    Serial.println(">> Manutencao: o tempo acabou, o rele volta ao automatico");
  }
}

// ---------- Botão de manutenção: confere o aperto e aplica na hora ----------
void cuidarDoBotao() {
  bool emLow = digitalRead(PINO_BOTAO) == LOW;   // LOW = apertado (pull-up)
  // O millis() é lido DENTRO da trava: assim a interrupção não consegue
  // anotar uma borda "do futuro" entre a leitura do relógio e a conta.
  portENTER_CRITICAL(&travaBotao);
  unsigned long agora = millis();
  bool apertou = confirmarAperto(botao, agora, emLow, DEBOUNCE_BOTAO_MS);
  portEXIT_CRITICAL(&travaBotao);
  if (!apertou) return;

  if (alternarManutencao(rele, agora)) {
    Serial.printf(">> Botao: MANUTENCAO por %lu min, nebulizador desligado (aperte de novo para sair)\n",
                  MANUTENCAO_MS / 60000UL);
  } else {
    Serial.println(">> Botao: fim da manutencao, o rele volta ao automatico");
  }
  decidirRiscoERele(agora);   // aplica agora, sem esperar o próximo ciclo de 2 s
}

// Roda a cada volta do loop (e não só a cada 2 s) para o pisca ficar regular.
void atualizarLeds(unsigned long agora) {
  bool fase = (agora / PISCA_MS) % 2 == 0;
  digitalWrite(PINO_LED_VERDE,    ledDeveAcender(nivelAtual, RISCO_VERDE,    fase) ? HIGH : LOW);
  digitalWrite(PINO_LED_AMARELO,  ledDeveAcender(nivelAtual, RISCO_AMARELO,  fase) ? HIGH : LOW);
  digitalWrite(PINO_LED_LARANJA,  ledDeveAcender(nivelAtual, RISCO_LARANJA,  fase) ? HIGH : LOW);
  digitalWrite(PINO_LED_VERMELHO, ledDeveAcender(nivelAtual, RISCO_VERMELHO, fase) ? HIGH : LOW);
  digitalWrite(PINO_LED_ROXO,     ledDeveAcender(nivelAtual, RISCO_ROXO,     fase) ? HIGH : LOW);
}

// O problema mais grave, em texto curto para a linha 2 do LCD.
const char* problemaCurto(unsigned long agora) {
  if (modoSeguro)                   return "MODO SEGURO";
  if (recuperacao.emManutencao)     return "MANUTENCAO SENSOR";
  if (saude.estado == SENSOR_FALHA) return "SENSOR EM FALHA";
  if (instabilidade.instavel)       return "SENSOR INSTAVEL";
  if (sensorTravado)                return "SENSOR TRAVADO";
  if (!dadoConfiavel(agora))        return "AGUARDANDO SENSOR";
  if (!ventoOk)                     return "VENTO ERRO: usa 0";
  if (!luzOk)                       return "LDR ERRO: usa sol";
  return nullptr;
}

// Hora (0 a 23), minuto e dia da semana (0 = domingo) pelo relógio da
// internet (NTP), ou -1 em todos se ainda não sincronizou.
// O 0 no getLocalTime = não espera: nunca trava o loop.
void relogioLocal(int& hora, int& minuto, int& dia) {
  struct tm agoraTm;
  if (!getLocalTime(&agoraTm, 0)) { hora = -1; minuto = -1; dia = -1; return; }
  hora   = agoraTm.tm_hour;
  minuto = agoraTm.tm_min;
  dia    = agoraTm.tm_wday;
}

// Só reescreve a linha que mudou: o I2C é lento (~1 ms por letra)
// Grava os 8 desenhos (á Á ç ã â é í ú) nas gavetas do LCD (acentos.h).
// A gaveta é o código & 7: o código 8 cai na gaveta 0.
void carregarAcentos(LiquidCrystal_I2C& tela) {
  for (const Acento& a : ACENTOS) {
    uint8_t desenho[8];
    memcpy(desenho, a.desenho, sizeof(desenho));   // a biblioteca pede um vetor que não seja const
    tela.createChar(a.codigo & 7, desenho);
  }
}

// Escreve um texto com acento (UTF-8) no ponto atual do cursor.
void escreverComAcento(LiquidCrystal_I2C& tela, const char* texto) {
  char lcdTexto[LCD_COLUNAS + 1];
  paraLcd(lcdTexto, sizeof(lcdTexto), texto);
  tela.print(lcdTexto);
}

void escreverLcd(LiquidCrystal_I2C& tela, char linhas[LCD_LINHAS][LCD_COLUNAS + 1],
                 char anterior[LCD_LINHAS][LCD_COLUNAS + 1]) {
  for (int i = 0; i < LCD_LINHAS; i++) {
    if (strcmp(linhas[i], anterior[i]) != 0) {
      tela.setCursor(0, i);
      tela.print(linhas[i]);
      strcpy(anterior[i], linhas[i]);
    }
  }
}

void atualizarDisplay(unsigned long agora) {
  int hora, minuto, dia;
  relogioLocal(hora, minuto, dia);
  DadosTela d;
  d.hora       = hora;
  d.minuto     = minuto;
  // Do LARANJA para cima, o refrigerado aberto ganha da sombra, mesmo
  // mais longe (entrevista com o grupo de risco: ver config.h).
  d.refugio    = refugioMaisPerto(REFUGIOS, NUM_REFUGIOS, hora, dia, deveIndicarRefrigerado(nivelAtual));
  // Dia ou noite: relógio (NTP) + posição do sol; sem relógio, o LDR.
  // hora >= 0 quer dizer que o NTP já sincronizou (ver relogioLocal).
  d.noite      = periodoDoDia(hora >= 0, (double)time(nullptr), LAT_ESTACAO, LON_ESTACAO,
                              luzOk, luxAtual, LUX_NOITE) == PERIODO_NOITE;
  d.ta         = sensacaoC;
  d.nivel      = nivelAtual;
  d.temp       = tempC;
  d.umid       = umid;
  d.vento      = ventoMs;
  d.ventoOk    = ventoOk;
  d.lux        = luxAtual;
  d.q          = radiacaoQ;
  d.luzOk      = luzOk;
  d.problema   = problemaCurto(agora);
  d.releLigado = rele.ligado;
  d.releMotivo = rele.motivo;
  d.releHaMs   = agora - rele.mudouEmMs;
  d.estacao    = ID_ESTACAO;
  d.wifiOk     = wifiOk;
  d.mqttOk     = mqttOk;

  char linhas[LCD_LINHAS][LCD_COLUNAS + 1];
  montarTela(d, linhas);              // LCD 1: medição
  escreverLcd(lcd, linhas, telaAnterior);
  montarTelaOrientacao(d, linhas);    // LCD 2: orientação
  escreverLcd(lcd2, linhas, telaAnterior2);
}

// ---------- Limites guardados na flash (NVS) ----------
// Analogia: anotar no caderno em vez de guardar de cabeça. Se a
// placa reiniciar, os limites mandados pela nuvem continuam valendo.
// A "gaveta" mudou de nome ("forno" -> "forno5") quando a régua passou
// a ter 5 níveis: uma placa que guardou a régua antiga (27/32/41)
// começa com a nova, em vez de misturar as duas.
#define GAVETA_LIMITES "forno5"

void carregarLimites() {
  memoria.begin(GAVETA_LIMITES, false);
  LimitesRisco salvo;
  salvo.amarelo  = memoria.getFloat("amarelo",  LIMITE_AMARELO_C);
  salvo.laranja  = memoria.getFloat("laranja",  LIMITE_LARANJA_C);
  salvo.vermelho = memoria.getFloat("vermelho", LIMITE_VERMELHO_C);
  salvo.roxo     = memoria.getFloat("roxo",     LIMITE_ROXO_C);
  memoria.end();
  if (limitesValidos(salvo)) limites = salvo;   // memória estranha? fica com o padrão
  Serial.printf("Limites de risco: amarelo %.1f | laranja %.1f | vermelho %.1f | roxo %.1f C\n",
                limites.amarelo, limites.laranja, limites.vermelho, limites.roxo);
}

void salvarLimites() {
  memoria.begin(GAVETA_LIMITES, false);
  memoria.putFloat("amarelo",  limites.amarelo);
  memoria.putFloat("laranja",  limites.laranja);
  memoria.putFloat("vermelho", limites.vermelho);
  memoria.putFloat("roxo",     limites.roxo);
  memoria.end();
}

// ---------- Comando que chega pelo field8 ----------
void registrarComando(const char* texto, const char* resultado) {
  snprintf(ultimoComando, sizeof(ultimoComando), "%s %s", texto, resultado);
  Serial.printf("[CONFIG][%s] %s\n", ID_ESTACAO, ultimoComando);
}

// Chamada pelo mqtt.loop() quando chega mensagem num tópico assinado.
// Nada aqui é aplicado sem passar pela validação do nuvem.h.
void aoReceberMqtt(char* topico, byte* dados, unsigned int tamanho) {
  if (strcmp(topico, TOPICO_COMANDO) != 0) return;
  Comando c = interpretarComando((const char*)dados, tamanho);
  if (c.tipo == CMD_NADA) return;                     // atualização vazia do canal

  char texto[CONFIG_MAX_TAMANHO + 1];                  // cópia "imprimível" só para o registro
  unsigned int n = tamanho < CONFIG_MAX_TAMANHO ? tamanho : CONFIG_MAX_TAMANHO;
  for (unsigned int i = 0; i < n; i++) texto[i] = isprint(dados[i]) ? (char)dados[i] : '?';
  texto[n] = '\0';

  unsigned long agora = millis();
  if (!frequenciaOk(freqComandos, agora)) { registrarComando(texto, "REJEITADO: muitos comandos seguidos"); return; }
  if (c.tipo == CMD_INVALIDO) {
    char motivo[56];
    snprintf(motivo, sizeof(motivo), "REJEITADO: %s", c.erro);
    registrarComando(texto, motivo);
    return;
  }
  if (c.tipo == CMD_LIMITES) {
    limites = c.limites;
    salvarLimites();
  } else {
    definirModoRele(rele, c.modo, agora);
  }
  registrarComando(texto, "OK");
}

// ---------- WiFi e MQTT: conecta e reconecta SEM travar o loop ----------
void iniciarRede() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false);   // quem decide quando tentar de novo é o nosso backoff
  mqtt.setServer(MQTT_SERVIDOR, MQTT_PORTA);
  mqtt.setCallback(aoReceberMqtt);
  mqtt.setBufferSize(MQTT_TAMANHO_BUFFER);
  mqtt.setSocketTimeout(3);       // segundos: a conexão nunca chega perto dos 8 s do watchdog
  mqtt.setKeepAlive(30);
}

void avisarMudancaDeRede() {
  if (wifiOk != wifiEstavaOk) {
    if (wifiOk) {
      alertar("OK", "WiFi conectado");
      // Pede a hora à internet (roda por trás, sem travar). Serve para
      // saber se o shopping está aberto antes de indicar ele no LCD.
      configTime(FUSO_HORARIO_S, 0, NTP_SERVIDOR);
    }
    else        alertar("ALERTA", "WiFi caiu. Reconectando com espera crescente.");
  }
  if (mqttOk != mqttEstavaOk) {
    if (mqttOk) alertar("OK", "MQTT conectado ao ThingSpeak");
    else        alertar("ALERTA", "MQTT desconectado. Os dados ficam so no display ate voltar.");
  }
  wifiEstavaOk = wifiOk;
  mqttEstavaOk = mqttOk;
}

void cuidarDaRede(unsigned long agora) {
  if (redeDerrubada) {                                   // simulação do comando 'd'
    if ((long)(agora - redeVoltaEmMs) < 0) {
      wifiOk = false;
      mqttOk = false;
      avisarMudancaDeRede();
      return;
    }
    redeDerrubada = false;
    Serial.println(">> Fim da queda simulada: reconectando");
  }

  wifiOk = WiFi.status() == WL_CONNECTED;
  if (!wifiOk) {
    mqttOk = false;
    if (backoffPodeTentar(backoffWifi, agora)) {
      backoffTentou(backoffWifi, agora, WIFI_ESPERA_MIN_MS, REDE_ESPERA_MAX_MS);
      Serial.printf("  WiFi: tentando conectar (se nao der, tenta de novo em %lu s)\n", backoffWifi.esperaMs / 1000);
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, "", WIFI_CANAL);   // não bloqueia: a conexão acontece "por trás"
    }
  } else {
    backoffConectou(backoffWifi);
    if (mqttDerrubado) {                        // simulação do comando 'm'
      if ((long)(agora - mqttVoltaEmMs) < 0) {
        mqttOk = false;
        avisarMudancaDeRede();
        return;
      }
      mqttDerrubado = false;
      Serial.println(">> Fim da queda simulada do MQTT: reconectando");
    }
    if (mqtt.connected()) {
      mqtt.loop();                              // recebe os comandos e mantém a conexão viva
    } else if (mqttOk) {
      // Caiu agora: registra a queda ANTES de tentar de novo. Sem isso, uma
      // reconexão imediata esconderia a queda do Serial, do LCD e do status.
      mqttOk = false;
      avisarMudancaDeRede();
    } else if (backoffPodeTentar(backoffMqtt, agora)) {
      backoffTentou(backoffMqtt, agora, MQTT_ESPERA_MIN_MS, REDE_ESPERA_MAX_MS);
      esp_task_wdt_reset();                     // a conexão pode levar alguns segundos
      if (mqtt.connect(SECRET_MQTT_CLIENT_ID, SECRET_MQTT_USUARIO, SECRET_MQTT_SENHA)) {
        backoffConectou(backoffMqtt);
        mqtt.subscribe(TOPICO_COMANDO);
      } else {
        Serial.printf("  MQTT: falhou (codigo %d). Tenta de novo em %lu s\n",
                      mqtt.state(), backoffMqtt.esperaMs / 1000);
      }
      esp_task_wdt_reset();
    }
    mqttOk = mqtt.connected();
  }
  avisarMudancaDeRede();
}

// ---------- Publica no ThingSpeak (a cada 20 s, logo depois de uma leitura) ----------
void publicar(unsigned long agora) {
  if (!mqttOk || (long)(agora - proximaPublicacaoMs) < 0) return;
  proximaPublicacaoMs = agora + PUBLICAR_A_CADA_MS;

  // Dado não confiável NÃO vai para a nuvem: o campo fica vazio
  bool confiavel = !modoSeguro && dadoConfiavel(agora);
  Leitura l;
  if (confiavel) { l.temp = tempC; l.umid = umid; l.ta = sensacaoC; }
  if (ventoOk)   l.vento = ventoMs;
  if (luzOk)     l.lux = luxAtual;
  l.nivel      = nivelAtual;
  l.releLigado = rele.ligado;

  char status[200];
  snprintf(status, sizeof(status), "%s | cmd: %s | lim %.1f/%.1f/%.1f/%.1f | rele %s%s",
           ultimoAlerta, ultimoComando, limites.amarelo, limites.laranja, limites.vermelho, limites.roxo,
           textoModoRele(rele.modo), rele.manutencao ? " (manutencao)" : "");
  l.status = status;

  char msg[MQTT_TAMANHO_BUFFER - 64];   // sobra espaço para o tópico e o cabeçalho do MQTT
  if (!montarMensagem(l, msg, sizeof(msg))) Serial.println("  aviso: mensagem cortada");
  bool ok = mqtt.publish(TOPICO_PUBLICAR, msg);
  Serial.printf("  MQTT: %s -> %s\n", ok ? "publicado" : "FALHOU ao publicar", msg);
}

void imprimirStatus(unsigned long agora) {
  const char* extra = modoSeguro ? " | MODO SEGURO"
                    : recuperacao.emManutencao ? " | MANUTENCAO" : "";
  char textoVento[24];
  char textoLuz[40];
  if (ventoOk) snprintf(textoVento, sizeof(textoVento), "%.1f m/s", ventoMs);
  else         snprintf(textoVento, sizeof(textoVento), "ERRO (usa 0)");
  if (luzOk)   snprintf(textoLuz, sizeof(textoLuz), "%.0f lux (Q=%.0f W/m2)", luxAtual, radiacaoQ);
  else         snprintf(textoLuz, sizeof(textoLuz), "ERRO adc=%d (usa Q=%.0f)", ultimoAdcLdr, Q_PIOR_CASO);

  if (dadoConfiavel(agora)) {
    Serial.printf("[%s] T=%.1f C  UR=%.0f%%  Vento=%s  Luz=%s  Sensacao=%.1f C | risco=%s rele=%s(%s) | sensor=%s | ativo ha %lus%s\n",
                  ID_ESTACAO, tempC, umid, textoVento, textoLuz, sensacaoC,
                  textoNivel(nivelAtual), rele.ligado ? "ON" : "OFF", textoMotivoRele(rele.motivo),
                  textoEstado(saude.estado), agora / 1000, extra);
  } else {
    Serial.printf("[%s] SEM LEITURA CONFIAVEL | Vento=%s  Luz=%s | risco=%s rele=%s(%s) | sensor=%s (falhas seguidas: %u) | ativo ha %lus%s\n",
                  ID_ESTACAO, textoVento, textoLuz,
                  textoNivel(nivelAtual), rele.ligado ? "ON" : "OFF", textoMotivoRele(rele.motivo),
                  textoEstado(saude.estado), saude.falhasSeguidas,
                  agora / 1000, extra);
  }
}

// ---------- setup: roda uma vez ao ligar ----------
void setup() {
  // FAIL-SAFE primeiro de tudo: o relé nasce DESLIGADO, antes de
  // qualquer outra coisa (até do autoteste), para nunca ligar sozinho.
  pinMode(PINO_RELE, OUTPUT);
  digitalWrite(PINO_RELE, LOW);
  pinMode(PINO_LED_VERDE, OUTPUT);
  pinMode(PINO_LED_AMARELO, OUTPUT);
  pinMode(PINO_LED_LARANJA, OUTPUT);
  pinMode(PINO_LED_VERMELHO, OUTPUT);
  pinMode(PINO_LED_ROXO, OUTPUT);

  Serial.begin(115200);

  Wire.begin();
  lcd.init();
  lcd.backlight();
  carregarAcentos(lcd);    // antes do setCursor: o createChar mexe no ponteiro de escrita do LCD
  lcd.setCursor(0, 0);
  lcd.print("Forno Alegre ");
  lcd.print(ID_ESTACAO);
  lcd.setCursor(0, 1);
  lcd.print("Autoteste...");
  lcd2.init();
  lcd2.backlight();
  carregarAcentos(lcd2);
  lcd2.setCursor(0, 0);
  escreverComAcento(lcd2, "Orientação ");
  lcd2.print(ID_ESTACAO);
  lcd2.setCursor(0, 1);
  lcd2.print("Aguarde...");

  esp_reset_reason_t motivo = esp_reset_reason();
  bool foiOVigia = (marcaReinicioDoVigia == MARCA_VIGIA);
  marcaReinicioDoVigia = 0;
  if (motivo == ESP_RST_POWERON) {   // energia nova: a memória RTC tem lixo, então zera
    contadorReinicios  = 0;
    reiniciosPorSensor = 0;
    foiOVigia = false;
  } else {
    contadorReinicios++;
  }

  Serial.println();
  Serial.printf("=== Forno Alegre | estacao %s (%s) ===\n", ID_ESTACAO, NOME_ESTACAO);
  Serial.printf("Ultimo reinicio: %s | reinicios desde que ligou: %lu\n",
                foiOVigia ? "VIGIA: recuperacao do sensor" : textoMotivoReinicio(motivo),
                (unsigned long)contadorReinicios);
  if (reiniciosPorSensor > 0) {
    Serial.printf("Reinicios causados pelo sensor: %lu de %lu permitidos\n",
                  (unsigned long)reiniciosPorSensor, (unsigned long)MAX_REINICIOS_POR_SENSOR);
  }

  iniciarWatchdog();

  modoSeguro = !rodarAutoteste();
  lcd.setCursor(0, 1);
  lcd.print(modoSeguro ? "Autoteste FALHOU    " : "Autoteste OK        ");
  if (modoSeguro) {
    alertar("ALERTA", "MODO SEGURO: o autoteste falhou. Os atuadores ficam desligados.");
  }

  pinMode(PINO_ENERGIA_DHT, OUTPUT);
  ligarSensor(millis());

  // Anemômetro: a chave liga o pino ao GND; o pull-up interno segura o
  // HIGH quando ela abre. FALLING = conta quando a linha CAI (a chave fecha).
  pinMode(PINO_ANEMOMETRO, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PINO_ANEMOMETRO), aoPulsoDoAnemometro, FALLING);
  inicioJanelaVentoMs = millis();

  // Botão de manutenção: mesma ideia do anemômetro (contato para o GND +
  // pull-up interno); FALLING = a borda de quando ele é apertado.
  pinMode(PINO_BOTAO, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PINO_BOTAO), aoApertarBotao, FALLING);

  analogReadResolution(12);   // 0 a 4095 (ADC_MAX)
  randomSeed(micros());   // só para a simulação de "sensor louco"

  carregarLimites();
  iniciarRede();

  Serial.println("Comandos no Serial: w = travar programa | f = sensor em falha | x = sensor louco | n = normal");
  Serial.println("                    d = derrubar o WiFi por 30 s | m = derrubar o MQTT por 30 s");
  Serial.println("Botao MANUTENCAO (GPIO 13): desliga o nebulizador por 2 min; aperte de novo para sair");

  // O primeiro ciclo vem 2 s depois do FIM do setup (e não 2 s depois de
  // ligar): o autoteste e o LCD levam quase 2 s, e a primeira janela do
  // vento ficaria com poucos ms, o que transformaria 1 pulso em "vento de
  // 60 m/s" e daria um falso alerta.
  inicioJanelaVentoMs = millis();
  proximoCicloMs      = inicioJanelaVentoMs + INTERVALO_LEITURA_MS;
}

// ---------- loop: roda para sempre, sem nunca bloquear ----------
void loop() {
  esp_task_wdt_reset();          // "estou vivo": alimenta o watchdog

  unsigned long agora = millis();
  verificarComandosSerial(agora);
  cuidarDoBotao();
  cuidarDaEnergiaDoSensor(agora);
  atualizarLeds(agora);
  cuidarDaRede(agora);

  // (long)(agora - proximo) >= 0 funciona mesmo quando o millis() dá a volta
  if ((long)(agora - proximoCicloMs) >= 0) {
    // Agenda pelo relógio, não pelo "agora": o ritmo fica exato em 2 s
    // e não vai atrasando um pouquinho a cada leitura.
    proximoCicloMs += INTERVALO_LEITURA_MS;
    if ((long)(agora - proximoCicloMs) >= 0) {
      proximoCicloMs = agora + INTERVALO_LEITURA_MS;   // atrasou demais: ressincroniza
    }

    atualizarJanela(instabilidade, agora);
    lerVento(agora);   // vento e luz não dependem do DHT22: são lidos sempre
    lerLuz();
    if (sensorPronto(agora)) {
      lerSensor(agora);
    } else {
      Serial.println("  sensor desligado ou aquecendo, leitura pulada");
    }
    calcularSensacao();
    vigiarSensor(agora);
    decidirRiscoERele(agora);
    imprimirStatus(agora);
    atualizarDisplay(agora);
    publicar(agora);
  }
}
