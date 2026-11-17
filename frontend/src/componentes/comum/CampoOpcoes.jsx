import { descricaoDoCampo, idDaDica } from '../../lib/formulario'
import ErroDoCampo from './ErroDoCampo'

// Um grupo de caixas de marcar que vira UMA lista (ex.: as atividades).
// <fieldset> + <legend>: o leitor de tela diz "Bom para, grupo" antes de cada
// caixa, então a pessoa sabe a que pergunta a caixa responde.
// valor = a lista marcada (ex.: ["caminhada", "crianca"]).
export default function CampoOpcoes({ id, rotulo, valor, aoMudar, opcoes, dica, erro, obrigatorio }) {
  function alternar(opcao, marcada) {
    // Mantém a ordem da tabela, e não a ordem dos cliques.
    const nova = Object.keys(opcoes).filter((o) => (o === opcao ? marcada : valor.includes(o)))
    aoMudar(nova)
  }

  return (
    <fieldset aria-describedby={descricaoDoCampo(id, { dica, erro })}>
      <legend className="font-semibold">
        {rotulo}
        {obrigatorio && <span className="font-normal text-texto-suave"> (marque pelo menos 1)</span>}
      </legend>
      {dica && (
        <p id={idDaDica(id)} className="text-sm text-texto-suave">
          {dica}
        </p>
      )}
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
        {Object.entries(opcoes).map(([opcao, texto]) => (
          <label key={opcao} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`${id}-${opcao}`}
              name={id}
              value={opcao}
              checked={valor.includes(opcao)}
              onChange={(e) => alternar(opcao, e.target.checked)}
              // Na caixa também: é ela que recebe o foco quando o grupo tem erro,
              // e alguns leitores de tela (ex.: o NVDA) não leem a descrição do fieldset.
              aria-invalid={erro ? true : undefined}
              aria-describedby={descricaoDoCampo(id, { dica, erro })}
              className="size-4 accent-foco focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
            />
            {texto}
          </label>
        ))}
      </div>
      <ErroDoCampo id={id} erro={erro} />
    </fieldset>
  )
}
