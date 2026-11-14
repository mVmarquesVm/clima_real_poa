"""Ferramentas de Cálculo do Forno Alegre, só com NumPy.

Nada aqui sabe de INMET ou de pandas: são funções puras de matemática,
testadas com funções cuja resposta a gente sabe de cabeça
(test_calculo.py). Quem usa os dados reais é o analise.py.

    t  -> tempo em HORAS (0 = meia-noite do dia analisado)
    y  -> temperatura em °C

O modelo do dia é uma soma de ondas de 24 h (série de Fourier truncada):

    y(t) = a + b1·sen(ωt) + c1·cos(ωt) + b2·sen(2ωt) + c2·cos(2ωt) + ...,  ω = 2π/24

Com o período fixo, os coeficientes entram "retos" (lineares) na conta,
então o ajuste é um sistema de mínimos quadrados: o NumPy resolve numa
linha (np.linalg.lstsq). E como cada termo é seno ou cosseno, a derivada
e a integral do modelo saem EXATAS, por fórmula.
"""

import math

import numpy as np

PERIODO_H = 24.0
OMEGA = 2 * math.pi / PERIODO_H   # rad/h: uma volta completa em 24 h


# ------------------------------------------------------------------ modelo

def matriz_harmonicos(t, n: int) -> np.ndarray:
    """Uma linha por hora; colunas: 1, sen(ωt), cos(ωt), sen(2ωt), cos(2ωt), ..."""
    t = np.asarray(t, dtype=float)
    colunas = [np.ones_like(t)]
    for k in range(1, n + 1):
        colunas += [np.sin(k * OMEGA * t), np.cos(k * OMEGA * t)]
    return np.column_stack(colunas)


def ajustar(t, y, n: int = 2) -> np.ndarray:
    """Mínimos quadrados: os coeficientes que deixam a soma dos erros² a menor possível."""
    coef, *_ = np.linalg.lstsq(matriz_harmonicos(t, n), np.asarray(y, dtype=float), rcond=None)
    return coef


def _harmonicos(coef):
    """Para cada onda k: (k·ω, b_k do seno, c_k do cosseno)."""
    n = (len(coef) - 1) // 2
    return [(k * OMEGA, coef[2 * k - 1], coef[2 * k]) for k in range(1, n + 1)]


def avaliar(coef, t):
    t = np.asarray(t, dtype=float)
    return coef[0] + sum(b * np.sin(kw * t) + c * np.cos(kw * t) for kw, b, c in _harmonicos(coef))


def derivada(coef, t):
    """y'(t): (sen)' = cos e (cos)' = −sen, vezes kω pela regra da cadeia. Unidade: °C/h."""
    t = np.asarray(t, dtype=float)
    return sum(kw * (b * np.cos(kw * t) - c * np.sin(kw * t)) for kw, b, c in _harmonicos(coef)) + 0 * t


def segunda_derivada(coef, t):
    """y''(t): a "aceleração" do aquecimento. É zero onde y' é máxima ou mínima."""
    t = np.asarray(t, dtype=float)
    return sum(-kw**2 * (b * np.sin(kw * t) + c * np.cos(kw * t)) for kw, b, c in _harmonicos(coef)) + 0 * t


def primitiva(coef, t):
    """F(t) com F' = y: a integral exata do modelo (∫sen = −cos, ∫cos = sen, divididos por kω)."""
    t = np.asarray(t, dtype=float)
    return coef[0] * t + sum((-b * np.cos(kw * t) + c * np.sin(kw * t)) / kw for kw, b, c in _harmonicos(coef))


def metricas(y, previsto) -> dict:
    """RMSE: o erro típico em °C. R²: quanto da variação do dia o modelo explica (1 = tudo)."""
    y, previsto = np.asarray(y, dtype=float), np.asarray(previsto, dtype=float)
    residuo = y - previsto
    rmse = float(np.sqrt(np.mean(residuo**2)))
    r2 = float(1 - np.sum(residuo**2) / np.sum((y - y.mean()) ** 2))
    return {"rmse": rmse, "r2": r2, "maior_erro": float(np.max(np.abs(residuo)))}


# ------------------------------------------------------------------ raízes

def bissecao(f, a: float, b: float, tol: float = 1e-6) -> float:
    """Acha t com f(t) = 0 em [a, b], partindo o intervalo ao meio até ficar menor que tol.

    Precisa de troca de sinal (f(a) e f(b) com sinais opostos): pelo
    Teorema do Valor Intermediário, uma função contínua que troca de
    sinal passa pelo zero no meio do caminho.
    """
    fa, fb = f(a), f(b)
    if fa == 0:
        return a
    if fb == 0:
        return b
    if fa * fb > 0:
        raise ValueError("sem troca de sinal em [a, b]")
    while b - a > tol:
        meio = (a + b) / 2
        fm = f(meio)
        if fa * fm <= 0:
            b, fb = meio, fm
        else:
            a, fa = meio, fm
    return (a + b) / 2


