import { CLASSE_BOTAO_SECUNDARIO } from '../../lib/formulario'

// Os botões "Editar" e "Apagar" de um cartão do cadastro.
// Numa lista, 5 botões "Editar" iguais confundem o leitor de tela ("Editar,
// botão; Editar, botão..."): o nome do item vai junto, escondido da tela
// (sr-only), e o leitor diz "Editar Praça XV, botão".
// Os ids ("editar-local-3") servem para o foco voltar a este botão quando o
// formulário fechar.
export default function AcoesDoItem({ prefixo, item, aoEditar, aoApagar }) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <button
        type="button"
        id={`editar-${prefixo}-${item.id}`}
        onClick={() => aoEditar(item)}
        className={`${CLASSE_BOTAO_SECUNDARIO} py-1 text-sm`}
      >
        Editar<span className="sr-only"> {item.nome}</span>
      </button>
      <button
        type="button"
        id={`apagar-${prefixo}-${item.id}`}
        onClick={() => aoApagar(item)}
        className={`${CLASSE_BOTAO_SECUNDARIO} py-1 text-sm text-erro`}
      >
        Apagar<span className="sr-only"> {item.nome}</span>
      </button>
    </div>
  )
}
