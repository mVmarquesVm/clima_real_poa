// Dia ou noite? Calcula a altura do sol no céu (em graus) para uma data, uma
// hora e um lugar. É a conta aproximada do Observatório Naval dos EUA (USNO),
// "Approximate Solar Coordinates", com erro de cerca de 1 minuto no nascer e
// no pôr do sol: sobra para saber se é dia. Não usa internet nem chave.
//
// Para que serve: à noite, "fique na sombra" não faz sentido. O conselho do
// selo muda com o sol (ver conselhoDe em lib/risco.js), como no LCD da estação.

const RAD = Math.PI / 180

// O Centro de Porto Alegre. Entre os 4 locais, o nascer do sol muda menos de
// 1 minuto, então um ponto só serve para todos.
export const PORTO_ALEGRE = { lat: -30.03, lon: -51.23 }

// O sol "nasce" quando o centro dele está 0,833° ABAIXO do horizonte: a
// atmosfera entorta a luz (refração) e a borda de cima já aparece.
const HORIZONTE = -0.833

export function elevacaoDoSol(data, { lat, lon } = PORTO_ALEGRE) {
  // Dias desde 01/01/2000 ao meio-dia (UTC), a data de referência dos astrônomos.
  const d = data.getTime() / 86400000 - 10957.5

  // Onde o sol está no "caminho" dele ao redor do céu ao longo do ano.
  const anomalia = (357.529 + 0.98560028 * d) * RAD
  const longitudeMedia = 280.459 + 0.98564736 * d
  const longitude =
    (longitudeMedia + 1.915 * Math.sin(anomalia) + 0.02 * Math.sin(2 * anomalia)) * RAD
  const inclinacaoTerra = (23.439 - 0.00000036 * d) * RAD

  // Posição do sol no céu (como latitude e longitude, mas no céu).
  const ascensaoReta = Math.atan2(Math.cos(inclinacaoTerra) * Math.sin(longitude), Math.cos(longitude))
  const declinacao = Math.asin(Math.sin(inclinacaoTerra) * Math.sin(longitude))

  // Que horas são "nas estrelas" neste lugar, e quanto o sol já andou desde o meio-dia.
  const horaSideralGraus = (((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24 * 15 + lon
  const anguloHorario = horaSideralGraus * RAD - ascensaoReta

  const latRad = lat * RAD
  const seno =
    Math.sin(latRad) * Math.sin(declinacao) +
    Math.cos(latRad) * Math.cos(declinacao) * Math.cos(anguloHorario)
  return Math.asin(seno) / RAD
}

export function ehDia(data, lugar = PORTO_ALEGRE) {
  return elevacaoDoSol(data, lugar) > HORIZONTE
}
