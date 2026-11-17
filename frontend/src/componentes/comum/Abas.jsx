import { useRef } from 'react'

// Abas no padrão da WAI-ARIA (o "manual" de acessibilidade do W3C):
//   - role tablist/tab, e aria-selected na aba ativa;
//   - o Tab entra só na aba ATIVA (tabIndex 0; as outras, -1) e depois vai
//     para o painel; as setas ← → trocam de aba, e Home/End vão à 1ª e à última.
//     É como os canais de uma TV: as setas mudam o canal, o Tab sai do controle.
// abas = [{id, rotulo}]. Os painéis ficam com quem usa (ids "aba-<id>" e "painel-<id>").
export default function Abas({ rotulo, abas, ativa, aoMudar }) {
  const botoes = useRef({})

  function teclado(evento, indice) {
    const ultimo = abas.length - 1
    const destino = {
      ArrowRight: indice === ultimo ? 0 : indice + 1,
      ArrowLeft: indice === 0 ? ultimo : indice - 1,
      Home: 0,
      End: ultimo,
    }[evento.key]
    if (destino === undefined) return
    evento.preventDefault()
    const id = abas[destino].id
    aoMudar(id)
    botoes.current[id]?.focus()
  }

  return (
    <div role="tablist" aria-label={rotulo} className="flex flex-wrap gap-1 border-b border-borda-forte">
      {abas.map((aba, indice) => {
        const selecionada = aba.id === ativa
        return (
          <button
            key={aba.id}
            ref={(el) => {
              botoes.current[aba.id] = el
            }}
            type="button"
            role="tab"
            id={`aba-${aba.id}`}
            aria-selected={selecionada}
            aria-controls={`painel-${aba.id}`}
            tabIndex={selecionada ? 0 : -1}
            onClick={() => aoMudar(aba.id)}
            onKeyDown={(e) => teclado(e, indice)}
            // A aba ativa: fundo de cartão + barra embaixo + negrito (não só a cor).
            className={`-mb-px rounded-t border px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco ${
              selecionada
                ? 'border-borda-forte border-b-superficie bg-superficie font-bold'
                : 'border-transparent text-texto-suave hover:bg-superficie-2'
            }`}
          >
            {aba.rotulo}
          </button>
        )
      })}
    </div>
  )
}
