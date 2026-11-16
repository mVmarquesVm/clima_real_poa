// Botão do tema. O texto diz o que o clique FAZ: no tema claro, "Tema escuro";
// no escuro, "Tema claro". Por isso ele NÃO usa aria-pressed: se o texto e o
// estado "pressionado" mudassem juntos, o leitor de tela diria "Tema claro,
// pressionado", e a pessoa não saberia qual tema está ligado.
// Ele fica no cabeçalho laranja, por isso o anel de foco é branco (o laranja
// do foco sumiria em cima do laranja da marca).
export default function BotaoTema({ escuro, aoAlternar }) {
  return (
    <button
      type="button"
      onClick={aoAlternar}
      className="shrink-0 rounded border border-white/80 px-3 py-1 text-sm font-semibold hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {/* O ícone é o do tema que o clique vai ligar. */}
      <span aria-hidden="true">{escuro ? '☀' : '☾'}</span> {escuro ? 'Tema claro' : 'Tema escuro'}
    </button>
  )
}
