import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import useLista from '../../ganchos/useLista'
import useLocalizacao from '../../ganchos/useLocalizacao'
import { ATIVIDADES } from '../../lib/cadastro'
import { formatarDistancia } from '../../lib/geo'
import {
  LIMITE_POR_ATIVIDADE,
  diaLocal,
  horaMenosQuente,
  horasDeLazer,
  janelasBoas,
  pontoMaisPerto,
  rankearLocais,
} from '../../lib/recomendacao'
import { api } from '../../servicos/api'
import { buscarPrevisao } from '../../servicos/openmeteo'
import EstadoCarregando from '../comum/EstadoCarregando'
import MensagemErro from '../comum/MensagemErro'
import MelhorHorario from '../previsao/MelhorHorario'
import SeletorAtividade from '../previsao/SeletorAtividade'
import TabelaPrevisao from '../previsao/TabelaPrevisao'
import BotaoPertoDeMim from './BotaoPertoDeMim'
import CartaoRecomendacao from './CartaoRecomendacao'

// O ECharts é pesado: baixa só quando a previsão chegou (como o mapa).
const GraficoPrevisao = lazy(() => import('../previsao/GraficoPrevisao'))

// Funções fixas (fora do componente) para o useLista não buscar de novo a cada render.
const buscarLocais = (opcoes) => api.locais.listar(opcoes)
// Só os pontos ativos: a recomendação não manda ninguém a um bebedouro quebrado.
const buscarPontosAtivos = (opcoes) => api.hidratacao.listar({ ...opcoes, so_ativos: true })

