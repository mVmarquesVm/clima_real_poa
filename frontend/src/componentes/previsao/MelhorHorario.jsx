import { ATIVIDADES } from '../../lib/cadastro'
import { numero } from '../../lib/formato'
import {
  diaLocal,
  horaBoa,
  horaLocal,
  horaMenosQuente,
  horasDeLazer,
  janelasBoas,
} from '../../lib/recomendacao'
import FaixaHoras from './FaixaHoras'

// "Quando ir", em 3 partes que se leem de longe:
// 1) a RESPOSTA, em letra grande ("Melhor horário: hoje, das 7h às 10h");
// 2) se AGORA dá (✓ ou ✕);
// 3) a régua de horas "Pode ir / Evite" de hoje.
// Os números (gráfico e tabela) ficam em "Ver a previsão em detalhes".
export default function MelhorHorario({ previsao, atividade, agora }) {
  const nome = ATIVIDADES[atividade].toLowerCase()
  const horas = horasDeLazer(previsao, agora)
  const janela = janelasBoas(horas, atividade)[0] ?? null
  const hoje = diaLocal(agora)
  const qualDia = (data) => (diaLocal(data) === hoje ? 'hoje' : 'amanhã')

  // Fora do horário de lazer (ex.: 3h da manhã), a linha "Agora" não aparece.
  const horaAgora = horas.find((h) => agora - h.hora >= 0 && agora - h.hora < 3600000)
  const menosQuente = janela ? null : horaMenosQuente(horas)

  return (
    <div className="space-y-4">
      <p className="rounded border-2 border-foco bg-superficie p-4 text-xl">
        {janela ? (
          <>
            Melhor horário para {nome}:{' '}
            <strong className="tabular-nums">
              {qualDia(janela.inicio)}, das {horaLocal(janela.inicio)}h às {horaLocal(janela.fim) || 24}h
            </strong>
          </>
        ) : menosQuente ? (
          <>
            <strong>Nenhum horário seguro</strong> para {nome} hoje nem amanhã. O menos quente é{' '}
            <strong className="tabular-nums">
              {qualDia(menosQuente.hora)} às {horaLocal(menosQuente.hora)}h
            </strong>
            : fique na sombra e leve água.
          </>
        ) : (
          <>Sem previsão para as próximas horas.</>
        )}
      </p>

      {horaAgora && (
        <p className="text-lg">
          <span aria-hidden="true" className="mr-1 font-bold">
            {horaBoa(horaAgora, atividade) ? '✓' : '✕'}
          </span>
          <strong>{horaBoa(horaAgora, atividade) ? 'Agora pode ir.' : 'Agora é melhor evitar.'}</strong>{' '}
          Sensação de <span className="tabular-nums">{numero(horaAgora.taSol, 0)} °C</span> ao sol.
        </p>
      )}

      <FaixaHoras horas={horas} atividade={atividade} hoje={hoje} />
    </div>
  )
}
