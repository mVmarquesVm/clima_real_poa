import { useEffect, useId, useRef } from 'react'
import { dataHora, numero, tempoDesde } from '../../lib/formato'
import { situacao } from '../../lib/leitura'
import { ehDia } from '../../lib/sol'
import Dado from '../comum/Dado'
import SeloRisco from '../risco/SeloRisco'

// O que cada regra de cobertura quer dizer, em português simples.
// A regra vem do Python (fontes/cobertura.py), pelo locais.json.
const REGRAS = {
  'local inteiro':
    'O local inteiro: ele é quase todo construído (80% ou mais), então a estação representa a área toda.',
  'raio de 50 m':
    'Um raio de 50 m em volta da estação: o local é misto (piso, árvore, grama), e a OMM diz que uma estação representa só “algumas dezenas de metros” nesses casos.',
}

// Painel de detalhes de uma estação, aberto ao clicar (ou dar Enter) no marcador.
// É um diálogo NÃO modal: o resto da página continua usável. Ao abrir, o foco
// vai para o título (o leitor de tela lê o nome do local); o Esc ou o botão
// "Fechar" fecham, e o Mapa devolve o foco ao marcador.
export default function PainelEstacao({ local, estado, agora, aoFechar }) {
  const idTitulo = useId()
  const titulo = useRef(null)

  // Foca o título sempre que o painel abre ou troca de local.
  useEffect(() => {
    titulo.current?.focus()
  }, [local.id])

  function teclas(evento) {
    if (evento.key === 'Escape') {
      evento.stopPropagation()
      aoFechar()
    }
  }

  const { cobertura, satelite } = local

  return (
    <section
      role="dialog"
      aria-labelledby={idTitulo}
      onKeyDown={teclas}
      className="space-y-3 rounded border border-gray-300 bg-white p-4 shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          id={idTitulo}
          ref={titulo}
          tabIndex={-1}
          className="text-lg font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
        >
          {local.nome}
        </h3>
        <button
          type="button"
          onClick={aoFechar}
          className="shrink-0 rounded border border-gray-400 px-2 py-1 text-sm font-semibold hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
        >
          Fechar <span aria-hidden="true">✕</span>
        </button>
      </div>
      <p className="text-sm text-gray-700">
        Estação {local.id} · {local.tipo}
      </p>

      {estado ? (
        <AoVivo estado={estado} agora={agora} />
      ) : (
        <p className="text-sm">
          <strong>Sem equipamento publicando ainda.</strong> Este local aparece só com os dados do
          satélite.
        </p>
      )}

      <div className="space-y-1">
        <h4 className="font-semibold">Área que a estação representa</h4>
        <p className="text-sm">{REGRAS[cobertura.regra] ?? cobertura.regra}</p>
        <p className="text-sm text-gray-700">
          Nessa área:{' '}
          <span className="font-mono tabular-nums">{numero(cobertura.construido * 100, 0)}%</span>{' '}
          construído,{' '}
          <span className="font-mono tabular-nums">{numero(cobertura.arvore * 100, 0)}%</span>{' '}
          árvore e <span className="font-mono tabular-nums">{numero(cobertura.grama * 100, 0)}%</span>{' '}
          grama (ESA WorldCover 2021; arredondado, a soma pode dar 99% ou 101%).
        </p>
      </div>

      <div className="space-y-1">
        <h4 className="font-semibold">Piso pelo satélite (verão)</h4>
        <dl className="grid grid-cols-2 gap-3">
          <Dado rotulo="Piso médio" valor={`${numero(satelite.pisoMedioVerao)} °C`} />
          <Dado rotulo="Ranking do piso" valor={`${satelite.posicao}º de 4`} />
        </dl>
        <p className="text-xs text-gray-700">
          O Landsat mede a superfície, por volta das 10h20, em {satelite.passagens} passagens. É o
          piso do problema, e não a sensação de quem está ali.
        </p>
      </div>
    </section>
  )
}

function AoVivo({ estado, agora }) {
  const { leitura, erro } = estado
  if (!leitura) {
    return (
      <p className="text-sm">
        {erro ? `Não deu para ler a estação agora (${erro}).` : 'Buscando a leitura da estação…'}
      </p>
    )
  }

  const { idade, recente, nivel } = situacao(leitura, agora)
  return (
    <div className="space-y-2">
      <SeloRisco nivel={nivel} dia={ehDia(new Date(agora))} />
      <p className="text-sm text-gray-700">
        {recente ? (
          <>Atualizado {tempoDesde(idade)}.</>
        ) : (
          <>
            <strong>Sem dado recente.</strong> Última leitura em {dataHora(leitura.criadoEm)}.
          </>
        )}
      </p>
      <dl className={`grid grid-cols-2 gap-3 ${recente ? '' : 'text-gray-600'}`}>
        <Dado rotulo="Sensação térmica" valor={`${numero(leitura.sensacao)} °C`} destaque />
        <Dado rotulo="Temperatura do ar" valor={`${numero(leitura.temperatura)} °C`} />
        <Dado rotulo="Umidade" valor={`${numero(leitura.umidade, 0)}%`} />
        <Dado rotulo="Vento" valor={`${numero(leitura.vento)} m/s`} />
      </dl>
    </div>
  )
}
