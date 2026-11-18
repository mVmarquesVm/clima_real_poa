import { ATIVIDADES } from '../../lib/cadastro'
import { LIMITE_POR_ATIVIDADE, LISTA_DE_ATIVIDADES } from '../../lib/recomendacao'
import NumeroPasso from '../comum/NumeroPasso'

// "O que você vai fazer?": botões de rádio (só uma escolha), com cara de pílula.
// O <input> continua de verdade (só fica invisível): as setas do teclado andam
// entre as opções e o leitor de tela diz "1 de 5, selecionado", de graça.
export default function SeletorAtividade({ valor, aoMudar }) {
  return (
    <fieldset>
      <legend className="mb-2 flex items-center text-lg font-bold">
        <NumeroPasso numero={1} />
        O que você vai fazer?
      </legend>
      <div className="flex flex-wrap gap-2">
        {LISTA_DE_ATIVIDADES.map((atividade) => (
          <label
            key={atividade}
            className="cursor-pointer rounded-full border border-borda-forte bg-superficie px-4 py-2 hover:bg-superficie-2 has-checked:border-foco has-checked:bg-foco has-checked:text-fundo has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-foco"
          >
            <input
              type="radio"
              name="atividade"
              value={atividade}
              checked={valor === atividade}
              onChange={() => aoMudar(atividade)}
              className="sr-only"
            />
            {ATIVIDADES[atividade]}
            <span className="sr-only">, limite de {LIMITE_POR_ATIVIDADE[atividade]} °C</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
