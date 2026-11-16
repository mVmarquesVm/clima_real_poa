"""Exporta os 4 locais + o ranking do satélite para o Front-end.

O app (frontend/) não roda Python nem lê CSV: ele importa um JSON pronto.
Este script junta, num arquivo só:
    - dados/locais.geojson  -> nome, tipo e a área de cada local (OSM)
    - dados/estacoes.geojson + dados/cobertura_solo.csv -> o ponto da estação,
      a área que ela representa e o solo dessa área (fontes/cobertura.py)
    - dados/ranking.csv     -> o ranking pela temperatura da SUPERFÍCIE (satélite)
    - dados/satelite_superficie.csv -> as datas das passagens usadas

Rode depois do processamento.ranking, sempre que o ranking mudar:
    python -m processamento.exportar_front
"""

import csv
import json
from pathlib import Path

PASTA_DADOS = Path(__file__).resolve().parents[1] / "dados"   # python/dados
SAIDA = Path(__file__).resolve().parents[2] / "frontend" / "src" / "dados" / "locais.json"


def ler_csv(nome: str) -> list[dict]:
    with open(PASTA_DADOS / nome, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def montar() -> dict:
    with open(PASTA_DADOS / "locais.geojson", encoding="utf-8") as f:
        areas = json.load(f)["features"]
    with open(PASTA_DADOS / "estacoes.geojson", encoding="utf-8") as f:
        estacoes = {e["properties"]["id"]: e for e in json.load(f)["features"]}
    solo = {(l["estacao"], l["medida"]): l for l in ler_csv("cobertura_solo.csv")}
    ranking = {linha["estacao"]: linha for linha in ler_csv("ranking.csv")}
    datas = sorted({linha["data"] for linha in ler_csv("satelite_superficie.csv")})

    locais = []
    for area in areas:
        p = area["properties"]
        r = ranking[p["id"]]
        e = estacoes[p["id"]]
        s = solo[(p["id"], "cobertura")]
        locais.append({
            "id": p["id"],
            "nome": p["nome"],
            "tipo": p["tipo"],
            "lat": e["properties"]["lat"],     # onde fica a estação
            "lon": e["properties"]["lon"],
            "fonteArea": p["fonte"],
            "area": area["geometry"],          # o local inteiro (OSM)
            "cobertura": {                     # a área que a estação representa
                "regra": e["properties"]["regra"],
                "area": e["geometry"],
                "construido": float(s["construido"]),
                "arvore": float(s["arvore"]),
                "grama": float(s["grama"]),
            },
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
        "fonte": "Landsat 8/9 (superfície) e Sentinel-2 (NDVI), via Microsoft Planetary Computer; áreas do OpenStreetMap; cobertura do solo do ESA WorldCover 2021",
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
