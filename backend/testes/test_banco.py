"""Testes do banco: tabelas, dados iniciais e as barreiras do CHECK."""

import json
import sqlite3

import pytest

from app.banco import ATIVIDADES, conectar, preparar_banco


def contar(tabela: str) -> int:
    with conectar() as conexao:
        return conexao.execute(f"SELECT COUNT(*) FROM {tabela}").fetchone()[0]


def test_cria_tabelas_e_dados_iniciais():
    preparar_banco()
    assert contar("locais") == 5
    assert contar("hidratacao") == 1


def test_nao_duplica_ao_subir_de_novo():
    preparar_banco()
    preparar_banco()
    assert contar("locais") == 5
    assert contar("hidratacao") == 1


def test_dados_iniciais_dentro_de_porto_alegre():
    preparar_banco()
    with conectar() as conexao:
        linhas = conexao.execute(
            "SELECT lat, lon FROM locais UNION ALL SELECT lat, lon FROM hidratacao"
        ).fetchall()
    for linha in linhas:
        assert -30.27 <= linha["lat"] <= -29.93
        assert -51.31 <= linha["lon"] <= -51.01


def test_atividades_guardadas_em_json_valido():
    preparar_banco()
    with conectar() as conexao:
        for linha in conexao.execute("SELECT atividades FROM locais"):
            atividades = json.loads(linha["atividades"])
            assert atividades, "todo local tem pelo menos 1 atividade"
            assert set(atividades) <= set(ATIVIDADES)


def test_check_recusa_tipo_invalido():
    preparar_banco()
    with conectar() as conexao, pytest.raises(sqlite3.IntegrityError):
        conexao.execute(
            """INSERT INTO hidratacao (nome, tipo, lat, lon, abre_domingo, ativo)
               VALUES ('Teste', 'piscina', -30.03, -51.23, 0, 1)"""
        )
