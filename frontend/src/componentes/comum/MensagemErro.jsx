// Caixa de erro com "Tentar de novo". Serve para o cadastro e, depois, para a
// recomendação. O role="alert" faz o leitor de tela anunciar na hora.
// O erro nunca vai só pela cor: o ícone ⚠ e a palavra "Erro" vão junto.
export default function MensagemErro({ titulo = 'Não deu certo', erro, aoTentarDeNovo }) {
  return (
    <div role="alert" className="space-y-3 rounded border-2 border-risco-vermelho bg-superficie p-4">
      <p className="font-semibold">
        <span aria-hidden="true">⚠ </span>
        <span className="sr-only">Erro: </span>
        {titulo}
      </p>
      <p>{erro?.message ?? 'Erro desconhecido.'}</p>
      {aoTentarDeNovo && (
        <button
          type="button"
          onClick={aoTentarDeNovo}
          className="rounded border border-borda-forte bg-superficie px-4 py-2 font-semibold hover:bg-superficie-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          Tentar de novo
        </button>
      )}
    </div>
  )
}
