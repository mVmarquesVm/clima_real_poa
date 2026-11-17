import { ATIVIDADES } from '../../lib/cadastro'
import { numero } from '../../lib/formato'
import {
  HORA_FIM,
  HORA_INICIO,
  LIMITE_POR_ATIVIDADE,
  MOTIVO_DO_LIMITE,
  arredondar,
  diaLocal,
  horaBoa,
  horaLocal,
  horaMenosQuente,
  horasDeLazer,
  janelasBoas,
} from '../../lib/recomendacao'
import { NIVEIS, conselhoDe, indicePorTA } from '../../lib/risco'
import IconeRisco from '../risco/IconeRisco'

// "Quando ir": diz se AGORA dá, e lista as janelas boas de hoje e de amanhã.
// Tudo em texto (o gráfico é só um apoio visual).
export default function MelhorHorario({ previsao, atividade, agora }) {
  const limite = LIMITE_POR_ATIVIDADE[atividade]
  const nome = ATIVIDADES[atividade].toLowerCase()
  const horas = horasDeLazer(previsao, agora)
  const janelas = janelasBoas(horas, atividade)
  const hoje = diaLocal(agora)

  // Fora do horário de lazer (ex.: 3h da manhã), o "Agora dá" não aparece.
  const horaAgora = horas.find((h) => agora - h.hora >= 0 && agora - h.hora < 3600000)
  const nivelAgora = horaAgora ? NIVEIS[indicePorTA(arredondar(horaAgora.taSol))] : null

  const porDia = (dia) => janelas.filter((j) => diaLocal(j.inicio) === dia)
  const diasComJanela = [...new Set(janelas.map((j) => diaLocal(j.inicio)))]
  const menosQuente = janelas.length === 0 ? horaMenosQuente(horas) : null

  return (
    <div className="space-y-3">
      <p className="text-sm text-texto-suave">{MOTIVO_DO_LIMITE[atividade]}</p>

      {horaAgora && (
        <p className="flex items-start gap-2 rounded border border-borda bg-superficie p-3">
          <span className={`inline-flex rounded-full p-1 ${nivelAgora.classe}`}>
            <IconeRisco nivel={nivelAgora} />
          </span>
          <span>
            <strong>
              {horaBoa(horaAgora, atividade) ? 'Agora dá: ' : 'Agora não é uma boa hora: '}
            </strong>
            sensação de {numero(horaAgora.taSol)} °C ao sol (nível {nivelAgora.nome.toLowerCase()}),
            {horaBoa(horaAgora, atividade) ? ' abaixo' : ' acima'} do limite de {limite} °C para {nome}.{' '}
            {conselhoDe(nivelAgora, horaAgora.dia)}.
          </span>
        </p>
      )}

      {janelas.length > 0 ? (
        <div>
          <h4 className="font-semibold">
            Melhores horários para {nome} (das {HORA_INICIO}h às {HORA_FIM}h)
          </h4>
          <ul className="mt-1 space-y-1">
            {diasComJanela.map((dia) => (
              <li key={dia}>
                <span className="font-semibold">{dia === hoje ? 'Hoje' : 'Amanhã'}: </span>
                {porDia(dia).map((j, i) => (
                  <span key={j.inicio.getTime()} className="font-mono tabular-nums">
                    {i > 0 && ', '}
                    {horaLocal(j.inicio)}h às {horaLocal(j.fim) || 24}h (até {numero(j.taMax)} °C)
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>
          <strong>Nenhum horário abaixo de {limite} °C</strong> para {nome} hoje nem amanhã,
          das {HORA_INICIO}h às {HORA_FIM}h.
          {menosQuente && (
            <>
              {' '}
              O menos quente: {diaLocal(menosQuente.hora) === hoje ? 'hoje' : 'amanhã'} às{' '}
              {horaLocal(menosQuente.hora)}h ({numero(menosQuente.taSol)} °C ao sol). Prefira a
              sombra, leve água e faça pausas.
            </>
          )}
        </p>
      )}
    </div>
  )
}
