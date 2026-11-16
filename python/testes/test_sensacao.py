"""Os mesmos casos do autoteste do ESP32 (edge/autoteste.h).

Se o Python e o C++ derem números diferentes, a comparação entre a
estação real e as simuladas deixa de valer. Rodar (de dentro de python/): python -m pytest
"""

from pytest import approx

from processamento.sensacao import nivel_de_risco, radiacao_de_lux, temperatura_aparente


def test_mesmos_valores_do_esp32():
    assert temperatura_aparente(30, 50, 0, 0) == approx(33.11, abs=0.05)
    assert temperatura_aparente(30, 50, 2, 0) == approx(31.71, abs=0.05)    # vento baixa 1,4 °C
    assert temperatura_aparente(30, 50, 0, 100) == approx(40.11, abs=0.05)  # sol forte soma 7 °C
    assert temperatura_aparente(20, 40, 0, 0) < 20                          # ar seco e ameno


def test_extremos_do_rs():
    assert temperatura_aparente(40, 60, 0, 100) == approx(58.09, abs=0.05)  # passa de 50
    assert temperatura_aparente(2, 80, 8, 0) == approx(-5.89, abs=0.05)     # minuano: negativa


def test_sol_do_ldr():
    assert radiacao_de_lux(100_000) == approx(100, abs=0.5)
    assert radiacao_de_lux(-5) == 0  # leitura estranha não vira radiação negativa


def test_niveis_de_risco():
    # Faixas da nota técnica da SMS de POA: 33,9 ainda é amarelo, 51,9 ainda é vermelho
    casos = (26.9, 27.0, 33.9, 34.0, 39.9, 40.0, 51.9, 52.0, 58.0, -5.0)
    assert [nivel_de_risco(t) for t in casos] == [0, 1, 1, 2, 2, 3, 3, 4, 4, 0]
