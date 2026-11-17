import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Map as MapaMapLibre, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// O "?url" pede ao Vite só o ENDEREÇO do arquivo (ele copia o arquivo para o build).
import urlDoWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { corDoToken } from '../../lib/cores'
import { limitesDosLocais, locaisParaGeoJSON } from '../../lib/geo'
import { situacao } from '../../lib/leitura'
import { NIVEIS, SEM_DADO } from '../../lib/risco'
import MarcadorEstacao from './MarcadorEstacao'
import PainelEstacao from './PainelEstacao'

// O MapLibre monta os pedaços do mapa num "worker" (um ajudante que roda em
// paralelo, para a página não travar). Ele procura esse arquivo ao lado do
// próprio código, mas o Vite muda o código de lugar, e o ajudante não é achado
// (o mapa fica em branco). Aqui dizemos onde ele está, no dev e no build.
setWorkerUrl(urlDoWorker)

// Mapas base gratuitos e sem chave (dados do OpenStreetMap). Os dois usam a
// mesma fonte de letras ("Noto Sans Regular"), então os rótulos servem nos dois.
const ESTILOS = {
  claro: 'https://tiles.openfreemap.org/styles/liberty',
  escuro: 'https://tiles.openfreemap.org/styles/dark',
}

// Textos dos botões do mapa em português (o padrão do MapLibre é inglês).
const TEXTOS = {
  'Map.Title': 'Mapa',
  'NavigationControl.ZoomIn': 'Aproximar',
  'NavigationControl.ZoomOut': 'Afastar',
  'NavigationControl.ResetBearing': 'Voltar o norte para cima',
  'AttributionControl.ToggleAttribution': 'Mostrar ou esconder os créditos do mapa',
  'CooperativeGesturesHandler.WindowsHelpText': 'Use Ctrl + rolagem para aproximar o mapa',
  'CooperativeGesturesHandler.MacHelpText': 'Use ⌘ + rolagem para aproximar o mapa',
  'CooperativeGesturesHandler.MobileHelpText': 'Use dois dedos para mover o mapa',
}

// A estação ao vivo fica POR CIMA das outras quando os marcadores se encostam
// (no celular, o Largo e o Calçadão quase se tocam). O z-index vai no div que
// o MapLibre posiciona, pelo próprio Marker.
function empilhar(marcadores, pontos) {
  for (const { properties } of pontos.features) {
    const div = marcadores[properties.id]?.getElement()
    if (div) div.style.zIndex = properties.selo === 'AO VIVO' ? '2' : '1'
  }
}

