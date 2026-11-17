import { useCallback, useEffect, useState } from 'react'

// Busca uma lista na API e guarda os 3 estados que a tela precisa mostrar:
//   carregando (esperando a resposta), erro (o ErroApi) e itens (a lista).
// "buscar" é uma função da api.js, como api.locais.listar.
//
// itens começa em null, e não em []: null = "ainda não sei", [] = "a API disse
// que não tem nenhum". São telas diferentes (carregando × vazio).
export default function useLista(buscar) {
  const [itens, setItens] = useState(null)
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(true)
  // Mudar a "tentativa" roda o efeito de novo: é o botão "Tentar de novo".
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    const controle = new AbortController()
    buscar({ signal: controle.signal })
      .then((lista) => {
        setItens(lista)
        setErro(null)
      })
      .catch((e) => {
        // Cancelada porque a tela saiu ou porque veio uma busca nova: não é erro.
        if (controle.signal.aborted) return
        setErro(e)
      })
      .finally(() => {
        if (!controle.signal.aborted) setCarregando(false)
      })
    return () => controle.abort()
  }, [buscar, tentativa])

  // O "carregando" liga aqui, no clique, e não dentro do efeito: assim a tela
  // muda numa renderização só (o lint do React avisa quando o efeito faz isso).
  // useCallback: a mesma função em todo render, para quem a recebe não rodar à toa.
  const recarregar = useCallback(() => {
    setCarregando(true)
    setTentativa((t) => t + 1)
  }, [])

  return { itens, erro, carregando, recarregar }
}