// "Onde e quando ir": a pessoa escolhe a atividade e o app responde, por
// regras simples, o melhor horário (previsão) e, depois, o melhor local.
export default function SecaoRecomendacao({ agora: agoraMs, escuro, aoMostrarRota }) {
  // O useAgora (App) dá um NÚMERO (milissegundos); as contas de hora daqui pedem um Date.
  const agora = new Date(agoraMs)
  const [atividade, setAtividade] = useState('caminhada')
  const previsao = useLista(buscarPrevisao)
  const locais = useLista(buscarLocais)
  const pontos = useLista(buscarPontosAtivos)
  const localizacao = useLocalizacao()
  const titulo = useRef(null)
  const tituloOnde = useRef(null)

  // Só as horas daqui para frente no gráfico e na tabela. O useMemo refaz a
  // lista só quando a HORA vira (e não a cada segundo do relógio): assim o
  // gráfico não é redesenhado à toa.
  const inicioDaHora = agora.getTime() - (agora.getTime() % 3600000)
  const proximas = useMemo(
    () => previsao.itens?.filter((h) => h.hora.getTime() >= inicioDaHora) ?? [],
    [previsao.itens, inicioDaHora],
  )

  // ONDE: os locais do cadastro que servem para a atividade, do melhor para o pior.
  const ranking = locais.itens ? rankearLocais(locais.itens, atividade, localizacao.posicao) : null
  const melhor = ranking?.[0] ?? null
  // QUANDO: a 1ª janela boa (ou a hora menos quente, se não houver nenhuma).
  const horas = previsao.itens ? horasDeLazer(previsao.itens, agora) : []
  const janela = janelasBoas(horas, atividade)[0] ?? null
  const menosQuente = janela ? null : horaMenosQuente(horas)
  // ÁGUA: o ponto aberto mais perto do local, na hora em que a pessoa vai estar lá.
  const ponto =
    melhor && pontos.itens
      ? pontoMaisPerto(pontos.itens, melhor, janela?.inicio ?? agora, janela?.fim ?? agora)
      : null

  function tentarDeNovoOnde() {
    tituloOnde.current?.focus()
    locais.recarregar()
    pontos.recarregar()
  }

  function tentarDeNovo() {
    // O botão "Tentar de novo" some; o foco vai para o título antes, e não se perde no <body>.
    titulo.current?.focus()
    previsao.recarregar()
  }

  return (
    <section aria-labelledby="titulo-recomendacao" className="space-y-4">
      <h2 id="titulo-recomendacao" ref={titulo} tabIndex={-1} className="text-xl font-bold">
        Onde e quando ir
      </h2>
      <SeletorAtividade valor={atividade} aoMudar={setAtividade} />

      <div className="space-y-3">
        <h3 className="text-lg font-bold">Quando ir</h3>
        {previsao.carregando && !previsao.itens && <EstadoCarregando texto="Buscando a previsão do tempo…" />}
        {previsao.erro && !previsao.itens && (
          <MensagemErro titulo="Sem previsão agora" erro={previsao.erro} aoTentarDeNovo={tentarDeNovo} />
        )}
        {previsao.itens && (
          <>
            <MelhorHorario previsao={previsao.itens} atividade={atividade} agora={agora} />
            <Suspense fallback={<EstadoCarregando texto="Carregando o gráfico…" />}>
              <GraficoPrevisao
                hoje={diaLocal(agora)}
                horas={proximas}
                limite={LIMITE_POR_ATIVIDADE[atividade]}
                nomeAtividade={ATIVIDADES[atividade]}
                escuro={escuro}
              />
            </Suspense>
            <TabelaPrevisao horas={proximas} agora={agora} />
            <p className="text-sm text-texto-suave">
              Previsão do Open-Meteo para o Centro (um modelo em grade: é igual para os 4 locais),
              com a mesma fórmula de sensação térmica da estação. Ao sol é o pior caso, e é ele que
              decide.
            </p>
          </>
        )}
      </div>

      <div className="space-y-3">
        <h3 ref={tituloOnde} tabIndex={-1} className="text-lg font-bold">
          Onde ir
        </h3>
        <p className="text-sm text-texto-suave">
          A previsão é a mesma para os locais do Centro; o que deixa um local mais seguro é a
          sombra. Ordem: com sombra primeiro, depois o mais perto de você e, por fim, com
          bebedouro.
        </p>
        <BotaoPertoDeMim localizacao={localizacao} />
        {(locais.carregando || pontos.carregando) && !locais.itens && (
          <EstadoCarregando texto="Buscando os locais cadastrados…" />
        )}
        {(locais.erro || pontos.erro) && !(locais.itens && pontos.itens) && (
          <MensagemErro
            titulo="Sem os locais cadastrados agora"
            erro={locais.erro ?? pontos.erro}
            aoTentarDeNovo={tentarDeNovoOnde}
          />
        )}
        {ranking && ranking.length === 0 && (
          <p className="rounded border border-borda bg-superficie p-4">
            Nenhum local cadastrado é bom para {ATIVIDADES[atividade].toLowerCase()}.{' '}
            <a href="#titulo-cadastro" className="underline">
              Cadastre um local
            </a>{' '}
            e marque essa atividade.
          </p>
        )}
        {melhor && (
          <CartaoRecomendacao
            // Outro local, outro ponto ou outra origem = cartão novo (a rota velha some).
            key={`${melhor.id}-${ponto?.id}-${localizacao.posicao?.lat}-${localizacao.posicao?.lon}`}
            local={melhor}
            janela={janela}
            menosQuente={menosQuente}
            ponto={ponto}
            posicao={localizacao.posicao}
            agora={agora}
            aoMostrarRota={aoMostrarRota}
          />
        )}
        {ranking && ranking.length > 1 && (
          <div>
            <h4 className="font-semibold">Outras opções</h4>
            <ol start={2} className="mt-1 list-decimal space-y-1 pl-6">
              {ranking.slice(1).map((l) => (
                <li key={l.id}>
                  {l.nome}
                  <span className="text-texto-suave">
                    {' '}
                    · {l.tem_sombra ? 'com sombra' : 'sem sombra'}
                    {l.distancia !== null && ` · ${formatarDistancia(l.distancia)}`}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  )
}
