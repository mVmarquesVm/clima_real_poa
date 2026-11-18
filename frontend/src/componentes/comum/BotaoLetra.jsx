// Botão da letra. Como o BotaoTema, o texto diz o que o clique FAZ:
// "A+ Letra maior" ou "A− Letra normal" (sem aria-pressed, pelo mesmo motivo).
// Fica no cabeçalho laranja, por isso o anel de foco é branco.
export default function BotaoLetra({ grande, aoAlternar }) {
  return (
    <button
      type="button"
      onClick={aoAlternar}
      className="shrink-0 rounded border border-white/80 px-3 py-1 font-semibold hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <span aria-hidden="true">{grande ? 'A− ' : 'A+ '}</span>
      {grande ? 'Letra normal' : 'Letra maior'}
    </button>
  )
}
