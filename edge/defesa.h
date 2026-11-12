#pragma once
// ============================================================
// defesa.h — as 3 barreiras contra leitura ruim.
//   1) leituraValida:    o número faz sentido físico?
//   2) aceitarSemSalto:  um pulo grande só vale se repetir
//   3) SaudeSensor:      várias falhas seguidas = sensor em FALHA
// Tudo aqui é lógica pura, testada no autoteste do boot.
// ============================================================

#include <math.h>
#include <stdint.h>
#include "config.h"

enum EstadoSensor { SENSOR_OK, SENSOR_SUSPEITO, SENSOR_FALHA };

inline const char* textoEstado(EstadoSensor e) {
  switch (e) {
    case SENSOR_OK:       return "OK";
    case SENSOR_SUSPEITO: return "SUSPEITO";
    default:              return "FALHA";
  }
}

// --- Barreira 1: faixa física do DHT22 ---
inline bool leituraValida(float t, float ur) {
  if (isnan(t) || isnan(ur)) return false;               // fio solto costuma dar NaN
  if (t < TEMP_MIN_C || t > TEMP_MAX_C) return false;
  if (ur < UMID_MIN || ur > UMID_MAX) return false;
  return true;
}

// --- Barreira 2: filtro de salto ---
// Analogia: se o amigo que sempre chega às 8h aparece às 3h da manhã,
// você desconfia. Se ele aparecer de novo no mesmo horário amanhã,
// aí você acredita que a rotina dele mudou.
struct FiltroSalto {
  bool  temReferencia = false;
  float referencia    = 0.0f;   // último valor aceito
  bool  temSuspeito   = false;
  float suspeito      = 0.0f;   // pulo grande esperando confirmação
};

// Devolve true se o valor pode ser usado.
inline bool aceitarSemSalto(FiltroSalto& f, float valor, float saltoMax) {
  if (!f.temReferencia) {                                 // primeira leitura: aceita
    f.referencia = valor;
    f.temReferencia = true;
    return true;
  }
  if (fabsf(valor - f.referencia) <= saltoMax) {          // mudança normal
    f.referencia = valor;
    f.temSuspeito = false;
    return true;
  }
  if (f.temSuspeito && fabsf(valor - f.suspeito) <= saltoMax) {  // o pulo se repetiu: é real
    f.referencia = valor;
    f.temSuspeito = false;
    return true;
  }
  f.suspeito = valor;                                     // pulo novo: segura e espera
  f.temSuspeito = true;
  return false;
}

// --- Barreira 3: saúde do sensor ---
struct SaudeSensor {
  uint8_t       falhasSeguidas     = 0;
  EstadoSensor  estado             = SENSOR_SUSPEITO;  // até a 1ª leitura boa, não confiamos
  bool          temLeituraBoa      = false;
  unsigned long ultimaLeituraBoaMs = 0;
};

inline void registrarSucesso(SaudeSensor& s, unsigned long agoraMs) {
  s.falhasSeguidas = 0;
  s.estado = SENSOR_OK;
  s.temLeituraBoa = true;
  s.ultimaLeituraBoaMs = agoraMs;
}

inline void registrarFalha(SaudeSensor& s) {
  if (s.falhasSeguidas < 255) s.falhasSeguidas++;        // não deixa o contador "dar a volta"
  s.estado = (s.falhasSeguidas >= FALHAS_PARA_ALARME) ? SENSOR_FALHA : SENSOR_SUSPEITO;
}

// A leitura pode ser usada para DECIDIR (ligar relé, mandar alerta)?
// A subtração com unsigned long continua certa mesmo quando o millis()
// "dá a volta" (depois de ~49 dias ligado).
inline bool leituraConfiavel(const SaudeSensor& s, unsigned long agoraMs) {
  if (!s.temLeituraBoa || s.estado == SENSOR_FALHA) return false;
  return (agoraMs - s.ultimaLeituraBoaMs) <= IDADE_MAX_LEITURA_MS;
}
