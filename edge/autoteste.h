#pragma once
// ============================================================
// autoteste.h — testes que rodam no próprio ESP32 a cada boot.
// Analogia: é o "check-list do piloto" antes de decolar. Se um
// item falhar, o avião não decola: a estação entra em MODO SEGURO.
//
// Os valores esperados foram calculados à parte, em Python, com a
// mesma fórmula (conferência independente).
// ============================================================

#include <Arduino.h>
#include <math.h>
#include "config.h"
#include "sensacao.h"
#include "conversao.h"
#include "defesa.h"
#include "vigia.h"
#include "risco.h"
#include "rele.h"
#include "display.h"
#include "rede.h"
#include "nuvem.h"
#include <string.h>

struct Placar {
  int passou = 0;
  int falhou = 0;
};

inline void verificar(Placar& p, bool condicao, const char* nome) {
  if (condicao) { p.passou++; Serial.printf("  [PASSOU] %s\n", nome); }
  else          { p.falhou++; Serial.printf("  [FALHOU] %s\n", nome); }
}

inline bool perto(float a, float b, float tolerancia) {
  return fabsf(a - b) <= tolerancia;
}

// Devolve true se TUDO passou.
inline bool rodarAutoteste() {
  Placar p;
  Serial.println("== Autoteste ==");

  // --- Física da sensação térmica ---
  verificar(p, perto(pressaoVapor(30, 100), 42.29f, 0.05f),        "pressão de vapor a 30 °C e 100% ≈ 42,29 hPa");
  verificar(p, perto(temperaturaAparente(30, 50, 0, 0), 33.11f, 0.05f),   "TA a 30 °C, 50%, sombra e sem vento ≈ 33,11 °C");
  verificar(p, perto(temperaturaAparente(30, 50, 0, 0), 32.98f, 0.20f),   "sem sol, fica a menos de 0,2 °C da versão de sombra");
  verificar(p, perto(temperaturaAparente(30, 50, 2, 0), 31.71f, 0.05f),   "vento de 2 m/s baixa a TA em 1,4 °C");
  verificar(p, perto(temperaturaAparente(30, 50, 0, 100), 40.11f, 0.05f), "sol forte (Q=100) sem vento soma 7 °C");
  verificar(p, temperaturaAparente(30, 50, 5, 100) - temperaturaAparente(30, 50, 5, 0) < 5.0f,
            "com vento de 5 m/s, o mesmo sol soma menos (≈ 4,7 °C)");
  verificar(p, temperaturaAparente(20, 40, 0, 0) < 20.0f,                 "ar seco e ameno parece mais fresco que o termômetro");

  // --- Conversões: anemômetro e LDR ---
  verificar(p, perto(ventoDePulsos(3, 2000), 1.0f, 0.01f), "3 pulsos em 2 s = 1,0 m/s (2,4 km/h por pulso/s)");
  verificar(p, ventoDePulsos(0, 2000) == 0.0f,             "nenhum pulso = sem vento");
  verificar(p, isnan(ventoDePulsos(5, 0)),                 "janela de tempo zero não divide por zero");
  verificar(p, perto(luxDoAdc(3412), 10.0f, 0.1f),         "ADC 3412 = 10 lux (LDR com 50 kΩ)");
  verificar(p, luxDoAdc(32) > 90000.0f,                    "ADC 32 = sol forte (~100.000 lux)");
  verificar(p, perto(radiacaoDeLux(100000), 100.0f, 0.5f), "100.000 lux = Q de 100 W/m²");
  verificar(p, radiacaoDeLux(0) == 0.0f && radiacaoDeLux(NAN) == 0.0f, "escuro (ou NaN) = sem sol");
  verificar(p, perto(radiacaoDeLux(1e9f), radiacaoDeLux(LUX_MAX), 0.01f), "luz absurda é cortada no máximo");

  // --- Barreira 1 do anemômetro e do LDR ---
  verificar(p,  ventoValido(10),                       "vento de 10 m/s é aceito");
  verificar(p, !ventoValido(60) && !ventoValido(-1),   "vento acima de 180 km/h ou negativo é rejeitado");
  verificar(p, !ventoValido(NAN),                      "vento NaN é rejeitado");
  verificar(p,  ldrValido(2048),                       "LDR no meio da faixa é aceito");
  verificar(p, !ldrValido(0) && !ldrValido(ADC_MAX),   "LDR grudado no 0 ou no máximo = fio solto ou curto");
  verificar(p, ventoSeguro(false, 8) == 0.0f,          "vento com defeito vira 0 (pior caso)");
  verificar(p, radiacaoSegura(false, 10) == Q_PIOR_CASO, "LDR com defeito vira sol forte (pior caso)");

  // --- Barreira 1: faixa física ---
  verificar(p,  leituraValida(25, 50),  "leitura normal é aceita");
  verificar(p, !leituraValida(NAN, 50), "NaN (fio solto) é rejeitado");
  verificar(p, !leituraValida(95, 50),  "95 °C (fora da faixa do DHT22) é rejeitado");
  verificar(p, !leituraValida(25, 101), "umidade de 101% é rejeitada");

  // --- Barreira 2: filtro de salto ---
  FiltroSalto f;
  aceitarSemSalto(f, 30, SALTO_MAX_TEMP_C);
  verificar(p,  aceitarSemSalto(f, 32, SALTO_MAX_TEMP_C),   "mudança pequena (30 → 32 °C) é aceita");
  verificar(p, !aceitarSemSalto(f, 47, SALTO_MAX_TEMP_C),   "pulo de 15 °C é segurado");
  verificar(p,  aceitarSemSalto(f, 47.5, SALTO_MAX_TEMP_C), "pulo confirmado na leitura seguinte é aceito");

  // --- Barreira 3: saúde do sensor ---
  SaudeSensor s;
  verificar(p, !leituraConfiavel(s, 0), "sem nenhuma leitura boa, nada é confiável");
  registrarSucesso(s, 1000);
  verificar(p, leituraConfiavel(s, 1500), "leitura boa e recente é confiável");
  registrarFalha(s);
  registrarFalha(s);
  verificar(p, s.estado == SENSOR_SUSPEITO, "2 falhas seguidas = SUSPEITO");
  registrarFalha(s);
  verificar(p, s.estado == SENSOR_FALHA, "3 falhas seguidas = FALHA");
  verificar(p, !leituraConfiavel(s, 1500), "sensor em FALHA não serve para decidir");

  SaudeSensor velho;
  registrarSucesso(velho, 1000);
  verificar(p, !leituraConfiavel(velho, 1000 + IDADE_MAX_LEITURA_MS + 1), "leitura velha não serve para decidir");

  // millis() "dá a volta" depois de ~49 dias: a conta não pode quebrar
  SaudeSensor volta;
  registrarSucesso(volta, 0xFFFFFF00UL);
  verificar(p, leituraConfiavel(volta, 0x00000100UL), "conta do tempo sobrevive à volta do millis()");

  // --- Vigia: sensor instável ---
  DetectorInstavel inst;
  for (unsigned long t = 1000; t <= 7000; t += 2000) registrarSuspeito(inst, t);   // 4 saltos
  verificar(p, !inst.instavel, "4 saltos em 1 min ainda não é instável");
  registrarSuspeito(inst, 9000);                                                  // 5º salto
  verificar(p, inst.instavel, "5 saltos em 1 min = sensor INSTÁVEL");
  atualizarJanela(inst, 9000 + JANELA_INSTABILIDADE_MS + 1);
  verificar(p, !inst.instavel, "passado 1 min calmo, deixa de ser instável");

  // --- Vigia: valor travado ---
  DetectorTravado trav;
  valorTravado(trav, 30, 50, 0);
  verificar(p, !valorTravado(trav, 30, 50, TEMPO_MAX_VALOR_IGUAL_MS - 1), "valor igual por pouco tempo não é travado");
  verificar(p,  valorTravado(trav, 30, 50, TEMPO_MAX_VALOR_IGUAL_MS),     "valor igual por 30 min = TRAVADO");
  verificar(p, !valorTravado(trav, 30.2f, 50, TEMPO_MAX_VALOR_IGUAL_MS + 1), "valor mudou: deixa de ser travado");

  // --- Vigia: escada de recuperação ---
  Recuperacao rec;
  verificar(p, decidirRecuperacao(rec, true, 0, 0) == ACAO_REINICIAR_LEITURA,     "degrau 1: reiniciar a leitura");
  verificar(p, decidirRecuperacao(rec, true, 5000, 0) == ACAO_NENHUMA,            "espera o remédio fazer efeito");
  verificar(p, decidirRecuperacao(rec, true, 10000, 0) == ACAO_RELIGAR_SENSOR,    "degrau 2: desligar e religar o sensor");
  verificar(p, decidirRecuperacao(rec, true, 20000, 0) == ACAO_REINICIAR_ESP32,   "degrau 3: reiniciar o ESP32");
  verificar(p, decidirRecuperacao(rec, false, 21000, 0) == ACAO_NENHUMA && rec.degrau == 0,
            "sensor voltou: a escada zera");

  // --- Vigia: proteção contra loop de reinícios ---
  Recuperacao loopRec;
  decidirRecuperacao(loopRec, true, 0, MAX_REINICIOS_POR_SENSOR);
  decidirRecuperacao(loopRec, true, 10000, MAX_REINICIOS_POR_SENSOR);
  verificar(p, decidirRecuperacao(loopRec, true, 20000, MAX_REINICIOS_POR_SENSOR) == ACAO_ENTRAR_MANUTENCAO,
            "já reiniciou demais: entra em MANUTENÇÃO em vez de reiniciar");
  verificar(p, decidirRecuperacao(loopRec, true, 20000 + ESPERA_MANUTENCAO_MS, MAX_REINICIOS_POR_SENSOR) == ACAO_RELIGAR_SENSOR,
            "em manutenção, tenta religar o sensor a cada 10 min");

  // --- Nível de risco (a cor do LED) ---
  LimitesRisco lim;
  verificar(p, nivelDaSensacao(26.9f, lim) == RISCO_VERDE && nivelDaSensacao(27, lim) == RISCO_AMARELO,
            "27 °C é onde o AMARELO começa");
  verificar(p, nivelDaSensacao(35, lim) == RISCO_LARANJA && nivelDaSensacao(41, lim) == RISCO_VERMELHO,
            "35 °C = LARANJA e 41 °C = VERMELHO");
  verificar(p, nivelDaSensacao(NAN, lim) == RISCO_SEM_DADO, "sem sensação = SEM DADO (nunca verde)");
  verificar(p, nivelComHisterese(RISCO_LARANJA, 31.8f, lim, HISTERESE_NIVEL_C) == RISCO_LARANJA,
            "histerese: 31,8 °C ainda é LARANJA (a folga é 0,5 °C)");
  verificar(p, nivelComHisterese(RISCO_LARANJA, 31.4f, lim, HISTERESE_NIVEL_C) == RISCO_AMARELO,
            "histerese: 31,4 °C já desce para AMARELO");
  verificar(p, nivelComHisterese(RISCO_VERDE, 41.5f, lim, HISTERESE_NIVEL_C) == RISCO_VERMELHO,
            "para subir não há espera: VERDE vai direto a VERMELHO");
  verificar(p, nivelComHisterese(RISCO_VERMELHO, 20, lim, HISTERESE_NIVEL_C) == RISCO_VERDE,
            "esfriou muito: desce vários níveis de uma vez");

  int acesos = 0;
  for (int c = RISCO_VERDE; c <= RISCO_VERMELHO; c++) acesos += ledDeveAcender(RISCO_LARANJA, (NivelRisco)c, true);
  verificar(p, acesos == 1 && ledDeveAcender(RISCO_LARANJA, RISCO_LARANJA, true), "só o LED da cor certa acende");
  verificar(p, ledDeveAcender(RISCO_SEM_DADO, RISCO_AMARELO, true) && !ledDeveAcender(RISCO_SEM_DADO, RISCO_AMARELO, false)
               && !ledDeveAcender(RISCO_SEM_DADO, RISCO_VERDE, true),
            "SEM DADO: o amarelo pisca e o verde nunca acende");

  LimitesRisco foraDeOrdem;  foraDeOrdem.laranja = 45;
  LimitesRisco grudados;     grudados.laranja = 27.5f;
  LimitesRisco comNaN;       comNaN.vermelho = NAN;
  verificar(p, limitesValidos(lim), "limites iniciais (27/32/41) são válidos");
  verificar(p, !limitesValidos(foraDeOrdem) && !limitesValidos(grudados) && !limitesValidos(comNaN),
            "limites fora de ordem, a menos de 1 °C ou NaN são rejeitados");

  // --- Relé: liga só com risco alto SEGUIDO (limite 32 °C) ---
  ControleRele r;
  verificar(p, !atualizarRele(r, 35, true, 32, 0) && r.motivo == RELE_CONFIRMANDO, "risco alto: primeiro confirma");
  verificar(p, !atualizarRele(r, 35, true, 32, CONFIRMAR_RISCO_MS - 1),          "ainda não deu o tempo: desligado");
  verificar(p,  atualizarRele(r, 35, true, 32, CONFIRMAR_RISCO_MS),               "risco alto por 10 s: LIGA");
  verificar(p,  atualizarRele(r, 31, true, 32, 15000) && r.motivo == RELE_LIGADO_CALOR,
            "histerese: 31 °C (acima de 32 − 2) continua ligado");
  verificar(p,  atualizarRele(r, 29, true, 32, 16000) && r.motivo == RELE_LIGADO_ESFRIANDO,
            "esfriou para 29 °C: ainda espera a calma se confirmar");
  verificar(p, !atualizarRele(r, 29, true, 32, 16000 + CONFIRMAR_CALMA_MS), "calma por 20 s: DESLIGA");
  unsigned long desligou = 16000 + CONFIRMAR_CALMA_MS;
  atualizarRele(r, 35, true, 32, desligou + 1000);
  verificar(p, !atualizarRele(r, 35, true, 32, desligou + 1000 + CONFIRMAR_RISCO_MS) && r.motivo == RELE_DESCANSO,
            "calor voltou, mas respeita o descanso mínimo");
  verificar(p,  atualizarRele(r, 35, true, 32, desligou + RELE_MIN_DESLIGADO_MS), "acabou o descanso: religa");
  verificar(p, !atualizarRele(r, 35, false, 32, desligou + RELE_MIN_DESLIGADO_MS + 2000) && r.motivo == RELE_BLOQUEADO,
            "fail-safe: sem dado confiável, desliga NA HORA");

  ControleRele pico;
  atualizarRele(pico, 35, true, 32, 0);
  atualizarRele(pico, 30, true, 32, 4000);   // o pico passou: a contagem zera
  atualizarRele(pico, 35, true, 32, 6000);   // novo pico: conta de novo a partir daqui
  verificar(p, !atualizarRele(pico, 35, true, 32, 14000), "pico curto não liga: a contagem recomeça");

  ControleRele maximo;
  atualizarRele(maximo, 45, true, 32, 0);
  atualizarRele(maximo, 45, true, 32, CONFIRMAR_RISCO_MS);
  verificar(p, !atualizarRele(maximo, 45, true, 32, CONFIRMAR_RISCO_MS + RELE_MAX_LIGADO_MS) && maximo.motivo == RELE_DESCANSO,
            "tempo máximo ligado: desliga e descansa, mesmo com calor");

  // --- Display: 4 linhas de 20 caracteres ---
  char tela[LCD_LINHAS][LCD_COLUNAS + 1];
  DadosTela dt;
  dt.ta = 34.6f;  dt.nivel = RISCO_LARANJA;  dt.temp = 30.2f;  dt.umid = 50;  dt.vento = 2;  dt.ventoOk = true;
  dt.releLigado = true;  dt.releHaMs = 135000;  dt.estacao = "E1";
  montarTela(dt, tela);
  bool todas20 = true;
  for (int i = 0; i < LCD_LINHAS; i++) todas20 = todas20 && strlen(tela[i]) == LCD_COLUNAS;
  verificar(p, todas20, "display: as 4 linhas têm exatamente 20 caracteres");
  verificar(p, strstr(tela[0], "34.6") && strstr(tela[0], "LARANJA"), "display: linha 1 mostra a sensação e o nível");
  verificar(p, strstr(tela[2], "LIGADO") && strstr(tela[2], "02:15"), "display: relé ligado há 135 s = 02:15");
  verificar(p, strstr(tela[3], "WiFi:--") && strstr(tela[3], "MQTT:--"), "display: sem rede mostra --");

  DadosTela ruim;
  ruim.problema = "SENSOR EM FALHA";  ruim.releMotivo = RELE_BLOQUEADO;  ruim.estacao = "E1";
  ruim.temp = -40;  ruim.umid = 100;  ruim.vento = 50;  ruim.ventoOk = true;
  montarTela(ruim, tela);
  verificar(p, strstr(tela[0], "SEM DADO") && strstr(tela[1], "SENSOR EM FALHA") && strstr(tela[2], "falha"),
            "display: sensor em falha aparece na tela e o relé fica bloqueado");
  ruim.problema = nullptr;
  montarTela(ruim, tela);
  verificar(p, strlen(tela[1]) == LCD_COLUNAS, "display: valores extremos não estouram a linha");

  // --- Extremos do RS: TA acima de 50 e abaixo de zero ---
  LimitesRisco padrao;
  float taCalorao = temperaturaAparente(40, 60, 0, 100);   // 40 °C, 60%, sem vento, sol forte
  float taMinuano = temperaturaAparente(2, 80, 8, 0);      // 2 °C, 80%, vento de 8 m/s, sem sol
  verificar(p, perto(taCalorao, 58.09f, 0.05f) && nivelDaSensacao(taCalorao, padrao) == RISCO_VERMELHO,
            "40 °C, 60% e sol forte: TA ≈ 58,1 °C (passa de 50), VERMELHO");
  verificar(p, perto(taMinuano, -5.89f, 0.05f), "2 °C, 80% e vento de 8 m/s: TA ≈ −5,9 °C (negativa)");
  DadosTela extremo;
  extremo.estacao = "E1";  extremo.temp = 2;  extremo.umid = 80;  extremo.vento = 8;  extremo.ventoOk = true;
  extremo.ta = taMinuano;  extremo.nivel = nivelDaSensacao(taMinuano, padrao);
  montarTela(extremo, tela);
  verificar(p, strstr(tela[0], "-5.9") && strstr(tela[0], "FRIO") && !strstr(tela[0], "VERDE")
               && strlen(tela[0]) == LCD_COLUNAS, "display: TA negativa mostra FRIO, e não VERDE");
  ControleRele noFrio;
  bool releFicouDesligado = true;
  for (unsigned long t = 0; t <= 60000; t += 2000)
    releFicouDesligado &= !atualizarRele(noFrio, taMinuano, true, padrao.laranja, t);
  verificar(p, releFicouDesligado, "no frio, o relé (nebulizador) nunca liga");
  extremo.ta = taCalorao;  extremo.nivel = RISCO_VERMELHO;
  montarTela(extremo, tela);
  verificar(p, strstr(tela[0], "58.1") && strstr(tela[0], "VERMELHO") && strlen(tela[0]) == LCD_COLUNAS,
            "display: TA de 58,1 °C cabe na linha");
  extremo.ta = 9.0f;  extremo.nivel = RISCO_VERDE;
  montarTela(extremo, tela);
  verificar(p, strstr(tela[0], "VERDE") != nullptr, "display: exatamente no limite do frio (9 °C) ainda é VERDE");

  // --- Relé: comando remoto (Passo 4) ---
  ControleRele remoto;
  definirModoRele(remoto, MODO_LIGAR, 0);
  verificar(p, atualizarRele(remoto, 25, true, 32, 0) && remoto.motivo == RELE_REMOTO_LIGADO,
            "rele:on liga na hora, mesmo sem calor");
  verificar(p, !atualizarRele(remoto, 25, false, 32, 2000), "fail-safe vence o rele:on: sem dado confiável, desliga");
  ControleRele expira;
  definirModoRele(expira, MODO_LIGAR, 0);
  atualizarRele(expira, 25, true, 32, 0);
  verificar(p, !atualizarRele(expira, 25, true, 32, RELE_MAX_LIGADO_MS) && expira.modo == MODO_AUTO,
            "rele:on volta sozinho ao automático depois do tempo máximo");
  ControleRele manutencao;
  definirModoRele(manutencao, MODO_DESLIGAR, 0);
  bool ficouDesligado = true;
  for (unsigned long t = 0; t <= 60000; t += 2000) ficouDesligado &= !atualizarRele(manutencao, 45, true, 32, t);
  verificar(p, ficouDesligado && manutencao.motivo == RELE_REMOTO_DESLIGADO, "rele:off segura desligado mesmo com 45 °C");
  dt.releMotivo = RELE_REMOTO_LIGADO;
  montarTela(dt, tela);
  verificar(p, strstr(tela[2], "REMOTO") && strlen(tela[2]) == LCD_COLUNAS, "display: relé ligado pela nuvem mostra REMOTO");

  // --- Rede: espera crescente (backoff) ---
  Backoff b;
  verificar(p, backoffPodeTentar(b, 0), "backoff: a primeira tentativa é na hora");
  backoffTentou(b, 0, 5000, 60000);
  verificar(p, !backoffPodeTentar(b, 4999) && backoffPodeTentar(b, 5000), "backoff: depois da 1ª falha, espera 5 s");
  backoffTentou(b, 5000, 5000, 60000);
  verificar(p, b.esperaMs == 10000, "backoff: a espera dobra (10 s)");
  for (int i = 0; i < 6; i++) backoffTentou(b, 0, 5000, 60000);
  verificar(p, b.esperaMs == 60000, "backoff: a espera para em 1 min");
  backoffConectou(b);
  verificar(p, backoffPodeTentar(b, 1) && b.esperaMs == 0, "backoff: conectou, a próxima queda recomeça do início");

  // --- Nuvem: a mensagem publicada ---
  char msg[200];
  Leitura l;
  l.temp = 30;  l.umid = 50;  l.vento = 2;  l.lux = 50064;  l.ta = 34.6f;
  l.nivel = RISCO_LARANJA;  l.releLigado = true;  l.status = "OK";
  verificar(p, montarMensagem(l, msg, sizeof(msg)) &&
               strcmp(msg, "field1=30.0&field2=50&field3=2.0&field4=50064&field5=34.6&field6=2&field7=1&status=OK") == 0,
            "mensagem: os 7 campos e o status no formato do ThingSpeak");
  Leitura semDado;
  montarMensagem(semDado, msg, sizeof(msg));
  verificar(p, strcmp(msg, "field6=4&field7=0") == 0, "mensagem: sem leitura confiável, só vai o risco (4) e o relé");
  semDado.status = "a&b=c";
  montarMensagem(semDado, msg, sizeof(msg));
  verificar(p, strstr(msg, "status=a b:c") != nullptr, "mensagem: '&' e '=' no status não quebram a mensagem");
  char pequeno[12];
  verificar(p, !montarMensagem(l, pequeno, sizeof(pequeno)) && strlen(pequeno) < sizeof(pequeno),
            "mensagem: buffer pequeno não estoura (avisa que não coube)");

  // --- Nuvem: comandos que chegam pelo field8 ---
  Comando c = interpretarComando("lim:28,33,40", 12);
  verificar(p, c.tipo == CMD_LIMITES && c.limites.amarelo == 28 && c.limites.laranja == 33 && c.limites.vermelho == 40,
            "comando lim:28,33,40 é aceito");
  const char* bagunca = " LIM: 28, 33 ,40 ";
  verificar(p, interpretarComando(bagunca, strlen(bagunca)).tipo == CMD_LIMITES, "comando aceita espaços e maiúsculas");
  const char* invalidos[] = {"lim:33,28,40", "lim:28,33", "lim:28,33,40,50", "lim:abc,33,40",
                             "lim:nan,33,40", "lim:5,33,40", "rele:talvez", "apagar:tudo"};
  bool todosRejeitados = true;
  for (const char* x : invalidos) todosRejeitados &= interpretarComando(x, strlen(x)).tipo == CMD_INVALIDO;
  verificar(p, todosRejeitados, "comandos fora de ordem, incompletos, NaN, fora da faixa ou desconhecidos são rejeitados");
  const char* longo = "lim:28.000000000,33.000000000,40.00000000";   // 41 letras
  verificar(p, interpretarComando(longo, strlen(longo)).tipo == CMD_INVALIDO, "mensagem com mais de 40 letras é rejeitada");
  verificar(p, interpretarComando("rele:on", 7).modo == MODO_LIGAR && interpretarComando("RELE:OFF", 8).modo == MODO_DESLIGAR
               && interpretarComando("rele:auto", 9).modo == MODO_AUTO,
            "comandos rele:on, rele:off e rele:auto");
  verificar(p, interpretarComando("rele:onXYZ", 7).modo == MODO_LIGAR, "lê só o tamanho recebido (o MQTT não manda o '\0')");
  verificar(p, interpretarComando("", 0).tipo == CMD_NADA && interpretarComando("null", 4).tipo == CMD_NADA,
            "mensagem vazia (da própria publicação) é ignorada sem erro");
  LimiteFrequencia freq;
  verificar(p, frequenciaOk(freq, 0) && !frequenciaOk(freq, 4999) && frequenciaOk(freq, 5000),
            "no máximo 1 comando a cada 5 s");

  Serial.printf("== Resultado: %d passaram, %d falharam ==\n", p.passou, p.falhou);
  return p.falhou == 0;
}
