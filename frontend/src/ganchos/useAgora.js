import { useEffect, useState } from 'react'

// Relógio da tela: muda a cada segundo, para o "atualizado há X s" e o relógio
// da barra andarem sem precisar buscar a API de novo.
export default function useAgora(intervaloMs = 1000) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])
  return agora
}
