import { ATIVIDADES, rotulo, TIPOS_DE_LOCAL } from '../../lib/cadastro'

// Um "sim/não" com ícone + texto (nunca só a cor ou só o ícone).
function SimNao({ sim, texto }) {
  return (
    <li>
      <span aria-hidden="true">{sim ? '✓' : '✕'} </span>
      {sim ? texto : `Sem ${texto.toLowerCase()}`}
    </li>
  )
}

// Os locais de lazer cadastrados, em cartões. É uma lista (<ul>) de verdade:
// o leitor de tela diz "lista, 5 itens", e cada cartão começa pelo nome (<h4>),
// então dá para pular de local em local pelos títulos.
export default function ListaLocais({ locais }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {locais.map((local) => (
        <li key={local.id} className="space-y-2 rounded border border-borda bg-superficie p-4">
          <h4 className="font-semibold">{local.nome}</h4>
          <p className="text-sm text-texto-suave">{rotulo(TIPOS_DE_LOCAL, local.tipo)}</p>
          <ul className="text-sm">
            <SimNao sim={local.tem_sombra} texto="Sombra" />
            <SimNao sim={local.tem_bebedouro} texto="Bebedouro" />
          </ul>
          <div>
            <p className="text-sm text-texto-suave">Bom para</p>
            <ul className="mt-1 flex flex-wrap gap-1">
              {local.atividades.map((a) => (
                <li key={a} className="rounded border border-borda bg-superficie-2 px-2 py-0.5 text-sm">
                  {rotulo(ATIVIDADES, a)}
                </li>
              ))}
            </ul>
          </div>
          {local.observacao && <p className="text-sm text-texto-suave">{local.observacao}</p>}
        </li>
      ))}
    </ul>
  )
}
