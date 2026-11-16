// Funções de geografia, sem React e sem mapa: só transformam dados.
// Ficam separadas para dar para testar e reaproveitar (ex.: o "perto de mim").

// Transforma a lista de locais (locais.json) nas 3 coleções GeoJSON, o formato
// que o MapLibre desenha:
// - as ÁREAS de cada local inteiro (polígonos do OpenStreetMap);
// - a COBERTURA: a parte que a estação representa (o local inteiro ou um raio
//   de 50 m), pintada com a cor do risco agora;
// - os PONTOS, onde fica a estação, que levam o nome e o selo ("AO VIVO").
// "estado" diz, para cada id, a cor da cobertura e o selo:
// { E1: { cor: '#e8590c', selo: 'AO VIVO' }, E2: { cor: '#6b7280', selo: '' } }
// (o Mapa pega as cores dos tokens do index.css e passa para cá).
export function locaisParaGeoJSON(locais, estado = {}) {
  const colecao = (features) => ({ type: 'FeatureCollection', features })

  const areas = colecao(
    locais.map((local) => ({
      type: 'Feature',
      geometry: local.area,
      properties: { id: local.id, nome: local.nome },
    })),
  )
  const cobertura = colecao(
    locais.map((local) => ({
      type: 'Feature',
      geometry: local.cobertura.area,
      properties: { id: local.id, cor: estado[local.id]?.cor },
    })),
  )
  const pontos = colecao(
    locais.map((local) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [local.lon, local.lat] },
      properties: { id: local.id, nome: local.nome, selo: estado[local.id]?.selo ?? '' },
    })),
  )
  return { areas, cobertura, pontos }
}

// O menor retângulo que contém todas as áreas: [[oeste, sul], [leste, norte]].
// O mapa abre enquadrado nele, então os 4 locais sempre aparecem.
export function limitesDosLocais(locais) {
  let oeste = Infinity
  let sul = Infinity
  let leste = -Infinity
  let norte = -Infinity
  for (const local of locais) {
    for (const [lon, lat] of todasAsCoordenadas(local.area)) {
      oeste = Math.min(oeste, lon)
      leste = Math.max(leste, lon)
      sul = Math.min(sul, lat)
      norte = Math.max(norte, lat)
    }
  }
  return [
    [oeste, sul],
    [leste, norte],
  ]
}

// Polygon tem [anel][ponto]; MultiPolygon tem [polígono][anel][ponto].
function todasAsCoordenadas(geometria) {
  if (geometria.type === 'Polygon') return geometria.coordinates.flat()
  if (geometria.type === 'MultiPolygon') return geometria.coordinates.flat(2)
  return []
}
