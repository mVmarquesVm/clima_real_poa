// O número do passo, numa bolinha ("1", "2", "3"), na frente do título:
// a página vira uma receita que se lê de cima para baixo.
// O leitor de tela ouve "Passo 1:", e não um "1" solto.
export default function NumeroPasso({ numero }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="mr-2 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-foco font-bold text-fundo"
      >
        {numero}
      </span>
      <span className="sr-only">Passo {numero}: </span>
    </>
  )
}
