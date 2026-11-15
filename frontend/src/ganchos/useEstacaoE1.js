import { useEffect, useState } from 'react'
import { buscarE1 } from '../servicos/thingspeak'

// O ThingSpeak grátis aceita uma consulta a cada 15 s.
const INTERVALO_MS = 15_000

// Gancho (hook) = uma função do React que guarda estado e efeitos para um
// componente usar. É como um "assistente" que fica buscando a E1 sozinho e
// avisa o componente quando chega coisa nova.
export default function useEstacaoE1() {
  const [estado, setEstado] = useState({ carregando: true, erro: null, leitura: null })

  useEffect(() => {
    let controle = new AbortController()

    async function buscar() {
      controle.abort() // se a anterior ainda não voltou, desiste dela
      controle = new AbortController()
      try {
        const leitura = await buscarE1(controle.signal)
        setEstado({ carregando: false, erro: null, leitura })
      } catch (erro) {
        if (erro.name === 'AbortError') return
        // Mantém a última leitura boa na tela, mas avisa do erro.
        setEstado((antes) => ({ ...antes, carregando: false, erro: erro.message }))
      }
    }

    buscar()
    const relogio = setInterval(buscar, INTERVALO_MS)
    // Limpeza: ao sair da tela, para o relógio e cancela a busca em andamento.
    return () => {
      clearInterval(relogio)
      controle.abort()
    }
  }, [])

  return estado
}

// Relógio da tela: muda a cada segundo, para o "atualizado há X s" andar
// sem precisar buscar a API de novo.
export function useAgora(intervaloMs = 1000) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])
  return agora
}
