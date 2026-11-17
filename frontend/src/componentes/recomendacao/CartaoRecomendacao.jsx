import { useEffect, useRef, useState } from 'react'
import { rotulo, TIPOS_DE_HIDRATACAO, TIPOS_DE_LOCAL, descreverHorario } from '../../lib/cadastro'
import { CLASSE_BOTAO_SECUNDARIO } from '../../lib/formulario'
import { formatarDistancia } from '../../lib/geo'
import { numero } from '../../lib/formato'
import { AGUA_LONGE_M, diaLocal, horaLocal } from '../../lib/recomendacao'
import { buscarRotaAPe, linkDoOsm, rotaEmLinhaReta } from '../../servicos/rota'
import SimNao from '../comum/SimNao'

// O local recomendado, num cartão: ONDE (local, distância, sombra, bebedouro),
// QUANDO (a 1ª janela boa) e ÁGUA (o ponto de hidratação aberto mais perto,
// com a rota a pé). "ponto" já vem escolhido (aberto na hora da janela).
// aoMostrarRota(rota) desenha a rota no mapa; aoMostrarRota(null) apaga.
export default function CartaoRecomendacao({ local, janela, menosQuente, ponto, posicao, agora, aoMostrarRota }) {
  const [rota, setRota] = useState({ estado: 'parado' })
  const pedido = useRef(null)

  // Quando o cartão sai (outra atividade, outro local), a rota velha sai do
  // mapa e um pedido que ainda estava a caminho é cancelado.
  useEffect(
    () => () => {
      pedido.current?.abort()
      aoMostrarRota(null)
    },
    [aoMostrarRota],
  )
  const hoje = diaLocal(agora)
  const quando = (data) => (diaLocal(data) === hoje ? 'hoje' : 'amanhã')

  // Sai de onde a pessoa está (se ela mostrou) ou do próprio local.
  const origem = posicao ?? local
  const nomeDaOrigem = posicao ? 'de onde você está' : `do ${local.nome}`

  async function comoChegar() {
    pedido.current?.abort() // dois cliques seguidos: vale só o último
    const controle = new AbortController()
    pedido.current = controle
    setRota({ estado: 'buscando' })
    try {
      const resultado = await buscarRotaAPe(origem, ponto, { signal: controle.signal })
      setRota({ estado: 'ok', ...resultado })
      aoMostrarRota({ ...resultado, origem, destino: ponto })
    } catch {
      if (controle.signal.aborted) return
      // Plano B: a linha reta no mapa e o link do OpenStreetMap.
      const reta = rotaEmLinhaReta(origem, ponto)
      setRota({ estado: 'linhaReta', ...reta })
      aoMostrarRota({ ...reta, origem, destino: ponto })
    }
  }

  return (
    <article aria-labelledby={`recomendado-${local.id}`} className="space-y-3 rounded border-2 border-foco bg-superficie p-4">
      <div>
        <p className="text-sm font-semibold text-texto-suave">Recomendado para você</p>
        <h4 id={`recomendado-${local.id}`} className="text-lg font-bold">
          {local.nome}
        </h4>
        <p className="text-sm text-texto-suave">
          {rotulo(TIPOS_DE_LOCAL, local.tipo)}
          {local.distancia !== null && ` · a ${formatarDistancia(local.distancia)} de você, em linha reta`}
        </p>
      </div>

      <ul className="text-sm">
        <SimNao sim={local.tem_sombra} texto="Sombra" />
        <SimNao sim={local.tem_bebedouro} texto="Bebedouro" />
      </ul>

      <p>
        <span className="font-semibold">Quando: </span>
        {janela ? (
          <span className="font-mono tabular-nums">
            {quando(janela.inicio)}, das {horaLocal(janela.inicio)}h às {horaLocal(janela.fim) || 24}h
            (até {numero(janela.taMax)} °C ao sol)
          </span>
        ) : !menosQuente ? (
          <span>sem previsão do tempo agora. Veja o nível ao vivo no Largo, lá em cima.</span>
        ) : (
          <span>
            nenhum horário seguro hoje nem amanhã. O menos quente é {quando(menosQuente.hora)} às{' '}
            {horaLocal(menosQuente.hora)}h; fique na sombra e leve água.
          </span>
        )}
      </p>

      <div className="space-y-2">
        <p>
          <span className="font-semibold">Água: </span>
          {ponto ? (
            <>
              {ponto.nome} ({rotulo(TIPOS_DE_HIDRATACAO, ponto.tipo).toLowerCase()},{' '}
              {descreverHorario(ponto).toLowerCase()}), a {formatarDistancia(ponto.distancia)} do local
              {ponto.distancia > AGUA_LONGE_M && (
                <strong>. É longe: leve a sua água.</strong>
              )}
            </>
          ) : (
            'nenhum ponto de hidratação cadastrado aberto nesse horário. Leve a sua água.'
          )}
        </p>

        {ponto && (
          <>
            <button
              type="button"
              onClick={comoChegar}
              disabled={rota.estado === 'buscando'}
              className={`${CLASSE_BOTAO_SECUNDARIO} disabled:opacity-60`}
            >
              Como chegar a pé até a água
            </button>
            <p className="text-sm text-texto-suave">
              A rota sai {nomeDaOrigem}. Ao tocar, {posicao ? 'a sua localização e o destino' : 'a partida e a chegada'}{' '}
              vão para o serviço de rotas da FOSSGIS (OpenStreetMap).
            </p>
            {/* Sempre montada: o leitor de tela anuncia quando a rota chega. */}
            <p role="status">
              {rota.estado === 'buscando' && 'Calculando a rota…'}
              {rota.estado === 'ok' && (
                <>
                  <strong className="font-mono tabular-nums">
                    {formatarDistancia(rota.metros)} a pé, cerca de {Math.max(1, Math.round(rota.segundos / 60))} min.
                  </strong>{' '}
                  <a href="#titulo-locais" className="underline">
                    Ver a rota no mapa
                  </a>
                </>
              )}
              {rota.estado === 'linhaReta' && (
                <>
                  <span className="text-erro">⚠ </span>
                  Não deu para calcular a rota pelas ruas agora. Em linha reta são{' '}
                  {formatarDistancia(rota.metros)} (a linha está no mapa).{' '}
                  <a href={linkDoOsm(origem, ponto)} target="_blank" rel="noreferrer" className="underline">
                    Abrir a rota no OpenStreetMap (nova aba)
                  </a>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </article>
  )
}
