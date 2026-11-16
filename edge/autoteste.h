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
#include "sol.h"
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
  verificar(p, nivelDaSensacao(33.9f, lim) == RISCO_AMARELO && nivelDaSensacao(34, lim) == RISCO_LARANJA,
            "33,9 °C ainda é AMARELO e 34 °C é LARANJA (faixas da SMS de POA)");
  verificar(p, nivelDaSensacao(39.9f, lim) == RISCO_LARANJA && nivelDaSensacao(40, lim) == RISCO_VERMELHO,
            "40 °C é onde o VERMELHO começa");
  verificar(p, nivelDaSensacao(51.9f, lim) == RISCO_VERMELHO && nivelDaSensacao(52, lim) == RISCO_ROXO,
            "51,9 °C ainda é VERMELHO (faixa 40-51) e 52 °C é ROXO");
  verificar(p, nivelDaSensacao(NAN, lim) == RISCO_SEM_DADO, "sem sensação = SEM DADO (nunca verde)");
  verificar(p, nivelComHisterese(RISCO_LARANJA, 33.8f, lim, HISTERESE_NIVEL_C) == RISCO_LARANJA,
            "histerese: 33,8 °C ainda é LARANJA (a folga é 0,5 °C)");
  verificar(p, nivelComHisterese(RISCO_LARANJA, 33.4f, lim, HISTERESE_NIVEL_C) == RISCO_AMARELO,
            "histerese: 33,4 °C já desce para AMARELO");
  verificar(p, nivelComHisterese(RISCO_VERDE, 41.5f, lim, HISTERESE_NIVEL_C) == RISCO_VERMELHO,
            "para subir não há espera: VERDE vai direto a VERMELHO");
  verificar(p, nivelComHisterese(RISCO_VERMELHO, 20, lim, HISTERESE_NIVEL_C) == RISCO_VERDE,
            "esfriou muito: desce vários níveis de uma vez");

  int acesos = 0;
  for (int c = RISCO_VERDE; c <= RISCO_ROXO; c++) acesos += ledDeveAcender(RISCO_LARANJA, (NivelRisco)c, true);
  verificar(p, acesos == 1 && ledDeveAcender(RISCO_LARANJA, RISCO_LARANJA, true), "só o LED da cor certa acende (1 de 5)");
  verificar(p, ledDeveAcender(RISCO_SEM_DADO, RISCO_AMARELO, true) && !ledDeveAcender(RISCO_SEM_DADO, RISCO_AMARELO, false)
               && !ledDeveAcender(RISCO_SEM_DADO, RISCO_VERDE, true),
            "SEM DADO: o amarelo pisca e o verde nunca acende");

  LimitesRisco foraDeOrdem;  foraDeOrdem.laranja = 45;
  LimitesRisco grudados;     grudados.laranja = 27.5f;
  LimitesRisco comNaN;       comNaN.vermelho = NAN;
  LimitesRisco roxoBaixo;    roxoBaixo.roxo = 39;
  LimitesRisco roxoAlto;     roxoAlto.roxo = 65;
  verificar(p, limitesValidos(lim), "limites iniciais (27/34/40/52) são válidos");
  verificar(p, !limitesValidos(foraDeOrdem) && !limitesValidos(grudados) && !limitesValidos(comNaN)
               && !limitesValidos(roxoBaixo) && !limitesValidos(roxoAlto),
            "limites fora de ordem, a menos de 1 °C, NaN ou fora da faixa são rejeitados");

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
  dt.lux = 50064;  dt.q = 50;  dt.luzOk = true;
  montarTela(dt, tela);
  bool todas20 = true;
  for (int i = 0; i < LCD_LINHAS; i++) todas20 = todas20 && strlen(tela[i]) == LCD_COLUNAS;
  verificar(p, todas20, "LCD 1: as 4 linhas têm exatamente 20 caracteres");
  verificar(p, strstr(tela[0], "34.6") && strstr(tela[0], "LARANJA"), "LCD 1: linha 1 mostra a sensação e o nível");
  verificar(p, strstr(tela[2], "50064lx") && strstr(tela[2], "Q 50"), "LCD 1: linha 3 mostra a luz (lux) e o Q");
  verificar(p, strstr(tela[3], "LIGADO") && strstr(tela[3], "02:15"), "LCD 1: relé ligado há 135 s = 02:15");
  montarTelaOrientacao(dt, tela);
  verificar(p, strstr(tela[3], "WiFi:--") && strstr(tela[3], "MQTT:--"), "LCD 2: sem rede mostra --");
  verificar(p, strstr(tela[2], "Hora --:--") != nullptr, "LCD 2: sem relógio da internet, a hora fica --:--");
  dt.hora = 9;  dt.minuto = 5;  montarTelaOrientacao(dt, tela);
  verificar(p, strstr(tela[2], "Hora 09:05") != nullptr, "LCD 2: hora com dois dígitos (09:05)");

  DadosTela ruim;
  ruim.problema = "SENSOR EM FALHA";  ruim.releMotivo = RELE_BLOQUEADO;  ruim.estacao = "E1";
  ruim.temp = -40;  ruim.umid = 100;  ruim.vento = 50;  ruim.ventoOk = true;
  montarTela(ruim, tela);
  verificar(p, strstr(tela[0], "SEM DADO") && strstr(tela[1], "SENSOR EM FALHA") && strstr(tela[3], "falha")
               && strstr(tela[2], "pior"),
            "LCD 1: sensor em falha aparece, o relé fica bloqueado e o sol ruim mostra o pior caso");
  ruim.problema = nullptr;
  montarTela(ruim, tela);
  verificar(p, strlen(tela[1]) == LCD_COLUNAS, "display: valores extremos não estouram a linha");

  // --- Extremos do RS: TA acima de 50 e abaixo de zero ---
  LimitesRisco padrao;
  float taCalorao = temperaturaAparente(40, 60, 0, 100);   // 40 °C, 60%, sem vento, sol forte
  float taMinuano = temperaturaAparente(2, 80, 8, 0);      // 2 °C, 80%, vento de 8 m/s, sem sol
  verificar(p, perto(taCalorao, 58.09f, 0.05f) && nivelDaSensacao(taCalorao, padrao) == RISCO_ROXO,
            "40 °C, 60% e sol forte: TA ≈ 58,1 °C (passa de 51), ROXO");
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
  extremo.ta = taCalorao;  extremo.nivel = RISCO_ROXO;
  montarTela(extremo, tela);
  verificar(p, strstr(tela[0], "58.1") && strstr(tela[0], "ROXO") && strlen(tela[0]) == LCD_COLUNAS,
            "display: TA de 58,1 °C cabe na linha e mostra ROXO");
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
  verificar(p, strstr(tela[3], "REMOTO") && strlen(tela[3]) == LCD_COLUNAS, "LCD 1: relé ligado pela nuvem mostra REMOTO");

  // --- Refúgio mais perto e orientação sem app ---
  const Refugio teste[] = { {"Praca", 400, -1, 0, true}, {"Shopping", 200, 10, 21, false} };
  verificar(p, refugioMaisPerto(teste, 2, 15, 3) == &teste[1], "refúgio: quarta às 15h, o shopping aberto e mais perto ganha da praça");
  verificar(p, refugioMaisPerto(teste, 2, 23, 3) == &teste[0], "refúgio: às 23h, o shopping fechado sai e fica a praça");
  verificar(p, refugioMaisPerto(teste, 2, 15, 0) == &teste[0], "refúgio: no domingo, o shopping que não abre sai");
  verificar(p, refugioMaisPerto(teste, 2, -1, -1) == &teste[0], "refúgio: sem relógio, só indica o que é 24 h");
  verificar(p, refugioMaisPerto(&teste[1], 1, -1, -1) == nullptr, "refúgio: sem relógio e só com shopping, não indica nenhum");
  char dist[8];
  textoDistancia(dist, sizeof(dist), 90);
  bool metros = strcmp(dist, "90m") == 0;
  textoDistancia(dist, sizeof(dist), 1260);
  verificar(p, metros && strcmp(dist, "1.3km") == 0, "refúgio: distância em m até 999 e em km depois");

  // LCD 2 (orientação): conselho, refúgio, hora e rede, tudo na tela ao mesmo tempo
  dt.releMotivo = RELE_CALMO;  dt.refugio = &teste[0];   // dt está em LARANJA (34,6 °C)
  montarTelaOrientacao(dt, tela);
  todas20 = true;
  for (int i = 0; i < LCD_LINHAS; i++) todas20 = todas20 && strlen(tela[i]) == LCD_COLUNAS;
  verificar(p, todas20 && strstr(tela[0], "Beba agua e descanse") && strstr(tela[1], "Va: Praca 400m"),
            "LCD 2: no LARANJA, conselho e refúgio aparecem juntos (4 linhas de 20)");
  montarTela(dt, tela);
  verificar(p, strstr(tela[1], "T30.2C") != nullptr, "LCD 1: com risco alto, as leituras continuam na tela");
  dt.nivel = RISCO_VERMELHO;  montarTelaOrientacao(dt, tela);
  verificar(p, strstr(tela[0], "SAIA DO SOL") != nullptr, "LCD 2: no VERMELHO, o conselho é sair do sol");
  dt.nivel = RISCO_ROXO;  montarTelaOrientacao(dt, tela);
  verificar(p, strstr(tela[0], "SUSPENDA ATIVIDADES") != nullptr, "LCD 2: no ROXO, o conselho é suspender as atividades");
  dt.nivel = RISCO_VERMELHO;  dt.refugio = nullptr;  montarTelaOrientacao(dt, tela);
  verificar(p, strstr(tela[1], "Procure uma sombra") != nullptr, "LCD 2: sem refúgio aberto, manda procurar sombra");
  const Refugio longe = {"NomeMuitoComprido", 9900, -1, 0, true};
  dt.refugio = &longe;  montarTelaOrientacao(dt, tela);
  verificar(p, strstr(tela[1], "9.9km") && strlen(tela[1]) == LCD_COLUNAS, "LCD 2: nome longo e 9,9 km cabem na linha");
  dt.nivel = RISCO_AMARELO;  dt.refugio = &teste[0];  montarTelaOrientacao(dt, tela);
  verificar(p, strstr(tela[0], "beba agua") && strstr(tela[1], "Pausas na sombra") && !strstr(tela[1], "Va:"),
            "LCD 2: no AMARELO, água e pausas, sem mandar ao refúgio");
  dt.nivel = RISCO_VERDE;  dt.ta = 22;  montarTelaOrientacao(dt, tela);
  verificar(p, strstr(tela[0], "Sem risco de calor") != nullptr, "LCD 2: no VERDE, sem risco de calor");
  dt.ta = 3;  montarTelaOrientacao(dt, tela);
  verificar(p, strstr(tela[0], "Frio") != nullptr, "LCD 2: abaixo de 9 °C, avisa o frio");
  ruim.refugio = &teste[0];
  montarTelaOrientacao(ruim, tela);
  verificar(p, strstr(tela[0], "Sem leitura") && strstr(tela[1], "Na duvida") && !strstr(tela[1], "Va:"),
            "LCD 2: SEM DADO nunca manda ao refúgio (não sabe se há risco), mas aconselha a sombra");

  // --- Dia ou noite (sol.h): à noite, nada de "sombra" ---
  // Horários conferidos com o Open-Meteo (nascer 05:20 e pôr 18:59 em 16/11/2026).
  // 1794841200 = 16/11/2026 15:00 UTC (12:00 em Brasília).
  const double MEIO_DIA = 1794841200.0, HORA = 3600.0;
  verificar(p, elevacaoDoSol(MEIO_DIA + 30 * 60, -30.03, -51.23) > 70,  "sol: em 16/11 às 12h30 o sol está alto (> 70°) em POA");
  verificar(p, elevacaoDoSol(MEIO_DIA - 9 * HORA, -30.03, -51.23) < -20, "sol: às 3h da madrugada o sol está bem abaixo do horizonte");
  bool nasceu = elevacaoDoSol(MEIO_DIA - 6 * HORA - 36 * 60, -30.03, -51.23) > SOL_HORIZONTE_GRAUS;   // 05:24
  bool antes  = elevacaoDoSol(MEIO_DIA - 6 * HORA - 44 * 60, -30.03, -51.23) > SOL_HORIZONTE_GRAUS;   // 05:16
  verificar(p, nasceu && !antes, "sol: em 16/11 nasce entre 05:16 e 05:24 (Open-Meteo: 05:20)");
  bool deDia  = elevacaoDoSol(MEIO_DIA + 6 * HORA + 56 * 60, -30.03, -51.23) > SOL_HORIZONTE_GRAUS;   // 18:56
  bool poente = elevacaoDoSol(MEIO_DIA + 7 * HORA + 4 * 60, -30.03, -51.23) > SOL_HORIZONTE_GRAUS;    // 19:04
  verificar(p, deDia && !poente, "sol: em 16/11 se põe entre 18:56 e 19:04 (Open-Meteo: 18:59)");
  verificar(p, periodoDoDia(false, 0, -30, -51, true, 10, 50) == PERIODO_NOITE,  "período: sem relógio, pouca luz no LDR = noite");
  verificar(p, periodoDoDia(false, 0, -30, -51, true, 5000, 50) == PERIODO_DIA,  "período: sem relógio, luz forte no LDR = dia");
  verificar(p, periodoDoDia(false, 0, -30, -51, false, 0, 50) == PERIODO_DIA,    "período: sem relógio e sem LDR = dia (lado seguro)");
  verificar(p, periodoDoDia(true, MEIO_DIA - 9 * HORA, -30, -51, true, 90000, 50) == PERIODO_NOITE,
            "período: o relógio vence o LDR (luz forte às 3h é um poste, não o sol)");
  ruim.noite = true;  montarTelaOrientacao(ruim, tela);
  verificar(p, strstr(tela[0], "Sem leitura") && !strstr(tela[1], "sombra") && strstr(tela[1], "agua"),
            "LCD 2: SEM DADO à noite não fala de sombra; fala de água");
  dt.noite = true;  dt.ta = 30;  dt.nivel = RISCO_AMARELO;  montarTelaOrientacao(dt, tela);
  verificar(p, strstr(tela[1], "Lugar ventilado") && !strstr(tela[1], "sombra"), "LCD 2: AMARELO à noite = lugar ventilado");
  dt.nivel = RISCO_VERMELHO;  dt.ta = 41;  dt.refugio = nullptr;  montarTelaOrientacao(dt, tela);
  verificar(p, strstr(tela[0], "LUGAR FRESCO") && !strstr(tela[0], "SOL") && strstr(tela[1], "lugar fresco"),
            "LCD 2: VERMELHO à noite = lugar fresco, sem falar de sol");
  dt.noite = false;

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
  verificar(p, strcmp(msg, "field6=5&field7=0") == 0, "mensagem: sem leitura confiável, só vai o risco (5 = sem dado) e o relé");
  semDado.status = "a&b=c";
  montarMensagem(semDado, msg, sizeof(msg));
  verificar(p, strstr(msg, "status=a b:c") != nullptr, "mensagem: '&' e '=' no status não quebram a mensagem");
  char pequeno[12];
  verificar(p, !montarMensagem(l, pequeno, sizeof(pequeno)) && strlen(pequeno) < sizeof(pequeno),
            "mensagem: buffer pequeno não estoura (avisa que não coube)");

  // --- Nuvem: comandos que chegam pelo field8 ---
  const char* novo = "lim:28,35,41,52";
  Comando c = interpretarComando(novo, strlen(novo));
  verificar(p, c.tipo == CMD_LIMITES && c.limites.amarelo == 28 && c.limites.laranja == 35 && c.limites.vermelho == 41
               && c.limites.roxo == 52,
            "comando lim:28,35,41,52 é aceito (os 4 limites)");
  const char* bagunca = " LIM: 28, 35 ,41, 52 ";
  verificar(p, interpretarComando(bagunca, strlen(bagunca)).tipo == CMD_LIMITES, "comando aceita espaços e maiúsculas");
  const char* invalidos[] = {"lim:35,28,41,52", "lim:28,35,41", "lim:28,35,41,52,55", "lim:abc,35,41,52",
                             "lim:nan,35,41,52", "lim:5,35,41,52", "lim:28,35,41,65", "rele:talvez", "apagar:tudo"};
  bool todosRejeitados = true;
  for (const char* x : invalidos) todosRejeitados &= interpretarComando(x, strlen(x)).tipo == CMD_INVALIDO;
  verificar(p, todosRejeitados, "comandos fora de ordem, incompletos (3 limites), NaN, fora da faixa ou desconhecidos são rejeitados");
  const char* longo = "lim:28.00000000,35.00000000,41.0000,52.00";   // 41 letras
  verificar(p, strlen(longo) == 41 && interpretarComando(longo, strlen(longo)).tipo == CMD_INVALIDO,
            "mensagem com mais de 40 letras é rejeitada");
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
