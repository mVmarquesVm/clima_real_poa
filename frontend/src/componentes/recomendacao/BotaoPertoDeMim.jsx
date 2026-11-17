import { formatarDistancia } from '../../lib/geo'
import { CLASSE_BOTAO_SECUNDARIO } from '../../lib/formulario'

// O botão "Perto de mim" e o que aconteceu com o pedido, em texto.
// O texto do resultado fica numa região role="status" SEMPRE montada: o leitor
// de tela anuncia quando a localização chega (ou dá erro) sem tirar o foco.
export default function BotaoPertoDeMim({ localizacao }) {
  const { estado, posicao, erro, pedir, esquecer } = localizacao
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={pedir}
          disabled={estado === 'buscando'}
          className={`${CLASSE_BOTAO_SECUNDARIO} disabled:opacity-60`}
        >
          <span aria-hidden="true">⌖ </span>
          {estado === 'ok' ? 'Atualizar minha localização' : 'Perto de mim'}
        </button>
        {estado === 'ok' && (
          <button type="button" onClick={esquecer} className={CLASSE_BOTAO_SECUNDARIO}>
            Esquecer minha localização
          </button>
        )}
      </div>
      <p role="status" className="text-sm text-texto-suave">
        {estado === 'buscando' && 'Descobrindo onde você está…'}
        {estado === 'ok' &&
          `Ordenando pela distância de você (precisão de cerca de ${formatarDistancia(posicao.precisao)}).`}
        {estado === 'erro' && <span className="text-erro">⚠ {erro}</span>}
        {estado === 'parado' && 'Sem a sua localização, a lista não usa a distância.'}
      </p>
    </div>
  )
}
