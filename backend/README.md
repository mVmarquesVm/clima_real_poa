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
│   ├── banco.py     ← tabelas do SQLite, dados iniciais e a conexão de cada requisição
│   ├── modelos.py   ← validação dos dados (Pydantic)
│   ├── erros.py     ← respostas de erro em português (422 e 500)
│   ├── config.py    ← configurações (endereços liberados no CORS)
│   └── rotas/
│       └── locais.py ← CRUD dos locais de lazer
├── testes/          ← testes (cada um usa um banco temporário)
├── pytest.ini
└── requirements.txt
```

## Rotas

| Método | Rota | O que faz |
|---|---|---|
| GET | `/saude` | Diz se a API está no ar (`{"status": "ok"}`) |
| GET | `/locais` | Lista os locais de lazer, por nome (200) |
| GET | `/locais/{id}` | Mostra um local (200; 404 se não existe) |
| POST | `/locais` | Cria um local (201; 422 se algum campo estiver errado) |
| PUT | `/locais/{id}` | Substitui todos os campos de um local (200; 404; 422) |
| DELETE | `/locais/{id}` | Apaga um local (204; 404) |

## Validação e erros

Tudo o que chega passa pelos modelos do Pydantic (`app/modelos.py`) antes de tocar no banco. Se algo estiver errado, nada é gravado.
- **Locais:** nome com 3 a 80 caracteres (os espaços das pontas são tirados); tipo e atividades só da lista; pelo menos 1 atividade (as repetidas são juntadas); lat e lon dentro de Porto Alegre (lat de −30,27 a −29,93; lon de −51,31 a −51,01); observação com até 200 caracteres (vazia = nenhuma).

Todo erro vem no mesmo formato, em português (`app/erros.py`):

```json
{
  "detail": "Há campos com problema. Confira e tente de novo.",
  "erros": [
    {"campo": "nome", "mensagem": "Use pelo menos 3 caracteres."},
    {"campo": "lat", "mensagem": "Fora de Porto Alegre: a latitude vai de -30.27 a -29.93."}
  ]
}
```

| Código | Quando |
|---|---|
| 422 | Campo faltando ou inválido, ou JSON quebrado (a lista `erros` diz qual campo e por quê) |
| 404 | O id não existe (ex.: `Local 9999 não encontrado. Ele pode ter sido apagado.`) |
| 500 | Falha no banco: a pessoa vê uma frase simples, e o detalhe técnico fica só no log do servidor |

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