function movimentoReduzido() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Coloca no mapa as 3 fontes de dados e as camadas que as desenham.
// Roda no 1º carregamento E depois de cada troca de tema, porque o setStyle
// apaga tudo o que não faz parte do estilo base.
// As letras usam os tokens do tema (texto sobre um halo da cor do fundo): no
// escuro, os tokens já trocaram de valor quando o estilo novo termina de carregar.
function montarCamadas(mapa, dados, rota) {
  if (mapa.getSource('locais')) return // já montadas neste estilo
  const corDaLetra = corDoToken('texto')
  const halo = corDoToken('fundo')
  const corDaRota = corDoToken('foco')

  mapa.addSource('locais', { type: 'geojson', data: dados.areas })
  mapa.addSource('cobertura', { type: 'geojson', data: dados.cobertura })
  mapa.addSource('pontos', { type: 'geojson', data: dados.pontos })

  // A área que a estação representa, na cor do risco agora (cinza = sem dado).
  mapa.addLayer({
    id: 'cobertura-preenchimento',
    type: 'fill',
    source: 'cobertura',
    paint: { 'fill-color': ['get', 'cor'], 'fill-opacity': 0.45 },
  })
  mapa.addLayer({
    id: 'cobertura-contorno',
    type: 'line',
    source: 'cobertura',
    paint: { 'line-color': ['get', 'cor'], 'line-width': 2 },
  })
  // O local inteiro (OpenStreetMap): só um contorno fino e tracejado, para não
  // competir com a cor do risco.
  mapa.addLayer({
    id: 'locais-contorno',
    type: 'line',
    source: 'locais',
    paint: { 'line-color': corDaLetra, 'line-width': 1.2, 'line-dasharray': [2, 2] },
  })
  // Nome de cada local e, embaixo, o selo ("AO VIVO" ou "SEM DADO RECENTE").
  // O marcador (um botão HTML) fica por cima do ponto, então o texto sai um
  // pouco mais longe dele.
  mapa.addLayer({
    id: 'nomes',
    type: 'symbol',
    source: 'pontos',
    layout: {
      'text-field': [
        'case',
        ['!=', ['get', 'selo'], ''],
        ['concat', ['get', 'nome'], '\n', ['get', 'selo']],
        ['get', 'nome'],
      ],
      'text-font': ['Noto Sans Regular'],
      'text-size': 13,
      // O Largo e o Calçadão ficam a só 245 m: o MapLibre testa acima, abaixo
      // e dos lados e usa a 1ª posição livre.
      'text-variable-anchor': ['bottom', 'top', 'left', 'right'],
      'text-radial-offset': 1.6,
      'text-justify': 'auto',
    },
    paint: { 'text-color': corDaLetra, 'text-halo-color': halo, 'text-halo-width': 2 },
  })

  // A rota a pé até a água (vazia até a pessoa pedir "Como chegar").
  // Linha cheia = pelas ruas; tracejada = só a linha reta (plano B).
  const { linha, pontas } = rotaParaGeoJSON(rota)
  mapa.addSource('rota', { type: 'geojson', data: linha })
  mapa.addSource('rota-pontas', { type: 'geojson', data: pontas })
  mapa.addLayer({
    id: 'rota-borda',
    type: 'line',
    source: 'rota',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': halo, 'line-width': 8 },
  })
  // Duas camadas (e não uma com "case"): o tracejado por expressão não funciona
  // em todas as versões do MapLibre; o filtro escolhe qual desenha.
  mapa.addLayer({
    id: 'rota-ruas',
    type: 'line',
    source: 'rota',
    filter: ['!', ['get', 'linhaReta']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': corDaRota, 'line-width': 4 },
  })
  mapa.addLayer({
    id: 'rota-reta',
    type: 'line',
    source: 'rota',
    filter: ['get', 'linhaReta'],
    paint: { 'line-color': corDaRota, 'line-width': 4, 'line-dasharray': [1, 1.5] },
  })
  mapa.addLayer({
    id: 'rota-pontas',
    type: 'circle',
    source: 'rota-pontas',
    paint: { 'circle-radius': 6, 'circle-color': corDaRota, 'circle-stroke-color': halo, 'circle-stroke-width': 2 },
  })
  mapa.addLayer({
    id: 'rota-nomes',
    type: 'symbol',
    source: 'rota-pontas',
    layout: {
      'text-field': ['get', 'nome'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 13,
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 1,
    },
    paint: { 'text-color': corDaLetra, 'text-halo-color': halo, 'text-halo-width': 2 },
  })
}

// A rota (ou nada) -> a linha e as duas pontas ("Início" e "Água"), em GeoJSON.
function rotaParaGeoJSON(rota) {
  const vazio = { type: 'FeatureCollection', features: [] }
  if (!rota) return { linha: vazio, pontas: vazio }
  const ponto = (lugar, nome) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lugar.lon, lugar.lat] },
    properties: { nome },
  })
  return {
    linha: {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: rota.linha, properties: { linhaReta: Boolean(rota.linhaReta) } }],
    },
    pontas: {
      type: 'FeatureCollection',
      features: [ponto(rota.origem, 'Início'), ponto(rota.destino, `Água: ${rota.destino.nome}`)],
    },
  }
}

