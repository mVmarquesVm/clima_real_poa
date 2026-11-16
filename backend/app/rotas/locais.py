"""CRUD dos locais de lazer.

| Método | Rota          | Faz                         | Sucesso | Erros    |
|--------|---------------|-----------------------------|---------|----------|
| GET    | /locais       | lista todos (por nome)      | 200     |          |
| GET    | /locais/{id}  | mostra um                   | 200     | 404      |
| POST   | /locais       | cria                        | 201     | 422      |
| PUT    | /locais/{id}  | substitui todos os campos   | 200     | 404, 422 |
| DELETE | /locais/{id}  | apaga                       | 204     | 404      |
"""

import json
import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.banco import obter_conexao
from app.modelos import Local, LocalEntrada

rotas = APIRouter(prefix="/locais", tags=["locais"])

# A ordem das colunas é a mesma nos INSERT e UPDATE abaixo.
COLUNAS = "nome, tipo, lat, lon, tem_sombra, tem_bebedouro, atividades, observacao"


def para_o_banco(local: LocalEntrada) -> tuple:
    """Modelo → linha: o SQLite não tem bool nem lista, então vira 0/1 e JSON."""
    return (
        local.nome, local.tipo, local.lat, local.lon,
        int(local.tem_sombra), int(local.tem_bebedouro),
        json.dumps(local.atividades), local.observacao,
    )


def do_banco(linha: sqlite3.Row) -> Local:
    """Linha → modelo: o caminho de volta."""
    dados = dict(linha)
    dados["tem_sombra"] = bool(dados["tem_sombra"])
    dados["tem_bebedouro"] = bool(dados["tem_bebedouro"])
    dados["atividades"] = json.loads(dados["atividades"])
    return Local(**dados)


def nao_encontrado(id_local: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Local {id_local} não encontrado. Ele pode ter sido apagado.",
    )


@rotas.get("", response_model=list[Local])
def listar(conexao: sqlite3.Connection = Depends(obter_conexao)):
    linhas = conexao.execute("SELECT * FROM locais ORDER BY nome").fetchall()
    return [do_banco(linha) for linha in linhas]


@rotas.get("/{id_local}", response_model=Local)
def mostrar(id_local: int, conexao: sqlite3.Connection = Depends(obter_conexao)):
    linha = conexao.execute("SELECT * FROM locais WHERE id = ?", (id_local,)).fetchone()
    if linha is None:
        raise nao_encontrado(id_local)
    return do_banco(linha)


@rotas.post("", response_model=Local, status_code=status.HTTP_201_CREATED)
def criar(local: LocalEntrada, conexao: sqlite3.Connection = Depends(obter_conexao)):
    # Os "?" mandam os valores separados do comando: isso impede a injeção de SQL.
    with conexao:  # confirma (commit) no fim do bloco, ou desfaz se der erro
        cursor = conexao.execute(
            f"INSERT INTO locais ({COLUNAS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            para_o_banco(local),
        )
    return Local(id=cursor.lastrowid, **local.model_dump())


@rotas.put("/{id_local}", response_model=Local)
def substituir(
    id_local: int, local: LocalEntrada, conexao: sqlite3.Connection = Depends(obter_conexao)
):
    with conexao:
        cursor = conexao.execute(
            """UPDATE locais
               SET nome = ?, tipo = ?, lat = ?, lon = ?, tem_sombra = ?,
                   tem_bebedouro = ?, atividades = ?, observacao = ?
               WHERE id = ?""",
            (*para_o_banco(local), id_local),
        )
    if cursor.rowcount == 0:  # nenhuma linha mudou = o id não existe
        raise nao_encontrado(id_local)
    return Local(id=id_local, **local.model_dump())


@rotas.delete("/{id_local}", status_code=status.HTTP_204_NO_CONTENT)
def apagar(id_local: int, conexao: sqlite3.Connection = Depends(obter_conexao)):
    with conexao:
        cursor = conexao.execute("DELETE FROM locais WHERE id = ?", (id_local,))
    if cursor.rowcount == 0:
        raise nao_encontrado(id_local)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
