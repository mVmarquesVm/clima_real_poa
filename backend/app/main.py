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


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    """Roda uma vez quando a API sobe: garante as tabelas e os dados iniciais."""
    preparar_banco()
    yield


app = FastAPI(
    lifespan=ciclo_de_vida,
    title="API do Forno Alegre",
    description=(
        "Cadastro de locais de lazer e de pontos de hidratação "
        "na região central de Porto Alegre."
    ),
    version=VERSAO,
)

# CORS: o navegador só deixa o app (porta 5173) ler as respostas da API
# (porta 8000) se a API disser que confia nesse endereço.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENS_PERMITIDAS,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.get("/saude", tags=["sistema"])
def saude() -> dict:
    """Diz se a API está no ar. O front usa para mostrar "API fora do ar"."""
    return {"status": "ok", "versao": VERSAO}
