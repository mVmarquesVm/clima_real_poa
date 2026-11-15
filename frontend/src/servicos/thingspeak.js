// Leitura da estação E1 no ThingSpeak.
// O canal 3578427 é PÚBLICO: a leitura não precisa de chave, então nada de
// segredo vai parar no navegador. (A chave de escrita fica só no ESP32.)

const CANAL = 3578427
const URL_FEEDS = `https://api.thingspeak.com/channels/${CANAL}/feeds.json?results=10`

// A estação publica a cada 20 s. Com mais de 2 min sem nada novo, a leitura
// é "velha" e não decide o risco: a mesma regra do Edge ("leitura velha não
// é usada para decidir").
export const IDADE_MAXIMA_S = 120

// O ThingSpeak manda tudo como texto ("30.0") ou null. Number(null) daria 0,
// um número falso; por isso null e texto vazio viram NaN, que o app trata
// como "sem valor".
function paraNumero(texto) {
  if (texto === null || texto === undefined || texto === '') return NaN
  return Number(texto)
}

// Uma entrada só de comando (config remota pelo field8) vem com os campos 1 a 7
// em null. Por isso procuramos, de trás para frente, a mais recente com a TA.
export function ultimaLeitura(feeds) {
  const entrada = [...feeds].reverse().find((f) => f.field5 !== null && f.field5 !== '')
  if (!entrada) return null
  return {
    criadoEm: new Date(entrada.created_at),
    temperatura: paraNumero(entrada.field1),
    umidade: paraNumero(entrada.field2),
    vento: paraNumero(entrada.field3),
    luz: paraNumero(entrada.field4),
    sensacao: paraNumero(entrada.field5),
    risco: paraNumero(entrada.field6),
    releLigado: paraNumero(entrada.field7) === 1,
  }
}

// O "signal" deixa cancelar a requisição (ex.: o componente saiu da tela).
export async function buscarE1(signal) {
  const resposta = await fetch(URL_FEEDS, { signal })
  if (!resposta.ok) throw new Error(`O ThingSpeak respondeu ${resposta.status}`)
  const corpo = await resposta.json()
  return ultimaLeitura(corpo.feeds ?? [])
}
