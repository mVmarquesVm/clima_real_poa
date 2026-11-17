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
- Rodei no Wokwi e testei à mão o salto de temperatura (o filtro só aceita o pulo quando ele se repete) e o travamento com o comando `w` (o watchdog reinicia o ESP32).

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

---

## Passos 2.3 e 2.4 — Edge: anemômetro, LDR e fórmula completa (12/11/2026)

**O que eu pedi**
- Continuar o projeto a partir do Passo 2.3: explicar a fórmula completa de Steadman (com vento e sol) antes do código, e depois implementar o anemômetro e o LDR.
- Entre as duas opções de anemômetro (analógico, como o da Adafruit, ou por pulsos, como o da SparkFun), **escolhi o por pulsos**, mesmo sendo o mais trabalhoso, por ser mais fiel ao hardware real.

**O que a IA explicou antes do código**
- A fórmula completa: `TA = T + 0,348·e − 0,70·v + 0,70·Q/(v + 10) − 4,25`, e por que o vento divide o termo do sol.
- Por que os coeficientes mudam em relação à versão de sombra: são dois ajustes (como regressões) do modelo grande do Steadman, um com o sol e outro sem; com Q = 0, a diferença fica perto de 0,1 °C, menor que o erro do DHT22.
- A conversão do LDR: ADC → lux (curva do LDR) → W/m² (~120 lux por W/m²) → Q (o corpo absorve ~12%). É uma aproximação, declarada no README.

**O que a IA gerou**
- `edge/anemometro.chip.json` e `edge/anemometro.chip.c`: chip customizado do Wokwi que imita o anemômetro da SparkFun (1 fechamento por segundo = 2,4 km/h), com slider de vento.
- `edge/conversao.h`: pulsos → vento (m/s), ADC → lux, lux → Q.
- `edge/sensacao.h`: troca para a fórmula completa de Steadman.
- `edge/defesa.h`: faixa física do vento e do LDR, e o **pior caso** quando a leitura falha (vento 0 e sol forte).
- `edge/sketch.ino`: interrupção que conta os pulsos (com debounce e seção crítica), leitura do LDR no ADC1, avisos de erro e impressão no Serial de temperatura, umidade, vento, luz e sensação.
- `edge/config.h` e `edge/diagram.json`: pinos (anemômetro no GPIO 27, LDR no GPIO 34) e as constantes novas.
- `edge/autoteste.h`: 18 testes novos, num total de 49. O caso de 35 °C e 60% continua fora dos testes.
- `edge/teste_pc/wokwi-api.h` e `edge/teste_pc/teste_chip.c`: um Wokwi falso que roda o chip no PC e confere os pulsos; o `testar.ps1` ganhou essa etapa.
- `edge/README.md`: seções da fórmula, da aproximação do LDR, do anemômetro, das defesas, das ligações e das limitações.

**O que eu mudei ou fiz sozinho**
- Escolhi o anemômetro por pulsos.
- Rodei no meu Wokwi em 13/11: 49 passaram e 0 falharam. Com vento de 2 m/s, o Serial mostrou `Vento=2.0` e `Sensacao=34.6`; com o slider em 9,6, `Vento=9.3` (o degrau é de 0,33 m/s) e `Sensacao=28.4`, que conferi na conta.
- O chip deu "Missing chip" no começo: era um erro de digitação no nome do arquivo (`anenometro`) e um `diagram.json` antigo, sem a peça do anemômetro.

---

## Passo 3 — Edge: LEDs de risco, relé com histerese e display (13/11/2026)

**O que eu pedi**
- Acelerar por causa do prazo: a IA implementa e eu testo, reviso o código e confiro se o projeto está no rumo certo. Quando eu sentir necessidade, peço uma atividade.
- Escolhi o **LCD 20x4 I2C** (e não o 16x2), para caber o valor, o risco, o relé e a rede ao mesmo tempo, sem a tela alternar.
- Autorizei a instalação da biblioteca `LiquidCrystal I2C` 1.1.2 no arduino-cli.

**O que a IA gerou**
- `edge/risco.h`: os 4 níveis (limites de 27, 32 e 41 °C, das categorias da NOAA), a histerese de 0,5 °C para a cor descer, o "amarelo piscando" quando não há dado confiável e a validação dos limites para a config remota do Passo 4.
- `edge/rele.h`: a máquina de estados do relé: confirma o risco por 10 s, desliga só 2 °C abaixo do limite e depois de 20 s de calma, tem descanso mínimo de 30 s e máximo de 10 min ligado, e o fail-safe desliga na hora sem dado confiável.
- `edge/display.h`: o texto das 4 linhas do LCD, sempre com 20 caracteres.
- `edge/sketch.ino`: relé desligado como primeira linha do `setup()`, LEDs atualizados a cada volta do `loop()`, decisão de risco e relé a cada 2 s, LCD reescrito só nas linhas que mudam, e o risco e o relé no Serial.
- `edge/config.h`, `edge/diagram.json` e `edge/libraries.txt`: pinos, limites, tempos, as peças novas e a biblioteca do LCD.
- `edge/autoteste.h`: 28 testes novos, num total de 77.
- `edge/README.md`: seções dos níveis de risco, do relé, do display (com as instruções de leitura) e das ligações.

- A pedido meu, a IA colou os arquivos no meu projeto do Wokwi e rodou a simulação: 77 passaram, o LED laranja acendeu com 34,6 °C de sensação, e 10 s depois o relé e o LED azul do nebulizador ligaram.
- Esse teste achou um bug: o `setup()` agora leva quase 2 s, e a primeira janela do vento ficava com poucos milissegundos, o que gerava um falso alerta do anemômetro. A IA corrigiu: o primeiro ciclo passou a ser agendado no fim do `setup()`. Ela também afastou os LEDs no diagrama, porque os nomes estavam encavalados.

**O que eu mudei ou fiz sozinho**
- Escolhi o LCD 20x4.
- No meu teste, o vento ficava parado em 2,0 m/s mesmo mexendo no slider. A IA reproduziu o problema no Wokwi e achou a causa: o `diagram.json` fixava `"vento": "2"` nos `attrs` do chip, e com isso o Wokwi ignora o slider. Com `"attrs": {}`, o slider voltou a funcionar (7,1 m/s no slider deu `Vento=7.3` e `7.0` no Serial).
- Pedi para acelerar o ritmo: a IA implementa, e eu testo e reviso o código. Testei no Wokwi junto com a IA (77/77 autotestes, LED laranja com TA de 34,6 °C, relé ligando 10 s depois e o LCD mostrando tudo) e pedi para mudar alguns dados.

---

## Passo 4 — Edge: WiFi, MQTT no ThingSpeak e comandos remotos (13/11/2026)

**O que eu pedi**
- Continuar o projeto com o Passo 4.
- Decidi, entre as opções que a IA mostrou:
  - a configuração remota chega pelo **field8 do próprio canal no ThingSpeak** (e não por um broker público), para ficar tudo na plataforma IoT que a rubrica pede;
  - a senha MQTT fica num `secrets.h` fora do Git, com uma credencial do ThingSpeak que **só acessa o canal da E1**, porque o projeto no Wokwi é visível para quem tem o link;
  - autorizei a instalação da biblioteca `PubSubClient` 2.8 no arduino-cli.

