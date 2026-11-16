import { ehDia } from '../../lib/sol'

const HORA = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

// Barra fina com o "estado do sistema": a hora de Porto Alegre, se é dia ou
// noite (pelo sol) e quantas estações estão publicando agora.
// O relógio NÃO fica numa região aria-live: o leitor de tela anunciaria a hora
// a cada segundo, e a pessoa não conseguiria ouvir mais nada.
export default function BarraStatus({ agora, total, aoVivo }) {
  const data = new Date(agora)
  const dia = ehDia(data)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-800">
      <span>
        Porto Alegre{' '}
        <time dateTime={data.toISOString()} className="font-mono tabular-nums">
          {HORA.format(data)}
        </time>
      </span>
      {/* O ícone é decorativo: o texto "Dia"/"Noite" já diz tudo. */}
      <span>
        <span aria-hidden="true">{dia ? '☀' : '☾'}</span> {dia ? 'Dia' : 'Noite'}
      </span>
      <span>
        <span className="font-mono tabular-nums">{total}</span> estações ·{' '}
        <span className="font-mono tabular-nums">{aoVivo}</span> ao vivo
      </span>
    </div>
  )
}
