"""Ranking dos locais mais críticos, só com dados MEDIDOS.

Cruza três fontes:
    1. Satélite Landsat: temperatura da SUPERFÍCIE em cada local, nas
       passagens de verão sem nuvens (por volta das 10h20);
    2. Satélite Sentinel-2: o NDVI (quanto verde há em cada local);
    3. INMET A801: a temperatura do AR medida pela estação oficial, na
       mesma hora da passagem do satélite (só para 2025, o ano do arquivo).

Indicadores de cada local:
    sup_media_verao   -> média da temperatura da superfície nas passagens de verão
    sup_max           -> o pixel mais quente já medido no local
    ndvi              -> índice de verde (0 = concreto, ~0,8 = árvore)
    acima_do_ar       -> quanto a superfície passou do ar medido pelo INMET
                         (média das passagens de 2025)

O ranking ordena pela superfície média do verão: é o calor que o piso
devolve para quem está em cima dele.

Uso:
    python -m processamento.ranking
"""

import argparse
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # gera arquivos PNG, sem abrir janela
import matplotlib.pyplot as plt  # noqa: E402
import pandas as pd  # noqa: E402

from fontes.locais import LOCAIS  # noqa: E402
from fontes.oficial import FIM_PADRAO, INICIO_PADRAO, PASTA_DADOS, carregar_oficial, ler_inmet  # noqa: E402
from fontes.satelite import carregar_satelite  # noqa: E402
from processamento.sensacao import LIMITE_LARANJA, LIMITE_VERMELHO  # noqa: E402

PASTA_GRAFICOS = Path(__file__).resolve().parents[1] / "graficos"   # python/graficos

# Paleta validada para daltonismo (ordem fixa; a cor segue a série)
AZUL, LARANJA = "#2a78d6", "#eb6834"
FUNDO, TINTA, TINTA_2, APAGADO = "#fcfcfb", "#0b0b0b", "#52514e", "#898781"
GRADE, EIXO = "#e1e0d9", "#c3c2b7"

NOMES = {local["id"]: local["nome"] for local in LOCAIS}


def ar_na_passagem(sup: pd.DataFrame) -> pd.DataFrame:
    """Para cada passagem, a temperatura do ar do INMET na hora cheia mais próxima."""
    inmet = ler_inmet().set_index("hora")["temp"]
    passagens = sup[["data", "hora_local"]].drop_duplicates()
    horas = pd.to_datetime(passagens["data"] + " " + passagens["hora_local"]).dt.round("h")
    passagens["ar_inmet"] = [inmet.get(h) for h in horas]   # None se a data não está no arquivo
    return passagens


def calcular_ranking(sup: pd.DataFrame, ndvi: pd.DataFrame) -> pd.DataFrame:
    sup = sup.merge(ar_na_passagem(sup), on=["data", "hora_local"])
    sup["acima_do_ar"] = sup["sup_media"] - sup["ar_inmet"]

    r = sup.groupby("estacao").agg(
        sup_media_verao=("sup_media", "mean"),
        sup_max=("sup_max", "max"),
        acima_do_ar=("acima_do_ar", "mean"),     # o pandas ignora as passagens sem INMET
        passagens=("cena", "nunique"),
    )
    r["ndvi"] = ndvi.set_index("estacao")["ndvi_medio"]
    r.insert(0, "local", r.index.map(NOMES))
    r = r.sort_values("sup_media_verao", ascending=False)
    r.insert(0, "posicao", range(1, len(r) + 1))
    return r.round({"sup_media_verao": 1, "sup_max": 1, "acima_do_ar": 1, "ndvi": 2})


def _estilo(ax) -> None:
    """Grade e eixos discretos: quem aparece são os dados."""
    ax.set_facecolor(FUNDO)
    for lado in ("top", "right"):
        ax.spines[lado].set_visible(False)
    for lado in ("left", "bottom"):
        ax.spines[lado].set_color(EIXO)
    ax.tick_params(colors=TINTA_2, labelsize=9)
    ax.grid(color=GRADE, linewidth=0.8)
    ax.set_axisbelow(True)


def _br(numero: float, casas: int = 1) -> str:
    return f"{numero:.{casas}f}".replace(".", ",")


def grafico_ranking(r: pd.DataFrame, arquivo: Path) -> None:
    """Barras horizontais: superfície média no verão, do mais quente para o menos."""
    r = r.iloc[::-1]   # o 1º lugar fica em cima
    fig, ax = plt.subplots(figsize=(10, 4), facecolor=FUNDO)
    _estilo(ax)
    ax.grid(axis="y", visible=False)

    rotulos = [f"{i}  {local}" for i, local in zip(r.index, r["local"])]
    barras = ax.barh(rotulos, r["sup_media_verao"], height=0.6, color=AZUL, edgecolor=FUNDO, linewidth=2)
    for barra, media, maximo, ndvi in zip(barras, r["sup_media_verao"], r["sup_max"], r["ndvi"]):
        ax.text(barra.get_width() + 0.4, barra.get_y() + barra.get_height() / 2,
                f"{_br(media)} °C   (pixel mais quente: {_br(maximo)} °C · NDVI {_br(ndvi, 2)})",
                va="center", color=TINTA_2, fontsize=8.5)

    ax.set_xlim(0, r["sup_media_verao"].max() * 1.6)
    ax.tick_params(axis="y", labelcolor=TINTA, labelsize=9)
    ax.set_xlabel("Temperatura média da superfície nas passagens de verão (°C)", color=TINTA_2)
    ax.set_title("Ranking dos locais mais quentes (superfície medida por satélite)",
                 loc="left", color=TINTA, fontsize=12, pad=12)
    fig.text(0.01, 0.01, f"Fontes: Landsat 8/9 (NASA/USGS), {int(r['passagens'].max())} passagens de verão sem nuvens, "
             "por volta das 10h20; NDVI do Sentinel-2 (ESA); via Microsoft Planetary Computer. Áreas do OpenStreetMap.",
             color=APAGADO, fontsize=7.5)
    fig.tight_layout(rect=(0, 0.04, 1, 1))
    fig.savefig(arquivo, dpi=150)
    plt.close(fig)


