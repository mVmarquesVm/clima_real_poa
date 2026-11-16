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
│       ├── locais.py     ← CRUD dos locais de lazer
│       └── hidratacao.py ← CRUD dos pontos de hidratação
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
| GET | `/hidratacao` | Lista os pontos de hidratação, por nome; `?so_ativos=true` deixa só os ativos (200) |
| GET | `/hidratacao/{id}` | Mostra um ponto (200; 404) |
| POST | `/hidratacao` | Cria um ponto (201; 422) |
| PUT | `/hidratacao/{id}` | Substitui todos os campos de um ponto (200; 404; 422) |
| DELETE | `/hidratacao/{id}` | Apaga um ponto (204; 404) |

## Validação e erros

Tudo o que chega passa pelos modelos do Pydantic (`app/modelos.py`) antes de tocar no banco. Se algo estiver errado, nada é gravado.
- **Tipos exatos (modo `strict`):** verdadeiro/falso tem de ser `true`/`false`, e número tem de ser número. `"yes"`, `1` ou `"-30.03"` (texto) dão 422, em vez de serem convertidos sem ninguém saber.
- **Nomes:** pelo menos 3 letras ou números **visíveis** (espaços de largura zero não contam); caracteres de controle, como o byte nulo, são recusados no nome e na observação.
- **Ids:** inteiros de 1 até 2^63 − 1 (o maior inteiro do SQLite); fora disso, 422.
- **Locais:** nome com 3 a 80 caracteres (os espaços das pontas são tirados); tipo e atividades só da lista; pelo menos 1 atividade (as repetidas são juntadas); lat e lon dentro de Porto Alegre (lat de −30,27 a −29,93; lon de −51,31 a −51,01); observação com até 200 caracteres (vazia = nenhuma).
- **Pontos de hidratação:** as mesmas regras de nome e de lat/lon; tipo só da lista; horários no formato `HH:MM` (de 00:00 a 23:59); os dois horários juntos ou nenhum (nenhum = aberto 24 h); o de fechar depois do de abrir (um horário que vira a noite não é aceito); `ativo` é verdadeiro se não vier.

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
| 422 | Campo faltando ou inválido, id fora da faixa ou JSON quebrado (a lista `erros` diz qual campo e por quê) |
| 404 | O id não existe (ex.: `Local 9999 não encontrado. Ele pode ter sido apagado.`) ou a rota não existe |
| 405 | A rota não aceita o método (ex.: `PATCH`); o cabeçalho `Allow` diz quais valem |
| 500 | Falha no banco ou erro inesperado: a pessoa vê uma frase simples, e o detalhe técnico fica só no log do servidor |

Fora do 422, a lista `erros` vem vazia, mas sempre existe. Toda resposta de erro, até a do 500, leva o cabeçalho do CORS: assim, o app consegue ler a mensagem, em vez de ver um "erro de CORS".

**Caça a erros (16/11):** um subagente tentou quebrar a API com cerca de 180 requisições (CORS, ids estranhos, corpos malformados, SQL no texto, tipos errados, métodos errados). Ele achou 5 problemas, todos corrigidos e cobertos pelo `testes/test_robustez.py`. O pior era um id gigante, que derrubava a rota com um 500 sem CORS.

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
