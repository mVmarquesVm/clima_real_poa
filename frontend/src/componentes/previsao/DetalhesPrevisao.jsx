import { lazy, Suspense, useState } from 'react'
import { ATIVIDADES } from '../../lib/cadastro'
import { LIMITE_POR_ATIVIDADE, MOTIVO_DO_LIMITE, diaLocal } from '../../lib/recomendacao'
import EstadoCarregando from '../comum/EstadoCarregando'
import LegendaRisco from '../risco/LegendaRisco'
import TabelaPrevisao from './TabelaPrevisao'

// O ECharts é pesado: só baixa quando a pessoa abre os detalhes.
const GraficoPrevisao = lazy(() => import('./GraficoPrevisao'))

// "Ver a previsão em detalhes": tudo o que é número fica aqui dentro, fechado.
// Quem só quer saber se pode ir lê a régua de horas e pronto; quem quer
// entender abre e vê a legenda das cores, o gráfico e a tabela.
// O gráfico só é montado com os detalhes ABERTOS: fechado, ele não teria
// largura para se desenhar (e o ECharts nem precisa ser baixado).
export default function DetalhesPrevisao({ horas, atividade, agora, escuro }) {
  const [aberto, setAberto] = useState(false)

  return (
    <details
      onToggle={(e) => setAberto(e.currentTarget.open)}
      className="rounded border border-borda bg-superficie"
    >
      <summary className="cursor-pointer px-4 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco">
        Ver a previsão em detalhes
      </summary>
      <div className="space-y-4 border-t border-borda p-4">
        <LegendaRisco />
        {aberto && (
          <Suspense fallback={<EstadoCarregando texto="Carregando o gráfico…" />}>
            <GraficoPrevisao
              hoje={diaLocal(agora)}
              horas={horas}
              limite={LIMITE_POR_ATIVIDADE[atividade]}
              nomeAtividade={ATIVIDADES[atividade]}
              escuro={escuro}
            />
          </Suspense>
        )}
        <TabelaPrevisao horas={horas} agora={agora} />
        <p>
          “Pode ir” = sensação ao sol abaixo de {LIMITE_POR_ATIVIDADE[atividade]} °C. {MOTIVO_DO_LIMITE[atividade]}
        </p>
      </div>
    </details>
  )
}
