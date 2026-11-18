import { useEffect, useRef } from 'react'
import { Map as MapaMapLibre, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import urlDoWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { corDoToken } from '../../lib/cores'

// Sem isto o mapa fica em branco no Vite (ver a explicação no Mapa.jsx).
setWorkerUrl(urlDoWorker)

const CENTRO_POA = [-51.23, -30.033] // [lon, lat]: o MapLibre usa x antes de y

const TEXTOS = {
  'Map.Title': 'Mapa',
  'Marker.Title': 'Ponto marcado',
  'NavigationControl.ZoomIn': 'Aproximar',
  'NavigationControl.ZoomOut': 'Afastar',
  'AttributionControl.ToggleAttribution': 'Mostrar ou esconder os créditos do mapa',
  'CooperativeGesturesHandler.WindowsHelpText': 'Use Ctrl + rolagem para aproximar o mapa',
  'CooperativeGesturesHandler.MacHelpText': 'Use ⌘ + rolagem para aproximar o mapa',
  'CooperativeGesturesHandler.MobileHelpText': 'Use dois dedos para mover o mapa',
}

// Mini mapa do cadastro: um toque marca o ponto (o alfinete vai para lá) e
// devolve {lat, lon} pelo aoEscolher. É o jeito mais fácil para uma praça,
// que muitas vezes não tem número.
//   ponto:     {lat, lon} já marcado (ou null): mostra o alfinete;
//   centrar:   um número que muda quando a busca por CEP acha o ponto: o mapa
//              vai até ele (num toque, o mapa NÃO se mexe, para não confundir).
// Quem usa só o teclado marca pelo CEP ou pelos campos de latitude e longitude.
export default function MapaEscolherPonto({ ponto, aoEscolher, centrar }) {
  const caixa = useRef(null)
  const mapaRef = useRef(null)
  const alfinete = useRef(null)
  // O mapa é criado uma vez só; o ref guarda sempre a função mais nova.
  const aoEscolherRef = useRef(aoEscolher)
  const pontoInicial = useRef(ponto)
  useEffect(() => {
    aoEscolherRef.current = aoEscolher
  })

  useEffect(() => {
    const escuro = document.documentElement.dataset.tema === 'escuro'
    const inicio = pontoInicial.current
    const mapa = new MapaMapLibre({
      container: caixa.current,
      style: `https://tiles.openfreemap.org/styles/${escuro ? 'dark' : 'liberty'}`,
      center: inicio ? [inicio.lon, inicio.lat] : CENTRO_POA,
      zoom: inicio ? 16 : 13,
      locale: TEXTOS,
      cooperativeGestures: true,
    })
    mapa.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    // O crédito do mapa (OpenStreetMap/OpenFreeMap) começa FECHADO no botão "i":
    // aberto, ele cobria cerca de 20% do mapa no celular. Um toque no "i" mostra.
    mapa.once('load', () => {
      const credito = caixa.current?.querySelector('.maplibregl-ctrl-attrib.maplibregl-compact')
      credito?.classList.remove('maplibregl-compact-show')
      credito?.removeAttribute('open')
    })
    const canvas = mapa.getCanvas()
    canvas.setAttribute('role', 'img')
    canvas.setAttribute(
      'aria-label',
      'Mapa para marcar o local: toque no ponto. Pelo teclado, use a busca por CEP ou os campos de latitude e longitude.',
    )
    mapa.getCanvas().style.cursor = 'crosshair'
    mapa.on('click', (e) => aoEscolherRef.current({ lat: e.lngLat.lat, lon: e.lngLat.lng }))
    mapaRef.current = mapa
    return () => {
      mapa.remove()
      mapaRef.current = null
      alfinete.current = null
    }
  }, [])

  // O alfinete acompanha o ponto marcado (pelo toque, pela busca ou digitado).
  const lat = ponto?.lat
  const lon = ponto?.lon
  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa) return
    if (lat === undefined) {
      alfinete.current?.remove()
      alfinete.current = null
      return
    }
    if (!alfinete.current) {
      alfinete.current = new Marker({ color: corDoToken('foco') }).setLngLat([lon, lat]).addTo(mapa)
    } else {
      alfinete.current.setLngLat([lon, lat])
    }
  }, [lat, lon])

  // A busca por CEP achou o ponto: o mapa vai até ele.
  useEffect(() => {
    if (!centrar || lat === undefined) return
    mapaRef.current?.jumpTo({ center: [lon, lat], zoom: 16 })
    // Só quando "centrar" muda (nova busca), e não a cada toque no mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centrar])

  return <div ref={caixa} className="h-64 w-full rounded border border-borda" />
}
