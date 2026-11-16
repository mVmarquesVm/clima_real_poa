import { useEffect, useRef } from 'react'
import { Map as MapaMapLibre, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// O "?url" pede ao Vite só o ENDEREÇO do arquivo (ele copia o arquivo para o build).
import urlDoWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { limitesDosLocais, locaisParaGeoJSON } from '../../lib/geo'

// O MapLibre monta os pedaços do mapa num "worker" (um ajudante que roda em
// paralelo, para a página não travar). Ele procura esse arquivo ao lado do
// próprio código, mas o Vite muda o código de lugar, e o ajudante não é achado
// (o mapa fica em branco). Aqui dizemos onde ele está, no dev e no build.
setWorkerUrl(urlDoWorker)

// Mapa base gratuito e sem chave (dados do OpenStreetMap).
const ESTILO = 'https://tiles.openfreemap.org/styles/liberty'

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

// O MapLibre desenha num <canvas> e não lê as classes do Tailwind, então
// pegamos a cor do token (index.css) na hora de montar o mapa.
function corDoToken(nome) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${nome}`).trim()
}

// Mapa dos locais monitorados. O canvas é um desenho: o leitor de tela não
// enxerga o que está nele, por isso a descrição manda para a tabela, que tem
// os mesmos dados em texto.
export default function Mapa({ locais, idTabela }) {
  const caixa = useRef(null)

  useEffect(() => {
    const { areas, pontos } = locaisParaGeoJSON(locais)
    const marca = corDoToken('marca')
    const texto = corDoToken('texto')
    const branco = corDoToken('white')

    const mapa = new MapaMapLibre({
      container: caixa.current,
      style: ESTILO,
      bounds: limitesDosLocais(locais),
      // Folga maior em cima (rótulos) e embaixo (créditos do mapa), para nenhum
      // local ficar escondido na borda.
      fitBoundsOptions: { padding: { top: 50, bottom: 80, left: 40, right: 40 } },
      locale: TEXTOS,
      // No celular, um dedo rola a PÁGINA (e não o mapa); no PC, a rodinha
      // só aproxima com Ctrl. Assim o mapa não "prende" quem está rolando.
      cooperativeGestures: true,
    })
    mapa.addControl(new NavigationControl({ showCompass: false }), 'top-right')

    // Acessibilidade do canvas: nome claro e a indicação de onde estão os dados.
    const canvas = mapa.getCanvas()
    canvas.setAttribute('role', 'img')
    canvas.setAttribute(
      'aria-label',
      `Mapa do Centro de Porto Alegre com os ${locais.length} locais monitorados. ` +
        'Os mesmos dados estão na tabela "Ranking do calor do piso", logo abaixo. ' +
        'Com o mapa em foco, as setas movem e as teclas mais e menos aproximam.',
    )
    if (idTabela) canvas.setAttribute('aria-describedby', idTabela)

    mapa.on('load', () => {
      mapa.addSource('areas', { type: 'geojson', data: areas })
      mapa.addSource('pontos', { type: 'geojson', data: pontos })

      // Área de cada local: preenchimento claro + contorno forte.
      mapa.addLayer({
        id: 'areas-preenchimento',
        type: 'fill',
        source: 'areas',
        paint: { 'fill-color': marca, 'fill-opacity': 0.25 },
      })
      mapa.addLayer({
        id: 'areas-contorno',
        type: 'line',
        source: 'areas',
        paint: { 'line-color': marca, 'line-width': 2 },
      })

      // Ponto de cada local; a E1 (estação ao vivo) é maior e tem borda escura.
      mapa.addLayer({
        id: 'pontos',
        type: 'circle',
        source: 'pontos',
        paint: {
          'circle-radius': ['case', ['get', 'aoVivo'], 8, 5],
          'circle-color': marca,
          'circle-stroke-color': ['case', ['get', 'aoVivo'], texto, branco],
          'circle-stroke-width': 2,
        },
      })

      // Nome de cada local, com halo branco para ler sobre qualquer fundo.
      mapa.addLayer({
        id: 'nomes',
        type: 'symbol',
        source: 'pontos',
        layout: {
          'text-field': [
            'case',
            ['get', 'aoVivo'],
            ['concat', ['get', 'nome'], '\n(estação E1, ao vivo)'],
            ['get', 'nome'],
          ],
          'text-font': ['Noto Sans Regular'],
          'text-size': 13,
          // O Largo e o Calçadão ficam a só 245 m: com o rótulo fixo embaixo,
          // um cobria o outro. Assim o MapLibre testa acima, abaixo e dos lados
          // e usa a 1ª posição livre.
          'text-variable-anchor': ['bottom', 'top', 'left', 'right'],
          'text-radial-offset': 0.9,
          'text-justify': 'auto',
        },
        paint: { 'text-color': texto, 'text-halo-color': branco, 'text-halo-width': 2 },
      })
    })

    // Ao sair da página (ou no duplo efeito do StrictMode), libera o mapa.
    return () => mapa.remove()
  }, [locais, idTabela])

  return (
    <figure className="space-y-2">
      <div
        ref={caixa}
        className="h-80 w-full overflow-hidden rounded border border-gray-300 bg-white md:h-[28rem] [&_canvas:focus-visible]:outline-2 [&_canvas:focus-visible]:outline-offset-[-2px] [&_canvas:focus-visible]:outline-marca"
      />
      <figcaption className="text-sm text-gray-700">
        Os 4 locais monitorados no Centro de Porto Alegre. O contorno é a área de cada local, pelo
        OpenStreetMap. O ponto maior é a estação E1, no Largo Glênio Peres, a única com equipamento
        (simulado no Wokwi). Os dados de cada local estão na tabela abaixo.
      </figcaption>
    </figure>
  )
}
