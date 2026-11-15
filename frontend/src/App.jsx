import EstacaoAoVivo from './componentes/EstacaoAoVivo'
import TabelaLocais from './componentes/TabelaLocais'
import dadosLocais from './dados/locais.json'

// Esqueleto da página. Cada parte (mapa, lista, gráfico...) é um componente
// próprio; aqui fica só a estrutura semântica e a ligação com os dados.
export default function App() {
  return (
    <>
      {/* "Pular para o conteúdo": quem navega pelo teclado não precisa passar pelo cabeçalho. */}
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Pular para o conteúdo
      </a>

      <header className="bg-marca px-4 py-4 text-white">
        <h1 className="text-2xl font-bold">Forno Alegre</h1>
        <p className="text-sm">Medindo a ilha de calor do Centro de Porto Alegre</p>
      </header>

      <main id="conteudo" className="mx-auto max-w-6xl space-y-4 p-4">
        <section aria-labelledby="titulo-e1" className="space-y-2">
          <h2 id="titulo-e1" className="text-xl font-bold">Agora no Largo Glênio Peres</h2>
          <EstacaoAoVivo />
        </section>

        <section aria-labelledby="titulo-locais" className="space-y-2">
          <h2 id="titulo-locais" className="text-xl font-bold">Locais monitorados</h2>
          <TabelaLocais locais={dadosLocais.locais} passagens={dadosLocais.passagens} />
        </section>
      </main>
    </>
  )
}
