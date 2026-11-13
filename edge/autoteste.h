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

  Serial.printf("== Resultado: %d passaram, %d falharam ==\n", p.passou, p.falhou);
  return p.falhou == 0;
}
