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

---

## Passo 2.2b — Edge: testar o código no PC (12/11/2026)

**O que eu pedi**
- Instalar no PC o que faltava para rodar C++, já que sem isso não dava para testar parte do código.
- Escolhi instalar as duas ferramentas: o g++ (WinLibs) e o arduino-cli com o núcleo do ESP32.

**O que a IA gerou**
- `edge/teste_pc/Arduino.h`: um "dublê" do Arduino, que troca o `Serial` por `printf`, para o autoteste rodar no PC.
- `edge/teste_pc/main.cpp`: roda no PC os mesmos 31 autotestes do boot e confere se o `unsigned long` tem 4 bytes, como no ESP32.
- `edge/teste_pc/testar.ps1`: um comando só, que roda os autotestes (g++) e compila o firmware inteiro para o ESP32 (arduino-cli).
- Seção "Testar no PC" no `edge/README.md`.

**O que eu mudei ou fiz sozinho**
- Escolhi as ferramentas (g++ + arduino-cli) entre as alternativas apresentadas.
- Rodei o projeto no Wokwi e achei um erro de compilação: o `config.h` tinha sido colado por cima da versão antiga, e não no lugar dela. Corrigi a colagem, rodei de novo e fiz os testes.

---

## Tarefa — Prever a Temperatura Aparente (12/11/2026)

**A tarefa:** prever a TA para 35 °C, 60% de umidade e sem vento, antes de rodar, e depois conferir no Wokwi.

**O que eu fiz**
- 1ª tentativa, à mão: `0,6 × 6,105 × (17,27 × 35 ÷ 272,7) + 35 ≈ 43,1`. Errei em dois pontos: multipliquei pelo expoente em vez de usar `exp()`, e somei a pressão de vapor direto, sem o `× 0,33` e sem o `− 4,00`. Os dois erros se compensaram em parte, e o resultado ficou perto por coincidência.
- A IA explicou o que é o `exp` (o *e* elevado a x, como juros compostos) e me deu um esqueleto em Python com lacunas. Eu preenchi as lacunas sozinho: `x = 17.27 * T / (237.7 + T)`, `e = (UR / 100) * 6.105 * math.exp(x)` e `ta = T + 0.33 * e - 4.00`.
- Resultado: 42,09 °C para 35,0 °C e 60%.

**Conferência no Wokwi**
- O DHT22 do Wokwi ajusta a temperatura por scroll, e ficou em 35,2 °C. O Serial mostrou `T=35.2 C  UR=60%  Sensacao=42.4 C`.
- A minha conta em Python com 35,2 °C dá 42,41 °C: bateu com o ESP32.

**Parte 2: o filtro de salto na prática**
- Mudei a temperatura no Wokwi de 35 °C para uns 25 °C e depois para 34 °C.
- Na primeira leitura depois do pulo, o Serial mostrou `T=25.6 C | sensor=SUSPEITO`: o ESP32 segurou o 34,1, porque o pulo de 8,5 °C passou do limite de 5 °C (`SALTO_MAX_TEMP_C`).
- Na leitura seguinte, o 34,1 se repetiu e foi aceito: `T=34.1 C | sensor=OK`.
- Expliquei com as minhas palavras. A IA corrigiu: a regra é de repetição, e não de média, e ela não tem relação com a mudança climática (o filtro olha para 2 segundos). O motivo é que o ar não muda tão rápido, então um pulo assim costuma ser ruído, e o filtro impede que uma leitura errada ligue o relé.

**O que eu aprendi**
- Resultado perto não quer dizer conta certa: por isso o autoteste tem vários casos.
- No calor, o `exp` amplifica: só 0,2 °C a mais muda a sensação em 0,3 °C.
