"""Os 4 gráficos da Matemática (PNG, para o relatório em PDF).

Mesma paleta e mesmo estilo do python/processamento/ranking.py: azul = temperatura do
AR, laranja = SENSAÇÃO ao sol. A cor segue a grandeza em todos os gráficos.
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # gera arquivos PNG, sem abrir janela
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

import calculo as c  # noqa: E402

AZUL, LARANJA = "#2a78d6", "#eb6834"
FUNDO, TINTA, TINTA_2, APAGADO = "#fcfcfb", "#0b0b0b", "#52514e", "#898781"
GRADE, EIXO = "#e1e0d9", "#c3c2b7"
FONTE = "Fonte: INMET, estação automática A801 (Porto Alegre - Jardim Botânico), dados horários medidos em 04-05/02/2025."


def _br(numero: float, casas: int = 1) -> str:
    return f"{numero:.{casas}f}".replace(".", ",")


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


def _eixo_horas(ax, inicio: float, fim: float, passo: int = 3) -> None:
    """Eixo x em horas do relógio (passa da meia-noite: 24 vira 0h)."""
    ticks = np.arange(inicio, fim + 0.1, passo)
    ax.set_xticks(ticks)
    ax.set_xticklabels([f"{int(x) % 24}h" for x in ticks])
    ax.set_xlim(inicio - 0.5, fim + 0.5)


def _salvar(fig, titulo: str, ax, arquivo: Path, nota: str = FONTE) -> Path:
    ax.set_title(titulo, loc="left", color=TINTA, fontsize=12, pad=12)
    fig.text(0.01, 0.01, nota, color=APAGADO, fontsize=7.5)
    fig.tight_layout(rect=(0, 0.04, 1, 1))
    fig.savefig(arquivo, dpi=150)
    plt.close(fig)
    return arquivo


def grafico_modelo(df, r, arquivo: Path) -> Path:
    """M1: os pontos medidos e a curva do modelo (e o modelo de 1 onda, para comparar)."""
    dia = df[df["t"] < 24]
    m1 = r["m1_modelo"]
    coef = np.array(m1["coeficientes"])
    tt = np.linspace(0, 23, 500)
    simples = c.ajustar(dia["t"], dia["ta_sol"], 1)
    erro = {linha["harmonicos"]: linha["rmse"] for linha in m1["comparacao"]}

    fig, ax = plt.subplots(figsize=(10, 5), facecolor=FUNDO)
    _estilo(ax)
    ax.axhline(r["limite_c"], color=APAGADO, linewidth=1, linestyle=(0, (4, 3)))
    ax.text(23.8, r["limite_c"] + 0.9, f"{r['limite_c']:.0f} °C (relé liga)", color=TINTA_2, fontsize=8.5)
    ax.plot(tt, c.avaliar(simples, tt), color=APAGADO, linewidth=1.5, linestyle=(0, (2, 2)),
            label=f"Modelo com 1 onda (erro típico {_br(erro[1])} °C)")
    ax.plot(tt, c.avaliar(coef, tt), color=LARANJA, linewidth=2,
            label=f"Modelo com {m1['harmonicos']} ondas (erro típico {_br(erro[m1['harmonicos']])} °C)")
    ax.plot(dia["t"], dia["ta_sol"], "o", markersize=7, color=LARANJA, markeredgecolor=FUNDO, markeredgewidth=1.5,
            label="Sensação ao sol medida (Steadman)")
    _eixo_horas(ax, 0, 24)
    ax.set_xlim(-0.5, 25.5)
    ax.set_ylabel("Sensação térmica (°C)", color=TINTA_2)
    ax.legend(loc="upper left", fontsize=8.5, frameon=False, labelcolor=TINTA_2)
    return _salvar(fig, "M1 · O modelo: a sensação ao sol de 04/02/2025 como soma de ondas de 24 h", ax, arquivo)


def grafico_derivada(df, r, arquivo: Path) -> Path:
    """M2: a derivada do modelo (°C/h) e a derivada discreta dos dados."""
    dia = df[df["t"] < 24]
    coef = np.array(r["m1_modelo"]["coeficientes"])
    m2 = r["m2_derivada"]
    tt = np.linspace(0, 23, 500)

    fig, ax = plt.subplots(figsize=(10, 5), facecolor=FUNDO)
    _estilo(ax)
    ax.axhline(0, color=EIXO, linewidth=1.2)
    ax.plot(tt, c.derivada(coef, tt), color=LARANJA, linewidth=2, label="Derivada do modelo, TA'(t)")
    ax.plot(dia["t"], np.gradient(dia["ta_sol"].to_numpy(), dia["t"].to_numpy()), "o", markersize=6,
            color=LARANJA, alpha=0.45, markeredgecolor=FUNDO, label="Diferença central dos dados (derivada discreta)")

    rapido, pico = m2["taxa_maxima_modelo"], m2["pico_modelo"]
    ax.plot(rapido["t"], rapido["c_por_h"], "o", markersize=9, color=LARANJA, markeredgecolor=FUNDO, markeredgewidth=2)
    ax.annotate(f"Aquece mais rápido às {rapido['hora']}:\n+{_br(rapido['c_por_h'])} °C por hora (TA'' = 0)",
                (rapido["t"], rapido["c_por_h"]), xytext=(40, 20), textcoords="offset points", color=TINTA, fontsize=8.5,
                arrowprops={"arrowstyle": "-", "color": APAGADO})
    ax.plot(pico["t"], 0, "o", markersize=9, color=TINTA, markeredgecolor=FUNDO, markeredgewidth=2)
    ax.annotate(f"TA'(t) = 0 às {pico['hora']}:\no pico ({_br(pico['ta'])} °C no modelo)",
                (pico["t"], 0), xytext=(14, 26), textcoords="offset points", color=TINTA, fontsize=8.5,
                arrowprops={"arrowstyle": "-", "color": APAGADO})
    ax.text(0.3, 0.25, "acima de 0: esquentando", color=TINTA_2, fontsize=8.5)
    ax.text(0.3, -0.75, "abaixo de 0: esfriando", color=TINTA_2, fontsize=8.5)
    _eixo_horas(ax, 0, 24)
    ax.set_ylim(top=4.8)
    ax.set_ylabel("Taxa de aquecimento (°C por hora)", color=TINTA_2)
    ax.legend(loc="lower left", fontsize=8.5, frameon=False, labelcolor=TINTA_2)
    return _salvar(fig, "M2 · A derivada: a que velocidade a sensação sobe e desce", ax, arquivo)


def grafico_integral(df, r, arquivo: Path) -> Path:
    """M3: à esquerda, a área acima do limite (34 °C) e os retângulos de Riemann; à direita, o erro caindo com h."""
    dia = df[df["t"] < 24]
    coef = np.array(r["m1_modelo"]["coeficientes"])
    m3, limite = r["m3_integral"], r["limite_c"]
    tt = np.linspace(0, 23, 800)
    curva = c.avaliar(coef, tt)

    fig, (ax, ax2) = plt.subplots(1, 2, figsize=(12, 5), facecolor=FUNDO, gridspec_kw={"width_ratios": [1.6, 1]})
    _estilo(ax)
    _estilo(ax2)

    # Retângulos de Riemann à esquerda (h = 1 h) sobre os DADOS: altura = quanto passou do limite
    for t0, ta in zip(dia["t"].iloc[:-1], dia["ta_sol"].iloc[:-1]):
        if ta > limite:
            ax.add_patch(plt.Rectangle((t0, limite), 1, ta - limite, facecolor="none", edgecolor=APAGADO, linewidth=0.9))
    ax.fill_between(tt, limite, curva, where=curva > limite, color=LARANJA, alpha=0.28, linewidth=0)
    ax.plot(tt, curva, color=LARANJA, linewidth=2)
    ax.axhline(limite, color=APAGADO, linewidth=1, linestyle=(0, (4, 3)))
    ax.text(0.2, limite - 1.6, f"limite de {limite:.0f} °C", color=TINTA_2, fontsize=8.5)
    ax.text(14.2, 35.2, f"área exata\n{_br(m3['dose_exata_modelo'])} °C·h", color=TINTA, fontsize=10, ha="center")
    ax.text(0.2, 45.5, f"retângulos (Riemann, h = 1 h, dados):\n{_br(m3['riemann_dados_h1']['esquerda'])} °C·h",
            color=TINTA_2, fontsize=8.5)
    _eixo_horas(ax, 0, 24)
    ax.set_ylabel("Sensação ao sol (°C)", color=TINTA_2)
    ax.set_title(f"M3 · A integral: a dose de calor acima de {limite:.0f} °C", loc="left", color=TINTA, fontsize=12, pad=12)

    conv = pd.DataFrame(m3["convergencia"])
    minutos = conv["h"] * 60
    ax2.loglog(minutos, conv["erro"], "o-", color=LARANJA, linewidth=2, markersize=7, markeredgecolor=FUNDO)
    for h, erro in zip(minutos, conv["erro"]):
        ax2.annotate(f"{erro:.0e}".replace("e-0", "e-"), (h, erro), xytext=(0, 9), textcoords="offset points",
                     ha="center", color=TINTA_2, fontsize=8)
    ax2.set_xticks(minutos, [_br(m, 1 if m < 1 else 0) for m in minutos])
    ax2.minorticks_off()
    ax2.invert_xaxis()
    ax2.set_xlabel("Largura do retângulo, h (minutos, escala log)", color=TINTA_2)
    ax2.set_ylabel("Erro da soma de Riemann (°C·h, escala log)", color=TINTA_2)
    ax2.set_title("h → 0: a soma vira a integral", loc="left", color=TINTA, fontsize=12, pad=12)

    fig.text(0.01, 0.01, FONTE + " Área e erros calculados sobre o modelo de M1.", color=APAGADO, fontsize=7.5)
    fig.tight_layout(rect=(0, 0.04, 1, 1))
    fig.savefig(arquivo, dpi=150)
    plt.close(fig)
    return arquivo


def grafico_limite(df, r, arquivo: Path) -> Path:
    """M4: a noite medida, a curva de Newton e a assíntota T∞."""
    m4 = r["m4_limite"]
    noite = df[(df["t"] >= 20) & (df["t"] <= 30)]
    tt_dados = np.linspace(20, 30, 200)
    tt_projecao = np.linspace(30, 56, 300)
    curva = lambda x: c.newton(x, m4["t_inf"], m4["t_0"], m4["k"], m4["inicio"])  # noqa: E731

    fig, ax = plt.subplots(figsize=(10, 5), facecolor=FUNDO)
    _estilo(ax)
    ax.axhline(m4["t_inf"], color=TINTA_2, linewidth=1.2, linestyle=(0, (4, 3)))
    ax.text(55.8, m4["t_inf"] - 0.45, f"lim T(t) = T∞ = {_br(m4['t_inf'])} °C  (t → ∞)", color=TINTA, fontsize=9, ha="right")
    ax.plot(tt_dados, curva(tt_dados), color=AZUL, linewidth=2, label="Lei de Newton ajustada à noite medida")
    ax.plot(tt_projecao, curva(tt_projecao), color=AZUL, linewidth=1.5, linestyle=(0, (2, 2)),
            label="Projeção (se o sol não nascesse)")
    ax.plot(noite["t"], noite["temp"], "o", markersize=7, color=AZUL, markeredgecolor=FUNDO, markeredgewidth=1.5,
            label="Temperatura do ar medida")
    ax.text(40, m4["t_inf"] + 2.6,
            f"T(t) = {_br(m4['t_inf'])} + ({_br(m4['t_0'])} − {_br(m4['t_inf'])})·e^(−{_br(m4['k'], 3)}·(t − 20h))\n"
            f"a diferença para T∞ cai pela metade a cada {_br(m4['meia_vida_h'])} h",
            color=TINTA_2, fontsize=8.5, ha="center")
    _eixo_horas(ax, 20, 56, 4)
    ax.set_ylim(m4["t_inf"] - 1.5, 30.5)
    ax.set_ylabel("Temperatura do ar (°C)", color=TINTA_2)
    ax.set_xlabel("Hora local (04/02 → 05/02)", color=TINTA_2)
    ax.legend(loc="upper right", fontsize=8.5, frameon=False, labelcolor=TINTA_2)
    return _salvar(fig, "M4 · O limite: para onde a noite de 04 para 05/02 levaria a temperatura", ax, arquivo)


def gerar_todos(df, r, pasta: Path) -> list:
    return [
        grafico_modelo(df, r, pasta / "1_modelo.png"),
        grafico_derivada(df, r, pasta / "2_derivada.png"),
        grafico_integral(df, r, pasta / "3_integral.png"),
        grafico_limite(df, r, pasta / "4_limite.png"),
    ]
