// Previsão do tempo hora a hora do Open-Meteo (grátis, sem chave), para o
// Centro de Porto Alegre. Com ela, o app calcula a sensação térmica das
// próximas horas com a MESMA fórmula da estação.
//
// Atenção: o Open-Meteo é um MODELO em grade (quadrados de alguns km). Os 4
// locais caem no mesmo quadrado, então a previsão é igual para todos. O que
// muda de um local para o outro é a sombra, o bebedouro e a distância.

import { radiacaoDeGlobal, temperaturaAparente } from '../lib/sensacao.js'
import { PORTO_ALEGRE, ehDia } from '../lib/sol.js'

const URL_PREVISAO = 'https://api.open-meteo.com/v1/forecast'

// Hoje e amanhã: dá para planejar "amanhã de manhã" à noite.
const DIAS = 2

export const SEM_PREVISAO = 'Não foi possível buscar a previsão do tempo. Tente de novo em instantes.'

export async function buscarPrevisao({ signal } = {}) {
  const parametros = new URLSearchParams({
    latitude: PORTO_ALEGRE.lat,
    longitude: PORTO_ALEGRE.lon,
    hourly: 'temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation',
    wind_speed_unit: 'ms', // o vento já em m/s, como na fórmula (o padrão é km/h)
    timezone: 'America/Sao_Paulo',
    forecast_days: DIAS,
  })
  let resposta
  try {
    resposta = await fetch(`${URL_PREVISAO}?${parametros}`, { signal })
  } catch (e) {
    if (signal?.aborted) throw e // cancelada pela tela: não é erro
    throw new Error(SEM_PREVISAO)
  }
  if (!resposta.ok) throw new Error(SEM_PREVISAO)
  return previsaoDoJson(await resposta.json())
}

// O JSON do Open-Meteo vem em colunas (uma lista por variável); a tela quer
// linhas (uma por hora). É como virar uma planilha de lado.
// Fica separada da busca para dar para testar sem internet.
export function previsaoDoJson(json) {
  const h = json?.hourly
  if (!h?.time?.length) throw new Error(SEM_PREVISAO)
  const fuso = desvioDoFuso(json.utc_offset_seconds ?? -10800)

  const horas = []
  h.time.forEach((texto, i) => {
    const t = h.temperature_2m[i]
    const ur = h.relative_humidity_2m[i]
    const vento = h.wind_speed_10m[i]
    const radiacao = h.shortwave_radiation[i] ?? 0
    // Hora com algum valor faltando fica de fora: o app não inventa número.
    if (![t, ur, vento].every(Number.isFinite)) return
    // "2026-11-17T14:00" é a hora de Porto Alegre; o fuso vai junto para o
    // Date não ler como a hora do computador de quem abre o app.
    const hora = new Date(`${texto}:00${fuso}`)
    horas.push({
      hora,
      t,
      ur,
      vento,
      radiacao,
      taSol: temperaturaAparente(t, ur, vento, radiacaoDeGlobal(radiacao)),
      taSombra: temperaturaAparente(t, ur, vento, 0),
      dia: ehDia(hora),
    })
  })
  if (horas.length === 0) throw new Error(SEM_PREVISAO)
  return horas
}

// -10800 s -> "-03:00"
function desvioDoFuso(segundos) {
  const sinal = segundos < 0 ? '-' : '+'
  const minutos = Math.abs(segundos) / 60
  const hh = String(Math.floor(minutos / 60)).padStart(2, '0')
  const mm = String(minutos % 60).padStart(2, '0')
  return `${sinal}${hh}:${mm}`
}
