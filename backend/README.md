# Backend — API do Forno Alegre

> Ficha da CitizenTech: ver o [README principal](../README.md).

**Disciplina:** Web Development

## O que vai nesta pasta
- API em **FastAPI + Uvicorn**, com banco **SQLite** (módulo `sqlite3`, que já vem com o Python).
- CRUD de **locais de lazer** e de **pontos de hidratação** (em construção).
- Sem chave nem senha: a API não guarda dado pessoal.

## Quickstart (Windows, de dentro de `backend/`)

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000
- Documentação automática (Swagger): http://127.0.0.1:8000/docs
- Testes: `.venv\Scripts\python.exe -m pytest`

## Estrutura

```
backend/
├── app/
│   ├── main.py      ← cria a API, liga o CORS, prepara o banco e registra as rotas
│   ├── banco.py     ← tabelas do SQLite e dados iniciais
│   └── config.py    ← configurações (endereços liberados no CORS)
├── testes/          ← testes (cada um usa um banco temporário)
├── pytest.ini
└── requirements.txt
```

## Rotas

| Método | Rota | O que faz |
|---|---|---|
| GET | `/saude` | Diz se a API está no ar (`{"status": "ok"}`) |

## Banco de dados

O banco fica no arquivo `backend/forno_alegre.db` (fora do Git). Ele é criado com os dados iniciais na primeira vez que a API sobe. Para recomeçar do zero, pare a API e apague esse arquivo.

| Tabela | Campos |
|---|---|
| `locais` | nome, tipo (`praca`, `parque`, `calcadao`), lat, lon, tem_sombra, tem_bebedouro, atividades (`crianca`, `caminhada`, `corrida`, `pedal`, `piquenique`), observação |
| `hidratacao` | nome, tipo (`bebedouro`, `fonte`, `comercio`), lat, lon, abre e fecha (`HH:MM`; vazios = 24 h), abre_domingo, ativo |

**Dados iniciais:**
- os 4 locais das estações (os pontos de `python/fontes/cobertura.py`);
- a Praça XV de Novembro (OSM, way 287533461);
- o Rua da Praia Shopping (entrada principal no OSM, node 3454105361; seg–sáb, das 9h às 18h, igual ao refúgio do Edge).

Sombra, bebedouro e atividades são uma **estimativa nossa**, editável pelo cadastro. Nenhum bebedouro público está mapeado no OSM a menos de 1 km da E1, e é por isso que o cadastro de hidratação existe.

## CORS

O navegador só deixa o app (porta 5173) ler as respostas da API (porta 8000) se a API disser que confia nesse endereço. Por padrão, só o dev server do Vite é liberado (`http://localhost:5173` e `http://127.0.0.1:5173`). Para trocar, use a variável de ambiente `FORNO_ORIGENS` (endereços separados por vírgula).
