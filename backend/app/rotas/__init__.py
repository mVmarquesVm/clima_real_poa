"""Rotas da API, uma por recurso."""

from typing import Annotated

from fastapi import Path

# O maior inteiro que o SQLite guarda (2^63 − 1). Sem esse teto, um id como
# 99999999999999999999 passava pelo FastAPI e quebrava no sqlite3
# (OverflowError → erro 500). Com ele, a resposta é um 422 claro.
MAIOR_ID = 2**63 - 1

IdDoBanco = Annotated[int, Path(ge=1, le=MAIOR_ID)]
