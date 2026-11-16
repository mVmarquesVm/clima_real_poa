"""Os 4 locais das estações e a área que o satélite mede em cada um.

As geometrias vêm do OpenStreetMap (OSM), pelo serviço Nominatim:
    - parque (área no OSM): o satélite mede o parque INTEIRO;
    - largo e calçadão (ponto ou linha no OSM): um círculo de 60 m
      em volta do ponto, que é mais ou menos o que a pessoa enxerga
      ao redor (e alguns pixels do satélite, para não depender de 1 só).

Na primeira vez, busca no OSM e salva em dados/locais.geojson. Depois,
lê o arquivo (funciona sem internet e dá sempre o mesmo resultado).
"""

import json
import math
import time
from pathlib import Path

import requests

PASTA_DADOS = Path(__file__).resolve().parents[1] / "dados"   # python/dados
ARQUIVO = PASTA_DADOS / "locais.geojson"
RAIO_PONTO_M = 60

LOCAIS = [
    {"id": "E1", "nome": "Largo Glênio Peres", "tipo": "Concreto",
     "busca": "Largo Glênio Peres, Porto Alegre"},
    {"id": "E2", "nome": "Calçadão da Rua dos Andradas", "tipo": "Concreto, cercado de prédios",
     "busca": "Rua dos Andradas, Centro Histórico, Porto Alegre", "osm_tipo": "pedestrian"},
    {"id": "E3", "nome": "Parque Harmonia", "tipo": "Parque com área pavimentada",
     "busca": "Parque Maurício Sirotsky Sobrinho, Porto Alegre"},
    {"id": "E4", "nome": "Parque Marinha do Brasil", "tipo": "Controle (parque arborizado)",
     "busca": "Parque Marinha do Brasil, Porto Alegre"},
]

NOMINATIM = "https://nominatim.openstreetmap.org/search"
# O Nominatim pede um nome de programa; não mandamos nenhum dado pessoal.
CABECALHO = {"User-Agent": "forno-alegre-estudo/1.0"}


def circulo(lat: float, lon: float, raio_m: float, lados: int = 32) -> dict:
    """Um círculo como polígono de latitude/longitude.

    1 grau de latitude ≈ 111,32 km; 1 grau de longitude encolhe com o
    cosseno da latitude (os meridianos se juntam perto dos polos).
    """
    dlat = raio_m / 111_320
    dlon = raio_m / (111_320 * math.cos(math.radians(lat)))
    anel = [[lon + dlon * math.cos(2 * math.pi * i / lados), lat + dlat * math.sin(2 * math.pi * i / lados)]
            for i in range(lados)]
    anel.append(anel[0])  # o polígono fecha no ponto em que começou
    return {"type": "Polygon", "coordinates": [anel]}


def _buscar_no_osm(local: dict) -> dict:
    resposta = requests.get(NOMINATIM, headers=CABECALHO, timeout=30, params={
        "q": local["busca"], "format": "jsonv2", "limit": 5, "polygon_geojson": 1})
    resposta.raise_for_status()
    achados = resposta.json()
    if "osm_tipo" in local:  # ex.: o trecho de pedestres da Rua dos Andradas (o calçadão)
        achados = [a for a in achados if a.get("type") == local["osm_tipo"]]
    if not achados:
        raise SystemExit(f"Não achei no OpenStreetMap: {local['busca']}")
    a = achados[0]
    geo = a["geojson"]
    lat, lon = float(a["lat"]), float(a["lon"])
    if geo["type"] not in ("Polygon", "MultiPolygon"):
        geo = circulo(lat, lon, RAIO_PONTO_M)
    return {"type": "Feature", "geometry": geo,
            "properties": {k: local[k] for k in ("id", "nome", "tipo")} | {
                "lat": lat, "lon": lon, "fonte": f"OpenStreetMap ({a['osm_type']} {a['osm_id']})"}}


def carregar_locais() -> list[dict]:
    """As 4 áreas como Features GeoJSON (do arquivo, ou do OSM na 1ª vez)."""
    if ARQUIVO.exists():
        return json.loads(ARQUIVO.read_text(encoding="utf-8"))["features"]
    feicoes = []
    for local in LOCAIS:
        feicoes.append(_buscar_no_osm(local))
        time.sleep(1.1)  # regra de uso do Nominatim: no máximo 1 pedido por segundo
    PASTA_DADOS.mkdir(exist_ok=True)
    ARQUIVO.write_text(json.dumps({"type": "FeatureCollection", "features": feicoes},
                                  ensure_ascii=False, indent=1), encoding="utf-8")
    return feicoes


if __name__ == "__main__":
    for f in carregar_locais():
        p = f["properties"]
        print(f"{p['id']} {p['nome']}: {f['geometry']['type']} ({p['fonte']}) em {p['lat']:.5f}, {p['lon']:.5f}")