// Mapa das estações, ao vivo. O canvas é um desenho que o leitor de tela não
// enxerga; por isso:
// - cada estação é também um BOTÃO (MarcadorEstacao), que abre o painel;
// - a descrição do canvas manda para a tabela, que tem os mesmos dados em texto.
// "escuro" vem do tema da página (useTema, no App): o mapa acompanha o resto.
export default function Mapa({ locais, estados, agora, idTabela, escuro = false, rota = null }) {
  const caixa = useRef(null)
  const mapaRef = useRef(null)
  const dadosRef = useRef(null)
  const escuroRef = useRef(escuro)
  const rotaRef = useRef(rota)
  const estiloAplicado = useRef(null)
  const botoes = useRef({})
  const marcadoresRef = useRef({}) // id -> Marker do MapLibre
  const [aberto, setAberto] = useState(null)

  // Um <div> por estação, criado uma vez só: o MapLibre posiciona o div no mapa,
  // e o React desenha o botão dentro dele (createPortal, lá embaixo).
  // role="none": sem isso, o MapLibre dá ao div o papel de "imagem", e o
  // leitor de tela esconderia o botão de dentro.
  const [caixasDosMarcadores] = useState(() =>
    Object.fromEntries(
      locais.map((local) => {
        const div = document.createElement('div')
        div.setAttribute('role', 'none')
        // O div é quadrado e o botão é redondo: os cantos do div de uma estação
        // podiam cobrir o centro da vizinha (o Largo e o Calçadão ficam a 245 m)
        // e "roubar" o toque. Assim só o botão recebe o clique.
        div.style.pointerEvents = 'none'
        return [local.id, div]
      }),
    ),
  )

  // A situação de cada local AGORA. Sem canal (E2–E4, por enquanto) = null.
  const situacoes = Object.fromEntries(
    locais.map((local) => {
      const estado = estados[local.id]
      return [local.id, estado ? { estado, ...situacao(estado.leitura, agora) } : null]
    }),
  )

  // O que muda o DESENHO do mapa: o nível e o selo de cada estação. Como texto,
  // o efeito abaixo só roda quando isso muda de verdade (e não a cada segundo).
  const resumoJSON = JSON.stringify(
    locais.map((local) => {
      const s = situacoes[local.id]
      return {
        id: local.id,
        nivel: s?.nivel.id ?? NIVEIS[SEM_DADO].id,
        selo: s ? (s.recente ? 'AO VIVO' : 'SEM DADO RECENTE') : '',
      }
    }),
  )

  // 1) Dados do desenho: monta o GeoJSON com as cores e atualiza as fontes.
  useEffect(() => {
    const estado = Object.fromEntries(
      JSON.parse(resumoJSON).map(({ id, nivel, selo }) => [
        id,
        { cor: corDoToken(`risco-${nivel}`), selo },
      ]),
    )
    const dados = locaisParaGeoJSON(locais, estado)
    dadosRef.current = dados
    empilhar(marcadoresRef.current, dados.pontos)
    // Com o estilo trocando, as fontes ainda não existem; o montarCamadas
    // vai usar os dados novos do dadosRef quando o estilo terminar.
    const mapa = mapaRef.current
    mapa?.getSource('cobertura')?.setData(dados.cobertura)
    mapa?.getSource('pontos')?.setData(dados.pontos)
  }, [locais, resumoJSON])

  // 2) Cria o mapa (uma vez) e põe os marcadores.
  useEffect(() => {
    const estilo = escuroRef.current ? ESTILOS.escuro : ESTILOS.claro
    const mapa = new MapaMapLibre({
      container: caixa.current,
      style: estilo,
      bounds: limitesDosLocais(locais),
      // Folga maior em cima (rótulos) e embaixo (créditos do mapa), para nenhum
      // local ficar escondido na borda.
      fitBoundsOptions: { padding: { top: 60, bottom: 80, left: 40, right: 40 } },
      locale: TEXTOS,
      // No celular, um dedo rola a PÁGINA (e não o mapa); no PC, a rodinha
      // só aproxima com Ctrl. Assim o mapa não "prende" quem está rolando.
      cooperativeGestures: true,
    })
    mapaRef.current = mapa
    estiloAplicado.current = estilo
    mapa.addControl(new NavigationControl({ showCompass: false }), 'top-right')

    // Acessibilidade do canvas: nome claro e a indicação de onde estão os dados.
    const canvas = mapa.getCanvas()
    canvas.setAttribute('role', 'img')
    canvas.setAttribute(
      'aria-label',
      `Mapa do Centro de Porto Alegre com as ${locais.length} estações. ` +
        'Logo depois do mapa, cada estação tem um botão que abre os detalhes. ' +
        'Os dados do satélite estão na tabela "Ranking do calor do piso", logo abaixo. ' +
        'Com o mapa em foco, as setas movem e as teclas mais e menos aproximam.',
    )
    if (idTabela) canvas.setAttribute('aria-describedby', idTabela)

    // "style.load" acontece no 1º estilo e em cada setStyle (troca de tema).
    mapa.on('style.load', () => {
      if (dadosRef.current) montarCamadas(mapa, dadosRef.current, rotaRef.current)
    })

    // Os marcadores entram no mapa na ordem E1, E2, E3, E4: é a ordem do Tab.
    // (O locais.json vem na ordem do ranking do satélite, e o Tab ficaria E3, E1...)
    const emOrdem = [...locais].sort((a, b) => a.id.localeCompare(b.id))
    const marcadores = Object.fromEntries(
      emOrdem.map((local) => [
        local.id,
        new Marker({ element: caixasDosMarcadores[local.id] })
          .setLngLat([local.lon, local.lat])
          .addTo(mapa),
      ]),
    )
    marcadoresRef.current = marcadores
    if (dadosRef.current) empilhar(marcadores, dadosRef.current.pontos)

    // Ao sair da página (ou no duplo efeito do StrictMode), libera o mapa.
    return () => {
      Object.values(marcadores).forEach((m) => m.remove())
      mapa.remove()
      mapaRef.current = null
      marcadoresRef.current = {}
    }
  }, [locais, idTabela, caixasDosMarcadores])

  // 3) Tema claro/escuro: troca o estilo base (as camadas voltam no style.load).
  useEffect(() => {
    escuroRef.current = escuro
    const estilo = escuro ? ESTILOS.escuro : ESTILOS.claro
    const mapa = mapaRef.current
    if (!mapa || estiloAplicado.current === estilo) return
    estiloAplicado.current = estilo
    // diff: false = recomeça do zero (os dois estilos são muito diferentes).
    mapa.setStyle(estilo, { diff: false })
  }, [escuro])

  // 4) A rota a pé: atualiza as fontes e enquadra a rota inteira no mapa.
  useEffect(() => {
    rotaRef.current = rota
    const mapa = mapaRef.current
    if (!mapa) return
    const { linha, pontas } = rotaParaGeoJSON(rota)
    mapa.getSource('rota')?.setData(linha)
    mapa.getSource('rota-pontas')?.setData(pontas)
    if (!rota) return
    const coordenadas = rota.linha.coordinates
    const lons = coordenadas.map((c) => c[0])
    const lats = coordenadas.map((c) => c[1])
    mapa.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: { top: 60, bottom: 60, left: 40, right: 40 }, maxZoom: 17, duration: movimentoReduzido() ? 0 : 1200 },
    )
  }, [rota])

  function abrir(local) {
    if (aberto === local.id) {
      fechar()
      return
    }
    setAberto(local.id)
    // "Voa" até a estação. Com "menos movimento" no sistema, vai direto (0 ms).
    // No PC, o painel cobre a esquerda do mapa: a folga põe a estação à direita dele.
    // Atenção: o MapLibre GUARDA essa folga para os próximos movimentos, por isso
    // os 4 lados vão sempre (no celular, tudo 0, senão a folga do PC continuaria).
    const largo = window.matchMedia('(min-width: 768px)').matches
    mapaRef.current?.flyTo({
      center: [local.lon, local.lat],
      zoom: Math.max(mapaRef.current.getZoom(), 16.5),
      padding: { left: largo ? 340 : 0, top: 0, right: 0, bottom: 0 },
      duration: movimentoReduzido() ? 0 : 1200,
    })
  }

  // Fecha o painel e devolve o foco ao marcador que o abriu (quem usa teclado
  // continua de onde estava).
  function fechar() {
    const id = aberto
    setAberto(null)
    botoes.current[id]?.focus()
  }

  const localAberto = locais.find((l) => l.id === aberto)

  return (
    <figure className="space-y-2">
      <div className="relative">
        <div
          ref={caixa}
          className="h-80 w-full overflow-hidden rounded border border-borda bg-superficie md:h-[28rem] [&_canvas:focus-visible]:outline-2 [&_canvas:focus-visible]:outline-offset-[-2px] [&_canvas:focus-visible]:outline-foco"
        />
        {localAberto && (
          // No celular, o painel fica embaixo do mapa (o mapa é pequeno);
          // do tablet para cima, ele flutua em cima do mapa, à esquerda.
          <div className="mt-2 md:absolute md:top-2 md:left-2 md:mt-0 md:max-h-[calc(100%-1rem)] md:w-80 md:overflow-y-auto">
            <PainelEstacao
              local={localAberto}
              estado={situacoes[localAberto.id]?.estado ?? null}
              agora={agora}
              aoFechar={fechar}
            />
          </div>
        )}
      </div>

      {locais.map((local) => {
        const s = situacoes[local.id]
        return createPortal(
          <MarcadorEstacao
            ref={(botao) => {
              botoes.current[local.id] = botao
            }}
            local={local}
            nivel={s?.nivel ?? NIVEIS[SEM_DADO]}
            temCanal={Boolean(s)}
            aoVivo={Boolean(s?.recente)}
            aberto={aberto === local.id}
            aoClicar={() => abrir(local)}
          />,
          caixasDosMarcadores[local.id],
          local.id,
        )
      })}

      <figcaption className="text-sm text-texto-suave">
        As 4 estações no Centro de Porto Alegre. A área colorida é a parte que cada estação
        representa, na cor do risco agora (cinza = sem dado). O contorno tracejado é o local
        inteiro, pelo OpenStreetMap. Cada estação é um ESP32 simulado no Wokwi, com os valores
        ajustados à mão (demonstração, não medição); o anel que pulsa marca quem está publicando
        agora. Clique numa estação, ou
        chegue nela com Tab e aperte Enter, para ver os detalhes. Em &quot;Onde e quando ir&quot;, o
        botão &quot;Como chegar a pé até a água&quot; desenha aqui a rota (linha tracejada = só a linha reta).
      </figcaption>
    </figure>
  )
}
