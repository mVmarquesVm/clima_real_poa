import { CLASSE_BOTAO, CLASSE_BOTAO_SECUNDARIO } from '../../lib/formulario'

// "Salvar" e "Cancelar", no fim de todo formulário do cadastro.
export default function BotoesFormulario({ textoSalvar, enviando, aoCancelar }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="submit"
        // aria-disabled (e não disabled): o botão continua no Tab e o leitor
        // de tela lê "Salvando…"; a trava do useFormulario barra o 2º clique.
        aria-disabled={enviando}
        // text-fundo, e não text-white: no escuro, o foco é um laranja claro, e o
        // branco por cima ficaria ilegível. Medido: 4,99:1 no claro e 8,0:1 no escuro.
        className={`${CLASSE_BOTAO} bg-foco text-fundo aria-disabled:cursor-wait`}
      >
        {enviando ? 'Salvando…' : textoSalvar}
      </button>
      <button type="button" onClick={aoCancelar} className={CLASSE_BOTAO_SECUNDARIO}>
        Cancelar
      </button>
    </div>
  )
}