def raizes(f, inicio: float, fim: float, passo: float = 0.05) -> list:
    """Todos os zeros de f em [inicio, fim]: varre em passos pequenos e refina com a bisseção."""
    grade = np.arange(inicio, fim + passo / 2, passo)
    valores = [float(f(x)) for x in grade]
    achadas = []
    for x0, x1, v0, v1 in zip(grade[:-1], grade[1:], valores[:-1], valores[1:]):
        if v0 == 0:
            achadas.append(float(x0))
        elif v0 * v1 < 0:
            achadas.append(bissecao(f, float(x0), float(x1)))
    if valores[-1] == 0:
        achadas.append(float(grade[-1]))
    return achadas


# ------------------------------------------------------------------ integral

def integral_acima(coef, limite: float, a: float, b: float) -> dict:
    """Dose = ∫ max(y(t) − limite, 0) dt em [a, b], EXATA pelo Teorema Fundamental do Cálculo.

    1. acha onde a curva cruza o limite (raízes de y − limite);
    2. em cada pedaço acima do limite, soma F(fim) − F(início) − limite·(duração).
    Unidade: °C·h (graus-hora).
    """
    cortes = raizes(lambda x: avaliar(coef, x) - limite, a, b)
    pontos = [a] + cortes + [b]
    dose, trechos = 0.0, []
    for ini, fim in zip(pontos[:-1], pontos[1:]):
        if fim - ini > 0 and avaliar(coef, (ini + fim) / 2) > limite:
            dose += float(primitiva(coef, fim) - primitiva(coef, ini)) - limite * (fim - ini)
            trechos.append((ini, fim))
    return {"dose": dose, "trechos": trechos, "horas_acima": sum(f - i for i, f in trechos)}


def riemann(valores, h: float, regra: str) -> float:
    """Soma de Riemann com pontos igualmente espaçados (h = largura de cada retângulo).

    esquerda: a altura de cada retângulo é o valor no início do intervalo;
    direita:  o valor no fim;
    trapezio: a média dos dois (um trapézio em vez de um retângulo).
    """
    v = np.asarray(valores, dtype=float)
    if regra == "esquerda":
        return float(h * v[:-1].sum())
    if regra == "direita":
        return float(h * v[1:].sum())
    if regra == "trapezio":
        return float(h * (v.sum() - (v[0] + v[-1]) / 2))
    raise ValueError(f"regra desconhecida: {regra}")


def riemann_funcao(f, a: float, b: float, n: int, regra: str) -> float:
    """Riemann de uma função com n retângulos: quanto maior n, mais perto da integral exata."""
    x = np.linspace(a, b, n + 1)
    return riemann(f(x), (b - a) / n, regra)


# ------------------------------------------------------------------ limite (Newton)

def newton(t, t_inf: float, t_0: float, k: float, inicio: float):
    """Lei do resfriamento de Newton: T(t) = T∞ + (T0 − T∞)·e^(−k·(t − início)).

    Quando t → ∞, e^(−k·t) → 0, então lim T(t) = T∞ (a "temperatura da sala").
    """
    return t_inf + (t_0 - t_inf) * np.exp(-k * (np.asarray(t, dtype=float) - inicio))


def ajustar_newton(t, temp, passo: float = 0.01, folga: float = 15.0) -> dict:
    """Acha T∞, T0 e k que melhor descrevem o resfriamento.

    Truque: para um T∞ fixo, ln(T − T∞) = ln(T0 − T∞) − k·(t − início) é uma
    RETA, e uma reta o NumPy ajusta direto (np.polyfit). Então testamos
    T∞ de 0,01 em 0,01 °C abaixo da menor temperatura e ficamos com o
    que deixa o menor erro na própria temperatura.
    """
    t, temp = np.asarray(t, dtype=float), np.asarray(temp, dtype=float)
    inicio = float(t[0])
    candidatos = np.arange(temp.min() - folga, temp.min() - passo / 2, passo)
    melhor = None
    for t_inf in candidatos:
        inclinacao, intercepto = np.polyfit(t - inicio, np.log(temp - t_inf), 1)
        k = -inclinacao
        if k <= 0:
            continue                       # não está esfriando: não é Newton
        t_0 = t_inf + math.exp(intercepto)
        sse = float(np.sum((temp - newton(t, t_inf, t_0, k, inicio)) ** 2))
        if melhor is None or sse < melhor["sse"]:
            melhor = {"t_inf": float(t_inf), "t_0": float(t_0), "k": float(k), "sse": sse, "inicio": inicio}
    if melhor is None:
        raise ValueError("os dados não esfriam: a lei de Newton não se aplica")
    # Se o melhor T∞ ficou na borda da busca, a assíntota não está bem definida pelos dados
    melhor["na_borda"] = melhor["t_inf"] <= candidatos[0] + passo
    melhor["meia_vida_h"] = math.log(2) / melhor["k"]
    return melhor
