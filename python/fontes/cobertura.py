"""A área que cada estação representa ("cobertura"), pela cobertura do solo.

Uma estação mede o ar do lugar onde está. A regra (decisão de 16/11/2026):
    - local HOMOGÊNEO (quase todo construído/pavimentado): o calor é parecido
      em toda a área, então a estação vale para o local INTEIRO (área do OSM);
    - local MISTO (concreto + árvore/grama): o calor muda de um canto para
      outro, então a estação vale só para um CÍRCULO de 50 m em volta dela.

Os 50 m vêm do Guia de Instrumentos da Organização Meteorológica Mundial
(WMO-No. 8, 7ª ed., 2008, Parte II, cap. 11, seção 11.1.1.4): para um sensor
a ~1,5 m de altura, a área que influencia a leitura vai de "algumas dezenas
de metros" (ar neutro) a mais de 100 m (noite calma).

Para saber se o local é homogêneo ou misto, usamos o ESA WorldCover (mapa do
uso do solo da Agência Espacial Europeia, pixels de 10 m, 2021), pelo
Microsoft Planetary Computer, de graça e sem chave. O serviço conta quantos
pixels de cada classe caem dentro da área.

Uso:
    python -m fontes.cobertura
"""

import json
from pathlib import Path

import pandas as pd
import requests

from fontes.locais import carregar_locais, circulo

PASTA_DADOS = Path(__file__).resolve().parents[1] / "dados"   # python/dados
ARQUIVO_COBERTURA = PASTA_DADOS / "cobertura_solo.csv"
ARQUIVO_ESTACOES = PASTA_DADOS / "estacoes.geojson"

ESTATISTICA = "https://planetarycomputer.microsoft.com/api/data/v1/item/statistics"
ITEM_WORLDCOVER = "ESA_WorldCover_10m_2021_v200_S33W054"   # o quadrado do mapa que tem Porto Alegre

# Classes do WorldCover (as que aparecem no Centro de POA)
CLASSES = {10: "arvore", 20: "arbusto", 30: "grama", 40: "plantacao", 50: "construido",
           60: "solo_exposto", 80: "agua", 90: "banhado"}

RAIO_COBERTURA_M = 50          # WMO-No. 8, seção 11.1.1.4 (ver acima)
LIMITE_HOMOGENEO = 0.80        # 80% ou mais construído = homogêneo (proposta; ver README)

# Onde fica (ou ficaria) cada estação. Escolhidos em 16/11/2026:
#   E1: o centro do Largo (o ponto do OSM);
#   E2: o centro do trecho de pedestres da Rua dos Andradas (o ponto do OSM);
#   E3: dentro da maior área pavimentada do Harmonia (OSM way 1315610353,
#       paving_stones, ~7.400 m²), no pixel com mais construído em volta;
#   E4: um pixel de árvore do Marinha cujo círculo de 50 m é 100% árvore,
#       o mais perto do centro do parque (o "refúgio" de controle).
ESTACOES = {
    "E1": (-30.0280671, -51.2276134),
    "E2": (-30.0302953, -51.2309031),
    "E3": (-30.040690, -51.237354),
    "E4": (-30.054441, -51.231272),
}


def fracoes_do_solo(geometria: dict) -> dict:
    """Fração (0 a 1) de cada classe do WorldCover dentro da área."""
    resposta = requests.post(ESTATISTICA, timeout=120, params={
        "collection": "esa-worldcover", "item": ITEM_WORLDCOVER, "assets": "map",
        "categorical": "true", "max_size": 1024,
    }, json={"type": "Feature", "properties": {}, "geometry": geometria})
    resposta.raise_for_status()
    estat = next(iter(resposta.json()["properties"]["statistics"].values()))
    contagens, valores = estat["histogram"]
    total = sum(contagens)
    fracoes = {nome: 0.0 for nome in CLASSES.values()}
    for n, valor in zip(contagens, valores):
        fracoes[CLASSES.get(int(valor), f"classe_{int(valor)}")] = n / total
    fracoes["pixels"] = total
    return fracoes


def eh_homogeneo(fracao_construida: float) -> bool:
    return fracao_construida >= LIMITE_HOMOGENEO


def area_da_estacao(local: dict, fracao_construida: float) -> tuple[dict, str]:
    """A área que a estação representa e o porquê ('local inteiro' ou 'raio de 50 m')."""
    if eh_homogeneo(fracao_construida):
        return local["geometry"], "local inteiro"
    lat, lon = ESTACOES[local["properties"]["id"]]
    return circulo(lat, lon, RAIO_COBERTURA_M), f"raio de {RAIO_COBERTURA_M} m"


def medir_cobertura() -> pd.DataFrame:
    """Mede o solo de cada local inteiro (OSM) e da área final da estação."""
    linhas = []
    for local in carregar_locais():
        id_ = local["properties"]["id"]
        do_local = fracoes_do_solo(local["geometry"])
        geometria, regra = area_da_estacao(local, do_local["construido"])
        da_area = do_local if regra == "local inteiro" else fracoes_do_solo(geometria)
        for medida, f in (("local", do_local), ("cobertura", da_area)):
            linhas.append({"estacao": id_, "medida": medida, "regra": regra, **f})
    return pd.DataFrame(linhas).round(3)


def carregar_estacoes() -> list[dict]:
    """As 4 áreas de cobertura como Features GeoJSON (do arquivo, ou medindo na 1ª vez)."""
    if ARQUIVO_ESTACOES.exists() and ARQUIVO_COBERTURA.exists():
        return json.loads(ARQUIVO_ESTACOES.read_text(encoding="utf-8"))["features"]

    cobertura = medir_cobertura()
    cobertura.to_csv(ARQUIVO_COBERTURA, index=False)
    feicoes = []
    for local in carregar_locais():
        p = local["properties"]
        linha = cobertura[(cobertura["estacao"] == p["id"]) & (cobertura["medida"] == "local")].iloc[0]
        geometria, regra = area_da_estacao(local, linha["construido"])
        lat, lon = ESTACOES[p["id"]]
        feicoes.append({"type": "Feature", "geometry": geometria, "properties": {
            "id": p["id"], "nome": p["nome"], "regra": regra, "lat": lat, "lon": lon,
            "construido_no_local": float(linha["construido"])}})
    ARQUIVO_ESTACOES.write_text(json.dumps({"type": "FeatureCollection", "features": feicoes},
                                           ensure_ascii=False, indent=1), encoding="utf-8")
    return feicoes


def main() -> None:
    carregar_estacoes()
    df = pd.read_csv(ARQUIVO_COBERTURA)
    colunas = ["estacao", "medida", "regra", "construido", "arvore", "grama", "pixels"]
    print("Cobertura do solo (ESA WorldCover 2021, fração dos pixels de 10 m)\n")
    print(df[colunas].to_string(index=False))


if __name__ == "__main__":
    main()
