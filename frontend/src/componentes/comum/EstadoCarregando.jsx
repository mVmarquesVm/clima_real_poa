// "Carregando…" com uma rodinha. O role="status" faz o leitor de tela anunciar
// o texto sem interromper a pessoa. A rodinha é só enfeite (aria-hidden) e para
// de girar com prefers-reduced-motion (a regra global do index.css).
export default function EstadoCarregando({ texto = 'Carregando…' }) {
  return (
    <p role="status" className="flex items-center gap-3 rounded border border-borda bg-superficie p-4">
      <span
        aria-hidden="true"
        className="size-5 shrink-0 animate-spin rounded-full border-2 border-borda-forte border-t-foco"
      />
      {texto}
    </p>
  )
}