**O que a IA gerou**
- `edge/rede.h`: a espera crescente (backoff) das reconexões: WiFi em 5 s, 10 s, 20 s... e MQTT em 2 s, 4 s, 8 s..., até 1 min.
- `edge/nuvem.h`: a mensagem publicada (7 campos + status; dado não confiável não é enviado) e a validação dos comandos do field8 (`lim:A,B,C`, `rele:on|off|auto`), com limite de tamanho, formato, faixa, ordem e frequência.
- `edge/rele.h`: o acionamento remoto (`rele:on` volta sozinho ao automático depois de 10 min; o fail-safe continua acima de tudo).
- `edge/sketch.ino`: conexão WiFi/MQTT sem travar o `loop()`, publicação a cada 20 s, recepção dos comandos, limites guardados na flash (NVS) e os comandos `d` (queda do WiFi por 30 s) e `m` (queda do MQTT) para o vídeo.
- `edge/secrets.example.h`, `edge/config.h`, `edge/display.h`, `edge/libraries.txt` e o `testar.ps1` (compila com o modelo se o `secrets.h` não existir).
- `edge/autoteste.h`: 22 testes novos, num total de 99, incluindo comandos maliciosos ou malformados.
- `edge/README.md`: seção da nuvem, com os campos do canal, os comandos, o motivo da credencial restrita e o passo a passo no ThingSpeak.
- Com a minha autorização, a IA criou pelo meu Chrome o dispositivo MQTT `estacao-E1`, com acesso só ao canal 3578427, e colocou o Channel ID no `secrets.h`. As credenciais quem copiou e colou fui eu.
- Correção achada no teste do Wokwi: o comando `m` derrubava o MQTT, mas a estação reconectava na mesma hora, e a queda não aparecia nem no LCD nem no Serial. Agora o `m` segura a queda por 30 s, como o `d`, e toda queda é registrada antes da nova tentativa de conexão.

**O que eu mudei ou fiz sozinho**
- Escolhi o field8 para a configuração remota e a credencial restrita ao canal.
- Criei a conta e o canal no ThingSpeak, dei nome aos campos e colei as credenciais MQTT no `secrets.h` do Wokwi.
- Testei o envio de um comando pelo field8, pelo navegador, com a URL de update do ThingSpeak.

## Passo 4.3 — Edge: nome do produto e dashboard no ThingSpeak (13/11/2026)

**O que eu pedi**
- Continuar o projeto, começando pela conversa sobre o nome.
- Escolhi, entre as opções que a IA mostrou, usar **os dois nomes**: o produto se chama "Forno Alegre", e "Hot Island in the City" vira o nome do projeto, com o subtítulo "Medindo a ilha de calor do Centro de Porto Alegre".
- Autorizei a IA a mexer no meu canal pelo Chrome (nome, descrição e widgets) e escolhi deixar o canal **público** (Public View), para o professor ver sem precisar de conta.

**O que a IA gerou**
- Subtítulo no `README.md` da raiz.
- No canal 3578427, pelo meu Chrome: o nome passou a ser "Forno Alegre - E1 Largo Glênio Peres"; a descrição foi reescrita dentro do limite de 255 caracteres, porque a antiga estava cortada e tinha "o previsão"; o canal passou a ser público; e foram criados 3 widgets na visão pública: o medidor da TA (field5, com as faixas 27/32/41 nas cores dos LEDs), a lâmpada do relé (field7) e o número do nível de risco (field6).
- `edge/README.md`: seção "Dashboard", com o link do canal e como ler cada widget; os links do Wokwi e do canal em "A preencher"; e o nome do canal atualizado no passo a passo.

**O que eu mudei ou fiz sozinho**
- Decidi o nome e a visibilidade do canal.
- **Achei uma falha na documentação:** o medidor ia só de 15 a 50 °C, mas no RS a sensação pode passar de 50 e também ficar negativa (minuano). A IA confirmou com a fórmula (58,1 °C com 40 °C, 60% e sol forte; −5,9 °C com 2 °C, 80% e vento de 8 m/s) e explicou que os 61 °C do Parque Harmonia eram do piso, e não do ar. Ela também mostrou que, no frio, a estação marcava "verde". Escolhi **mostrar o frio sem alertar**:
  - `config.h`: `LIMITE_FRIO_C = 9` (início do "estresse por frio leve" na escala UTCI);
  - `display.h`: o LCD mostra `FRIO` em vez de `VERDE` abaixo de 9 °C (os LEDs, o relé e o field6 não mudam);
  - `autoteste.h`: 6 testes novos (TA de 58,1 e de −5,9 °C, `FRIO` no LCD, relé desligado no frio, linha com 20 caracteres, limite exato de 9 °C), num total de 105;
  - medidor no ThingSpeak ampliado para −10 a 60 °C, com uma faixa azul de frio; depois **pedi para ir até 65 °C**, pensando no aquecimento global e na urbanização sem verde (a IA conferiu: 43 °C, 55% e sol forte, sem vento, já dão TA de 62 °C);
  - `edge/README.md`: explicação do frio e duas limitações novas;
  - teste no Wokwi (feito pela IA, pelo meu Chrome, com o meu ok): 105/105 no ESP32. Com 2 °C e 80%, o LCD mostrou `TA 3.2C FRIO`, com o LED verde aceso, o relé desligando depois da calma e a nuvem recebendo TA 3,2, risco 0 e relé 0. Com vento de 8 m/s, mostrou `TA -3.9C FRIO`.
- Pedi para a IA conferir o acesso público. Em 13/11, sem login, a página do canal abriu com o nome e o widget da sensação térmica, e a API pública (`feeds.json`, sem chave) devolveu os dados.

## Python 1 — Dados oficiais, simulador das estações e ranking (13/11/2026)

**O que eu pedi**
- Passar para a disciplina de Python e entender onde entra o cálculo da sensação térmica (no Edge, no Python ou na Matemática).
- Autorizei criar um `venv` em `python/.venv` e instalar `pandas`, `matplotlib` e `requests`. A IA também instalou o `pytest` sem ter pedido antes e me avisou; ele ficou separado no `requirements.txt`.
- Escolhi que as estações simuladas fiquem **em CSV agora**; publicar no ThingSpeak fica para depois.

**O que a IA gerou**
- `python/sensacao.py`: a fórmula de Steadman e os níveis de risco, iguais aos do ESP32, e `test_sensacao.py`, com os mesmos casos do autoteste do ESP32 (4 testes).
- `python/oficial.py`: baixa do Open-Meteo (reanálise ERA5) os dados horários do Centro de POA e calcula a sensação na sombra e ao sol. Salva em `dados/` para rodar sem internet.
- `python/simulador.py`: gera as 4 estações aplicando o efeito de cada tipo de local (hipóteses documentadas, a calibrar com as estações reais). A E1 também é simulada nessa análise, porque os dados dela no ThingSpeak vêm do Wokwi, e não de fevereiro de 2025.
- `python/ranking.py`: horas por dia em risco, dose de calor (°C·h acima de 32 °C), sensação máxima e diferença em relação à previsão; ranking e 2 gráficos (paleta validada para daltonismo, com rótulos diretos).
- `python/README.md` com o problema, o que o programa faz, o Quickstart, o resultado, as hipóteses, as fontes e as limitações.
- Resultado da semana de 03 a 09/02/2025: a previsão mostrou no máximo 37,5 °C, e a sensação ao sol com os mesmos dados oficiais chegou a 47,0 °C; o concreto do Harmonia lidera o ranking, e o refúgio sob as árvores fica ~10 °C abaixo ao meio-dia.

**O que eu mudei ou fiz sozinho**
- Decidi o ambiente isolado e a ordem (CSV antes da nuvem).
- **Não aceitei as hipóteses** e pedi dados reais (sugeri uma API de clima, como a do Google). Ver "Python 2".

## Python 2 — Só dados reais: INMET + satélite (13/11/2026)

**O que eu pedi**
- "Faça com dados reais, sem hipóteses", por exemplo com uma weather API do Google.
- A IA conferiu e explicou que a Google Weather API só guarda as últimas 24 h e que qualquer API de clima é dado de modelo numa grade de quilômetros: nos 4 locais (1 a 3 km de distância), ela daria quase o mesmo número e esconderia a ilha de calor. Ela testou e mostrou as fontes medidas.
- Escolhi: **satélite + INMET**; autorizei baixar o arquivo de 2025 do INMET (91 MB, só a estação A801 fica no projeto); e mandei **apagar o simulador**.

