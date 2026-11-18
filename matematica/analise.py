"""Matemática do Clima Real POA: o calor de 04/02/2025 visto pelo Cálculo.

Dados REAIS: estação automática A801 do INMET (Porto Alegre), hora a
hora, em hora local, lidos pelo python/fontes/oficial.py. A sensação térmica é
a MESMA fórmula da estação Clima Real POA (Temperatura Aparente de
Steadman, com o sol medido), do python/processamento/sensacao.py.

Por que 04/02/2025? É o dia em que o InGá mediu 61 °C no piso do Parque
Harmonia (Sul21, 05/02/2025): o mesmo dia contado no Python e no pitch.

    M1 Modelo    -> uma soma de 2 ondas de 24 h ajustada à sensação ao sol
    M2 Derivada  -> a taxa de aquecimento (°C/h) e a hora em que ela zera (o pico)
    M3 Integral  -> a dose de calor acima de 34 °C, exata × somas de Riemann
    M4 Limite    -> o resfriamento da noite (Newton) e a temperatura para onde ele tende

Uso (de dentro da pasta matematica/, com o .venv do python/):
    python analise.py
Saída: resumo no terminal, resultados.json e 4 gráficos em graficos/.
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

PASTA = Path(__file__).resolve().parent
sys.path.insert(0, str(PASTA.parent / "python"))   # reaproveita o código do Python

from fontes.oficial import carregar_oficial  # noqa: E402
from processamento.sensacao import LIMITE_LARANJA  # noqa: E402

import calculo as c  # noqa: E402
import graficos  # noqa: E402

DIA = "2025-02-04"
HARMONICOS = 2          # escolhido pela comparação de 1 a 4 ondas (ver M1)
LIMITE = LIMITE_LARANJA  # 34 °C: onde começa o laranja (SMS de POA) e o relé liga o nebulizador
# A noite: das 20h (o sol já não chega a 4 W/m²) até as 6h do dia seguinte (antes de o sol nascer)
INICIO_NOITE, FIM_NOITE = 20, 30
PASSOS_RIEMANN = (23, 46, 92, 230, 2300)   # h = 1 h, 30 min, 15 min, 6 min, 36 s


def hhmm(t: float) -> str:
    """14.12 -> '14h07' (horas decimais viram relógio; passa da meia-noite com %24)."""
    minutos = round(t * 60)
    return f"{(minutos // 60) % 24:02d}h{minutos % 60:02d}"


def carregar_dia(dia: str = DIA) -> pd.DataFrame:
    """O dia e a madrugada seguinte, com t = horas desde a meia-noite do dia."""
    seguinte = (pd.Timestamp(dia) + pd.Timedelta(days=1)).strftime("%Y-%m-%d")
    df = carregar_oficial(dia, seguinte)
    df["t"] = (df["hora"] - pd.Timestamp(dia)).dt.total_seconds() / 3600
    return df


def analisar(df: pd.DataFrame) -> dict:
    dia = df[df["t"] < 24]
    t, ta = dia["t"].to_numpy(), dia["ta_sol"].to_numpy()

    # ---- M1: modelo. Mais ondas sempre erram menos; paramos quando o ganho fica pequeno.
    comparacao = [{"harmonicos": n, **c.metricas(ta, c.avaliar(c.ajustar(t, ta, n), t))} for n in (1, 2, 3, 4)]
    coef = c.ajustar(t, ta, HARMONICOS)

    # ---- M2: derivada. Pico = onde y' = 0; aquecimento mais rápido = onde y'' = 0 (e y' > 0).
    pico = c.raizes(lambda x: c.derivada(coef, x), 10, 20)[0]
    candidatos = c.raizes(lambda x: c.segunda_derivada(coef, x), 0, pico)
    t_taxa_max = max(candidatos, key=lambda x: c.derivada(coef, x))
    taxa_dados = np.gradient(ta, t)           # derivada "discreta": diferença central hora a hora
    subidas = np.diff(ta)                     # quanto subiu de uma hora para a seguinte

    # ---- M3: integral. A área exata do modelo × os retângulos de Riemann.
    integral = c.integral_acima(coef, LIMITE, 0, 23)
    acima_dados = np.maximum(ta - LIMITE, 0)
    acima_modelo = lambda x: np.maximum(c.avaliar(coef, x) - LIMITE, 0)  # noqa: E731
    # A dose vale 0 nas duas pontas (0h e 23h), e aí as regras esquerda, direita e
    # trapézio dão o MESMO número. Por isso a convergência usa uma regra só.
    convergencia = []
    for n in PASSOS_RIEMANN:
        soma = c.riemann_funcao(acima_modelo, 0, 23, n, "esquerda")
        convergencia.append({"n": n, "h": 23 / n, "soma": soma, "erro": abs(soma - integral["dose"])})

    # ---- M4: limite. Newton na temperatura do AR (é ela que segue a física do resfriamento).
    noite = df[(df["t"] >= INICIO_NOITE) & (df["t"] <= FIM_NOITE)]
    nw = c.ajustar_newton(noite["t"], noite["temp"])
    nw_metricas = c.metricas(noite["temp"], c.newton(noite["t"], nw["t_inf"], nw["t_0"], nw["k"], nw["inicio"]))

    return {
        "dia": DIA,
        "fonte": "INMET A801 (Porto Alegre - Jardim Botânico), dados horários medidos",
        "limite_c": LIMITE,
        "m1_modelo": {
            "harmonicos": HARMONICOS,
            "coeficientes": coef.tolist(),
            "comparacao": comparacao,
            "pico_medido": {"hora": hhmm(float(t[ta.argmax()])), "ta": float(ta.max())},
        },
        "m2_derivada": {
            "pico_modelo": {"t": pico, "hora": hhmm(pico), "ta": float(c.avaliar(coef, pico))},
            "taxa_maxima_modelo": {"t": t_taxa_max, "hora": hhmm(t_taxa_max),
                                   "c_por_h": float(c.derivada(coef, t_taxa_max))},
            "taxa_9h_modelo": float(c.derivada(coef, 9)),
            "taxa_9h_dados": float(taxa_dados[9]),
            "maior_subida_medida": {"de": hhmm(float(t[subidas.argmax()])), "ate": hhmm(float(t[subidas.argmax()] + 1)),
                                    "c": float(subidas.max())},
        },
        "m3_integral": {
            "dose_exata_modelo": integral["dose"],
            "horas_acima_modelo": integral["horas_acima"],
            "trechos": [[hhmm(a), hhmm(b)] for a, b in integral["trechos"]],
            "riemann_dados_h1": {r: c.riemann(acima_dados, 1, r) for r in ("esquerda", "direita", "trapezio")},
            "horas_acima_dados": int((ta >= LIMITE).sum()),
            "convergencia": convergencia,
        },
        "m4_limite": {**nw, "na_borda": bool(nw["na_borda"]), **{f"ajuste_{k}": v for k, v in nw_metricas.items()},
                      "noite": [hhmm(INICIO_NOITE), hhmm(FIM_NOITE)],
                      "minima_medida": float(noite["temp"].min())},
    }


def imprimir(r: dict) -> None:
    m1, m2, m3, m4 = r["m1_modelo"], r["m2_derivada"], r["m3_integral"], r["m4_limite"]
    br = lambda x, casas=1: f"{x:.{casas}f}".replace(".", ",")  # noqa: E731
    print(f"Clima Real POA - Matemática com o dia {r['dia']} ({r['fonte']})\n")
    print("M1 MODELO: sensação ao sol = soma de ondas de 24 h")
    for linha in m1["comparacao"]:
        marca = "  <- escolhido" if linha["harmonicos"] == m1["harmonicos"] else ""
        print(f"   {linha['harmonicos']} onda(s): erro típico {br(linha['rmse'], 2)} °C, R² {br(linha['r2'], 3)}{marca}")
    print(f"\nM2 DERIVADA (o velocímetro do calor)")
    print(f"   Às 9h a sensação sobe {br(m2['taxa_9h_modelo'])} °C/h no modelo ({br(m2['taxa_9h_dados'])} °C/h nos dados).")
    print(f"   Aquecimento mais rápido: {br(m2['taxa_maxima_modelo']['c_por_h'])} °C/h às {m2['taxa_maxima_modelo']['hora']}"
          f" (nos dados: +{br(m2['maior_subida_medida']['c'])} °C de {m2['maior_subida_medida']['de']} a {m2['maior_subida_medida']['ate']}).")
    print(f"   Derivada = 0 às {m2['pico_modelo']['hora']}: pico de {br(m2['pico_modelo']['ta'])} °C"
          f" (medido: {br(m1['pico_medido']['ta'])} °C às {m1['pico_medido']['hora']}).")
    print(f"\nM3 INTEGRAL (a dose de calor acima de {r['limite_c']:.0f} °C)")
    print(f"   Exata no modelo: {br(m3['dose_exata_modelo'])} °C·h em {br(m3['horas_acima_modelo'])} h"
          f" ({' e '.join(' a '.join(p) for p in m3['trechos'])}).")
    regras = m3["riemann_dados_h1"]
    print(f"   Riemann nos dados (h = 1 h): esquerda {br(regras['esquerda'])}, direita {br(regras['direita'])},"
          f" trapézio {br(regras['trapezio'])} °C·h (iguais: a dose vale 0 nas duas pontas);"
          f" {m3['horas_acima_dados']} horas medidas acima do limite.")
    for linha in m3["convergencia"]:
        print(f"   Riemann no modelo com h = {br(linha['h'] * 60, 1):>4} min: {br(linha['soma'], 4)} °C·h,"
              f" erro {linha['erro']:.1e} °C·h")
    # O terminal do Windows (cp1252) não tem os símbolos − → ∞: aqui vai em texto comum
    print(f"\nM4 LIMITE (a noite, lei de Newton, de {m4['noite'][0]} a {m4['noite'][1]})")
    print(f"   T(t) = {br(m4['t_inf'], 2)} + ({br(m4['t_0'], 2)} - {br(m4['t_inf'], 2)})·e^(-{br(m4['k'], 3)}·(t - 20))"
          f"   erro típico {br(m4['ajuste_rmse'], 2)} °C")
    print(f"   lim T(t) com t tendendo ao infinito = {br(m4['t_inf'])} °C;  a diferença para esse valor"
          f" cai pela metade a cada {br(m4['meia_vida_h'])} h.")
    if m4["na_borda"]:
        print("   ATENÇÃO: o T infinito ficou na borda da busca; a assíntota não está bem definida pelos dados.")


def _json(valor):
    """O json não conhece os números do NumPy: converte para float/bool comuns."""
    if isinstance(valor, np.generic):
        return valor.item()
    raise TypeError(type(valor))


def main() -> None:
    df = carregar_dia()
    r = analisar(df)
    imprimir(r)
    (PASTA / "resultados.json").write_text(json.dumps(r, indent=2, ensure_ascii=False, default=_json), encoding="utf-8")
    pasta_graficos = PASTA / "graficos"
    pasta_graficos.mkdir(exist_ok=True)
    arquivos = graficos.gerar_todos(df, r, pasta_graficos)
    print("\nGerados: resultados.json, " + ", ".join(f"graficos/{a.name}" for a in arquivos))


if __name__ == "__main__":
    main()
