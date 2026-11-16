"""Testes dos achados da caça a erros (um subagente tentou quebrar a API por HTTP).

Cada teste aqui falhava antes da correção.
"""

import pytest
from fastapi import APIRouter
from fastapi.testclient import TestClient

from app.main import app

ORIGEM = {"Origin": "http://localhost:5173"}

LOCAL = {
    "nome": "Praça da Matriz",
    "tipo": "praca",
    "lat": -30.0331,
    "lon": -51.2300,
    "tem_sombra": True,
    "tem_bebedouro": False,
    "atividades": ["caminhada"],
}

PONTO = {
    "nome": "Bebedouro do Chafariz",
    "tipo": "bebedouro",
    "lat": -30.0331,
    "lon": -51.2300,
    "abre_domingo": True,
}

CORPO_VALIDO = {"/locais": LOCAL, "/hidratacao": PONTO}


@pytest.fixture
def cliente():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def erros_por_campo(resposta) -> dict:
    assert resposta.status_code == 422
    return {e["campo"]: e["mensagem"] for e in resposta.json()["erros"]}


# 1. Id gigante: antes, OverflowError no sqlite3 → 500 em texto, sem CORS.
@pytest.mark.parametrize("rota", ["/locais", "/hidratacao"])
@pytest.mark.parametrize("metodo", ["get", "put", "delete"])
@pytest.mark.parametrize("id_", ["99999999999999999999", "9223372036854775808", "0", "-1"])
def test_id_fora_da_faixa_da_422(cliente, rota, metodo, id_):
    # Corpo válido no PUT: assim, o único erro possível é o do id.
    kwargs = {"json": CORPO_VALIDO[rota]} if metodo == "put" else {}
    resposta = getattr(cliente, metodo)(f"{rota}/{id_}", headers=ORIGEM, **kwargs)
    assert resposta.status_code == 422
    assert list(erros_por_campo(resposta).values()) == [
        "Id inválido: use um número inteiro de 1 em diante."
    ]
    assert resposta.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_maior_id_valido_da_404(cliente):
    assert cliente.get("/locais/9223372036854775807").status_code == 404


# 2. 404 e 405 do próprio FastAPI: antes, em inglês e sem a lista "erros".
def test_rota_que_nao_existe(cliente):
    resposta = cliente.get("/naoexiste")
    assert resposta.status_code == 404
    assert resposta.json() == {
        "detail": "Endereço não encontrado na API. Confira a rota (ex.: /locais).",
        "erros": [],
    }


@pytest.mark.parametrize("metodo, rota", [("patch", "/locais/1"), ("post", "/locais/1"), ("delete", "/locais")])
def test_metodo_nao_permitido(cliente, metodo, rota):
    resposta = getattr(cliente, metodo)(rota)
    assert resposta.status_code == 405
    assert resposta.json()["detail"].startswith("Esta rota não aceita esse método")
    assert "allow" in resposta.headers  # diz quais métodos valem


def test_404_das_rotas_tem_o_formato_unico(cliente):
    corpo = cliente.get("/locais/9999").json()
    assert corpo["erros"] == [] and "não encontrado" in corpo["detail"]


# 3. JSON quebrado: antes, "campo": "13" (a posição do erro no texto).
def test_json_quebrado_aponta_o_corpo(cliente):
    resposta = cliente.post(
        "/locais", content='{"nome": "x",', headers={"Content-Type": "application/json"}
    )
    assert list(erros_por_campo(resposta)) == ["corpo"]


# 4. Nomes invisíveis: antes, 3 espaços de largura zero ou um byte nulo passavam.
@pytest.mark.parametrize("nome", ["​​​", "a​​b"])
def test_nome_invisivel(cliente, nome):
    erros = erros_por_campo(cliente.post("/locais", json={**LOCAL, "nome": nome}))
    assert erros["nome"] == "Use pelo menos 3 letras ou números visíveis."


@pytest.mark.parametrize("campo", ["nome", "observacao"])
def test_caractere_de_controle(cliente, campo):
    erros = erros_por_campo(cliente.post("/locais", json={**LOCAL, campo: "abc\u0000def"}))
    assert erros[campo].startswith("Tem caracteres invisíveis de controle")


def test_nome_com_acento_e_emoji_continua_valendo(cliente):
    assert cliente.post("/locais", json={**LOCAL, "nome": "Praça ☀️ Açoriana"}).status_code == 201


# 5. Tipos exatos (strict): antes, "yes" virava verdadeiro e true virava 1.0.
@pytest.mark.parametrize("valor", ["true", "yes", 1, "1"])
def test_booleano_tem_de_ser_booleano(cliente, valor):
    erros = erros_por_campo(cliente.post("/locais", json={**LOCAL, "tem_sombra": valor}))
    assert erros["tem_sombra"] == "Use verdadeiro ou falso."


@pytest.mark.parametrize("valor", [True, "-30.03"])
def test_latitude_tem_de_ser_numero(cliente, valor):
    erros = erros_por_campo(cliente.post("/locais", json={**LOCAL, "lat": valor}))
    assert erros["lat"] == "Use um número."


def test_latitude_inteira_vale(cliente):
    # -30 é um número (inteiro) e está dentro de POA: tem de passar.
    assert cliente.post("/locais", json={**LOCAL, "lat": -30}).status_code == 201


# Rede de segurança: um erro inesperado vira 500 em português, COM o CORS.
def test_erro_inesperado_vira_500_em_portugues():
    teste = APIRouter()

    @teste.get("/_quebra")
    def quebra():
        raise RuntimeError("bug de propósito")

    app.include_router(teste)
    try:
        with TestClient(app, raise_server_exceptions=False) as c:
            resposta = c.get("/_quebra", headers=ORIGEM)
        assert resposta.status_code == 500
        assert resposta.json()["detail"].startswith("Não foi possível atender agora")
        assert "bug de propósito" not in resposta.text
        assert resposta.headers["access-control-allow-origin"] == "http://localhost:5173"
    finally:
        app.router.routes[:] = [r for r in app.router.routes if getattr(r, "path", "") != "/_quebra"]
