// CEP + número -> latitude e longitude, para ninguém precisar digitar coordenadas.
// São 2 serviços públicos, grátis e sem chave, chamados SÓ no clique em "Buscar":
//   1) ViaCEP (viacep.com.br): o CEP vira a rua, o bairro e a cidade;
//   2) Nominatim (nominatim.openstreetmap.org, do OpenStreetMap): o endereço
//      vira o ponto no mapa ("geocodificação").
// O Nominatim pede no máximo 1 busca por segundo e nada de busca automática
// enquanto a pessoa digita: por isso é só no botão, que fica travado durante a busca.
// Privacidade: o CEP e o número do LOCAL (uma praça, um parque) vão para esses
// serviços; nenhum dado da pessoa vai junto.

import { LAT_MAX, LAT_MIN, LON_MAX, LON_MIN } from '../lib/validacao.js'

const TEMPO_MAXIMO_MS = 10_000

export const ERROS_ENDERECO = {
  cepInvalido: 'O CEP precisa ter 8 números. Ex.: 90010-150.',
  cepNaoExiste: 'Esse CEP não existe. Confira os números.',
  foraDePoa: 'Esse CEP não é de Porto Alegre. O Forno Alegre só cadastra locais de Porto Alegre.',
  naoAchou: 'Não achamos esse endereço no mapa. Toque no mapa para marcar o ponto.',
  semServico: 'Não deu para buscar o endereço agora. Tente de novo ou toque no mapa para marcar o ponto.',
}

// "90010-150", "90.010-150" ou "90010150" -> "90010150" (ou null, se não tiver 8 números).
export function limparCep(texto) {
  const numeros = String(texto).replace(/\D/g, '')
  return numeros.length === 8 ? numeros : null
}

async function buscarJson(url, signal) {
  const limite = AbortSignal.timeout(TEMPO_MAXIMO_MS)
  const sinal = signal ? AbortSignal.any([signal, limite]) : limite
  try {
    const resposta = await fetch(url, { signal: sinal })
    if (!resposta.ok) throw new Error(ERROS_ENDERECO.semServico)
    return await resposta.json()
  } catch (e) {
    if (signal?.aborted) throw e // cancelada pela tela: não é erro
    throw new Error(ERROS_ENDERECO.semServico)
  }
}

// Passo 1: CEP -> {rua, bairro, cidade, uf}. Erros com a frase pronta para a tela.
export async function buscarCep(cep, { signal } = {}) {
  const limpo = limparCep(cep)
  if (!limpo) throw new Error(ERROS_ENDERECO.cepInvalido)
  const json = await buscarJson(`https://viacep.com.br/ws/${limpo}/json/`, signal)
  if (json.erro) throw new Error(ERROS_ENDERECO.cepNaoExiste)
  if (json.localidade !== 'Porto Alegre' || json.uf !== 'RS') throw new Error(ERROS_ENDERECO.foraDePoa)
  return { rua: json.logradouro, bairro: json.bairro, cidade: json.localidade, uf: json.uf }
}

// Uma busca no Nominatim, só dentro de Porto Alegre (viewbox + bounded = não
// devolve um lugar de mesmo nome em outra cidade).
async function nominatim(rua, endereco, signal) {
  const parametros = new URLSearchParams({
    street: rua,
    city: endereco.cidade,
    state: 'Rio Grande do Sul',
    country: 'Brasil',
    format: 'jsonv2',
    limit: '1',
    viewbox: `${LON_MIN},${LAT_MAX},${LON_MAX},${LAT_MIN}`,
    bounded: '1',
  })
  const lista = await buscarJson(`https://nominatim.openstreetmap.org/search?${parametros}`, signal)
  return lista?.[0] ?? null
}

// Passo 2: endereço + número -> {lat, lon}. Se não achar COM o número (praças
// costumam não ter), tenta só a rua: o ponto cai no meio dela, e a pessoa
// ajusta tocando no mapa.
export async function buscarPonto(endereco, numero, { signal } = {}) {
  if (!endereco.rua) throw new Error(ERROS_ENDERECO.naoAchou) // CEP geral da cidade, sem rua
  const comNumero = numero?.trim() ? await nominatim(`${numero.trim()} ${endereco.rua}`, endereco, signal) : null
  // A 2ª busca espera 1 s: a regra do Nominatim é no máximo 1 busca por segundo.
  if (!comNumero && numero?.trim()) await new Promise((fim) => setTimeout(fim, 1000))
  const achado = comNumero ?? (await nominatim(endereco.rua, endereco, signal))
  if (!achado) throw new Error(ERROS_ENDERECO.naoAchou)
  return { lat: Number(achado.lat), lon: Number(achado.lon), exato: Boolean(comNumero) }
}
