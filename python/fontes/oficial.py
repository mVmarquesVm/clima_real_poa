"""Dados oficiais MEDIDOS: estação automática A801 do INMET.

A A801 (Porto Alegre - Jardim Botânico) é a estação oficial da cidade.
Como manda a norma, ela fica num gramado aberto, longe de prédios e de
concreto. Por isso ela mede bem "o tempo da cidade", mas não o calor
de quem está no Largo Glênio Peres ao meio-dia. É esse o ponto cego
que o Clima Real POA quer cobrir.

Fonte: INMET, dados históricos anuais (portal.inmet.gov.br/dadoshistoricos),
arquivo de 2025, só a estação A801, salvo sem mudanças em
dados/inmet_A801_2025.csv.

Para cada hora, calculamos com a MESMA fórmula da estação Clima Real POA:
    ta_sombra -> sensação sem o sol;   ta_sol -> sensação com o sol medido.

Uso:
    python -m fontes.oficial                            # semana padrão (fev/2025)
    python -m fontes.oficial --inicio 2025-01-20 --fim 2025-01-26
"""

import argparse
from pathlib import Path

import pandas as pd

from processamento.sensacao import LIMITE_LARANJA, nivel_de_risco, radiacao_de_global, temperatura_aparente

PASTA_DADOS = Path(__file__).resolve().parents[1] / "dados"   # python/dados
ARQUIVO_INMET = PASTA_DADOS / "inmet_A801_2025.csv"

# Semana de calor de fevereiro de 2025: inclui o dia 04/02, quando o
# InGá mediu 61 °C no piso do Parque Harmonia e o satélite passou às 10h18.
INICIO_PADRAO = "2025-02-03"
FIM_PADRAO = "2025-02-09"

# Nomes das colunas do arquivo do INMET -> nomes curtos
COLUNAS = {
    "TEMPERATURA DO AR - BULBO SECO, HORARIA (°C)": "temp",
    "UMIDADE RELATIVA DO AR, HORARIA (%)": "umid",
    "VENTO, VELOCIDADE HORARIA (m/s)": "vento",
    "RADIACAO GLOBAL (Kj/m²)": "radiacao_kj",
}


def kj_hora_para_w(kj_m2: float) -> float:
    """Energia do sol numa hora (kJ/m²) -> potência média (W/m²).

    1 W = 1 J por segundo; 1 hora = 3600 s. Então kJ/m² ÷ 3,6 = W/m².
    """
    return kj_m2 / 3.6


def ler_inmet(arquivo: Path = ARQUIVO_INMET) -> pd.DataFrame:
    """Lê o CSV do INMET: 8 linhas de cabeçalho, ';' e vírgula decimal."""
    df = pd.read_csv(arquivo, sep=";", decimal=",", skiprows=8, encoding="latin-1")
    df = df.rename(columns=COLUNAS)
    # O INMET usa horário UTC; Porto Alegre está 3 horas atrás (UTC−3).
    utc = pd.to_datetime(df["Data"] + " " + df["Hora UTC"].str[:4], format="%Y/%m/%d %H%M", utc=True)
    df["hora"] = utc.dt.tz_convert("America/Sao_Paulo").dt.tz_localize(None)
    df = df[["hora", "temp", "umid", "vento", "radiacao_kj"]]
    df = df.mask(df == -9999)                       # -9999 = sem dado no INMET
    # Radiação vazia à noite = sol zero (o sensor só registra com luz)
    df["radiacao"] = df["radiacao_kj"].fillna(0).map(kj_hora_para_w).clip(lower=0)
    return df.drop(columns="radiacao_kj")


def calcular_sensacao(df: pd.DataFrame) -> pd.DataFrame:
    """A mesma régua da estação, hora a hora. Hora sem medida fica de fora."""
    df = df.dropna(subset=["temp", "umid", "vento"]).copy()
    df["ta_sombra"] = [temperatura_aparente(t, u, v, 0.0)
                       for t, u, v in zip(df["temp"], df["umid"], df["vento"])]
    df["ta_sol"] = [temperatura_aparente(t, u, v, radiacao_de_global(r))
                    for t, u, v, r in zip(df["temp"], df["umid"], df["vento"], df["radiacao"])]
    df["risco_sol"] = df["ta_sol"].map(nivel_de_risco)
    numeros = df.select_dtypes("number").columns
    df[numeros] = df[numeros].round(2)
    return df


def carregar_oficial(inicio: str = INICIO_PADRAO, fim: str = FIM_PADRAO) -> pd.DataFrame:
    df = calcular_sensacao(ler_inmet())
    fim_inclusivo = pd.Timestamp(fim) + pd.Timedelta(days=1)
    return df[(df["hora"] >= inicio) & (df["hora"] < fim_inclusivo)].reset_index(drop=True)


def main() -> None:
    leitor = argparse.ArgumentParser(description="Sensação térmica com os dados medidos pelo INMET.")
    leitor.add_argument("--inicio", default=INICIO_PADRAO, help="AAAA-MM-DD (dentro de 2025)")
    leitor.add_argument("--fim", default=FIM_PADRAO, help="AAAA-MM-DD (dentro de 2025)")
    args = leitor.parse_args()

    df = carregar_oficial(args.inicio, args.fim)
    if df.empty:
        raise SystemExit("Sem dados do INMET nesse período (o arquivo cobre 2025).")
    pico = df.loc[df["ta_sol"].idxmax()]
    print(f"INMET A801, {len(df)} horas com medida, de {args.inicio} a {args.fim}")
    print(f"Maior temperatura do ar medida: {df['temp'].max():.1f} °C")
    print(f"Maior sensação ao sol (mesma régua da estação): {pico['ta_sol']:.1f} °C em {pico['hora']:%d/%m %Hh}")
    print(f"Horas com sensação ao sol >= {LIMITE_LARANJA:.0f} °C (laranja ou mais): {(df['ta_sol'] >= LIMITE_LARANJA).sum()}")


if __name__ == "__main__":
    main()
