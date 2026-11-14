"""Exporta os 4 locais + o ranking do satélite para o Front-end.

O app (frontend/) não roda Python nem lê CSV: ele importa um JSON pronto.
Este script junta, num arquivo só:
    - dados/locais.geojson  -> nome, tipo, coordenadas e a área de cada local (OSM)
    - dados/ranking.csv     -> o ranking pela temperatura da SUPERFÍCIE (satélite)
    - dados/satelite_superficie.csv -> as datas das passagens usadas

Rode depois do ranking.py, sempre que o ranking mudar:
    python exportar_front.py
"""

import csv
import json
from pathlib import Path

PASTA_DADOS = Path(__file__).parent / "dados"
SAIDA = Path(__file__).parent.parent / "frontend" / "src" / "dados" / "locais.json"


def ler_csv(nome: str) -> list[dict]:
    with open(PASTA_DADOS / nome, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def montar() -> dict:
    with open(PASTA_DADOS / "locais.geojson", encoding="utf-8") as f:
        areas = json.load(f)["features"]
    ranking = {linha["estacao"]: linha for linha in ler_csv("ranking.csv")}
    datas = sorted({linha["data"] for linha in ler_csv("satelite_superficie.csv")})

    locais = []
    for area in areas:
        p = area["properties"]
        r = ranking[p["id"]]
        locais.append({
            "id": p["id"],
            "nome": p["nome"],
            "tipo": p["tipo"],
            "lat": p["lat"],
            "lon": p["lon"],
            "fonteArea": p["fonte"],
            "area": area["geometry"],          # polígono, para o mapa pintar a área
            "satelite": {
                "posicao": int(r["posicao"]),
                "pisoMedioVerao": float(r["sup_media_verao"]),
                "pisoMaximo": float(r["sup_max"]),
                "acimaDoAr": float(r["acima_do_ar"]),
                "ndvi": float(r["ndvi"]),
                "passagens": int(r["passagens"]),
            },
        })
    locais.sort(key=lambda l: l["satelite"]["posicao"])

    return {
        "fonte": "Landsat 8/9 (superfície) e Sentinel-2 (NDVI), via Microsoft Planetary Computer; áreas do OpenStreetMap",
        "passagens": {"primeira": datas[0], "ultima": datas[-1], "total": len(datas)},
        "locais": locais,
    }


def main() -> None:
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    dados = montar()
    SAIDA.write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Salvo: {SAIDA} ({len(dados['locais'])} locais, "
          f"{dados['passagens']['total']} passagens)")


if __name__ == "__main__":
    main()
