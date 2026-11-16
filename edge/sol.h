// sol.h — Dia ou noite? A altura do sol no céu, para o conselho do LCD 2.
//
// À noite, "procure uma sombra" não faz sentido. A estação decide o período
// nesta ordem (do mais confiável para o menos):
//   1. o relógio da internet (NTP) + a conta da posição do sol;
//   2. sem relógio: a luz medida pelo LDR (pouca luz = noite);
//   3. sem os dois: DIA. É o lado seguro: o conselho de dia ("sombra") à noite
//      é só inútil, mas o conselho da noite de dia poderia deixar alguém no sol.
//
// A conta é a mesma do app (frontend/src/lib/sol.js): "Approximate Solar
// Coordinates" do Observatório Naval dos EUA (USNO), erro de ~1 minuto no
// nascer e no pôr do sol. Usa double: os números de dias e horas ficam
// grandes, e o float (7 dígitos) perderia a precisão.
#pragma once
#include <math.h>

enum Periodo { PERIODO_DIA, PERIODO_NOITE };

// O sol "nasce" com o centro dele 0,833° ABAIXO do horizonte (a atmosfera
// entorta a luz, e a borda de cima já aparece).
const double SOL_HORIZONTE_GRAUS = -0.833;

// Altura do sol em graus (negativa = abaixo do horizonte).
// epochUtc = segundos desde 01/01/1970 em UTC, o que o time() do ESP32 dá
// depois do NTP.
inline double elevacaoDoSol(double epochUtc, double latGraus, double lonGraus) {
  const double RAD = 3.14159265358979323846 / 180.0;   // M_PI não existe em todo compilador
  const double d = epochUtc / 86400.0 - 10957.5;   // dias desde 01/01/2000 ao meio-dia (UTC)

  const double anomalia   = (357.529 + 0.98560028 * d) * RAD;
  const double longMedia  = 280.459 + 0.98564736 * d;
  const double longitude  = (longMedia + 1.915 * sin(anomalia) + 0.020 * sin(2 * anomalia)) * RAD;
  const double inclinacao = (23.439 - 0.00000036 * d) * RAD;

  const double ascensaoReta = atan2(cos(inclinacao) * sin(longitude), cos(longitude));
  const double declinacao   = asin(sin(inclinacao) * sin(longitude));

  double horaSideral = fmod(18.697374558 + 24.06570982441908 * d, 24.0);
  if (horaSideral < 0) horaSideral += 24.0;
  const double anguloHorario = (horaSideral * 15.0 + lonGraus) * RAD - ascensaoReta;

  const double lat = latGraus * RAD;
  const double seno = sin(lat) * sin(declinacao) + cos(lat) * cos(declinacao) * cos(anguloHorario);
  return asin(seno) / RAD;
}

// relogioOk: o NTP já sincronizou. luzOk: o LDR está lendo direito.
inline Periodo periodoDoDia(bool relogioOk, double epochUtc, double lat, double lon,
                            bool luzOk, float lux, float luxNoite) {
  if (relogioOk) return elevacaoDoSol(epochUtc, lat, lon) > SOL_HORIZONTE_GRAUS ? PERIODO_DIA : PERIODO_NOITE;
  if (luzOk)     return lux < luxNoite ? PERIODO_NOITE : PERIODO_DIA;
  return PERIODO_DIA;   // lado seguro
}
