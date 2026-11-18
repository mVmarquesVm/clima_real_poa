import { baixarArquivo, paraCsv } from '../../lib/csv'
import { CLASSE_BOTAO_SECUNDARIO } from '../../lib/formulario'

// As colunas da planilha: as mesmas da tabela, mais o ponto da estação e a
// cobertura do solo (que a tabela não mostra, para não lotar a tela).
// Os nomes das colunas dizem a unidade, porque na planilha não há legenda.
const pct = (fracao) => Math.round(fracao * 1000) / 10 // 0,625 -> 62,5

const COLUNAS = [
  { titulo: 'Posição', valor: (l) => l.satelite.posicao },
  { titulo: 'Estação', valor: (l) => l.id },
  { titulo: 'Local', valor: (l) => l.nome },
  { titulo: 'Tipo', valor: (l) => l.tipo },
  { titulo: 'Piso no verão, média (°C)', valor: (l) => l.satelite.pisoMedioVerao },
  { titulo: 'Piso mais quente (°C)', valor: (l) => l.satelite.pisoMaximo },
  { titulo: 'Piso acima do ar (°C)', valor: (l) => l.satelite.acimaDoAr },
  { titulo: 'Vegetação (NDVI)', valor: (l) => l.satelite.ndvi },
  { titulo: 'Passagens do satélite', valor: (l) => l.satelite.passagens },
  { titulo: 'Área medida', valor: (l) => l.cobertura.regra },
  { titulo: 'Construído (%)', valor: (l) => pct(l.cobertura.construido) },
  { titulo: 'Árvores (%)', valor: (l) => pct(l.cobertura.arvore) },
  { titulo: 'Grama (%)', valor: (l) => pct(l.cobertura.grama) },
  { titulo: 'Latitude da estação', valor: (l) => l.lat },
  { titulo: 'Longitude da estação', valor: (l) => l.lon },
]

// Botão "Baixar a planilha (CSV)": monta o arquivo aqui mesmo, no navegador,
// a partir do locais.json (os dados que a tabela já mostra). A ordem é a do
// ranking (1º = o piso mais quente).
export default function BaixarCsvLocais({ locais, passagens }) {
  function baixar() {
    const emOrdem = [...locais].sort((a, b) => a.satelite.posicao - b.satelite.posicao)
    baixarArquivo(`forno-alegre-ranking-satelite-${passagens.ultima}.csv`, paraCsv(COLUNAS, emOrdem))
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={baixar} className={CLASSE_BOTAO_SECUNDARIO}>
        Baixar a planilha (CSV)
      </button>
      <p className="text-sm text-texto-suave">Abre no Excel, no LibreOffice e no Google Planilhas.</p>
    </div>
  )
}
