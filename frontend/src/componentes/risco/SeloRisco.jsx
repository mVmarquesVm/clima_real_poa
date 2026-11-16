import { conselhoDe } from '../../lib/risco'
import IconeRisco from './IconeRisco'

// Selo do nível de risco: COR + ÍCONE + TEXTO, nunca só a cor.
// "nivel" é um item de NIVEIS (lib/risco.js); "dia" escolhe o conselho de dia ou de noite.
export default function SeloRisco({ nivel, dia = true }) {
  return (
    <p
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-lg font-bold ${nivel.classe}`}
    >
      <IconeRisco nivel={nivel} />
      <span>
        {nivel.id === 'semdado' ? 'Sem dado' : `Nível ${nivel.nome.toLowerCase()}`}
        <span className="font-normal">: {conselhoDe(nivel, dia)}</span>
      </span>
    </p>
  )
}