**O que a IA gerou**
- `python/locais.py`: as áreas reais dos 4 locais, do OpenStreetMap (polígonos do largo e dos parques; círculo de 60 m no calçadão), salvas em `dados/locais.geojson`.
- `python/oficial.py` reescrito: lê o CSV oficial da estação A801 (UTC → horário de Brasília, kJ/m² → W/m², -9999 = sem dado) e calcula a sensação na sombra e ao sol.
- `python/satelite.py`: acha as 6 passagens de verão do Landsat sem nuvens (2024/25 e 2025/26) e o Sentinel-2 de 10/02/2025, e pede ao Microsoft Planetary Computer a média, o mínimo e o máximo da superfície e do NDVI em cada área. Não precisa de chave nem de biblioteca nova.
- `python/ranking.py` reescrito: ranking pela superfície média do verão, NDVI e diferença em relação ao ar do INMET; 2 gráficos.
- `python/test_dados.py`: 4 testes novos (kJ → W, banda térmica, círculo, leitura do arquivo real do INMET com a hora convertida), num total de 8.
- Apagados: `simulador.py` e os CSVs e o gráfico gerados pela versão com hipóteses.
- README do Python reescrito, com o que os dados reais mostram e o que **não** mostram.
- Resultados: o INMET mediu no máximo 37,3 °C no ar, e a sensação ao sol chegou a 47,0 °C (04/02/2025, 15h). Ranking da superfície: Harmonia (41,5 °C) > Largo (39,5) > Marinha (37,7) > calçadão (35,7). O dado real derrubou uma hipótese da versão anterior: o calçadão, sombreado pelos prédios às 10h e perto da Praça da Alfândega, é o mais fresco.
- A IA errou e corrigiu: gravou um arquivo temporário fora do projeto (apagado) e escreveu no README duas frases que os dados não sustentavam (a ordem "igual nas 6 passagens" e o pixel "parecido" com os 61 °C do InGá).

**O que eu mudei ou fiz sozinho**
- Recusei os dados com hipóteses e escolhi as fontes reais.
- Rodei o `ranking.py` (a 1ª tentativa falhou porque eu estava na raiz do projeto, e não em `python/`).
- **Observei que as médias de superfície não mostram a sensação térmica de fato.** A IA confirmou e separou três coisas: o satélite mede o piso, e não o ar nem a sensação; a média da área esconde os extremos (no Harmonia, a média é 41,5 °C, mas o pixel mais quente chega a 50,4 °C); e a passagem às 10h20 perde o pico da tarde. A medida em si é boa (erro de 1 a 2 °C); o problema é o que ela representa. Isso mostra por que as estações no local são necessárias.


## Matemática — Derivada, integral e limite com o dia 04/02/2025 (13/11/2026)

**O que eu pedi**
- Uma regra fixa para a IA: em tarefa pesada (arquivo grande, muitas buscas), usar um subagente que traga só um resumo, para gastar menos tokens.
- Aprovei o plano: o dia **04/02/2025** (o mesmo do Harmonia e do Python) e **só o NumPy** (sem instalar o SciPy).
- Pedi que a IA escrevesse o código, porque o professor não ensinou a aplicar o Cálculo em Python.

**O que a IA gerou**
- Um subagente leu o CSV do INMET e devolveu só a tabela hora a hora de 04 e 05/02 e os picos, sem colar o arquivo na conversa.
- `matematica/calculo.py`: as ferramentas de Cálculo, só com NumPy: ajuste de ondas de 24 h por mínimos quadrados, derivada, 2ª derivada e primitiva exatas, bisseção, somas de Riemann e o ajuste da lei de Newton.
- `matematica/analise.py`: lê o INMET pelo `python/oficial.py` e roda M1 (modelo), M2 (derivada), M3 (integral) e M4 (limite); grava o `resultados.json`.
- `matematica/graficos.py`: 4 gráficos, com a mesma paleta do Python.
- `matematica/test_calculo.py`: 9 testes com funções de resposta conhecida.
- README da Matemática com o problema, o modelo, as análises, a interpretação, as limitações e o Quickstart.
- Resultados: pico de 46,9 °C às 14h07 (medido: 47,0 °C às 15h); aquecimento máximo de 3,2 °C/h às 09h55; dose de 116,4 °C·h acima de 32 °C, em 13,7 h; a noite tende a 23,3 °C (noite tropical).
- A IA ajustou o próprio trabalho: escolheu 2 ondas comparando os erros de 1 a 4 ondas; tirou os símbolos que o terminal do Windows não mostra; e, como as regras de Riemann deram o mesmo número (a dose vale 0 nas pontas), deixou uma só no gráfico e explicou o porquê.
- Relatório técnico (escolhi o formato: documento do Claude exportado em PDF): 9 seções (problema, dados, modelo, derivada, integral, limite, interpretação, limitações, conclusão e referências), com os 4 gráficos, salvo em `matematica/relatorio_matematica.pdf` (10 páginas). Ao revisar o texto, a IA corrigiu 4 frases que diziam mais do que os dados mostravam (ex.: "passaram de 35 °C" → "chegaram a 35 °C ou mais"; a madrugada não é "segura", e sim nível amarelo).

**O que eu mudei ou fiz sozinho**
- Escolhi o dia 04/02/2025, só o NumPy e o formato do relatório (documento exportado em PDF).
- Revisei o relatório e observei: "ele aprofunda, mostra o que o nosso modelo cobre, o que ele não foi feito para cobrir (como medidas gerais, e sim medidas mais precisas) e o que os outros dados cobrem mas deixam lacunas, como o calor no ar de fato, principalmente pelo fato dele não medir ilhas de calor intenso e como isso afeta as pessoas."
- A IA ajustou a direção: o modelo da Matemática usa o dado geral (INMET, num gramado) e por isso mostra o **piso** do problema; o satélite mede o piso dos locais, e não o ar; só a estação Forno Alegre mede o ar e a sensação no ponto onde a pessoa está.


## Front-end 1 — Plano e base do app (14/11/2026)

**O que eu pedi**
- Seguir para o Front-end.
- Decidi, entre as opções da IA: o app lê os dados **direto, sem servidor** (ThingSpeak público e Open-Meteo, sem chave; o ranking do satélite vira um JSON), para o professor rodar só com `npm install` e `npm run dev`; o mapa mostra **a E1 ao vivo + os 4 locais pelo ranking do satélite**, e a previsão responde "quando ir".
- Autorizei instalar os pacotes só dentro de `frontend/`: React, Vite, Tailwind 4, MapLibre GL e Apache ECharts.

**O que a IA gerou**
- Um plano com 12 componentes e ~16 commits pequenos (`feat(front): ...`).
- A base do app em `frontend/`: modelo React + Vite (sem os arquivos de exemplo), Tailwind 4 ligado no `vite.config.js`, cores de risco iguais às dos LEDs da estação, página em `pt-BR`, link "pular para o conteúdo" e respeito a quem pede menos animação.
- Verificação: `npm run build` e `npm run lint` sem erros.

**O que eu mudei ou fiz sozinho**
- Escolhi que o app lê os dados direto do navegador, sem servidor, para o professor conseguir rodar só com `npm install` e `npm run dev`.
- Escolhi o que o mapa mostra: a E1 ao vivo + os 4 locais pelo ranking do satélite, sem estações simuladas.
- Autorizei a instalação dos pacotes, só dentro de `frontend/`.
- Fiz o commit da base pelo GitHub Desktop.


## Front-end 2 — Tabela acessível dos locais (14/11/2026)

**O que eu pedi**
- Fazer primeiro o básico (mapa, funções e botões) e deixar para uma fase própria, depois, o design system (cores, layout, botões e comportamentos).
- Lembrei a IA da regra dos subagentes para as tarefas pesadas.

**O que a IA gerou**
- `python/exportar_front.py`: junta as áreas do OSM, o ranking do satélite e as datas das passagens em `frontend/src/dados/locais.json` (o app importa o JSON pronto, sem rodar Python).
- `frontend/src/lib/formato.js`: números e datas no padrão brasileiro e o NDVI em palavras (pouco verde, verde médio, muito verde).
- `frontend/src/componentes/TabelaLocais.jsx`: a tabela dos 4 locais, com legenda (`caption`), cabeçalhos de coluna e de linha (o leitor de tela anuncia "Parque Harmonia, Piso no verão, 41,5 °C") e rolagem própria no celular, que recebe foco pelo teclado.
- A IA avisou que o satélite mede o **piso**, e não a sensação térmica, então a tabela não leva selo de risco; o selo entra com a E1 ao vivo.
- Verificação: `npm run build` e `npm run lint` sem erros; um subagente conferiu a página no navegador (desktop e celular) e devolveu só o resumo.