def grafico_semana(df: pd.DataFrame, periodo: str, arquivo: Path) -> None:
    """INMET A801: a temperatura do ar medida × a sensação ao sol (mesma régua da estação)."""
    fig, ax = plt.subplots(figsize=(10, 5), facecolor=FUNDO)
    _estilo(ax)

    for limite, nome in ((LIMITE_LARANJA, "laranja"), (LIMITE_VERMELHO, "vermelho")):
        ax.hlines(limite, df["hora"].iloc[0], df["hora"].iloc[-1], color=APAGADO, linewidth=1, linestyle=(0, (4, 3)))
        # O rótulo fica à direita do último dia, onde não cobre nenhum dado
        ax.text(df["hora"].iloc[-1] + pd.Timedelta(hours=3), limite, f"risco {nome}\n({limite:.0f} °C)",
                color=TINTA_2, fontsize=8.5, va="center")
    ax.set_xlim(df["hora"].iloc[0] - pd.Timedelta(hours=2), df["hora"].iloc[-1] + pd.Timedelta(hours=26))

    ax.plot(df["hora"], df["temp"], color=AZUL, linewidth=2, label="Temperatura do ar medida (o número que sai no jornal)")
    ax.plot(df["hora"], df["ta_sol"], color=LARANJA, linewidth=2, label="Sensação térmica ao sol (Steadman)")

    pico = df.loc[df["ta_sol"].idxmax()]
    ax.plot(pico["hora"], pico["ta_sol"], "o", markersize=8, color=LARANJA, markeredgecolor=FUNDO, markeredgewidth=2)
    ax.annotate(f"{_br(pico['ta_sol'])} °C de sensação\ncom {_br(pico['temp'])} °C no ar ({pico['hora']:%d/%m %Hh})",
                (pico["hora"], pico["ta_sol"]), xytext=(12, 0), textcoords="offset points",
                va="center", color=TINTA, fontsize=8.5)

    ax.set_ylabel("°C", color=TINTA_2)
    ax.xaxis.set_major_formatter(matplotlib.dates.DateFormatter("%d/%m"))
    ax.set_title(f"Estação oficial do INMET (A801), {periodo}: o ar × a sensação ao sol",
                 loc="left", color=TINTA, fontsize=12, pad=12)
    ax.legend(loc="lower left", fontsize=8.5, frameon=False, labelcolor=TINTA_2)
    fig.text(0.01, 0.01, "Fonte: INMET, estação automática A801 (Porto Alegre - Jardim Botânico), dados horários medidos.",
             color=APAGADO, fontsize=7.5)
    fig.tight_layout(rect=(0, 0.04, 1, 1))
    fig.savefig(arquivo, dpi=150)
    plt.close(fig)


def main() -> None:
    leitor = argparse.ArgumentParser(description="Ranking dos locais mais quentes, com dados medidos.")
    leitor.add_argument("--inicio", default=INICIO_PADRAO, help="semana do INMET, AAAA-MM-DD")
    leitor.add_argument("--fim", default=FIM_PADRAO, help="semana do INMET, AAAA-MM-DD")
    args = leitor.parse_args()

    sup, ndvi = carregar_satelite()
    ranking = calcular_ranking(sup, ndvi)
    print("Ranking dos locais mais quentes (superfície medida pelo satélite, verão)\n")
    print(ranking.to_string())
    ranking.to_csv(PASTA_DADOS / "ranking.csv")

    semana = carregar_oficial(args.inicio, args.fim)
    periodo = f"{pd.Timestamp(args.inicio):%d/%m} a {pd.Timestamp(args.fim):%d/%m/%Y}"
    PASTA_GRAFICOS.mkdir(exist_ok=True)
    grafico_ranking(ranking, PASTA_GRAFICOS / "ranking.png")
    grafico_semana(semana, periodo, PASTA_GRAFICOS / "inmet_semana.png")
    print(f"\nINMET {periodo}: ar máximo {semana['temp'].max():.1f} °C; "
          f"sensação ao sol máxima {semana['ta_sol'].max():.1f} °C")
    print("Salvos: dados/ranking.csv, graficos/ranking.png e graficos/inmet_semana.png")


if __name__ == "__main__":
    main()
