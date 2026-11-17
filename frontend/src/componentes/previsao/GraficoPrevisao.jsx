import { useEffect, useRef } from 'react'
// Só os pedaços do ECharts que o gráfico usa: o pacote inteiro pesa ~1 MB, e
// assim o navegador baixa bem menos (é o "importar só os módulos usados").
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import { corDoToken } from '../../lib/cores'
import { numero } from '../../lib/formato'
import { arredondar, diaLocal, horaLocal } from '../../lib/recomendacao'
import { LIMITES, NIVEIS, indicePorTA } from '../../lib/risco'

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  AriaComponent,
  SVGRenderer, // SVG em vez de canvas: o texto fica nítido no zoom e o navegador o enxerga
])

// As faixas de risco ao fundo, de baixo para cima (a mesma régua da estação).
const FAIXAS = [
  { nivel: 'amarelo', de: LIMITES.amarelo, ate: LIMITES.laranja },
  { nivel: 'laranja', de: LIMITES.laranja, ate: LIMITES.vermelho },
  { nivel: 'vermelho', de: LIMITES.vermelho, ate: LIMITES.roxo },
  { nivel: 'roxo', de: LIMITES.roxo, ate: 70 },
]

const UMA_HORA = 3600000

// Previsão da sensação térmica em linha: AO SOL (a que decide) e NA SOMBRA
// (para comparar). Ao fundo, as faixas de risco; a linha tracejada é o limite
// da atividade escolhida; a noite fica sombreada.
// "escuro" só serve para redesenhar com as cores do tema novo.
export default function GraficoPrevisao({ horas, limite, nomeAtividade, escuro, hoje }) {
  const caixa = useRef(null)
  const grafico = useRef(null)

  // Cria o gráfico uma vez e o acompanha no tamanho da caixa (celular girando,
  // janela mudando de tamanho). Ao sair da tela, libera a memória (dispose).
  useEffect(() => {
    const instancia = echarts.init(caixa.current, null, { renderer: 'svg', locale: 'PT-br' })
    grafico.current = instancia
    const observador = new ResizeObserver(() => instancia.resize())
    observador.observe(caixa.current)
    return () => {
      observador.disconnect()
      instancia.dispose()
      grafico.current = null
    }
  }, [])

  // Os dados ou o tema mudaram: monta as opções de novo (notMerge = do zero).
  useEffect(() => {
    grafico.current?.setOption(opcoes(horas, limite, nomeAtividade, hoje), { notMerge: true })
  }, [horas, limite, nomeAtividade, escuro, hoje])

  // role="img" + aria-label: o leitor de tela ouve um resumo; a tabela logo
  // abaixo (TabelaPrevisao) tem todos os números, hora a hora.
  return (
    <div className="space-y-1">
      {/* Legenda em HTML: o traço de cada linha + o nome (nunca só a cor). */}
      <ul className="flex flex-wrap gap-x-4 text-sm" aria-hidden="true">
        <li className="flex items-center gap-2">
          <span className="inline-block w-6 border-t-2 border-texto" /> Ao sol (é o que decide)
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block w-6 border-t-2 border-dashed border-texto-suave" /> Na sombra
        </li>
      </ul>
      <div
        ref={caixa}
        role="img"
        aria-label={resumo(horas, limite, nomeAtividade, hoje)}
        className="h-72 w-full rounded border border-borda bg-superficie md:h-80"
      />
    </div>
  )
}

// O resumo em frase: a máxima e a hora dela, e quantas horas ficam abaixo do limite.
function resumo(horas, limite, nomeAtividade, hoje) {
  if (!horas.length) return 'Sem previsão.'
  const pico = horas.reduce((a, h) => (h.taSol > a.taSol ? h : a))
  const abaixo = horas.filter((h) => arredondar(h.taSol) < limite).length
  return (
    `Gráfico da sensação térmica prevista ao sol nas próximas ${horas.length} horas. ` +
    `Máxima de ${numero(pico.taSol)} °C ${qualDia(pico.hora, hoje)} às ${horaLocal(pico.hora)}h. ` +
    `${abaixo} de ${horas.length} horas abaixo do limite de ${limite} °C para ${nomeAtividade}.`
  )
}

