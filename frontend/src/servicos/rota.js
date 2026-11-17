// Rota a pé pelas ruas, do serviço público de rotas da FOSSGIS (OSRM sobre o
// OpenStreetMap, grátis e sem chave). Ele SÓ LÊ: não guarda nem muda nada,
// então não substitui o nosso CRUD.
//
// Privacidade: os dois pontos (origem e destino) vão para o servidor da
// FOSSGIS. Por isso a rota só é pedida no clique em "Como chegar", nunca sozinha.

import { distanciaMetros } from '../lib/geo.js'

const URL_ROTA = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot'
const TEMPO_MAXIMO_MS = 10_000

export const SEM_ROTA = 'Não foi possível calcular a rota a pé agora.'

// origem e destino: {lat, lon}. Devolve {linha (GeoJSON), metros, segundos}.
// O OSRM pede "lon,lat" (x antes de y), ao contrário do que se fala no dia a dia.
export async function buscarRotaAPe(origem, destino, { signal } = {}) {
  const pontos = `${origem.lon},${origem.lat};${destino.lon},${destino.lat}`
  const limite = AbortSignal.timeout(TEMPO_MAXIMO_MS)
  const sinal = signal ? AbortSignal.any([signal, limite]) : limite
  let json
  try {
    const resposta = await fetch(`${URL_ROTA}/${pontos}?overview=full&geometries=geojson`, { signal: sinal })
    if (!resposta.ok) throw new Error(SEM_ROTA)
    json = await resposta.json()
  } catch (e) {
    if (signal?.aborted) throw e // cancelada pela tela: não é erro
    throw new Error(SEM_ROTA)
  }
  const rota = json?.routes?.[0]
  if (json?.code !== 'Ok' || !rota?.geometry) throw new Error(SEM_ROTA)
  return { linha: rota.geometry, metros: rota.distance, segundos: rota.duration }
}

// Plano B, sem servidor nenhum: a linha reta e um link para o site do OSM
// já com a rota a pé pronta (a pessoa abre se quiser).
export function rotaEmLinhaReta(origem, destino) {
  return {
    linha: { type: 'LineString', coordinates: [[origem.lon, origem.lat], [destino.lon, destino.lat]] },
    metros: distanciaMetros(origem, destino),
    segundos: null,
    linhaReta: true,
  }
}

export function linkDoOsm(origem, destino) {
  return (
    'https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=' +
    `${origem.lat},${origem.lon};${destino.lat},${destino.lon}`
  )
}
