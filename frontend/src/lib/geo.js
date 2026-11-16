// Funções de geografia, sem React e sem mapa: só transformam dados.
// Ficam separadas para dar para testar e reaproveitar (ex.: o "perto de mim").

// Transforma a lista de locais (locais.json) em 2 coleções GeoJSON, o formato
// que o MapLibre desenha: as ÁREAS (polígonos do OpenStreetMap) e os PONTOS
// (o centro de cada local, onde fica ou ficaria a estação).
export function locaisParaGeoJSON(locais) {
  const areas = {
    type: 'FeatureCollection',
    features: locais.map((local) => ({
      type: 'Feature',
      geometry: local.area,
      properties: { id: local.id, nome: local.nome, posicao: local.satelite.posicao },
    })),
  }
  const pontos = {
    type: 'FeatureCollection',
    features: locais.map((local) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [local.lon, local.lat] },
      // Só a E1 tem equipamento de verdade (no Wokwi); as outras são locais
      // monitorados pelo satélite.
      properties: { id: local.id, nome: local.nome, aoVivo: local.id === 'E1' },
    })),
  }
  return { areas, pontos }
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
