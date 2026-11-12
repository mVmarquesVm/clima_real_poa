# Registro de prompts

Cada passo tem três partes: **o que eu pedi**, **o que a IA gerou** e **o que eu mudei ou fiz sozinho**.

---

## Passo 0 — Combinar o projeto (11 e 12/11/2026)

**O que eu pedi**
- Que a IA lesse o plano do projeto, resumisse o que entendeu e verificasse o que estava instalado no computador (só verificar, sem instalar nada).

**O que a IA gerou**
- Um resumo do plano e a verificação do ambiente: git, Python 3.14, Node 24/npm 11 e VS Code já instalados.
- Pesquisa de fontes de dados: totens da Defesa Civil de Porto Alegre (POA Clima), API da Defesa Civil RS (acesso restrito), satélite (Landsat e Sentinel-2 via Microsoft Planetary Computer) e Open-Meteo.
- Comparações de bibliotecas e de fórmulas de sensação térmica, com prós e contras.

**O que eu mudei ou decidi sozinho**
- **Escala:** 4 estações em vez de 1, numa só região (Centro Histórico e Praia de Belas): Largo Glênio Peres, Calçadão da Rua dos Andradas, área pavimentada do Parque Harmonia e Parque Marinha do Brasil como controle.
- **Foco:** em vez de trabalhadores e paradas de ônibus para **lazer em geral**, com recomendação do local certo para cada atividade. IA para recomendação fica para o futuro.
- **Back-end:** nada de Node.js no servidor; API em **FastAPI + Uvicorn**.
- **Front:** **MapLibre GL** e **Apache ECharts**, com geolocalização e atualização quase em tempo real.
- **Cruzamento de dados:** satélite + termômetros da Defesa Civil + nossos dispositivos, porque as estações oficiais medem a temperatura, mas não a sensação térmica onde as pessoas estão.
- **Sensores:** anemômetro como chip customizado no Wokwi e sensor de luz, para a sensação térmica considerar vento e sol.
- **Repositório:** um só para todas as disciplinas.
- **Fonte:** trouxe a medição do Parque Harmonia (InGá/Sul21: piso a 61 °C × gramado sombreado a 31 °C).

---

## Passo 1 — Estrutura do repositório (12/11/2026)

**O que eu pedi**
- Criar a estrutura de pastas e os arquivos-base no repositório.

**O que a IA gerou**
- `.gitignore`, `README.md` com a Ficha da CitizenTech, `INTEGRANTES.md`, `AI.md`, este `PROMPTS.md` e um `README.md` em cada pasta (`edge/`, `python/`, `matematica/`, `backend/`, `frontend/`, `docs/`).

**O que eu mudei ou fiz sozinho**
- Revisei e editei os arquivos gerados, achei e corrigi as tabelas quebradas no AI.md e no INTEGRANTES.md, fiz o commit sozinho pelo GitHub Desktop e reescrevi a mensagem com amend, depois da revisão.

---

## Passo 2 — Edge: ler o sensor com robustez (12/11/2026)

**O que eu pedi**
- Ritmo mais rápido: a IA faz os passos e continua explicando, eu faço os commits e recebo uma tarefa a cada 2 ou 3 passos.
- Que o equipamento seja **profissional de verdade**: watchdog, sistemas de defesa e testes.

**O que a IA gerou**
- `edge/config.h`: todos os ajustes num lugar só (pinos, tempos, faixas, limites de defesa).
- `edge/sensacao.h`: pressão de vapor e Temperatura Aparente de Steadman (ainda sem vento e sem sol).
- `edge/defesa.h`: 3 barreiras contra leitura ruim (faixa física, filtro de salto, contador de falhas) e a regra de "leitura velha não serve para decidir".
- `edge/autoteste.h`: 18 testes (depois foram 31, ver a revisão abaixo) que rodam no ESP32 a cada boot; se algum falhar, a estação entra em modo seguro. Os valores esperados foram conferidos à parte, em Python.
- `edge/sketch.ino`: leitura a cada 2 s com `millis()` e agenda sem atraso acumulado, watchdog de 8 s, motivo do reinício, contador de reinícios e o comando `w` para simular travamento.
- `edge/diagram.json` e `edge/libraries.txt`: ESP32 + DHT22 no Wokwi.

**Revisão que eu pedi:** "se o sensor ficar louco, não tem nenhum watchdog para isso, nem sistema para parar, reiniciar e avisar". A IA então gerou:
- `edge/vigia.h`: detectores de sensor **instável** (5 saltos em 1 min) e **travado** (mesmo valor por 30 min), e a **escada de recuperação**: reiniciar a leitura → desligar e religar o sensor → reiniciar o ESP32 (no máximo 2 vezes) → modo manutenção.
- Alimentação do DHT22 pelo GPIO 4, para o ESP32 conseguir desligar e religar o sensor.
- Avisos (`ALERTA`, `OK`, `MANUTENCAO`) só quando o estado muda.
- Comandos de teste `f` (falha), `x` (sensor louco) e `n` (normal).
- 13 testes novos no autoteste, num total de 31.

**O que eu mudei ou fiz sozinho**
- Pedi o watchdog, as defesas e os testes.
- Achei a falha de projeto: o watchdog só protegia o programa, não o sensor.
- (preencher depois de rodar no Wokwi)
