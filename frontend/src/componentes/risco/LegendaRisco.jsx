import { LIMITES, NIVEIS } from '../../lib/risco'
import IconeRisco from './IconeRisco'

// "O que quer dizer cada cor?": as 5 faixas da régua com a sensação térmica
// e o conselho em palavras simples (os mesmos do LCD da estação).
// As faixas são as da Nota Técnica nº 01/26 da SMS de Porto Alegre; a nota só
// dá as cores, então o texto é o conselho, e não um "nome" inventado.
const FAIXAS = [
  { nivel: 'verde', texto: `abaixo de ${LIMITES.amarelo} °C` },
  { nivel: 'amarelo', texto: `de ${LIMITES.amarelo} a ${LIMITES.laranja - 1} °C` },
  { nivel: 'laranja', texto: `de ${LIMITES.laranja} a ${LIMITES.vermelho - 1} °C` },
  { nivel: 'vermelho', texto: `de ${LIMITES.vermelho} a ${LIMITES.roxo - 1} °C` },
  { nivel: 'roxo', texto: `${LIMITES.roxo} °C ou mais` },
]

export default function LegendaRisco() {
  return (
    <div>
      <h5 className="font-semibold">O que quer dizer cada cor</h5>
      <ul className="mt-1 space-y-1">
        {FAIXAS.map((f) => {
          const nivel = NIVEIS.find((n) => n.id === f.nivel)
          return (
            <li key={f.nivel} className="flex items-start gap-2">
              <span className={`inline-flex shrink-0 items-center gap-1 rounded px-2 py-0.5 font-semibold ${nivel.classe}`}>
                <IconeRisco nivel={nivel} className="size-5" />
                {nivel.nome}
              </span>
              <span>
                <span className="font-mono tabular-nums">{f.texto}</span>: {nivel.conselho.toLowerCase()}.
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