**O que eu mudei ou fiz sozinho**
- Decidi a ordem do Front: primeiro o básico (mapa, funções e botões), com estilo simples, e depois uma fase só para o design system.
- Cobrei a regra dos subagentes no meio do passo; por isso a conferência no navegador foi feita por um subagente, que trouxe só o resumo.


## Problema — Estruturação e verificação das fontes (14/11/2026)

**O que eu pedi**
- Perguntei se o projeto resolve um problema de fato ou um problema que só eu acho que existe ("inventar uma lâmpada branca quando já existe LED").
- Pedi para estruturar bem o problema e questionei como um gari se beneficiaria, se ele está trabalhando atrás do caminhão.
- Pesquisei como o calor afeta as pessoas, trouxe um rascunho em Markdown feito com outra IA e depois as fontes com os links.
- Liberei a IA para pesquisar e pedi que investigasse os totens de medição da prefeitura.

**O que a IA gerou**
- Uma estruturação do problema (contexto, públicos, causas, o que já existe e a lacuna, proposta, limites), salva em `docs/problema.md`.
- Uma revisão crítica do meu rascunho: aproveitou a "barreira da permanência", a "fadiga de alerta", a validação de refúgio e as pessoas em situação de rua; apontou que a Temperatura Aparente não serve como gatilho legal de pausa (o índice legal é o IBUTG, da NHO 06 e da NR-15).
- Subagentes de pesquisa abriram cada fonte e trouxeram só o resumo. Resultado: o "3 °C a 12 °C entre bairros" e o "32 de 87 bebedouros" ficaram fora, por falta de fonte; Sarandi e Rubem Berta se confirmaram como os bairros mais quentes na superfície (estudo da UFRGS); a GZH mediu no Largo Glênio Peres (o local da E1) 34 °C no ar e até 54 °C nos ladrilhos.
- Sobre os 16 pontos de medição da prefeitura (10 totens da Defesa Civil e 6 estações de qualidade do ar da Smamus): nenhum fica nos nossos locais de lazer e nenhum calcula a sensação térmica nem dá alerta de calor.

**O que eu mudei ou fiz sozinho**
- Questionei se o problema era real e se o trabalhador de rua se beneficiaria de fato.
- Pesquisei as fontes e achei os links que a primeira verificação não tinha encontrado (UOL, GZH, Matinal, Band RS).
- Em 15/11, decidi:
  - **o público:** o cidadão é o principal, porque o app existe para ele, e a gestão pública usa os dados;
  - **a proteção sem app:** a estação deve avisar o risco, mandar procurar sombra e se hidratar e indicar o refúgio mais perto, sem depender do app (ideia minha);
  - **a frase do problema:** "Porto Alegre já mede o tempo em 16 pontos, mas nenhum diz quanto calor a pessoa sente na praça, nem avisa, nem refresca.";
  - **a IA do rascunho:** foi o Gemini (registrado no `AI.md`).

## Edge — Orientação sem app: conselho e refúgio mais perto no LCD (15/11/2026)

**O que eu pedi**
- Que a própria estação, sem depender do app, mande procurar sombra e se hidratar e indique o lugar mais perto para se refrescar.
- Que o refúgio possa ser também o shopping mais próximo, se ele estiver mais perto que uma praça.
- Que isso fique só no LCD por enquanto; no app, só se sobrar tempo.

**O que a IA gerou**
- `edge/refugio.h`: escolhe o refúgio mais perto que está aberto agora (praça 24 h ou shopping, pela hora e pelo dia da semana do NTP); sem relógio, só indica o que é 24 h.
- Letreiro na linha 2 do LCD (`display.h`): com risco LARANJA ou VERMELHO, alterna as leituras, o conselho (`Beba agua e descanse` / `SAIA DO SOL + AGUA`) e o refúgio (`Va: Praca XV 24m`).
- Lista da E1 no `config.h`, com dados do OpenStreetMap levantados por um subagente: a Praça XV fica a 24 m e ganha sempre; o Rua da Praia Shopping fica a 448 m, com o horário mais curto entre o OSM e o Jornal do Comércio (o site oficial não abriu). Não há bebedouro mapeado a menos de 1 km.
- 12 autotestes novos (117 no total), README do Edge atualizado; `testar.ps1`: 117/117, chip OK, firmware em 75% da flash.

**O que eu mudei ou fiz sozinho**
- A ideia da orientação na própria estação, sem app, e a regra do shopping mais perto.
## Edge, Python e Matemática — Régua de risco da Secretaria de Saúde de POA (15/11/2026)

**O que eu pedi**
- Aumentar a régua de risco: 30,2 °C com 50% de umidade é um dia comum em Porto Alegre e não devia acender o laranja nem mandar a pessoa para o refúgio.
- Trouxe uma tabela com 5 faixas (27/34/40/51 °C) e os efeitos à saúde.

**O que a IA gerou**
- Um subagente achou a fonte da tabela: a **Nota Técnica nº 01/26 da Secretaria Municipal de Saúde de Porto Alegre** (atualizada em 04/02/2026), com 5 cores (verde, amarelo, laranja, vermelho e roxo). Os nomes dos níveis, o "abaixo de 26" e alguns efeitos da minha tabela não estão na nota; ficaram de fora.
- Mostrou que a nota usa o índice de calor na sombra e que a nossa TA inclui o sol (a NOAA diz que o sol pleno soma até 8 °C), e que mudar o 32 mexia também no Python e na Matemática.
- Edge: 5 níveis (27/34/40/52 °C), LED roxo no GPIO 19, `lim:` com 4 valores, field6 com 4 = roxo e 5 = sem dado, conselho `SUSPENDA ATIVIDADES` no roxo; 120/120 autotestes, firmware em 75% da flash.
- Python: os mesmos limites no `sensacao.py` (8/8 testes); semana do INMET: 71 h com sensação ao sol de 34 °C ou mais (eram 80 h com 32 °C).
- Matemática: a dose agora é acima de 34 °C: 91,0 °C·h em 11,8 h (era 116,4 °C·h em 13,7 h); Riemann nos dados: 91,9 °C·h; 9/9 testes; gráficos, README e relatório atualizados.

**O que eu mudei ou fiz sozinho**
- Percebi que a régua estava curta para Porto Alegre e trouxe a tabela.
- Decidi: as 5 faixas da nota técnica, um LED roxo novo, a TA com sol decidindo o nível e refazer o Python e a Matemática com 34 °C.
## Edge — Segundo LCD: medição e orientação separadas (15/11/2026)

**O que eu pedi**
- Colocar uma segunda tela LCD, para ter mais espaço para a leitura.

**O que a IA gerou**
- LCD 1 "Medição" (I2C 0x27): TA e nível, T/UR/vento (ou o problema), luz do sol e Q (novo) e o relé.
- LCD 2 "Orientação" (I2C 0x26, mesmo fio I2C): conselho por nível (segundo a nota técnica da SMS), refúgio mais perto e aberto (do laranja para cima), hora do NTP e WiFi/MQTT. O letreiro que trocava a cada 2 s saiu.
- Sem dado: o LCD 2 mostra `Sem leitura agora` e `Na duvida: sombra`, sem mandar ao refúgio.
- `diagram.json` com o 2º LCD; 126 autotestes (126/126 no PC); firmware compila (75% da flash). Arquivos colocados no Wokwi pelo meu Chrome e projeto salvo.

**O que eu mudei ou fiz sozinho**
- A ideia da segunda tela.
## Front-end 3 — Leitura ao vivo da estação E1 com o selo de risco (15/11/2026)

**O que eu pedi**
- Continuar o projeto, no próximo passo do plano do Front: a E1 ao vivo no app.

