"""CRUD dos pontos de hidratação (bebedouros, fontes e comércios que dão água).

| Método | Rota              | Faz                                   | Sucesso | Erros    |
|--------|-------------------|---------------------------------------|---------|----------|
| GET    | /hidratacao       | lista todos (?so_ativos=true filtra)  | 200     |          |
| GET    | /hidratacao/{id}  | mostra um                             | 200     | 404      |
| POST   | /hidratacao       | cria                                  | 201     | 422      |
| PUT    | /hidratacao/{id}  | substitui todos os campos             | 200     | 404, 422 |
| DELETE | /hidratacao/{id}  | apaga                                 | 204     | 404      |

O mesmo molde de rotas/locais.py; muda só a tabela e os campos.
"""

import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.banco import obter_conexao
from app.modelos import Hidratacao, HidratacaoEntrada

rotas = APIRouter(prefix="/hidratacao", tags=["hidratação"])

COLUNAS = "nome, tipo, lat, lon, abre, fecha, abre_domingo, ativo"


def para_o_banco(ponto: HidratacaoEntrada) -> tuple:
    return (
        ponto.nome, ponto.tipo, ponto.lat, ponto.lon, ponto.abre, ponto.fecha,
        int(ponto.abre_domingo), int(ponto.ativo),
    )


def do_banco(linha: sqlite3.Row) -> Hidratacao:
    dados = dict(linha)
    dados["abre_domingo"] = bool(dados["abre_domingo"])
    dados["ativo"] = bool(dados["ativo"])
    return Hidratacao(**dados)


def nao_encontrado(id_ponto: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Ponto de hidratação {id_ponto} não encontrado. Ele pode ter sido apagado.",
    )


@rotas.get("", response_model=list[Hidratacao])
def listar(so_ativos: bool = False, conexao: sqlite3.Connection = Depends(obter_conexao)):
    """Com ?so_ativos=true, a recomendação não manda ninguém a um bebedouro quebrado."""
    sql = "SELECT * FROM hidratacao"
    if so_ativos:
        sql += " WHERE ativo = 1"
    linhas = conexao.execute(sql + " ORDER BY nome").fetchall()
    return [do_banco(linha) for linha in linhas]


@rotas.get("/{id_ponto}", response_model=Hidratacao)
def mostrar(id_ponto: int, conexao: sqlite3.Connection = Depends(obter_conexao)):
    linha = conexao.execute("SELECT * FROM hidratacao WHERE id = ?", (id_ponto,)).fetchone()
    if linha is None:
        raise nao_encontrado(id_ponto)
    return do_banco(linha)


@rotas.post("", response_model=Hidratacao, status_code=status.HTTP_201_CREATED)
def criar(ponto: HidratacaoEntrada, conexao: sqlite3.Connection = Depends(obter_conexao)):
    with conexao:
        cursor = conexao.execute(
            f"INSERT INTO hidratacao ({COLUNAS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            para_o_banco(ponto),
        )
    return Hidratacao(id=cursor.lastrowid, **ponto.model_dump())


@rotas.put("/{id_ponto}", response_model=Hidratacao)
def substituir(
    id_ponto: int, ponto: HidratacaoEntrada, conexao: sqlite3.Connection = Depends(obter_conexao)
):
    with conexao:
        cursor = conexao.execute(
            """UPDATE hidratacao
               SET nome = ?, tipo = ?, lat = ?, lon = ?, abre = ?, fecha = ?,
                   abre_domingo = ?, ativo = ?
               WHERE id = ?""",
            (*para_o_banco(ponto), id_ponto),
        )
    if cursor.rowcount == 0:
        raise nao_encontrado(id_ponto)
    return Hidratacao(id=id_ponto, **ponto.model_dump())


@rotas.delete("/{id_ponto}", status_code=status.HTTP_204_NO_CONTENT)
def apagar(id_ponto: int, conexao: sqlite3.Connection = Depends(obter_conexao)):
    with conexao:
        cursor = conexao.execute("DELETE FROM hidratacao WHERE id = ?", (id_ponto,))
    if cursor.rowcount == 0:
        raise nao_encontrado(id_ponto)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
