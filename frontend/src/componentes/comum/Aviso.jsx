import { CLASSE_BOTAO_SECUNDARIO } from '../../lib/formulario'

// O aviso de "deu certo" (ou de erro) depois de salvar ou apagar.
// A região com role="status" fica SEMPRE na página, mesmo vazia: o leitor de
// tela só anuncia mudanças numa região que já existia. Se ela nascesse junto
// com o texto, o aviso passaria em silêncio.
// Só o TEXTO fica dentro da região: com o botão "Fechar" lá dentro, o leitor
// leria "Local X salvo. Fechar aviso" como se fosse uma frase só.
// O aviso não some sozinho (a pessoa pode ler com calma): some no "Fechar" ou
// na próxima ação.
//   aviso: null | {tipo: 'sucesso' | 'erro', texto}
export default function Aviso({ aviso, aoFechar }) {
  const caixa = aviso
    ? `flex flex-wrap items-center justify-between gap-3 rounded border-2 bg-superficie p-3 ${
        aviso.tipo === 'erro' ? 'border-erro' : 'border-risco-verde'
      }`
    : ''
  return (
    <div className={caixa}>
      <p role="status" aria-live="polite" className={aviso ? 'font-semibold' : ''}>
        {aviso && (
          <>
            <span aria-hidden="true">{aviso.tipo === 'erro' ? '⚠ ' : '✓ '}</span>
            {aviso.texto}
          </>
        )}
      </p>
      {aviso && (
        <button type="button" onClick={aoFechar} className={`${CLASSE_BOTAO_SECUNDARIO} py-1 text-sm`}>
          Fechar<span className="sr-only"> aviso</span>
        </button>
      )}
    </div>
  )
}
