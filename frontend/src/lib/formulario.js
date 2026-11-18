// Peças comuns a todos os campos de formulário (CampoTexto, CampoEscolha, CampoOpcoes).

// O id do texto de ajuda e o da mensagem de erro de um campo.
export const idDaDica = (id) => `${id}-dica`
export const idDoErro = (id) => `${id}-erro`

// O aria-describedby liga o campo à ajuda e ao erro: ao chegar no campo, o
// leitor de tela lê o rótulo, depois a ajuda e depois o erro.
// Sem nenhum dos dois, o atributo nem aparece (undefined).
export function descricaoDoCampo(id, { dica, erro }) {
  const ids = [dica && idDaDica(id), erro && idDoErro(id)].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
}

// A caixa de texto/lista: só tokens do tema. Com erro (aria-invalid), a borda
// fica grossa e na cor de erro; a mensagem com ⚠ vai junto (nunca só a cor).
export const CLASSE_CAMPO =
  'w-full rounded border border-borda-forte bg-superficie px-3 py-2 text-texto ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco ' +
  'aria-invalid:border-2 aria-invalid:border-erro'

// Os botões do cadastro: o principal (Salvar) e o secundário (Cancelar, Editar...).
export const CLASSE_BOTAO =
  'rounded px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco'
export const CLASSE_BOTAO_PRINCIPAL = `${CLASSE_BOTAO} bg-foco text-fundo`
export const CLASSE_BOTAO_SECUNDARIO = `${CLASSE_BOTAO} border border-borda-forte bg-superficie hover:bg-superficie-2`