**O que a IA gerou**
- `src/lib/risco.js`: a mesma régua da estação (5 faixas da nota técnica da SMS: 27/34/40/52 °C), o aviso de frio abaixo de 9 °C e o field6 → nível (4 = roxo, 5 = sem dado; valor vazio ou estranho vira "sem dado").
- `src/servicos/thingspeak.js`: lê o canal público 3578427 sem chave e pega a entrada mais recente com a sensação térmica (pula as entradas só de comando). Leitura com mais de 2 min não decide: vira "sem dado recente", como no Edge.
- `src/ganchos/useEstacaoE1.js`: busca a cada 15 s (o limite do ThingSpeak grátis), cancela a busca anterior e mantém a última leitura boa se a rede falhar.
- Componentes novos: `IconeRisco` (um formato por nível, para quem não distingue cores), `SeloRisco` (cor + ícone + texto, com o conselho do LCD de Orientação) e `EstacaoAoVivo` (selo, "atualizado há X s", TA, ar, umidade, vento, luz, nebulizador e a fonte). O leitor de tela só anuncia quando o nível muda (`aria-live="polite"`).
- Token novo `--color-risco-roxo`. Texto escuro no amarelo e no laranja, para passar no contraste.
- Um teste rápido da lógica achou um bug antes do commit: `Number(null)` dá 0, e um field6 vazio virava "verde". Corrigido: vazio = sem dado.
- A conferência no navegador (por um subagente, com leituras falsas de laranja, roxo e frio) achou um risco: a região `aria-live` sumia quando não havia leitura, e alguns leitores de tela ignoram uma região recém-criada. Agora ela fica sempre na página.

**O que eu mudei ou fiz sozinho**
- As decisões deste passo são minhas, da sessão 7: ler o ThingSpeak direto, sem servidor, e mostrar a E1 ao vivo.

## Edge — Dashboard do ThingSpeak na régua nova (15/11/2026)

**O que eu pedi**
- Autorizei a IA a atualizar o dashboard do canal pelo meu Chrome.

**O que a IA gerou**
- Medidor da TA (Public View): faixas de 27 a 34 (amarelo), 34 a 40 (laranja), 40 a 52 (vermelho) e uma faixa nova, roxa, de 52 a 65. O azul abaixo de 9 e o verde de 9 a 27 ficaram iguais.
- Widget de risco: o título agora traz a legenda (0 verde, 1 amarelo, 2 laranja, 3 vermelho, 4 roxo, 5 sem dado).
- Conferido depois de recarregar a página: os valores ficaram gravados. README do Edge ajustado.

**O que eu mudei ou fiz sozinho**
- Autorizei a mudança.

## Organização das pastas: Python, Matemática e Front-end (15/11/2026)

**O que eu pedi**
- "Vamos estruturar o código em pastas, ele não está muito estruturado."

**O que a IA gerou**
- Uma proposta, com o que fica e o que muda, antes de mover qualquer arquivo. A raiz fica como está (o PDF exige os arquivos lá). O `edge/` também: o Wokwi não tem pastas, e o `edge/` é um espelho 1:1 do projeto de lá.
- **Python:** `fontes/` (`oficial.py`, `locais.py`, `satelite.py`), `processamento/` (`sensacao.py`, `ranking.py`, `exportar_front.py`) e `testes/`. As duas primeiras viraram pacotes (`__init__.py`), e os imports passaram a ter o nome da pasta (ex.: `from processamento.sensacao import ...`). Os scripts rodam com `python -m processamento.ranking`. Um `pytest.ini` faz o `python -m pytest` achar os testes. O nome `processamento` (e não `analise`) evita confusão com o `matematica/analise.py`, que importa esse código.
- **Matemática:** `testes/` e `relatorio/` (o PDF), com um `pytest.ini` igual e o import do Python ajustado.
- **Front-end:** componentes agrupados por assunto em `componentes/estacao/`, `componentes/risco/` e `componentes/locais/`.
- Os arquivos foram movidos com `git mv`, para o histórico seguir cada arquivo. READMEs do Python, da Matemática e do Front-end atualizados.
- Conferido: 8/8 testes do Python, 9/9 da Matemática, e o `npm run build` e o `npm run lint` do Front passaram. O ranking, o `locais.json`, os gráficos e o `resultados.json` gerados de novo saíram **idênticos** (o Git não viu diferença).

**O que eu mudei ou fiz sozinho**
- Pedi a reorganização e aprovei a proposta.

## Front-end — Mapa dos locais com MapLibre (15/11/2026)

**O que eu pedi**
- "Acho que já dá para nós começarmos a integrar os gráficos e mapas."

**O que a IA gerou**
- `src/lib/geo.js`: transforma o `locais.json` em GeoJSON (as áreas do OpenStreetMap e o ponto de cada local) e calcula o retângulo que enquadra os 4 locais.
- `src/componentes/mapa/Mapa.jsx`: mapa do MapLibre com o estilo gratuito do OpenFreeMap, em camadas: as áreas (preenchimento e contorno), os pontos (a E1, única com equipamento, é maior) e os nomes. As cores vêm dos tokens do `index.css`.
- Acessibilidade: o canvas tem `role="img"` e uma descrição que remete à tabela (`aria-describedby`); os botões e as dicas estão em português; dá para mover e aproximar pelo teclado, com contorno de foco visível; o `cooperativeGestures` evita que o mapa prenda a rolagem da página no celular.
- Desempenho: o mapa é carregado em separado (`React.lazy` + `Suspense`, com "Carregando o mapa…"), porque o MapLibre pesa uns 290 kB comprimido; a leitura da E1 aparece antes.
- A conferência no navegador (por um subagente) achou um erro grave: o mapa ficava em branco, porque o Vite muda o MapLibre de lugar e o "worker" dele não era achado. Corrigido com `setWorkerUrl` e o import `?url`, que valem no dev e no build. Ela também achou o rótulo do Largo cobrindo o Calçadão (a 245 m) e os créditos cobrindo o Marinha no celular: agora os rótulos escolhem uma posição livre, e o enquadramento tem mais folga. Na 2ª conferência, os 4 pontos e os 4 nomes apareceram no PC e no celular, sem erros.

**O que eu mudei ou fiz sozinho**
- Decidi começar pelos mapas e gráficos antes dos estados de carregando e erro. As decisões do mapa (MapLibre + OpenFreeMap, sem chave, E1 ao vivo + os 4 locais) são minhas, da sessão 7.

## Front-end e Edge — Conselho de dia e de noite (16/11/2026)

**O que eu pedi**
- Percebi que, à noite e sem dado, o app manda a pessoa ir para a sombra, o que não faz sentido. Escolhi corrigir no app e na estação.

**O que a IA gerou**
- `frontend/src/lib/sol.js` e `edge/sol.h`: a mesma conta da altura do sol no céu ("Approximate Solar Coordinates", do Observatório Naval dos EUA). Acima do horizonte (−0,833°, por causa da refração) é dia. Conferida com o Open-Meteo: em 16/11/2026, a conta dá o nascer às 05:21 e o pôr às 19:00, e o Open-Meteo dá 05:20 e 18:59; também bateu em 04/02/2025, 21/06 e 21/12.
- Conselhos da noite onde o texto falava de sol ou sombra: amarelo → "lugar ventilado"; vermelho → "lugar fresco" (no LCD, `LUGAR FRESCO + AGUA`); sem dado → "À noite não há sol; se estiver abafado, beba água" (no LCD, `Abafado? Beba agua`). No app, `conselhoDe(nivel, dia)` em `lib/risco.js`, e o `SeloRisco` recebe `dia`.
- Na estação, o período vem do relógio (NTP) + a conta do sol; sem relógio, do LDR (abaixo de 50 lux = noite); sem os dois, dia (o lado seguro). O relógio vence o LDR, porque um poste acenderia o LDR à noite.
- 11 autotestes novos no Edge (137/137 no PC; firmware em 76% da flash). README do Edge atualizado (tabela com a coluna "À noite").

**O que eu mudei ou fiz sozinho**
- Achei o problema e escolhi a solução (app e Edge, pelo sol).

## Python — A área que cada estação representa (16/11/2026)

**O que eu pedi**
- Percebi que o Parque Harmonia e o Marinha do Brasil são grandes demais para um aparelho só medir. Propus: onde é só concreto, o calor se mantém, então a estação vale para a área inteira (mas isso precisa de uma conta da área coberta de concreto); onde é misto (concreto e árvore), o calor muda, e a estação vale para um raio de uns 50 m.

