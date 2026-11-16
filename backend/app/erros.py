"""Respostas de erro claras e em português.

Formato ÚNICO de erro da API (o front lê sempre do mesmo jeito):
    {"detail": "frase para a pessoa", "erros": [{"campo": "lat", "mensagem": "..."}]}
A lista "erros" só tem itens no 422; nos outros, ela vem vazia.

- 422: campos inválidos (a lista diz qual campo e por quê);
- 404: id que não existe (das rotas) ou endereço que não existe na API;
- 405: método que a rota não aceita (ex.: PATCH);
- 500: falha no banco ou erro inesperado, sem mostrar detalhes internos.
"""

import logging
import sqlite3

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.modelos import LAT_MAX, LAT_MIN, LON_MAX, LON_MIN

registro = logging.getLogger("forno_alegre")

FORA_DE_POA = {
    "lat": f"Fora de Porto Alegre: a latitude vai de {LAT_MIN} a {LAT_MAX}.",
    "lon": f"Fora de Porto Alegre: a longitude vai de {LON_MIN} a {LON_MAX}.",
}

CAMPOS_DE_ID = ("id_local", "id_ponto")
ID_INVALIDO = "Id inválido: use um número inteiro de 1 em diante."

# As frases padrão do Starlette (em inglês) trocadas pelas nossas.
FRASES_HTTP = {
    404: "Endereço não encontrado na API. Confira a rota (ex.: /locais).",
    405: "Esta rota não aceita esse método. Veja as rotas em /docs.",
}

ERRO_INTERNO = "Não foi possível atender agora. Tente de novo em instantes."


def resposta(status: int, detail: str, erros: list | None = None, headers=None) -> JSONResponse:
    return JSONResponse(
        status_code=status, content={"detail": detail, "erros": erros or []}, headers=headers
    )


def nome_do_campo(erro: dict) -> str:
    """("body", "atividades", 0) vira "atividades.0"; "body", "path" e "query" não interessam.

    No JSON quebrado, o Pydantic põe a POSIÇÃO do erro no texto, ("body", 13):
    aí o campo é o corpo inteiro, e não "13".
    """
    if erro["type"] == "json_invalid":
        return "corpo"
    partes = [str(p) for p in erro["loc"] if p not in ("body", "path", "query")]
    return ".".join(partes) or "corpo"


def traduzir(erro: dict) -> str:
    """Troca a mensagem do Pydantic (em inglês) por uma frase em português."""
    tipo = erro["type"]
    ctx = erro.get("ctx", {})
    campo = nome_do_campo(erro)

    if campo in FORA_DE_POA and tipo in ("greater_than_equal", "less_than_equal"):
        return FORA_DE_POA[campo]
    if campo in CAMPOS_DE_ID:
        return ID_INVALIDO

    mensagens = {
        "missing": "Campo obrigatório.",
        "string_too_short": f"Use pelo menos {ctx.get('min_length')} caracteres.",
        "string_too_long": f"Use no máximo {ctx.get('max_length')} caracteres.",
        "string_type": "Use um texto.",
        "string_pattern_mismatch": "Use o formato HH:MM, de 00:00 a 23:59 (ex.: 09:00).",
        "too_short": f"Escolha pelo menos {ctx.get('min_length')}.",
        "list_type": "Use uma lista.",
        "literal_error": "Valor inválido. Use um destes: "
        + str(ctx.get("expected", "")).replace(" or ", " ou ") + ".",
        "float_parsing": "Use um número.",
        "float_type": "Use um número.",
        "finite_number": "Use um número.",
        "bool_parsing": "Use verdadeiro ou falso.",
        "bool_type": "Use verdadeiro ou falso.",
        "greater_than_equal": f"Use no mínimo {ctx.get('ge')}.",
        "less_than_equal": f"Use no máximo {ctx.get('le')}.",
        "int_parsing": "Use um número inteiro.",
        "json_invalid": "O corpo da requisição não é um JSON válido.",
        "model_attributes_type": "Mande um objeto JSON com os campos.",
        "model_type": "Mande um objeto JSON com os campos.",
        "dict_type": "Mande um objeto JSON com os campos.",
        "value_error": str(ctx.get("error", "Valor inválido.")),
    }
    return mensagens.get(tipo, "Valor inválido.")


async def erro_de_validacao(request: Request, exc: RequestValidationError) -> JSONResponse:
    erros = [{"campo": nome_do_campo(e), "mensagem": traduzir(e)} for e in exc.errors()]
    return resposta(422, "Há campos com problema. Confira e tente de novo.", erros)


async def erro_http(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """404 e 405 do próprio FastAPI (em inglês) e os 404 das nossas rotas (já em português)."""
    detail = exc.detail
    if exc.status_code in FRASES_HTTP and detail in ("Not Found", "Method Not Allowed"):
        detail = FRASES_HTTP[exc.status_code]
    return resposta(exc.status_code, str(detail), headers=getattr(exc, "headers", None))


async def erro_do_banco(request: Request, exc: sqlite3.Error) -> JSONResponse:
    # O detalhe técnico vai só para o log do servidor, nunca para o navegador.
    registro.exception("Erro no banco ao atender %s %s", request.method, request.url.path)
    return resposta(500, ERRO_INTERNO)


async def erro_inesperado(request: Request, call_next):
    """Rede de segurança para qualquer outro erro (ex.: um bug nosso).

    É um middleware, e não um exception_handler(Exception), por um motivo: o
    handler de Exception roda FORA do CORS, e a resposta sairia sem o cabeçalho
    do CORS; o navegador mostraria "erro de CORS" em vez do nosso 500.
    """
    try:
        return await call_next(request)
    except Exception:
        registro.exception("Erro inesperado ao atender %s %s", request.method, request.url.path)
        return resposta(500, ERRO_INTERNO)


def registrar_erros(app: FastAPI) -> None:
    """Chame ANTES de adicionar o CORS, para o CORS ficar por fora e cobrir o 500."""
    app.add_exception_handler(RequestValidationError, erro_de_validacao)
    app.add_exception_handler(StarletteHTTPException, erro_http)
    app.add_exception_handler(sqlite3.Error, erro_do_banco)
    app.middleware("http")(erro_inesperado)
