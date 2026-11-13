// ============================================================
// Forno Alegre — estação de "calor real"
// Passo 2: a cada 2 s lê o DHT22, o anemômetro e o LDR e calcula a
// Temperatura Aparente (com vento e sol), com watchdog do programa,
// vigia do sensor, defesa da leitura e autoteste no boot.
// Passo 3: LEDs de risco, relé do nebulizador com histerese e
// fail-safe, e LCD 20x4 com o valor, o risco, o relé e a rede.
// ============================================================

#include <Arduino.h>
#include <esp_task_wdt.h>   // watchdog de tarefas do ESP32
#include <esp_system.h>     // motivo do último reinício
#include "DHTesp.h"
#include <Wire.h>                // I2C (SDA 21, SCL 22)
#include <LiquidCrystal_I2C.h>

#include "config.h"
#include "sensacao.h"
#include "conversao.h"
#include "defesa.h"
#include "vigia.h"
#include "risco.h"
#include "rele.h"
#include "display.h"
#include "autoteste.h"

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
LiquidCrystal_I2C lcd(LCD_ENDERECO_I2C, LCD_COLUNAS, LCD_LINHAS);
LimitesRisco limites;                    // no Passo 4, a nuvem pode mudar
NivelRisco   nivelAtual = RISCO_SEM_DADO;
ControleRele rele;
bool wifiOk = false;                     // preenchidos no Passo 4
bool mqttOk = false;
char telaAnterior[LCD_LINHAS][LCD_COLUNAS + 1] = {"", "", "", ""};

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

  bool estavaLigado = rele.ligado;
  bool ligar = atualizarRele(rele, sensacaoC, podeDecidir, limites.laranja, agora);
  digitalWrite(PINO_RELE, ligar ? HIGH : LOW);
  if (ligar != estavaLigado) {
    Serial.printf("  rele %s (%s)\n", ligar ? "LIGADO" : "DESLIGADO", textoMotivoRele(rele.motivo));
  }
}

// Roda a cada volta do loop (e não só a cada 2 s) para o pisca ficar regular.
void atualizarLeds(unsigned long agora) {
  bool fase = (agora / PISCA_MS) % 2 == 0;
  digitalWrite(PINO_LED_VERDE,    ledDeveAcender(nivelAtual, RISCO_VERDE,    fase) ? HIGH : LOW);
  digitalWrite(PINO_LED_AMARELO,  ledDeveAcender(nivelAtual, RISCO_AMARELO,  fase) ? HIGH : LOW);
  digitalWrite(PINO_LED_LARANJA,  ledDeveAcender(nivelAtual, RISCO_LARANJA,  fase) ? HIGH : LOW);
  digitalWrite(PINO_LED_VERMELHO, ledDeveAcender(nivelAtual, RISCO_VERMELHO, fase) ? HIGH : LOW);
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

void atualizarDisplay(unsigned long agora) {
  DadosTela d;
  d.ta         = sensacaoC;
  d.nivel      = nivelAtual;
  d.temp       = tempC;
  d.umid       = umid;
  d.vento      = ventoMs;
  d.ventoOk    = ventoOk;
  d.problema   = problemaCurto(agora);
  d.releLigado = rele.ligado;
  d.releMotivo = rele.motivo;
  d.releHaMs   = agora - rele.mudouEmMs;
  d.estacao    = ID_ESTACAO;
  d.wifiOk     = wifiOk;
  d.mqttOk     = mqttOk;

  char linhas[LCD_LINHAS][LCD_COLUNAS + 1];
  montarTela(d, linhas);
  // Só reescreve a linha que mudou: o I2C é lento (~1 ms por letra)
  for (int i = 0; i < LCD_LINHAS; i++) {
    if (strcmp(linhas[i], telaAnterior[i]) != 0) {
      lcd.setCursor(0, i);
      lcd.print(linhas[i]);
      strcpy(telaAnterior[i], linhas[i]);
    }
  }
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

  Serial.begin(115200);

  Wire.begin();
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Forno Alegre ");
  lcd.print(ID_ESTACAO);
  lcd.setCursor(0, 1);
  lcd.print("Autoteste...");

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

  analogReadResolution(12);   // 0 a 4095 (ADC_MAX)
  randomSeed(micros());   // só para a simulação de "sensor louco"

  Serial.println("Comandos no Serial: w = travar programa | f = sensor em falha | x = sensor louco | n = normal");

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
  cuidarDaEnergiaDoSensor(agora);
  atualizarLeds(agora);

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
  }
}