**O que a IA gerou**
- Pesquisa (por um subagente): a fonte do raio (Guia de Instrumentos da OMM, WMO-No. 8, 2008, seção 11.1.1.4: um sensor a ~1,5 m "enxerga" algumas dezenas de metros), a cobertura do solo (ESA WorldCover 2021, no Planetary Computer, sem chave) e o ponto de cada estação (o piso do Harmonia, numa área de paving_stones do OSM; o Marinha, sob as árvores).
- `fontes/cobertura.py`: mede a fração construída de cada local e aplica a minha regra, com o limite de 80% (Largo 91% → local inteiro; calçadão 51%, Harmonia 15% e Marinha 14% → raio de 50 m). Salva `dados/cobertura_solo.csv` e `dados/estacoes.geojson`.
- `fontes/satelite.py` passou a medir essas áreas (com a opção `--refazer`), e o ranking foi refeito: a ordem continua (Harmonia 41,7 °C, Largo 39,5, Marinha 35,9, calçadão 35,6), mas o Marinha sob as árvores caiu 1,8 °C e ficou empatado com o calçadão. O Harmonia passou o Largo nas 6 de 6 passagens.
- 2 testes novos da regra (10/10), README do Python com a tabela da cobertura e as limitações (resolução térmica de 100 m e solo de 2021), `docs/problema.md` e o JSON do Front (`locais.json`, agora com o ponto e a área de cada estação).

**O que eu mudei ou fiz sozinho**
- A ideia e a regra (área inteira para o concreto homogêneo, raio de 50 m para o misto) são minhas.

## Front-end — Mapa ao vivo com painel de detalhes (16/11/2026)

**O que eu pedi**
- Mapa ao vivo inspirado no painel Osiris (osirisai.live), com as 6 ideias que aprovei: anel que pulsa só na estação ao vivo (com o texto "AO VIVO"), a área de cobertura na cor do risco, o clique/Enter na estação abrindo um painel, uma barra de status, números com algarismos de mesma largura e um botão de mapa claro/escuro. Sem a faixa que rola sem parar, sem cinza-escuro sobre preto e sem a marca deles.

**O que a IA gerou**
- `ganchos/useEstacoes.js` + `lib/estacoes.js` + `lib/leitura.js`: o App busca todas as estações com canal numa rodada só, a cada 15 s (`Promise.allSettled`: se uma falhar, as outras seguem). O cartão da E1, o mapa e a barra usam a mesma leitura (antes, a E1 seria buscada 2 vezes). `situacao()` decide "recente" (até 2 min) e o nível, como no Edge.
- `componentes/mapa/MarcadorEstacao.jsx`: cada estação é um `<button>` de verdade dentro de um marcador do MapLibre (com `createPortal`), na ordem E1 → E4 no Tab, com cor + ícone + texto no `aria-label`. O div do marcador leva `role="none"`, porque o MapLibre o marcaria como imagem e esconderia o botão do leitor de tela.
- `componentes/mapa/PainelEstacao.jsx`: um diálogo não modal com o selo, os valores, "atualizado há", a área que a estação representa (a minha regra da cobertura, com os % do WorldCover) e o piso pelo satélite. O foco vai para o título; Esc ou "Fechar" fecham e devolvem o foco ao marcador.
- `Mapa.jsx` refeito: a fonte `cobertura` pintada pela cor do nível (cinza = sem dado), o local inteiro só com contorno tracejado, o rótulo "AO VIVO"/"SEM DADO RECENTE", `flyTo` (0 ms com "menos movimento") e o tema escuro (`setStyle` + as camadas de novo no `style.load`). As cores só mudam quando o nível muda, e não a cada segundo.
- `componentes/comum/Dado.jsx` (saiu de dentro do `EstacaoAoVivo`, com `font-mono tabular-nums`), `componentes/comum/BarraStatus.jsx` (hora de POA, dia/noite, "4 estações · N ao vivo"; o relógio fica fora do `aria-live`) e `ganchos/useAgora.js`.
- Conferência no navegador por um subagente, com leituras falsas: laranja, roxo, leitura velha (10 min), teclado (Tab, Enter, Esc), tema escuro, 375 px e movimento reduzido. Os 8 testes passaram, e ela achou 3 detalhes, corrigidos: no celular, a folga do painel do PC continuava gravada no mapa; a ordem do Tab seguia o ranking; e os % arredondados somavam 101%.

- Limpeza: o `ganchos/useEstacaoE1.js` e o `buscarE1` ficaram sem uso (o `useEstacoes` faz o trabalho dos dois) e foram apagados com o meu ok. O README do Front ganhou a estrutura nova de `src/`.

**O que eu mudei ou fiz sozinho**
- Escolhi as 6 ideias e o que não usar.

## Front-end — Tema escuro na página inteira (16/11/2026)

**O que eu pedi**
- Notei que o botão escurecia só o mapa e pedi o tema escuro na página inteira.

**O que a IA gerou**
- Tokens de cor pelo papel (`fundo`, `superficie`, `superficie-2`, `texto`, `texto-suave`, `borda`, `borda-forte`, `foco`) no `@theme` do `index.css`, com outros valores em `[data-tema="escuro"]`. Todas as cores fixas dos componentes (`bg-white`, `text-gray-700`...) viraram esses tokens, e nenhum componente precisa saber qual tema está ligado.
- `ganchos/useTema.js` e `componentes/comum/BotaoTema.jsx` (no cabeçalho). Primeiro o botão tinha o texto fixo "Tema escuro" + `aria-pressed`. Eu achei confuso continuar escrito "Tema escuro" com a página já escura, então agora o texto diz o que o clique faz ("Tema escuro" ou "Tema claro"), sem `aria-pressed`. Um script no `index.html` aplica o tema antes de a página aparecer: a escolha salva ou, na 1ª visita, o tema do sistema. O mapa troca o estilo base junto com a página, e os rótulos usam os tokens `texto` e `fundo`.
- O contraste foi medido pela fórmula da WCAG. A medida achou um erro antigo: o azul do "Frio: se agasalhe" dava 4,2:1 sobre o branco (o mínimo é 4,5:1) e foi trocado por um que dá 5,0:1. No escuro, o anel de foco e o azul do frio ganharam versões mais claras (8,0:1 e 8,2:1).
- Conferência no navegador por um subagente: a página inteira escura (nenhuma caixa clara sobrando), o tema lembrado depois de recarregar, a 1ª visita seguindo o sistema, o anel de foco visível, o painel escuro e o celular. Ela achou um problema no celular: o Largo e o Calçadão quase se encostam, e o toque numa estação abria a outra. O motivo eram os cantos do quadrado do marcador e o anel que pulsa, que cresce para fora do botão. Agora só o botão redondo recebe o toque, e a estação ao vivo fica por cima.

**O que eu mudei ou fiz sozinho**
- Percebi que o tema escuro valia só para o mapa e pedi a página inteira.

## Edge e Experiência — Vários aparelhos no mesmo parque (16/11/2026)

**O que eu pedi**
- Perguntei se dava para colocar mais aparelhos no mesmo parque, para cobrir uma área maior, com todos mandando os dados por um aparelho só, para não passar de 4 canais e continuar no plano grátis do ThingSpeak.

**O que a IA gerou**
- A explicação da arquitetura de nós sensores + estação principal (gateway), com o rádio ESP-NOW ou LoRa, e 3 caminhos: documentar agora, simular vários DHT22 num ESP32 só ou ligar vários Wokwi por um broker público. A IA recomendou documentar, por causa do prazo.
- Uma seção nova no `edge/README.md` ("Próximo passo: vários aparelhos no mesmo parque"), com o desenho, a regra do pior ponto (a maior TA vai no field5/field6, e o detalhe de cada nó no `status`), a defesa da leitura por nó, a segurança do rádio e o motivo de não estar no Wokwi (as simulações não conversam entre si).
- `docs/requisitos_rascunho.md`, o começo do relatório de Total Experience, com os RNF de cobertura e de escala, as RN de como juntar os nós, o épico no backlog e as notas de hardware real.

