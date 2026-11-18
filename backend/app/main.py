"""Ponto de entrada da API.

Rodar (de dentro de backend/):
    .venv\\Scripts\\python.exe -m uvicorn app.main:app --reload

Documentação automática: http://127.0.0.1:8000/docs
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.banco import preparar_banco
from app.config import ORIGENS_PERMITIDAS, VERSAO
from app.erros import registrar_erros
from app.rotas import hidratacao, locais


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    """Roda uma vez quando a API sobe: garante as tabelas e os dados iniciais."""
    preparar_banco()
    yield


app = FastAPI(
    lifespan=ciclo_de_vida,
    title="API do Clima Real POA",
    description=(
        "Cadastro de locais de lazer e de pontos de hidratação "
        "na região central de Porto Alegre."
    ),
    version=VERSAO,
)

# Erros em português (422, 404, 405 e 500). Vem ANTES do CORS de propósito:
# o último middleware adicionado fica por fora, como a casca de uma cebola.
# Com o CORS por fora, até a resposta de um erro 500 leva o cabeçalho do CORS,
# e o app consegue ler a mensagem em vez de ver um "erro de CORS".
registrar_erros(app)

# CORS: o navegador só deixa o app (porta 5173) ler as respostas da API
# (porta 8000) se a API disser que confia nesse endereço.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENS_PERMITIDAS,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)

app.include_router(locais.rotas)
app.include_router(hidratacao.rotas)


@app.get("/saude", tags=["sistema"])
def saude() -> dict:
    """Diz se a API está no ar. O front usa para mostrar "API fora do ar"."""
    return {"status": "ok", "versao": VERSAO}
