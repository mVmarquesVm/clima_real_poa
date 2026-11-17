import { CLASSE_CAMPO, descricaoDoCampo, idDaDica } from '../../lib/formulario'
import ErroDoCampo from './ErroDoCampo'

// Um campo de texto com rótulo, ajuda e erro, sempre ligados entre si:
//   <label for> -> o clique no rótulo leva ao campo, e o leitor de tela lê o nome;
//   aria-describedby -> lê a ajuda e o erro; aria-invalid -> diz "inválido".
// multilinha = uma <textarea> (ex.: a observação).
// O resto das props (inputMode, maxLength, autoComplete...) vai direto para o campo.
export default function CampoTexto({ id, rotulo, valor, aoMudar, dica, erro, obrigatorio, multilinha, ...resto }) {
  const Elemento = multilinha ? 'textarea' : 'input'
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
      <Elemento
        id={id}
        name={id}
        type={multilinha ? undefined : 'text'}
        rows={multilinha ? 3 : undefined}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        required={obrigatorio}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricaoDoCampo(id, { dica, erro })}
        className={`mt-1 ${CLASSE_CAMPO}`}
        {...resto}
      />
      <ErroDoCampo id={id} erro={erro} />
    </div>
  )
}