**O que eu mudei ou fiz sozinho**
- A ideia de vários aparelhos por local com um canal só é minha. Escolhi documentar agora (opção A) e deixar a simulação para depois.

## Web — Estrutura da API em FastAPI (16/11/2026)

**O que eu pedi**
- Começar o Web com um CRUD num back-end próprio em FastAPI (decisão de 16/11) e aprovei o plano: os campos dos locais de lazer e dos pontos de hidratação, o `sqlite3` do próprio Python (sem SQLAlchemy) e a instalação de 4 pacotes numa `venv` só do back-end.

**O que a IA gerou**
- `backend/.venv` com `fastapi`, `uvicorn`, `pytest` e `httpx` (versões fixadas no `requirements.txt`).
- `app/main.py` (a API, o CORS liberado só para o Vite e a rota `GET /saude`), `app/config.py` (os endereços do CORS, trocáveis pela variável `FORNO_ORIGENS`), 3 testes em `testes/test_saude.py` (a API responde, o Vite é liberado e outro site é bloqueado) e o README com o Quickstart.

**O que eu mudei ou fiz sozinho**
- Aprovei os campos e a instalação.

## Web — Banco SQLite e dados iniciais (16/11/2026)

**O que eu pedi**
- Seguir para o banco, depois do commit da estrutura.

**O que a IA gerou**
- `app/banco.py`: as tabelas `locais` e `hidratacao` (com `CHECK` nos tipos e nos sim/não), as atividades guardadas como lista em JSON e os dados iniciais. São os 4 locais das estações, a Praça XV e o Rua da Praia Shopping, com as coordenadas do OSM achadas por um subagente. Ele também conferiu que os 24 m e os 448 m do `config.h` são medidos até a borda de cada lugar. Os dados iniciais só entram com a tabela vazia.
- `main.py` prepara o banco quando a API sobe (`lifespan`). O `conftest.py` faz cada teste usar um banco temporário, e o `test_banco.py` tem 5 testes.

**O que eu mudei ou fiz sozinho**
- Commitei a estrutura antes deste passo.

## Web — CRUD dos locais de lazer, com validação e erros em português (16/11/2026)

**O que eu pedi**
- Seguir para o CRUD depois do commit do banco. Antes, perguntei se a API de rota a pé que eu sugeri podia fazer as vezes do CRUD. A IA explicou que não: a API de rota só lê, sem criar, editar nem apagar. Mas ela soma como consumo de API externa. Decidi que a rota a pé até o ponto de hidratação entra na fase da recomendação.

**O que a IA gerou**
- `app/modelos.py`: os modelos do Pydantic, com nome de 3 a 80 caracteres sem os espaços das pontas, tipo e atividades só da lista, pelo menos 1 atividade (as repetidas são juntadas), lat/lon dentro da caixa de Porto Alegre e observação vazia virando nenhuma.
- `app/erros.py`: os erros 422 traduzidos para português, campo por campo (inclusive "Fora de Porto Alegre" para lat/lon trocadas), e o 500 com uma frase simples, deixando o detalhe técnico só no log. Todo erro sai no mesmo formato (`detail` + `erros`).
- `app/rotas/locais.py`: o `GET` da lista e de um local, o `POST` (201), o `PUT` (200) e o `DELETE` (204), com 404 em português para id que não existe. Os valores vão no SQL pelos `?`, e cada gravação fica num `with conexao` (confirma no fim ou desfaz se der erro). O `banco.py` ganhou a `obter_conexao`, que abre o banco por requisição e sempre fecha.
- `testes/test_locais.py`: 12 testes (o caminho feliz completo, a limpeza dos dados, o 404 nos 3 métodos, os campos obrigatórios, lat/lon trocadas, as mensagens de cada erro, a posição da atividade errada, o JSON quebrado e o `PUT` inválido sem mudar nada).

**O que eu mudei ou fiz sozinho**
- A ideia da rota a pé até o ponto de hidratação é minha.

## Web — CRUD dos pontos de hidratação (16/11/2026)

**O que eu pedi**
- Seguir para a hidratação, depois de testar o CRUD dos locais no `/docs` e de commitar.

**O que a IA gerou**
- `HidratacaoEntrada` e `Hidratacao` no `app/modelos.py`. Os horários vêm em `HH:MM` (de 00:00 a 23:59), e o horário vazio vira "aberto 24 h". As regras: os dois horários juntos ou nenhum, e o de fechar depois do de abrir. O `info.data` dá à regra de `fecha` o valor de `abre`, e um erro no `abre` não repete a bronca no `fecha`. O `ativo` é verdadeiro se não vier. O `erros.py` ganhou a tradução do formato de horário.
- `app/rotas/hidratacao.py`, no mesmo molde dos locais, com o filtro `?so_ativos=true` para a recomendação não mandar ninguém a um bebedouro desativado.
- `testes/test_hidratacao.py`: 16 testes (36 no total).

**O que eu mudei ou fiz sozinho**
- Testei o CRUD dos locais pelo `/docs` (o 422 com um nome de 2 letras e o 201 com um nome válido).

## Web — Caça a erros na API e correções (16/11/2026)

**O que eu pedi**
- Testar as portas e as rotas para tentar achar um erro, por um subagente se fosse maçante.

**O que a IA gerou**
- Um subagente subiu a API numa porta própria (8021), com um banco temporário, e mandou cerca de 180 requisições para tentar quebrá-la. Ele achou 5 problemas:
  1. um id gigante derrubava a rota com um 500 em texto e sem CORS;
  2. os 404 e 405 do FastAPI vinham em inglês;
  3. o JSON quebrado mostrava o campo "13";
  4. um nome feito de caracteres invisíveis passava;
  5. o Pydantic convertia `"yes"` em verdadeiro e `true` em 1.0 na latitude.
- As correções:
  - `IdDoBanco` (`rotas/__init__.py`), com ids de 1 a 2^63 − 1;
  - o `erros.py` reescrito, com um formato único (`detail` + `erros`, sempre), os 404/405 em português, o campo "corpo" no JSON quebrado e uma rede de segurança para erros inesperados como middleware, para o 500 sair com CORS;
  - o modo `strict` e a regra do nome visível no `modelos.py`;
  - a ordem do CORS no `main.py`.
- `testes/test_robustez.py`: um teste para cada achado, que falhava antes da correção. São 80 testes no total.

**O que eu mudei ou fiz sozinho**
- A ideia de testar a API tentando quebrá-la foi minha.

## Web — Cliente da API no front (16/11/2026)

**O que eu pedi**
- Começar as telas do Web pelo cliente que conversa com a nossa API.

**O que a IA gerou**
- `frontend/src/servicos/api.js`, no mesmo molde do `thingspeak.js`:
  - `api.locais` e `api.hidratacao`, cada um com `listar`, `mostrar`, `criar`, `substituir` e `apagar`, e `api.saude`;
  - o erro próprio `ErroApi` (a frase em `message`, mais o `status` e a lista `erros`), lido do formato único da API;
  - a API desligada vira "A API está fora do ar. Ligue o back-end e tente de novo." (status 0), e a falta de resposta em 10 s vira um aviso de demora;
  - o 204 do DELETE devolve `null` (sem tentar ler um JSON que não existe), e o cancelamento pelo `signal` é repassado para a tela ignorar;
  - `errosPorCampo`, que transforma a lista do 422 em `{campo: mensagem}` para o formulário;
  - o endereço vem do `VITE_API_URL`, com o padrão `http://127.0.0.1:8000`, e o modelo está em `frontend/.env.example`.
- Um teste em Node contra a API de verdade (porta 8011, banco temporário): 11/11, cobrindo o CRUD inteiro, o 404, o 422 por campo, o filtro `so_ativos`, o cancelamento e a API desligada. O lint e o build passaram.

**O que eu mudei ou fiz sozinho**
- Confirmei que o Front e o Web podem ficar no mesmo repositório, que os commits de várias partes contam e que a nossa API vale como API externa.

