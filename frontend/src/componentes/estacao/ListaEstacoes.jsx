import { situacao } from '../../lib/leitura'
import EstacaoAoVivo from './EstacaoAoVivo'

// As estações lado a lado (no celular, uma embaixo da outra), na ordem E1→E4.
// É também a versão em TEXTO do mapa: o mapa é um desenho que o leitor de
// tela não enxerga, e esta lista diz o nível de cada local.
// Se NENHUMA estação tem leitura recente, 4 cartões cinza repetindo "sem dado"
// só ocupariam espaço: aparece um aviso só, numa frase.
// "locais" vem do locais.json (nome de cada estação); "estados" vem do App.
export default function ListaEstacoes({ estacoes, locais, estados, agora }) {
  const nomeDe = (id) => locais.find((l) => l.id === id)?.nome ?? id
  const carregando = estacoes.some((e) => estados[e.id]?.carregando && !estados[e.id]?.leitura)
  const ligadas = estacoes.filter((e) => situacao(estados[e.id]?.leitura, agora).recente)

  if (carregando) return <p role="status">Buscando as estações…</p>

  if (ligadas.length === 0) {
    return (
      <p role="status" className="rounded border border-borda bg-superficie p-4 text-lg">
        <span aria-hidden="true">? </span>
        As estações estão <strong>sem leitura agora</strong>. Use a previsão do “Planeje o seu passeio”, logo acima.
      </p>
    )
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {estacoes.map((e) => (
        // "flex" no item: os 4 cartões ficam com a mesma altura na linha.
        <li key={e.id} className="flex">
          <EstacaoAoVivo nome={nomeDe(e.id)} estado={estados[e.id]} agora={agora} />
        </li>
      ))}
    </ul>
  )
}
