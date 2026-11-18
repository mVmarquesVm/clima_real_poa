import { useEffect, useRef, useState } from 'react'
import { rotulo, TIPOS_DE_HIDRATACAO, descreverHorario } from '../../lib/cadastro'
import { CLASSE_BOTAO_PRINCIPAL, CLASSE_BOTAO_SECUNDARIO } from '../../lib/formulario'
import { formatarDistancia } from '../../lib/geo'
import { AGUA_LONGE_M } from '../../lib/recomendacao'
import { buscarRotaAPe, linkDoOsm, rotaEmLinhaReta } from '../../servicos/rota'
import SimNao from '../comum/SimNao'

// O local recomendado, num cartão curto: ONDE (o local, sombra, bebedouro),
// ÁGUA (o ponto de hidratação aberto mais perto) e COMO CHEGAR, com 2 rotas a pé:
//   - de onde a pessoa está ATÉ O LOCAL (só com a localização ligada);
//   - do local ATÉ A ÁGUA (para quando ela já estiver lá).
// O QUANDO não se repete aqui: a resposta grande do passo 2 já diz.
// "ponto" já vem escolhido (aberto na hora da janela).
// aoMostrarRota(rota) desenha a rota no mapa; aoMostrarRota(null) apaga.
export default function CartaoRecomendacao({ local, ponto, posicao, aoMostrarRota }) {
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

  // Os 2 trajetos possíveis: de onde, para onde e o nome de cada ponta no mapa.
  const TRAJETOS = {
    local: { origem: posicao, destino: local, nomeOrigem: 'Você', nomeDestino: local.nome },
    agua: ponto && { origem: local, destino: ponto, nomeOrigem: local.nome, nomeDestino: `Água: ${ponto.nome}` },
  }

  async function comoChegar(alvo) {
    const trajeto = TRAJETOS[alvo]
    pedido.current?.abort() // dois cliques seguidos: vale só o último
    const controle = new AbortController()
    pedido.current = controle
    setRota({ estado: 'buscando', alvo })
    try {
      const resultado = await buscarRotaAPe(trajeto.origem, trajeto.destino, { signal: controle.signal })
      setRota({ estado: 'ok', alvo, ...resultado })
      aoMostrarRota({ ...resultado, ...trajeto })
    } catch {
      if (controle.signal.aborted) return
      // Plano B: a linha reta no mapa e o link do OpenStreetMap.
      const reta = rotaEmLinhaReta(trajeto.origem, trajeto.destino)
      setRota({ estado: 'linhaReta', alvo, ...reta })
      aoMostrarRota({ ...reta, ...trajeto })
    }
  }

  const trajetoAtual = rota.alvo ? TRAJETOS[rota.alvo] : null
  // "Até o local" (e não "Até o Praça XV"): o nome já está no título do cartão.
  const ateOnde = rota.alvo === 'agua' ? 'Do local até a água' : 'De você até o local'

  return (
    <article aria-labelledby={`recomendado-${local.id}`} className="space-y-4 rounded border-2 border-foco bg-superficie p-4">
      <div>
        <p className="font-semibold text-texto-suave">Vá para:</p>
        <h4 id={`recomendado-${local.id}`} className="text-2xl font-bold">
          {local.nome}
        </h4>
        {local.distancia !== null && <p>A {formatarDistancia(local.distancia)} de você.</p>}
      </div>

      <ul className="text-lg">
        <SimNao sim={local.tem_sombra} texto="Tem sombra" naoTexto="Sem sombra" />
        <SimNao sim={local.tem_bebedouro} texto="Tem bebedouro" naoTexto="Sem bebedouro" />
      </ul>

      <p>
        <span className="font-semibold">Água: </span>
        {ponto ? (
          <>
            {ponto.nome} ({rotulo(TIPOS_DE_HIDRATACAO, ponto.tipo).toLowerCase()},{' '}
            {descreverHorario(ponto).toLowerCase()}), a {formatarDistancia(ponto.distancia)}
            {ponto.distancia > AGUA_LONGE_M && <strong>. É longe: leve a sua água.</strong>}
          </>
        ) : (
          'leve a sua água (nenhum ponto aberto perto).'
        )}
      </p>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {posicao && (
            <button
              type="button"
              onClick={() => comoChegar('local')}
              disabled={rota.estado === 'buscando'}
              className={`${CLASSE_BOTAO_PRINCIPAL} disabled:opacity-60`}
            >
              Como chegar a pé
            </button>
          )}
          {ponto && (
            <button
              type="button"
              onClick={() => comoChegar('agua')}
              disabled={rota.estado === 'buscando'}
              className={`${CLASSE_BOTAO_SECUNDARIO} disabled:opacity-60`}
            >
              Caminho até a água
            </button>
          )}
        </div>
        {!posicao && <p>Para ver o caminho de onde você está, toque em “Perto de mim”, logo acima.</p>}
        {(posicao || ponto) && (
          <p className="text-texto-suave">O caminho é calculado pelo OpenStreetMap, que recebe a partida e a chegada.</p>
        )}
        {/* Sempre montada: o leitor de tela anuncia quando a rota chega. */}
        <p role="status" className="text-lg">
          {rota.estado === 'buscando' && 'Calculando o caminho…'}
          {rota.estado === 'ok' && (
            <>
              {ateOnde}:{' '}
              <strong className="tabular-nums">
                {formatarDistancia(rota.metros)} a pé, cerca de {Math.max(1, Math.round(rota.segundos / 60))} min.
              </strong>{' '}
              <a href="#titulo-mapa" className="underline">
                Ver no mapa
              </a>
            </>
          )}
          {rota.estado === 'linhaReta' && trajetoAtual && (
            <>
              <span className="text-erro">⚠ </span>
              Não deu para calcular o caminho pelas ruas agora. {ateOnde}, em linha reta, são{' '}
              {formatarDistancia(rota.metros)}.{' '}
              <a
                href={linkDoOsm(trajetoAtual.origem, trajetoAtual.destino)}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Abrir o caminho no OpenStreetMap (nova aba)
              </a>
            </>
          )}
        </p>
      </div>
    </article>
  )
}
