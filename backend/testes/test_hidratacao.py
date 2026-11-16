"""Testes do CRUD de pontos de hidratação, com foco nas regras de horário."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

VALIDO = {
    "nome": "Bebedouro do Chafariz",
    "tipo": "bebedouro",
    "lat": -30.0331,
    "lon": -51.2300,
    "abre": "08:00",
    "fecha": "20:00",
    "abre_domingo": True,
    "ativo": True,
}


@pytest.fixture
def cliente():
    with TestClient(app) as c:
        yield c


def erros_por_campo(resposta) -> dict:
    assert resposta.status_code == 422
    return {e["campo"]: e["mensagem"] for e in resposta.json()["erros"]}


# --- Caminho feliz ---------------------------------------------------------

def test_lista_o_dado_inicial(cliente):
    pontos = cliente.get("/hidratacao").json()
    assert [p["nome"] for p in pontos] == ["Rua da Praia Shopping"]
    assert pontos[0]["abre"] == "09:00" and pontos[0]["abre_domingo"] is False


def test_cria_mostra_edita_e_apaga(cliente):
    criado = cliente.post("/hidratacao", json=VALIDO)
    assert criado.status_code == 201
    novo = criado.json()
    assert cliente.get(f"/hidratacao/{novo['id']}").json() == novo

    editado = cliente.put(f"/hidratacao/{novo['id']}", json={**VALIDO, "ativo": False})
    assert editado.status_code == 200
    assert cliente.get(f"/hidratacao/{novo['id']}").json()["ativo"] is False

    assert cliente.delete(f"/hidratacao/{novo['id']}").status_code == 204
    assert cliente.get(f"/hidratacao/{novo['id']}").status_code == 404


def test_filtro_so_ativos(cliente):
    cliente.post("/hidratacao", json={**VALIDO, "nome": "Fonte quebrada", "ativo": False})
    todos = [p["nome"] for p in cliente.get("/hidratacao").json()]
    ativos = [p["nome"] for p in cliente.get("/hidratacao?so_ativos=true").json()]
    assert "Fonte quebrada" in todos
    assert "Fonte quebrada" not in ativos


def test_sem_horario_e_24h(cliente):
    novo = cliente.post("/hidratacao", json={**VALIDO, "abre": "", "fecha": ""}).json()
    assert novo["abre"] is None and novo["fecha"] is None


def test_ativo_por_padrao(cliente):
    dados = {k: v for k, v in VALIDO.items() if k != "ativo"}
    assert cliente.post("/hidratacao", json=dados).json()["ativo"] is True


# --- Erros -----------------------------------------------------------------

@pytest.mark.parametrize("metodo", ["get", "put", "delete"])
def test_id_que_nao_existe_da_404(cliente, metodo):
    kwargs = {"json": VALIDO} if metodo == "put" else {}
    resposta = getattr(cliente, metodo)("/hidratacao/9999", **kwargs)
    assert resposta.status_code == 404
    assert "não encontrado" in resposta.json()["detail"]


@pytest.mark.parametrize("horario", ["9h", "24:00", "09:60", "9:00"])
def test_horario_fora_do_formato(cliente, horario):
    erros = erros_por_campo(cliente.post("/hidratacao", json={**VALIDO, "abre": horario}))
    assert erros["abre"].startswith("Use o formato HH:MM")
    assert "fecha" not in erros  # não repete a bronca no outro campo


def test_so_um_horario(cliente):
    erros = erros_por_campo(cliente.post("/hidratacao", json={**VALIDO, "fecha": None}))
    assert erros["fecha"].startswith("Preencha os dois horários")


@pytest.mark.parametrize("abre, fecha", [("18:00", "09:00"), ("10:00", "10:00")])
def test_fecha_antes_de_abrir(cliente, abre, fecha):
    erros = erros_por_campo(cliente.post("/hidratacao", json={**VALIDO, "abre": abre, "fecha": fecha}))
    assert erros["fecha"] == "O horário de fechar tem de ser depois do de abrir."


def test_tipo_e_lugar_invalidos(cliente):
    erros = erros_por_campo(
        cliente.post("/hidratacao", json={**VALIDO, "tipo": "piscina", "lat": -23.55})
    )
    assert "'bebedouro', 'fonte' ou 'comercio'" in erros["tipo"]
    assert erros["lat"].startswith("Fora de Porto Alegre")
