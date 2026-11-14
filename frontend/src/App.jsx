// Esqueleto da página. Cada parte (mapa, lista, gráfico...) vira um componente
// próprio nos próximos passos; aqui fica só a estrutura semântica.
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

      <main id="conteudo" className="mx-auto max-w-6xl p-4">
        <p>Em construção: mapa, lista de locais e melhor horário.</p>
      </main>
    </>
  )
}
