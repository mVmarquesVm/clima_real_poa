"""Sensação térmica (Temperatura Aparente de Steadman) e nível de risco.

É a MESMA conta do ESP32 (edge/sensacao.h e edge/risco.h), traduzida
para Python. Assim, a estação de verdade, as estações simuladas e os
dados oficiais são medidos com a mesma régua, e a comparação é justa.

    TA = T + 0,348·e − 0,70·v + 0,70·Q/(v + 10) − 4,25

    T = temperatura do ar (°C)      e = pressão de vapor (hPa)
    v = vento (m/s)                 Q = radiação absorvida pelo corpo (W/m²)
"""

import math

# Limites de risco (°C de sensação), os mesmos do edge/config.h.
# Categorias do índice de calor da NOAA (regressão das tabelas de Steadman).
LIMITE_AMARELO = 27.0
LIMITE_LARANJA = 32.0
LIMITE_VERMELHO = 41.0
LIMITE_FRIO = 9.0  # abaixo disso, só um aviso de FRIO (escala UTCI)

NIVEIS = ["VERDE", "AMARELO", "LARANJA", "VERMELHO"]


def pressao_vapor(t: float, ur: float) -> float:
    """Quanto vapor de água já existe no ar (hPa).

    A parte com exp() mostra que o ar quente aguenta muito mais vapor.
    """
    return (ur / 100.0) * 6.105 * math.exp(17.27 * t / (237.7 + t))


def temperatura_aparente(t: float, ur: float, vento: float = 0.0, q: float = 0.0) -> float:
    """Temperatura Aparente de Steadman, versão completa (com vento e sol).

    + umidade: o suor não evapora, a sensação sobe;
    - vento: leva o calor do corpo embora, a sensação desce;
    + sol: o corpo absorve radiação; o vento DIVIDE esse efeito.
    """
    return t + 0.348 * pressao_vapor(t, ur) - 0.70 * vento + 0.70 * q / (vento + 10.0) - 4.25


def radiacao_de_lux(lux: float) -> float:
    """Do LDR (lux) para Q (W/m²), igual ao edge/conversao.h.

    Luz do sol: ~120 lux por W/m² de radiação. O corpo absorve só uma
    parte (fator 0,12). Sol forte (100 mil lux) dá Q ≈ 100.
    """
    return 0.12 * max(lux, 0.0) / 120.0


def radiacao_de_global(w_m2: float) -> float:
    """Da radiação global medida pelo INMET (W/m², num plano horizontal) para Q.

    Mesmo fator 0,12 do LDR: 1000 W/m² (sol a pino) dá Q = 120.
    """
    return 0.12 * max(w_m2, 0.0)


def nivel_de_risco(ta: float) -> int:
    """0 VERDE, 1 AMARELO, 2 LARANJA, 3 VERMELHO (sem histerese).

    É o mesmo número que a estação manda no field6 do ThingSpeak.
    """
    if ta >= LIMITE_VERMELHO:
        return 3
    if ta >= LIMITE_LARANJA:
        return 2
    if ta >= LIMITE_AMARELO:
        return 1
    return 0
