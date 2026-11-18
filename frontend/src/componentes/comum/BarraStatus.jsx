import { ehDia } from '../../lib/sol'

// Sem os segundos: um número que muda o tempo todo distrai e não ajuda ninguém.
const HORA = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

// Barra fina com o "estado do sistema": a hora de Porto Alegre, se é dia ou
// noite (pelo sol) e quantas estações estão publicando agora.
// O relógio NÃO fica numa região aria-live: o leitor de tela anunciaria a hora
// a cada minuto, e a pessoa não conseguiria ouvir mais nada.
export default function BarraStatus({ agora, total, aoVivo }) {
  const data = new Date(agora)
  const dia = ehDia(data)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-borda bg-superficie px-4 py-1.5 text-texto-suave">
      <span>
        Agora{' '}
        <time dateTime={data.toISOString()} className="tabular-nums">
          {HORA.format(data)}
        </time>
      </span>
      {/* O ícone é decorativo: o texto "Dia"/"Noite" já diz tudo. */}
      <span>
        <span aria-hidden="true">{dia ? '☀' : '☾'}</span> {dia ? 'Dia' : 'Noite'}
      </span>
      <span>
        <span className="tabular-nums">{aoVivo}</span> de <span className="tabular-nums">{total}</span> estações
        ligadas
      </span>
    </div>
  )
}
