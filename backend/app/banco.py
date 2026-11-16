"""Banco de dados SQLite: as tabelas e os dados iniciais.

O SQLite é um banco que mora num arquivo só (forno_alegre.db), sem servidor.
Pense numa planilha com abas: cada tabela é uma aba, e cada linha, um cadastro.
O arquivo .db não vai para o Git (está no .gitignore): ele é recriado com os
dados iniciais na primeira vez que a API sobe.
"""

import json
import os
import sqlite3
from pathlib import Path

PASTA_BACKEND = Path(__file__).resolve().parent.parent

# Os testes trocam o caminho por um banco temporário (variável FORNO_BANCO).
def caminho_do_banco() -> Path:
    return Path(os.environ.get("FORNO_BANCO", PASTA_BACKEND / "forno_alegre.db"))


# Os mesmos valores aparecem na validação (Pydantic) e nas telas.
TIPOS_DE_LOCAL = ("praca", "parque", "calcadao")
TIPOS_DE_HIDRATACAO = ("bebedouro", "fonte", "comercio")
ATIVIDADES = ("crianca", "caminhada", "corrida", "pedal", "piquenique")

# O CHECK é a última barreira: mesmo que alguém grave direto no banco,
# sem passar pela API, um tipo inválido é recusado.
ESQUEMA = f"""
CREATE TABLE IF NOT EXISTS locais (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nome          TEXT    NOT NULL,
    tipo          TEXT    NOT NULL CHECK (tipo IN {TIPOS_DE_LOCAL}),
    lat           REAL    NOT NULL,
    lon           REAL    NOT NULL,
    tem_sombra    INTEGER NOT NULL CHECK (tem_sombra IN (0, 1)),
    tem_bebedouro INTEGER NOT NULL CHECK (tem_bebedouro IN (0, 1)),
    atividades    TEXT    NOT NULL,  -- lista em JSON, ex.: ["caminhada","pedal"]
    observacao    TEXT
);

CREATE TABLE IF NOT EXISTS hidratacao (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nome          TEXT    NOT NULL,
    tipo          TEXT    NOT NULL CHECK (tipo IN {TIPOS_DE_HIDRATACAO}),
    lat           REAL    NOT NULL,
    lon           REAL    NOT NULL,
    abre          TEXT,              -- "HH:MM"; abre e fecha vazios = 24 h
    fecha         TEXT,
    abre_domingo  INTEGER NOT NULL CHECK (abre_domingo IN (0, 1)),
    ativo         INTEGER NOT NULL CHECK (ativo IN (0, 1))
);
"""

AVISO_DEMO = "Dado inicial de demonstração: confira no local e edite se precisar."

# Coordenadas: os 4 pontos das estações (python/fontes/cobertura.py, ESA
# WorldCover + OSM) e a Praça XV pelo OpenStreetMap (way 287533461).
# Sombra, bebedouro e atividades são uma estimativa nossa, editável pelo CRUD.
# Nenhum bebedouro público está mapeado no OSM a menos de 1 km da E1.
LOCAIS_INICIAIS = [
    ("Largo Glênio Peres", "praca", -30.0280671, -51.2276134, 0, 0,
     ["caminhada"], "Piso de concreto, quase sem sombra. " + AVISO_DEMO),
    ("Calçadão da Rua dos Andradas", "calcadao", -30.0302953, -51.2309031, 0, 0,
     ["caminhada"], "Sombra só dos prédios, em parte do dia. " + AVISO_DEMO),
    ("Parque Harmonia (área pavimentada)", "parque", -30.040690, -51.237354, 0, 0,
     ["caminhada", "corrida", "pedal"], "Grande área de concreto ao sol. " + AVISO_DEMO),
    ("Parque Marinha do Brasil (gramado sob as árvores)", "parque", -30.054441, -51.231272, 1, 0,
     list(ATIVIDADES), "Refúgio térmico: gramado com árvores. " + AVISO_DEMO),
    ("Praça XV de Novembro", "praca", -30.028416, -51.227206, 1, 0,
     ["crianca", "caminhada"], "Praça arborizada ao lado do Mercado Público. " + AVISO_DEMO),
]

# Rua da Praia Shopping: entrada principal no OSM (node 3454105361).
# Horário seg–sáb 9h–19h (Jornal do Comércio, 2024); guardamos até 18h,
# igual ao Edge, para dar tempo de a pessoa ficar no refúgio.
HIDRATACAO_INICIAL = [
    ("Rua da Praia Shopping", "comercio", -30.030609, -51.231522, "09:00", "18:00", 0, 1),
]


def conectar() -> sqlite3.Connection:
    """Abre o banco. O row_factory faz cada linha virar algo parecido com um dict."""
    conexao = sqlite3.connect(caminho_do_banco())
    conexao.row_factory = sqlite3.Row
    return conexao


def preparar_banco() -> None:
    """Cria as tabelas, se faltarem, e põe os dados iniciais, se estiverem vazias."""
    with conectar() as conexao:
        conexao.executescript(ESQUEMA)

        if conexao.execute("SELECT COUNT(*) FROM locais").fetchone()[0] == 0:
            conexao.executemany(
                """INSERT INTO locais (nome, tipo, lat, lon, tem_sombra, tem_bebedouro,
                                       atividades, observacao)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                [(*l[:6], json.dumps(l[6]), l[7]) for l in LOCAIS_INICIAIS],
            )

        if conexao.execute("SELECT COUNT(*) FROM hidratacao").fetchone()[0] == 0:
            conexao.executemany(
                """INSERT INTO hidratacao (nome, tipo, lat, lon, abre, fecha,
                                           abre_domingo, ativo)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                HIDRATACAO_INICIAL,
            )
    conexao.close()
