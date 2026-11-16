"""Testes do CRUD de locais: o caminho feliz e cada erro que a tela precisa mostrar."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

VALIDO = {
    "nome": "Praça da Matriz",
    "tipo": "praca",
    "lat": -30.0331,
    "lon": -51.2300,
    "tem_sombra": True,
    "tem_bebedouro": False,
    "atividades": ["caminhada", "crianca"],
    "observacao": "Teste",
}


@pytest.fixture
def cliente():
    # O "with" faz a API subir de verdade: o lifespan cria o banco temporário.
    with TestClient(app) as c:
        yield c


def erros_por_campo(resposta) -> dict:
    return {e["campo"]: e["mensagem"] for e in resposta.json()["erros"]}


# --- Caminho feliz ---------------------------------------------------------

def test_lista_os_dados_iniciais_por_nome(cliente):
    resposta = cliente.get("/locais")
    assert resposta.status_code == 200
    nomes = [l["nome"] for l in resposta.json()]
    assert len(nomes) == 5
    assert nomes == sorted(nomes)


def test_cria_mostra_edita_e_apaga(cliente):
    criado = cliente.post("/locais", json=VALIDO)
    assert criado.status_code == 201
    novo = criado.json()
    assert novo["id"] > 0
    assert novo["tem_sombra"] is True
    assert novo["atividades"] == ["caminhada", "crianca"]

    assert cliente.get(f"/locais/{novo['id']}").json() == novo

    editado = cliente.put(f"/locais/{novo['id']}", json={**VALIDO, "nome": "Praça da Matriz (editada)"})
    assert editado.status_code == 200
    assert cliente.get(f"/locais/{novo['id']}").json()["nome"] == "Praça da Matriz (editada)"

    assert cliente.delete(f"/locais/{novo['id']}").status_code == 204
    assert cliente.get(f"/locais/{novo['id']}").status_code == 404


def test_limpa_espacos_repetidas_e_observacao_vazia(cliente):
    novo = cliente.post(
        "/locais",
        json={**VALIDO, "nome": "  Praça  ", "atividades": ["pedal", "pedal"], "observacao": ""},
    ).json()
    assert novo["nome"] == "Praça"
    assert novo["atividades"] == ["pedal"]
    assert novo["observacao"] is None


# --- 404 -------------------------------------------------------------------

@pytest.mark.parametrize("metodo", ["get", "put", "delete"])
def test_id_que_nao_existe_da_404_em_portugues(cliente, metodo):
    kwargs = {"json": VALIDO} if metodo == "put" else {}
    resposta = getattr(cliente, metodo)("/locais/9999", **kwargs)
    assert resposta.status_code == 404
    assert "não encontrado" in resposta.json()["detail"]


# --- 422 -------------------------------------------------------------------

def test_campos_obrigatorios(cliente):
    resposta = cliente.post("/locais", json={})
    assert resposta.status_code == 422
    erros = erros_por_campo(resposta)
    for campo in ("nome", "tipo", "lat", "lon", "tem_sombra", "tem_bebedouro", "atividades"):
        assert erros[campo] == "Campo obrigatório."


def test_fora_de_porto_alegre(cliente):
    # Erro clássico: latitude e longitude trocadas.
    resposta = cliente.post("/locais", json={**VALIDO, "lat": -51.23, "lon": -30.03})
    erros = erros_por_campo(resposta)
    assert erros["lat"].startswith("Fora de Porto Alegre")
    assert erros["lon"].startswith("Fora de Porto Alegre")


def test_valores_invalidos_tem_mensagem_clara(cliente):
    resposta = cliente.post(
        "/locais",
        json={**VALIDO, "nome": "AB", "tipo": "piscina", "atividades": [], "tem_sombra": "talvez"},
    )
    erros = erros_por_campo(resposta)
    assert erros["nome"] == "Use pelo menos 3 caracteres."
    assert erros["tipo"] == "Valor inválido. Use um destes: 'praca', 'parque' ou 'calcadao'."
    assert erros["atividades"] == "Escolha pelo menos 1."
    assert erros["tem_sombra"] == "Use verdadeiro ou falso."


def test_atividade_desconhecida_aponta_a_posicao(cliente):
    resposta = cliente.post("/locais", json={**VALIDO, "atividades": ["caminhada", "natacao"]})
    assert "atividades.1" in erros_por_campo(resposta)


def test_json_quebrado(cliente):
    resposta = cliente.post(
        "/locais", content="{nome: sem aspas", headers={"Content-Type": "application/json"}
    )
    assert resposta.status_code == 422
    assert "JSON" in resposta.json()["erros"][0]["mensagem"]


def test_put_invalido_nao_muda_nada(cliente):
    antes = cliente.get("/locais/1").json()
    resposta = cliente.put("/locais/1", json={**VALIDO, "lat": 0})
    assert resposta.status_code == 422
    assert cliente.get("/locais/1").json() == antes
