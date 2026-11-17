import { lazy, Suspense, useState } from 'react'
import BarraStatus from './componentes/comum/BarraStatus'
import BotaoTema from './componentes/comum/BotaoTema'
import SecaoCadastro from './componentes/cadastro/SecaoCadastro'
import EstacaoAoVivo from './componentes/estacao/EstacaoAoVivo'
import SecaoRecomendacao from './componentes/recomendacao/SecaoRecomendacao'
import TabelaLocais from './componentes/locais/TabelaLocais'
import dadosLocais from './dados/locais.json'
import useAgora from './ganchos/useAgora'
import useEstacoes from './ganchos/useEstacoes'
import useTema from './ganchos/useTema'
import { ESTACOES, ESTACOES_AO_VIVO } from './lib/estacoes'
import { situacao } from './lib/leitura'

// O mapa (MapLibre) é a parte mais pesada do app, então ele é baixado em separado,
// depois do resto: a leitura da E1 aparece primeiro, mesmo com internet lenta.
const Mapa = lazy(() => import('./componentes/mapa/Mapa'))

// Esqueleto da página. Cada parte (mapa, lista, gráfico...) é um componente
// próprio; aqui fica só a estrutura semântica e a ligação com os dados.
export default function App() {
  // Uma busca só para a página inteira (a cada 15 s): o cartão da E1, o mapa e
  // a barra usam as MESMAS leituras, sem gastar o limite do ThingSpeak em dobro.
  const estados = useEstacoes(ESTACOES_AO_VIVO)
  const agora = useAgora()
  const aoVivo = ESTACOES_AO_VIVO.filter((e) => situacao(estados[e.id].leitura, agora).recente)
  const { escuro, alternar } = useTema()
  // A rota a pé até a água (da recomendação) é desenhada no mapa: as duas
  // seções conversam por aqui, pelo App, que é o "pai" das duas.
  const [rota, setRota] = useState(null)

  return (
    <>
      {/* "Pular para o conteúdo": quem navega pelo teclado não precisa passar pelo cabeçalho. */}
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-superficie focus:px-4 focus:py-2 focus:shadow"
      >
        Pular para o conteúdo
      </a>

      <header className="flex flex-wrap items-center justify-between gap-3 bg-marca px-4 py-4 text-white">
        <div>
          <h1 className="text-2xl font-bold">Forno Alegre</h1>
          <p className="text-sm">Medindo a ilha de calor do Centro de Porto Alegre</p>
        </div>
        <BotaoTema escuro={escuro} aoAlternar={alternar} />
      </header>
      <BarraStatus agora={agora} total={ESTACOES.length} aoVivo={aoVivo.length} />

      <main id="conteudo" className="mx-auto max-w-6xl space-y-4 p-4">
        <section aria-labelledby="titulo-e1" className="space-y-2">
          <h2 id="titulo-e1" className="text-xl font-bold">Agora no Largo Glênio Peres</h2>
          <EstacaoAoVivo estado={estados.E1} agora={agora} />
        </section>

        <SecaoRecomendacao agora={agora} escuro={escuro} aoMostrarRota={setRota} />

        <section aria-labelledby="titulo-locais" className="space-y-2">
          <h2 id="titulo-locais" tabIndex={-1} className="text-xl font-bold">Locais monitorados</h2>
          <Suspense fallback={<p role="status" className="h-80 rounded border border-borda bg-superficie p-4 md:h-[28rem]">Carregando o mapa…</p>}>
            <Mapa
              locais={dadosLocais.locais}
              estados={estados}
              agora={agora}
              idTabela="legenda-locais"
              escuro={escuro}
              rota={rota}
            />
          </Suspense>
          <TabelaLocais locais={dadosLocais.locais} passagens={dadosLocais.passagens} />
        </section>

        <SecaoCadastro />
      </main>
    </>
  )
}
