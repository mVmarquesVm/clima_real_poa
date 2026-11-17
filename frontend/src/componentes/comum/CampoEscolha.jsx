import { CLASSE_CAMPO, descricaoDoCampo, idDaDica } from '../../lib/formulario'
import ErroDoCampo from './ErroDoCampo'

// Uma lista de escolha (<select>) com rótulo, ajuda e erro.
// opcoes = a tabela {valor: texto} da lib/cadastro.js (ex.: TIPOS_DE_LOCAL).
// A 1ª opção, vazia, obriga a pessoa a escolher: sem ela, o 1º tipo viria
// marcado sem ninguém ter decidido.
export default function CampoEscolha({ id, rotulo, valor, aoMudar, opcoes, dica, erro, obrigatorio }) {
  return (
    <div>
      <label htmlFor={id} className="block font-semibold">
        {rotulo}
        {obrigatorio && <span className="font-normal text-texto-suave"> (obrigatório)</span>}
      </label>
      {dica && (
        <p id={idDaDica(id)} className="text-sm text-texto-suave">
          {dica}
        </p>
      )}
      <select
        id={id}
        name={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        required={obrigatorio}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricaoDoCampo(id, { dica, erro })}
        className={`mt-1 ${CLASSE_CAMPO}`}
      >
        <option value="">Escolha…</option>
        {Object.entries(opcoes).map(([v, texto]) => (
          <option key={v} value={v}>
            {texto}
          </option>
        ))}
      </select>
      <ErroDoCampo id={id} erro={erro} />
    </div>
  )
}