## Web — Lista de locais na seção Cadastro (17/11/2026)

**O que eu pedi**
- Seguir para as telas do Web; escolhi pôr o Cadastro numa seção da própria página (sem roteador).

**O que a IA gerou**
- `ganchos/useLista.js`: busca a lista na API e guarda os estados (carregando, erro e itens; `null` = "ainda não sei", `[]` = "não tem nenhum"), com "Tentar de novo" e cancelamento quando a tela sai.
- `componentes/comum/EstadoCarregando.jsx` (`role="status"`, rodinha que para com movimento reduzido) e `componentes/comum/MensagemErro.jsx` (`role="alert"`, ícone + texto, botão "Tentar de novo"; serve também para a recomendação).
- `componentes/cadastro/ListaLocais.jsx` (cartões numa lista `<ul>`, cada um com o nome em `<h4>`, sombra e bebedouro com ✓/✕ + texto e as atividades em português) e `componentes/cadastro/SecaoCadastro.jsx` (escolhe a tela pelo estado; se a lista já apareceu e a atualização falhar, a lista fica e o erro aparece em cima).
- `lib/cadastro.js`: os valores da API e o texto em português de cada um.
- O teste no navegador (subagente) passou nos 7 itens: os 4 estados, o teclado, os 2 temas, o celular e o console.

**O que eu mudei ou fiz sozinho**
- Escolhi a seção na página em vez de abas.

## Web — Correção: erro 500 com requisições ao mesmo tempo (17/11/2026)

**O que eu pedi**
- Corrigir o bug que o teste da lista achou (eu já desconfiava de um bug nas rotas e requisições).

**O que a IA gerou**
- O diagnóstico: o FastAPI abre a conexão do SQLite numa thread (a dependência `obter_conexao`) e a usa ou fecha em outra (a rota), e o `sqlite3` recusa isso por padrão. Com uma requisição por vez quase nunca acontece; com várias ao mesmo tempo, 35 de 40 davam 500. A caça a erros anterior mandava as requisições uma de cada vez, por isso não pegou.
- A correção: `check_same_thread=False` no `conectar()` (`backend/app/banco.py`). É seguro porque cada requisição tem a sua conexão, e só uma thread por vez mexe nela.
- O teste `test_requisicoes_ao_mesmo_tempo_nao_dao_500` (40 GETs em paralelo), que falhava antes e passa depois. São 81 testes.

**O que eu mudei ou fiz sozinho**
- Autorizei a correção. A desconfiança de que havia um bug nas rotas e requisições foi minha.

## Web — Formulário de adicionar local (17/11/2026)

**O que eu pedi**
- Seguir para o próximo passo combinado do Web: o formulário de criar local.

**O que a IA gerou**
- `componentes/cadastro/FormularioLocal.jsx`: o formulário "Novo local de lazer" (nome, tipo, latitude, longitude, sombra, bebedouro, atividades e observação). Quem valida é a API: o 422 vira um erro embaixo de cada campo (pelo `errosPorCampo`), e o foco vai ao 1º campo com erro, só logo depois do envio. Corrigir um campo apaga o erro dele. Os outros erros (API fora do ar, 500) aparecem numa caixa no topo do formulário.
- Uma trava com `useRef` contra 2 cliques rápidos (o estado do React só muda na renderização seguinte) e o cancelamento da requisição se o formulário fechar.
- Os campos reutilizáveis em `componentes/comum/`: `CampoTexto` (texto ou `textarea`), `CampoEscolha` (`select` com "Escolha…"), `CampoOpcoes` (caixas de marcar num `fieldset` que viram uma lista) e `ErroDoCampo`, mais o `lib/formulario.js` (ids e `aria-describedby`). Todo campo tem `label`, `aria-invalid` e `aria-describedby` com a ajuda e o erro.
- `lib/cadastro.js`: `LOCAL_VAZIO`, `numeroDoCampo` (aceita vírgula: "-30,03" → -30.03) e `localParaApi` (campo vazio não vai no JSON, para a API responder "Campo obrigatório").
- `SecaoCadastro.jsx`: o botão "+ Adicionar local". Ao salvar, a lista é recarregada; ao salvar ou cancelar, o foco volta ao botão.
- O token `--color-erro` no `index.css` (claro #c92a2a, 5,46:1; escuro #ff8787, 6,96:1): o vermelho dos LEDs daria só 2,96:1 no escuro. O botão "Salvar local" usa `bg-foco text-fundo` (4,99:1 e 8,0:1).
- O teste no navegador (subagente, API e front em portas próprias) passou em 11 itens: abrir, erros por campo, foco, vírgula, salvar, cancelar, API desligada, teclado, tema escuro a 375 px e console. Ele achou 2 pontos, corrigidos e conferidos num reteste: 2 cliques no mesmo instante criavam 2 locais (agora a trava é um `ref`), e as caixas de "Bom para" não apontavam para a mensagem de erro (o NVDA pode não ler a do `fieldset`).

**O que eu mudei ou fiz sozinho**
- Pedi para seguir com o passo do formulário.

## Web — Editar, apagar, avisos, hidratação e validação no navegador (17/11/2026)

**O que eu pedi**
- Fazer, na ordem, os 6 passos que faltavam no cadastro: editar local, apagar com confirmação, aviso com `aria-live` (corrigindo o foco do "Tentar de novo"), lista da hidratação com abas, formulário da hidratação (horários e "24 h") e a validação no navegador igual à do servidor. Pedi para não se preocupar com a quantidade de commits.

**O que a IA gerou**
- `ganchos/useFormulario.js`: a lógica comum aos 2 formulários (valores, erros por campo, foco no 1º erro, trava contra 2 cliques, cancelamento), tirada de dentro do `FormularioLocal`.
- **Editar:** o `FormularioLocal` recebe o `item` e serve para criar (`POST`) e editar (`PUT`), já preenchido (`localParaFormulario`, com a vírgula na latitude).
- **Apagar:** `comum/ConfirmarApagar.jsx`, um `<dialog>` nativo com `showModal()` (o resto da página fica inerte e o Esc fecha), com o nome do item, "Isso não pode ser desfeito" e o foco começando no "Cancelar". O 404 (alguém já apagou) conta como apagado. Token novo `--color-veu` para o fundo escurecido.
- **Avisos e foco:** `comum/Aviso.jsx` (região `role="status"` sempre montada; só o texto fica dentro dela). Depois de salvar, o foco volta ao botão que abriu o formulário; depois de apagar, vai ao título da lista; no "Tentar de novo", vai ao título antes do botão sumir (era a pendência do foco no `body`).
- **Hidratação:** `cadastro/PainelCadastro.jsx` (a "máquina" do CRUD, a mesma para os locais e a hidratação), `comum/Abas.jsx` (padrão de abas da WAI-ARIA: setas, Home e End), `cadastro/ListaHidratacao.jsx` (horário, domingo e ativo) e `cadastro/FormularioHidratacao.jsx` ("Aberto 24 h" marcado esconde os horários; os campos são `type="time"`).
- Peças comuns: `AcoesDoItem` (Editar/Apagar com o nome do item para o leitor de tela), `BotoesFormulario`, `CampoMarcar` e `SimNao`.
- **Validação no navegador:** `lib/validacao.js` (`validarLocal` e `validarHidratacao`), com as mesmas regras e frases da API, na mesma ordem. Uma regra a mais, de propósito: desmarcar "Aberto 24 h" e deixar os 2 horários vazios dá erro (para a API, seria 24 h sem ninguém perceber).
- Os RF, RNF e RN do cadastro no `docs/requisitos_rascunho.md`.
- **Testes:** um script em Node mandou 29 formulários ao `validacao.js` e à API rodando: 28 deram os mesmos campos e frases, e o único diferente é a regra a mais. No navegador (subagente), os 12 itens passaram: validação sem ir à API, criar, editar, cancelar, apagar (Esc, Tab preso na caixa, fundo escuro), "Tentar de novo", abas, hidratação, tema escuro a 375 px e console.

**O que eu mudei ou fiz sozinho**
- Escolhi a ordem dos 6 passos e pedi para fazê-los em sequência.
