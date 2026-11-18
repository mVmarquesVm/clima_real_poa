import { lazy, Suspense, useState } from 'react'
import BarraStatus from './componentes/comum/BarraStatus'
import BotaoLetra from './componentes/comum/BotaoLetra'
import BotaoTema from './componentes/comum/BotaoTema'
import Menu from './componentes/comum/Menu'
import Rodape from './componentes/comum/Rodape'
import SecaoCadastro from './componentes/cadastro/SecaoCadastro'
import ListaEstacoes from './componentes/estacao/ListaEstacoes'
import SecaoRecomendacao from './componentes/recomendacao/SecaoRecomendacao'
import BaixarCsvLocais from './componentes/locais/BaixarCsvLocais'
import TabelaLocais from './componentes/locais/TabelaLocais'
import dadosLocais from './dados/locais.json'
import useAgora from './ganchos/useAgora'
import useEstacoes from './ganchos/useEstacoes'
import useLetra from './ganchos/useLetra'
import useTema from './ganchos/useTema'
import { ESTACOES, ESTACOES_AO_VIVO } from './lib/estacoes'
import { situacao } from './lib/leitura'

// O mapa (MapLibre) é a parte mais pesada do app, então ele é baixado em separado,
// depois do resto: o planejamento e as estações aparecem primeiro, mesmo com internet lenta.
const Mapa = lazy(() => import('./componentes/mapa/Mapa'))

// O menu tem só 3 itens. Os 2 primeiros são para quem vai passear; a gestão
// (cadastro e números do satélite) fica numa área fechada no fim da página.
const SECOES = [
  { id: 'titulo-recomendacao', texto: 'Planejar' },
  { id: 'titulo-mapa', texto: 'Calor agora' },
  { id: 'area-gestao', texto: 'Gestão' },
]

// Esqueleto da página. Cada parte (mapa, lista, gráfico...) é um componente
// próprio; aqui fica só a estrutura semântica e a ligação com os dados.
export default function App() {
  // Uma busca só para a página inteira (a cada 15 s): os cartões das estações,
  // o mapa e a barra usam as MESMAS leituras, sem gastar o limite do ThingSpeak em dobro.
  const estados = useEstacoes(ESTACOES_AO_VIVO)
  const agora = useAgora()
  const aoVivo = ESTACOES_AO_VIVO.filter((e) => situacao(estados[e.id].leitura, agora).recente)
  const { escuro, alternar } = useTema()
  const letra = useLetra()
  // A rota a pé (da recomendação) é desenhada no mapa: as duas seções
  // conversam por aqui, pelo App, que é o "pai" das duas.
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

      <header className="bg-marca px-4 py-4 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Forno Alegre</h1>
            <p>Calor no Centro de Porto Alegre</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BotaoLetra grande={letra.grande} aoAlternar={letra.alternar} />
            <BotaoTema escuro={escuro} aoAlternar={alternar} />
          </div>
          <Menu secoes={SECOES} />
        </div>
      </header>
      <BarraStatus agora={agora} aoVivo={aoVivo.length} total={ESTACOES.length} />

      <main id="conteudo" className="mx-auto max-w-6xl space-y-10 p-4">
        <SecaoRecomendacao agora={agora} escuro={escuro} aoMostrarRota={setRota} />

        <section aria-labelledby="titulo-mapa" className="space-y-3">
          <h2 id="titulo-mapa" tabIndex={-1} className="text-2xl font-bold">
            Calor agora
          </h2>
          <ListaEstacoes estacoes={ESTACOES} locais={dadosLocais.locais} estados={estados} agora={agora} />
          <p id="descricao-mapa" className="sr-only">
            Mapa das 4 estações e da rota a pé. O nível de cada estação está logo acima, em texto.
          </p>
          <Suspense fallback={<p role="status" className="h-80 rounded border border-borda bg-superficie p-4 md:h-[28rem]">Carregando o mapa…</p>}>
            <Mapa
              locais={dadosLocais.locais}
              estados={estados}
              agora={agora}
              idTabela="descricao-mapa"
              escuro={escuro}
              rota={rota}
            />
          </Suspense>
        </section>

        {/* A gestão (cadastro e números) começa FECHADA: quem vai passear não
            precisa ver formulários nem tabelas. O menu "Gestão" abre a gaveta. */}
        <details className="rounded border border-borda-forte">
          <summary
            id="area-gestao"
            className="cursor-pointer p-4 text-xl font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
          >
            Área da gestão: cadastro de locais e números do satélite
          </summary>
          <div className="space-y-10 border-t border-borda p-4">
            <SecaoCadastro />

            <section aria-labelledby="titulo-metricas" className="space-y-3">
              <h2 id="titulo-metricas" tabIndex={-1} className="text-xl font-bold">
                Métricas: o calor do piso pelo satélite
              </h2>
              <TabelaLocais locais={dadosLocais.locais} passagens={dadosLocais.passagens} />
              <BaixarCsvLocais locais={dadosLocais.locais} passagens={dadosLocais.passagens} />
            </section>
          </div>
        </details>
      </main>
      <Rodape />
    </>
  )
}
