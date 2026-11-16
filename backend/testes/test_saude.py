"""Testes da estrutura da API: rota de saúde e CORS."""

from fastapi.testclient import TestClient

from app.main import app

cliente = TestClient(app)


def test_saude_responde_ok():
    resposta = cliente.get("/saude")
    assert resposta.status_code == 200
    assert resposta.json()["status"] == "ok"


def test_cors_libera_o_vite():
    resposta = cliente.get("/saude", headers={"Origin": "http://localhost:5173"})
    assert resposta.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_bloqueia_outro_site():
    resposta = cliente.get("/saude", headers={"Origin": "https://site-estranho.com"})
    assert "access-control-allow-origin" not in resposta.headers
