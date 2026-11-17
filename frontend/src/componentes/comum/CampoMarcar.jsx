// Uma caixa de marcar sozinha (sim/não), com o texto ao lado dentro do <label>:
// clicar no texto também marca, e o leitor de tela lê o texto como o nome da caixa.
// dica (opcional) = um texto de apoio embaixo, ligado por aria-describedby.
export default function CampoMarcar({ id, rotulo, valor, aoMudar, dica }) {
  return (
    <div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          id={id}
          name={id}
          checked={valor}
          onChange={(e) => aoMudar(e.target.checked)}
          aria-describedby={dica ? `${id}-dica` : undefined}
          className="size-4 accent-foco focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
        />
        {rotulo}
      </label>
      {dica && (
        <p id={`${id}-dica`} className="ml-6 text-sm text-texto-suave">
          {dica}
        </p>
      )}
    </div>
  )
}
