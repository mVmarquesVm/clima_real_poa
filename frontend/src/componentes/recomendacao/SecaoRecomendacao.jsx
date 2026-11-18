import { useMemo, useRef, useState } from 'react'
import useLista from '../../ganchos/useLista'
import useLocalizacao from '../../ganchos/useLocalizacao'
import { ATIVIDADES } from '../../lib/cadastro'
import { formatarDistancia } from '../../lib/geo'
import { aoClicarLink } from '../../lib/navegacao'
import {
  horasDeLazer,
  janelasBoas,
  pontoMaisPerto,
  rankearLocais,
} from '../../lib/recomendacao'
import { api } from '../../servicos/api'
import { buscarPrevisao } from '../../servicos/openmeteo'
import EstadoCarregando from '../comum/EstadoCarregando'
import MensagemErro from '../comum/MensagemErro'
import NumeroPasso from '../comum/NumeroPasso'
import DetalhesPrevisao from '../previsao/DetalhesPrevisao'
import MelhorHorario from '../previsao/MelhorHorario'
import SeletorAtividade from '../previsao/SeletorAtividade'
import BotaoPertoDeMim from './BotaoPertoDeMim'
import CartaoRecomendacao from './CartaoRecomendacao'

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
  // QUANDO: a 1ª janela boa (para achar a água aberta nessa hora).
  const horas = previsao.itens ? horasDeLazer(previsao.itens, agora) : []
  const janela = janelasBoas(horas, atividade)[0] ?? null
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
      <h2 id="titulo-recomendacao" ref={titulo} tabIndex={-1} className="text-2xl font-bold">
        Planeje o seu passeio
      </h2>
      <p className="text-lg">Escolha o que você vai fazer. O app diz se está quente demais, a melhor hora e para onde ir.</p>
      <SeletorAtividade valor={atividade} aoMudar={setAtividade} />

      <div className="space-y-3">
        <h3 className="flex items-center text-xl font-bold">
          <NumeroPasso numero={2} />
          Quando ir
        </h3>
        {previsao.carregando && !previsao.itens && <EstadoCarregando texto="Buscando a previsão do tempo…" />}
        {previsao.erro && !previsao.itens && (
          <MensagemErro titulo="Sem previsão agora" erro={previsao.erro} aoTentarDeNovo={tentarDeNovo} />
        )}
        {previsao.itens && (
          <>
            <MelhorHorario previsao={previsao.itens} atividade={atividade} agora={agora} />
            <DetalhesPrevisao horas={proximas} atividade={atividade} agora={agora} escuro={escuro} />
          </>
        )}
      </div>

      <div className="space-y-3">
        <h3 ref={tituloOnde} tabIndex={-1} className="flex items-center text-xl font-bold">
          <NumeroPasso numero={3} />
          Onde ir e como chegar
        </h3>
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
            <a href="#titulo-cadastro" onClick={(e) => aoClicarLink(e, 'titulo-cadastro')} className="underline">
              Cadastre um local
            </a>{' '}
            e marque essa atividade.
          </p>
        )}
        {/* O cartão espera a previsão: a água depende da HORA da ida, e sem
            isso o cartão aparecia com um ponto e trocava para outro logo depois. */}
        {melhor && !previsao.itens && !previsao.erro && <EstadoCarregando texto="Escolhendo o melhor local…" />}
        {melhor && (previsao.itens || previsao.erro) && (
          <CartaoRecomendacao
            // Outro local, outro ponto ou outra origem = cartão novo (a rota velha some).
            key={`${melhor.id}-${ponto?.id}-${localizacao.posicao?.lat}-${localizacao.posicao?.lon}`}
            local={melhor}
            ponto={ponto}
            posicao={localizacao.posicao}
            aoMostrarRota={aoMostrarRota}
          />
        )}
        {ranking && ranking.length > 1 && (
          // Fechadas: a resposta é o cartão acima; as outras são só para quem quer escolher.
          <details>
            <summary className="cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco">
              Ver outras opções ({ranking.length - 1})
            </summary>
            <ol start={2} className="mt-2 list-decimal space-y-1 pl-6">
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
          </details>
        )}
      </div>
    </section>
  )
}
