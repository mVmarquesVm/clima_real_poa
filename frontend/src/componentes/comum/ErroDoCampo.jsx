import { idDoErro } from '../../lib/formulario'

// A mensagem de erro embaixo de um campo. O id é o que o aria-describedby do
// campo aponta. Ícone + palavra "Erro" (só para o leitor de tela) + texto.
export default function ErroDoCampo({ id, erro }) {
  if (!erro) return null
  return (
    <p id={idDoErro(id)} className="mt-1 text-sm font-semibold text-erro">
      <span aria-hidden="true">⚠ </span>
      <span className="sr-only">Erro: </span>
      {erro}
    </p>
  )
}
