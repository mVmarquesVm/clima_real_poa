import IconeRisco from './IconeRisco'

// Selo do nível de risco: COR + ÍCONE + TEXTO, nunca só a cor.
// "nivel" é um item de NIVEIS (lib/risco.js).
export default function SeloRisco({ nivel }) {
  return (
    <p
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-lg font-bold ${nivel.classe}`}
    >
      <IconeRisco nivel={nivel} />
      <span>
        {nivel.id === 'semdado' ? 'Sem dado' : `Nível ${nivel.nome.toLowerCase()}`}
        <span className="font-normal">: {nivel.conselho}</span>
      </span>
    </p>
  )
}
