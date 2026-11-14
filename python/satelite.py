"""Medidas de satélite em cada local: temperatura da superfície e vegetação.

- Landsat 8 e 9 (NASA/USGS), Coleção 2, Nível 2: a banda térmica (lwir11)
  vira a TEMPERATURA DA SUPERFÍCIE (do piso, do telhado, da grama), em
  pixels de 30 m (o sensor térmico mede em 100 m). O satélite passa
  sobre Porto Alegre por volta das 10h20.
- Sentinel-2 (ESA): as bandas do vermelho (B04) e do infravermelho
  próximo (B08) dão o NDVI, o "índice de verde": planta viva reflete
  muito infravermelho e pouco vermelho. Concreto ≈ 0 a 0,2; árvore ≈ 0,8.

Os dois vêm do Microsoft Planetary Computer, de graça e sem chave. O
próprio serviço calcula a média, o mínimo e o máximo dentro da área de
cada local (dados/locais.geojson), então não precisamos baixar imagens.

Usamos só as passagens de VERÃO (21/12 a 20/03) com menos de 10% de
nuvens na cena. Os resultados ficam salvos em dados/ (roda sem internet
depois).

Uso:
    python satelite.py
"""

from pathlib import Path

import pandas as pd
import requests

from locais import carregar_locais

PASTA_DADOS = Path(__file__).parent / "dados"
ARQUIVO_SUPERFICIE = PASTA_DADOS / "satelite_superficie.csv"
ARQUIVO_NDVI = PASTA_DADOS / "satelite_ndvi.csv"

STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
ESTATISTICA = "https://planetarycomputer.microsoft.com/api/data/v1/item/statistics"

VEROES = ["2024-12-21/2025-03-20", "2025-12-21/2026-03-20"]
MAX_NUVENS = 10           # % de nuvens na cena inteira
PONTO_CENTRAL = [-51.2305, -30.04]

# Sentinel-2 sem nuvens mais perto do dia 04/02/2025 (verão, mesma semana do InGá)
JANELA_NDVI = "2025-01-25/2025-02-15"

# Landsat Coleção 2, Nível 2, banda térmica: número do pixel -> Kelvin
ESCALA_TERMICA = 0.00341802
DESLOCAMENTO_TERMICO = 149.0


def landsat_celsius(valor: float) -> float:
    """Número do pixel da banda térmica -> temperatura da superfície em °C."""
    return valor * ESCALA_TERMICA + DESLOCAMENTO_TERMICO - 273.15


def buscar_cenas(colecao: str, periodo: str, max_nuvens: float) -> list[dict]:
    """Procura no catálogo (STAC) as passagens sobre o Centro com pouca nuvem."""
    resposta = requests.post(STAC, timeout=60, json={
        "collections": [colecao],
        "intersects": {"type": "Point", "coordinates": PONTO_CENTRAL},
        "datetime": periodo,
        "query": {"eo:cloud_cover": {"lt": max_nuvens}},
        "limit": 50,
    })
    resposta.raise_for_status()
    return resposta.json()["features"]


def estatisticas(colecao: str, item: str, geometria: dict, **parametros) -> dict:
    """Média, mínimo e máximo dos pixels dentro da área (calculados pelo serviço)."""
    resposta = requests.post(ESTATISTICA, timeout=120,
                             params={"collection": colecao, "item": item, **parametros},
                             json={"type": "Feature", "properties": {}, "geometry": geometria})
    resposta.raise_for_status()
    return next(iter(resposta.json()["properties"]["statistics"].values()))


def medir_superficie() -> pd.DataFrame:
    locais = carregar_locais()
    linhas = []
    for periodo in VEROES:
        for cena in buscar_cenas("landsat-c2-l2", periodo, MAX_NUVENS):
            quando = pd.Timestamp(cena["properties"]["datetime"]).tz_convert("America/Sao_Paulo")
            for local in locais:
                e = estatisticas("landsat-c2-l2", cena["id"], local["geometry"], assets="lwir11")
                linhas.append({
                    "cena": cena["id"], "data": quando.strftime("%Y-%m-%d"), "hora_local": quando.strftime("%H:%M"),
                    "nuvens_cena": cena["properties"]["eo:cloud_cover"], "estacao": local["properties"]["id"],
                    "sup_media": landsat_celsius(e["mean"]), "sup_min": landsat_celsius(e["min"]),
                    "sup_max": landsat_celsius(e["max"]), "pixels": int(e["valid_pixels"]),
                })
    return pd.DataFrame(linhas).sort_values(["data", "estacao"]).round(2)


def medir_ndvi() -> pd.DataFrame:
    """NDVI de cada local na cena Sentinel-2 com menos nuvem da janela."""
    cenas = sorted(buscar_cenas("sentinel-2-l2a", JANELA_NDVI, 5),
                   key=lambda c: c["properties"]["eo:cloud_cover"])
    if not cenas:
        raise SystemExit("Nenhuma cena Sentinel-2 sem nuvens na janela escolhida.")
    cena = cenas[0]
    # Desde a versão 04.00 do processamento (2022), cada banda vem com +1000.
    # Na conta do NDVI, as duas bandas somadas levam +2000, que tiramos.
    desconto = 2000 if cena["properties"].get("s2:processing_baseline", "00") >= "04.00" else 0
    expressao = f"(B08-B04)/(B08+B04-{desconto})"
    linhas = []
    for local in carregar_locais():
        e = estatisticas("sentinel-2-l2a", cena["id"], local["geometry"], expression=expressao, asset_as_band="true")
        linhas.append({"cena": cena["id"], "data": cena["properties"]["datetime"][:10],
                       "estacao": local["properties"]["id"], "ndvi_medio": e["mean"]})
    return pd.DataFrame(linhas).round(3)


def carregar_satelite() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Usa os CSVs salvos; se não existirem, mede tudo e salva."""
    PASTA_DADOS.mkdir(exist_ok=True)
    if not ARQUIVO_SUPERFICIE.exists():
        medir_superficie().to_csv(ARQUIVO_SUPERFICIE, index=False)
    if not ARQUIVO_NDVI.exists():
        medir_ndvi().to_csv(ARQUIVO_NDVI, index=False)
    return pd.read_csv(ARQUIVO_SUPERFICIE), pd.read_csv(ARQUIVO_NDVI)


def main() -> None:
    sup, ndvi = carregar_satelite()
    print(f"Landsat: {sup['cena'].nunique()} passagens de verão sem nuvens")
    print(sup.pivot(index="data", columns="estacao", values="sup_media").round(1).to_string())
    print(f"\nNDVI (Sentinel-2, {ndvi['data'].iloc[0]}):")
    print(ndvi.set_index("estacao")["ndvi_medio"].to_string())


if __name__ == "__main__":
    main()
