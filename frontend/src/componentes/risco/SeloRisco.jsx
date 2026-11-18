import { conselhoDe } from '../../lib/risco'
import IconeRisco from './IconeRisco'

// Selo do nível de risco: COR + ÍCONE + TEXTO, nunca só a cor.
// "nivel" é um item de NIVEIS (lib/risco.js); "dia" escolhe o conselho de dia ou de noite.
// "compacto" é para os cartões estreitos (as 4 estações lado a lado): o nome do
// nível fica numa linha e o conselho embaixo, num bloco de cantos levemente
// arredondados (a pílula redonda fica feia quando o texto quebra em 2 linhas).
export default function SeloRisco({ nivel, dia = true, compacto = false }) {
  const nome = nivel.id === 'semdado' ? 'Sem dado' : `Nível ${nivel.nome.toLowerCase()}`

  if (compacto) {
    return (
      <p className={`rounded px-3 py-2 ${nivel.classe}`}>
        <span className="flex items-center gap-2 font-bold">
          <IconeRisco nivel={nivel} />
          {nome}
        </span>
        <span className="block">{conselhoDe(nivel, dia)}</span>
      </p>
    )
  }

  return (
    <p
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-lg font-bold ${nivel.classe}`}
    >
      <IconeRisco nivel={nivel} />
      <span>
        {nome}
        <span className="font-normal">: {conselhoDe(nivel, dia)}</span>
      </span>
    </p>
  )
}