function opcoes(horas, limite, nomeAtividade, hoje) {
  const cor = {
    texto: corDoToken('texto'),
    suave: corDoToken('texto-suave'),
    borda: corDoToken('borda'),
    superficie: corDoToken('superficie'),
    noite: corDoToken('superficie-2'),
  }
  const fonte = { color: cor.suave, fontSize: 12 }

  // A escala do eixo: 2 °C de folga, sempre mostrando o limite da atividade.
  const tas = horas.flatMap((h) => [h.taSol, h.taSombra])
  const yMin = Math.floor(Math.min(...tas, limite) - 2)
  const yMax = Math.ceil(Math.max(...tas, limite) + 2)
  // Só as faixas que aparecem, cortadas na escala: o nome fica no meio do pedaço visível.
  const faixasVisiveis = FAIXAS.map((f) => ({ ...f, de: Math.max(f.de, yMin), ate: Math.min(f.ate, yMax) })).filter(
    (f) => f.de < f.ate,
  )

  // Os trechos de noite viram faixas verticais (cada hora sem sol, juntando as seguidas).
  const noites = []
  for (const h of horas) {
    const fim = h.hora.getTime() + UMA_HORA
    const ultima = noites.at(-1)
    if (h.dia) continue
    if (ultima && ultima[1].xAxis === h.hora.getTime()) ultima[1].xAxis = fim
    else noites.push([{ xAxis: h.hora.getTime() }, { xAxis: fim }])
  }

  return {
    animation: false, // respeita quem pede menos movimento, e o gráfico já aparece pronto
    aria: { enabled: true, label: { description: resumo(horas, limite, nomeAtividade, hoje) } },
    // À direita, a margem é para os nomes das faixas, FORA da área das linhas:
    // assim a curva nunca passa por cima deles (no celular passava).
    grid: { left: 44, right: 64, top: 24, bottom: 32 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: cor.suave } }, // a "mira" vertical
      backgroundColor: cor.superficie,
      borderColor: cor.borda,
      textStyle: { color: cor.texto },
      formatter: (pontos) => dica(horas[pontos[0].dataIndex], hoje),
    },
    xAxis: {
      type: 'time',
      axisLabel: {
        ...fonte,
        hideOverlap: true,
        // 0h mostra o dia (17/11), as outras horas só "15h".
        formatter: (valor) => {
          const d = new Date(valor)
          const hl = horaLocal(d)
          return hl === 0
            ? d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
            : `${hl}h`
        },
      },
      axisLine: { lineStyle: { color: cor.borda } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: '°C',
      nameTextStyle: fonte,
      min: yMin,
      max: yMax,
      axisLabel: fonte,
      splitLine: { lineStyle: { color: cor.borda, opacity: 0.6 } },
    },
    series: [
      {
        name: 'Ao sol',
        type: 'line',
        showSymbol: false,
        symbolSize: 8,
        lineStyle: { width: 2, color: cor.texto },
        itemStyle: { color: cor.texto },
        data: horas.map((h) => [h.hora.getTime(), arredondar(h.taSol)]),
        // Faixas de risco ao fundo, bem claras, com o nome escrito (nunca só a cor).
        markArea: {
          silent: true,
          data: faixasVisiveis.map((f) => [
            {
              yAxis: f.de,
              itemStyle: { color: corDoToken(`risco-${f.nivel}`), opacity: 0.14 },
              label: { show: true, position: 'right', distance: 4, color: cor.suave, fontSize: 11 },
              name: NIVEIS.find((n) => n.id === f.nivel).nome,
            },
            { yAxis: f.ate },
          ]),
        },
        // O limite da atividade escolhida.
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: cor.texto, type: 'dashed', width: 1.5 },
          label: {
            position: 'insideStartTop',
            color: cor.texto,
            backgroundColor: cor.superficie,
            padding: [1, 3],
            borderRadius: 2,
            formatter: `Limite para ${nomeAtividade.toLowerCase()}: ${limite} °C`,
          },
          data: [{ yAxis: limite }],
        },
      },
      {
        name: 'Na sombra',
        type: 'line',
        showSymbol: false,
        symbolSize: 8,
        lineStyle: { width: 2, color: cor.suave, type: [6, 4] },
        itemStyle: { color: cor.suave },
        data: horas.map((h) => [h.hora.getTime(), arredondar(h.taSombra)]),
        markArea: {
          silent: true,
          itemStyle: { color: cor.noite, opacity: 0.7 },
          label: { show: true, position: 'insideBottom', color: cor.suave, fontSize: 11 },
          data: noites.map(([a, b]) => [{ ...a, name: 'Noite' }, b]),
        },
      },
    ],
  }
}

// O texto da "dica" ao passar o mouse (ou o dedo) numa hora.
function dica(h, hoje) {
  const nivel = NIVEIS[indicePorTA(arredondar(h.taSol))]
  const linhas = [
    `<strong>${qualDia(h.hora, hoje, true)} ${horaLocal(h.hora)}h${h.dia ? '' : ' (noite)'}</strong>`,
    `Ao sol: ${numero(h.taSol)} °C (${nivel.nome})`,
    `Na sombra: ${numero(h.taSombra)} °C`,
    `Ar ${numero(h.t)} °C · umidade ${numero(h.ur, 0)}% · vento ${numero(h.vento)} m/s`,
  ]
  return linhas.join('<br>')
}

// "hoje"/"amanhã" (ou "Hoje"/"Amanhã" no começo da frase): a previsão cobre 2 dias.
function qualDia(data, hoje, maiuscula = false) {
  const palavra = diaLocal(data) === hoje ? 'hoje' : 'amanhã'
  return maiuscula ? palavra[0].toUpperCase() + palavra.slice(1) : palavra
}
