"""Configurações da API, num lugar só.

Os valores podem ser trocados por variáveis de ambiente, sem mexer no código
(ex.: num servidor de verdade, outro endereço para o front-end).
"""

import os

# Quem pode chamar a API pelo navegador (CORS).
# O padrão é só o dev server do Vite. Para mais de um, separe por vírgula.
ORIGENS_PERMITIDAS = [
    origem.strip()
    for origem in os.environ.get(
        "FORNO_ORIGENS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origem.strip()
]

VERSAO = "0.1.0"
