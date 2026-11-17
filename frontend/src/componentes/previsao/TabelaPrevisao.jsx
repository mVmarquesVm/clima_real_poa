import { numero } from '../../lib/formato'
import { arredondar, diaLocal, horaLocal } from '../../lib/recomendacao'
import { NIVEIS, indicePorTA } from '../../lib/risco'

// A previsão em tabela: o mesmo conteúdo do gráfico, para quem usa leitor de
// tela (o gráfico é um desenho) ou prefere ler números. Fica fechada num
// <details> para não alongar a página.
export default function TabelaPrevisao({ horas, agora }) {
  const hoje = diaLocal(agora)
  return (
    <details className="rounded border border-borda bg-superficie">
      <summary className="cursor-pointer px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco">
        Ver a previsão hora a hora em tabela
      </summary>
      {/* No celular a tabela rola de lado; o tabIndex deixa rolar pelo teclado. */}
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Previsão hora a hora">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Sensação térmica prevista hora a hora (Open-Meteo, mesma fórmula da estação)
          </caption>
          <thead className="bg-superficie-2">
            <tr>
              <th scope="col" className="px-3 py-2">Hora</th>
              <th scope="col" className="px-3 py-2">Ao sol</th>
              <th scope="col" className="px-3 py-2">Na sombra</th>
              <th scope="col" className="px-3 py-2">Nível ao sol</th>
              <th scope="col" className="px-3 py-2">Ar</th>
              <th scope="col" className="px-3 py-2">Umidade</th>
              <th scope="col" className="px-3 py-2">Vento</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {horas.map((h) => (
              <tr key={h.hora.getTime()} className="border-t border-borda">
                <th scope="row" className="px-3 py-1 font-normal whitespace-nowrap">
                  {diaLocal(h.hora) === hoje ? 'Hoje' : 'Amanhã'} {horaLocal(h.hora)}h
                  {!h.dia && ' (noite)'}
                </th>
                <td className="px-3 py-1">{numero(h.taSol)} °C</td>
                <td className="px-3 py-1">{numero(h.taSombra)} °C</td>
                <td className="px-3 py-1 font-sans">{NIVEIS[indicePorTA(arredondar(h.taSol))].nome}</td>
                <td className="px-3 py-1">{numero(h.t)} °C</td>
                <td className="px-3 py-1">{numero(h.ur, 0)}%</td>
                <td className="px-3 py-1">{numero(h.vento)} m/s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
