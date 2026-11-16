// Leitura das estações no ThingSpeak (1 canal por estação).
// Os canais são PÚBLICOS: a leitura não precisa de chave, então nada de
// segredo vai parar no navegador. (A chave de escrita fica só no ESP32.)
// Os números dos canais ficam em lib/estacoes.js.

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

// As últimas 10 entradas de um canal -> a leitura mais recente.
// O "signal" deixa cancelar a requisição (ex.: o componente saiu da tela).
export async function buscarCanal(canal, signal) {
  const url = `https://api.thingspeak.com/channels/${canal}/feeds.json?results=10`
  const resposta = await fetch(url, { signal })
  if (!resposta.ok) throw new Error(`O ThingSpeak respondeu ${resposta.status}`)
  const corpo = await resposta.json()
  return ultimaLeitura(corpo.feeds ?? [])
}
