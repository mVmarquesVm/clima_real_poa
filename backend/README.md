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
│   ├── main.py      ← cria a API, liga o CORS e registra as rotas
│   └── config.py    ← configurações (endereços liberados no CORS)
├── testes/          ← testes com o TestClient do FastAPI
├── pytest.ini
└── requirements.txt
```

## Rotas

| Método | Rota | O que faz |
|---|---|---|
| GET | `/saude` | Diz se a API está no ar (`{"status": "ok"}`) |

## CORS

O navegador só deixa o app (porta 5173) ler as respostas da API (porta 8000) se a API disser que confia nesse endereço. Por padrão, só o dev server do Vite é liberado (`http://localhost:5173` e `http://127.0.0.1:5173`). Para trocar, use a variável de ambiente `FORNO_ORIGENS` (endereços separados por vírgula).
