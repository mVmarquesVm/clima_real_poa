"""Testes das conversões e da leitura dos dados reais.

Uma conversão errada (de UTC, de kJ, da banda do satélite) estraga tudo
sem dar erro nenhum: os números só saem errados. Por isso cada uma tem
um caso conferido na mão. Rodar: python -m pytest
"""

import math

from pytest import approx

from locais import circulo
from oficial import kj_hora_para_w, ler_inmet
from satelite import landsat_celsius


def test_kj_por_hora_para_watts():
    assert kj_hora_para_w(3600) == approx(1000)   # 3600 kJ numa hora = 1000 W por m²


def test_banda_termica_do_landsat():
    # Valor do pixel do Largo em 04/02/2025: 49939 × 0,00341802 + 149 − 273,15
    assert landsat_celsius(49939) == approx(46.54, abs=0.01)


def test_circulo_fecha_e_tem_o_raio_certo():
    anel = circulo(-30.03, -51.23, 60)["coordinates"][0]
    assert anel[0] == anel[-1]                          # o polígono fecha
    lon, lat = anel[0]                                  # 1º ponto: 60 m a leste do centro
    metros = (lon + 51.23) * 111_320 * math.cos(math.radians(-30.03))
    assert metros == approx(60, abs=0.5)


def test_inmet_le_o_arquivo_real_e_converte_o_horario():
    df = ler_inmet()
    # No arquivo: "2025/02/04;1600 UTC" com 34,7 °C, 46% e 3742,6 kJ/m².
    # 16h UTC = 13h em Porto Alegre (UTC−3).
    linha = df[df["hora"] == "2025-02-04 13:00"].iloc[0]
    assert linha["temp"] == approx(34.7)
    assert linha["umid"] == approx(46)
    assert linha["radiacao"] == approx(3742.6 / 3.6)
    assert len(df) == 365 * 24                           # o ano inteiro, hora a hora
