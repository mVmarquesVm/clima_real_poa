"""Respostas de erro claras e em português.

Formato único de erro da API (o front lê sempre do mesmo jeito):
    {"detail": "frase para a pessoa", "erros": [{"campo": "lat", "mensagem": "..."}]}

- 422: campos inválidos (a lista "erros" diz qual campo e por quê);
- 404: id que não existe (vem do HTTPException nas rotas);
- 500: falha no banco (sem mostrar detalhes internos para quem chamou).
"""

import logging
import sqlite3

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.modelos import LAT_MAX, LAT_MIN, LON_MAX, LON_MIN

registro = logging.getLogger("forno_alegre")

FORA_DE_POA = {
    "lat": f"Fora de Porto Alegre: a latitude vai de {LAT_MIN} a {LAT_MAX}.",
    "lon": f"Fora de Porto Alegre: a longitude vai de {LON_MIN} a {LON_MAX}.",
}


def nome_do_campo(local: tuple) -> str:
    """("body", "atividades", 0) vira "atividades.0"; o "body" não interessa."""
    return ".".join(str(parte) for parte in local if parte != "body") or "corpo"


def traduzir(erro: dict) -> str:
    """Troca a mensagem do Pydantic (em inglês) por uma frase em português."""
    tipo = erro["type"]
    ctx = erro.get("ctx", {})
    campo = nome_do_campo(erro["loc"])

    if campo in FORA_DE_POA and tipo in ("greater_than_equal", "less_than_equal"):
        return FORA_DE_POA[campo]

    mensagens = {
        "missing": "Campo obrigatório.",
        "string_too_short": f"Use pelo menos {ctx.get('min_length')} caracteres.",
        "string_too_long": f"Use no máximo {ctx.get('max_length')} caracteres.",
        "string_type": "Use um texto.",
        "too_short": f"Escolha pelo menos {ctx.get('min_length')}.",
        "list_type": "Use uma lista.",
        "literal_error": "Valor inválido. Use um destes: "
        + str(ctx.get("expected", "")).replace(" or ", " ou ") + ".",
        "float_parsing": "Use um número.",
        "float_type": "Use um número.",
        "bool_parsing": "Use verdadeiro ou falso.",
        "bool_type": "Use verdadeiro ou falso.",
        "greater_than_equal": f"Use no mínimo {ctx.get('ge')}.",
        "less_than_equal": f"Use no máximo {ctx.get('le')}.",
        "int_parsing": "Use um número inteiro.",
        "json_invalid": "O corpo da requisição não é um JSON válido.",
        "model_attributes_type": "Mande um objeto JSON com os campos.",
        "dict_type": "Mande um objeto JSON com os campos.",
        "value_error": str(ctx.get("error", "Valor inválido.")),
    }
    return mensagens.get(tipo, "Valor inválido.")


async def erro_de_validacao(request: Request, exc: RequestValidationError) -> JSONResponse:
    erros = [
        {"campo": nome_do_campo(erro["loc"]), "mensagem": traduzir(erro)}
        for erro in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={"detail": "Há campos com problema. Confira e tente de novo.", "erros": erros},
    )


async def erro_do_banco(request: Request, exc: sqlite3.Error) -> JSONResponse:
    # O detalhe técnico vai só para o log do servidor, nunca para o navegador.
    registro.exception("Erro no banco ao atender %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Não foi possível acessar os dados agora. Tente de novo em instantes."},
    )


def registrar_erros(app: FastAPI) -> None:
    app.add_exception_handler(RequestValidationError, erro_de_validacao)
    app.add_exception_handler(sqlite3.Error, erro_do_banco)
