"""Testes do calculo.py com funções cuja resposta a gente sabe de cabeça.

Rodar (de dentro de matematica/):  python -m pytest
"""

import math

import numpy as np
import pytest

import calculo as c

W = c.OMEGA


def test_ajuste_recupera_os_coeficientes():
    t = np.arange(24)
    y = 30 + 5 * np.sin(W * t) - 2 * np.cos(W * t) + 1 * np.sin(2 * W * t)
    assert c.ajustar(t, y, 2) == pytest.approx([30, 5, -2, 1, 0], abs=1e-9)


def test_derivadas_batem_com_a_diferenca_finita():
    coef = np.array([30, 5, -2, 1, 0.5])
    t, h = np.linspace(0, 24, 50), 1e-4
    y = lambda x: c.avaliar(coef, x)  # noqa: E731
    assert c.derivada(coef, t) == pytest.approx((y(t + h) - y(t - h)) / (2 * h), abs=1e-6)
    d = lambda x: c.derivada(coef, x)  # noqa: E731
    assert c.segunda_derivada(coef, t) == pytest.approx((d(t + h) - d(t - h)) / (2 * h), abs=1e-6)


def test_primitiva_e_a_integral():
    coef = np.array([30, 5, -2, 1, 0.5])
    exata = c.primitiva(coef, 17) - c.primitiva(coef, 3)
    assert exata == pytest.approx(c.riemann_funcao(lambda x: c.avaliar(coef, x), 3, 17, 100_000, "trapezio"))


def test_bissecao_acha_raiz_de_2():
    assert c.bissecao(lambda x: x * x - 2, 0, 2) == pytest.approx(math.sqrt(2), abs=1e-6)
    with pytest.raises(ValueError):
        c.bissecao(lambda x: x * x + 1, 0, 2)


def test_raizes_do_cosseno():
    assert c.raizes(np.cos, 0, 10) == pytest.approx([math.pi / 2, 3 * math.pi / 2, 5 * math.pi / 2], abs=1e-5)


def test_integral_acima_de_meia_onda():
    # y = 30 + 4·sen(ωt): acima de 30 °C das 0h às 12h; área = 4·2/ω = 96/π
    resultado = c.integral_acima(np.array([30, 4, 0]), 30, 0, 24)
    assert resultado["dose"] == pytest.approx(96 / math.pi, abs=1e-4)
    assert resultado["horas_acima"] == pytest.approx(12, abs=1e-4)


def test_regras_de_riemann():
    v = [0, 1, 2, 3]
    assert c.riemann(v, 1, "esquerda") == 3
    assert c.riemann(v, 1, "direita") == 6
    assert c.riemann(v, 1, "trapezio") == 4.5     # reta: o trapézio é exato
    with pytest.raises(ValueError):
        c.riemann(v, 1, "meio")


def test_newton_recupera_a_curva():
    t = np.arange(20, 31)
    temp = c.newton(t, 22.0, 30.0, 0.2, 20)
    r = c.ajustar_newton(t, temp)
    assert r["t_inf"] == pytest.approx(22.0, abs=0.02)
    assert r["k"] == pytest.approx(0.2, abs=0.005)
    assert not r["na_borda"]


def test_newton_recusa_quem_esquenta():
    with pytest.raises(ValueError):
        c.ajustar_newton([0, 1, 2, 3], [20, 21, 22, 23])
