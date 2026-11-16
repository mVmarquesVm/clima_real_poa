import { useEffect, useState } from 'react'
import { buscarCanal } from '../servicos/thingspeak'

// O ThingSpeak grátis aceita uma consulta a cada 15 s.
const INTERVALO_MS = 15_000

// Busca TODAS as estações que têm canal, ao mesmo tempo, a cada 15 s.
// Devolve um objeto por id: { E1: { carregando, erro, leitura }, ... }.
// Se uma estação falhar, as outras continuam (cada uma tem o seu erro), e a
// última leitura boa de cada uma fica na tela.
export default function useEstacoes(estacoes) {
  const [estados, setEstados] = useState(() =>
    Object.fromEntries(estacoes.map((e) => [e.id, { carregando: true, erro: null, leitura: null }])),
  )

  useEffect(() => {
    let controle = new AbortController()

    async function buscarTodas() {
      controle.abort() // se a rodada anterior ainda não voltou, desiste dela
      controle = new AbortController()
      const { signal } = controle
      // Promise.allSettled espera TODAS, mesmo se alguma falhar
      // (o Promise.all pararia no primeiro erro).
      const resultados = await Promise.allSettled(estacoes.map((e) => buscarCanal(e.canal, signal)))
      if (signal.aborted) return
      setEstados((antes) => {
        const novos = { ...antes }
        resultados.forEach((r, i) => {
          const id = estacoes[i].id
          novos[id] =
            r.status === 'fulfilled'
              ? { carregando: false, erro: null, leitura: r.value }
              : { ...antes[id], carregando: false, erro: r.reason?.message ?? 'erro desconhecido' }
        })
        return novos
      })
    }

    buscarTodas()
    const relogio = setInterval(buscarTodas, INTERVALO_MS)
    return () => {
      clearInterval(relogio)
      controle.abort()
    }
  }, [estacoes])

  return estados
}
