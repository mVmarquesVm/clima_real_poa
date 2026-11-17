# Rascunho de requisitos (base do relatório de Total Experience)

> Rascunho de trabalho: aqui vamos anotando, parte por parte, o que vira requisito no relatório final (18/11).
> O problema, o público e as fontes estão em [problema.md](problema.md).
> Legenda: **RF** = requisito funcional (o que o sistema faz) · **RNF** = requisito não funcional (como ele deve ser: desempenho, segurança, escala...) · **RN** = regra de negócio (a regra do domínio que o sistema segue).

## Escala e cobertura

### RNF — Cobertura de cada local
- **RNF-COB-1:** cada estação declara a área que representa: o local inteiro, quando ele é 80% ou mais construído, ou um raio de 50 m, quando ele é misto (WMO-No. 8, seção 11.1.1.4). *Já feito:* `python/fontes/cobertura.py` e o mapa do Front.
- **RNF-COB-2 (futuro):** um local grande pode ter vários nós sensores, que mandam a leitura por rádio (ESP-NOW ou LoRa) para uma estação principal. Só a principal publica na nuvem, e o número de canais e de mensagens não cresce com os nós.
- **RNF-COB-3 (futuro):** o rádio entre os nós e a principal é criptografado, e só os nós cadastrados são aceitos.

### RN — Como juntar vários nós
- **RN-COB-1 (futuro):** o nível de risco do local é o do **pior ponto** (a maior TA entre os nós válidos). Na dúvida, o sistema protege, como já faz com o vento e a luz.
- **RN-COB-2 (futuro):** a leitura de um nó com mais de 2 min, ou em falha, não entra na conta. Se todos os nós falharem, o local fica "sem dado".

### RNF — Limites do plano grátis e o caminho para crescer
- **RNF-ESC-1:** o ThingSpeak grátis tem 4 canais e cerca de 8.200 mensagens por dia. Hoje: 1 canal por local, 1 mensagem a cada 20 s na demonstração (numa estação real, 1 por minuto basta).
- **RNF-ESC-2 (futuro):** para mais de 4 locais, trocar por um broker MQTT próprio e um banco de séries temporais atrás da API (FastAPI).
- **RNF-ESC-3 (futuro):** o app lê o ThingSpeak direto, o que não escala com muitas pessoas usando. O próximo passo é um servidor com cache entre os dois.

## Cadastro (Web: API em `backend/` + telas em `frontend/src/componentes/cadastro/`)

### RF — O que o cadastro faz
- **RF-CAD-1:** listar, criar, editar e apagar **locais de lazer** (nome, tipo, latitude, longitude, sombra, bebedouro, atividades e observação).
- **RF-CAD-2:** listar, criar, editar e apagar **pontos de hidratação** (nome, tipo, latitude, longitude, horário de abrir e de fechar ou "aberto 24 h", se abre no domingo e se está ativo).
- **RF-CAD-3:** listar só os pontos ativos (`GET /hidratacao?so_ativos=true`), para a recomendação não mandar a pessoa a um bebedouro quebrado.
- **RF-CAD-4:** pedir confirmação antes de apagar, com o nome do item e o aviso de que não dá para desfazer.
- **RF-CAD-5:** avisar o resultado de cada ação ("Local X salvo/atualizado/apagado") e mostrar cada erro embaixo do seu campo.
- **RF-CAD-6:** `GET /saude`, para o app saber se a API está no ar.

### RNF — Como o cadastro deve ser
- **RNF-CAD-1 (estados):** toda tela de dados mostra os 4 estados: carregando, erro (com "Tentar de novo"), vazio e a lista. Se a lista já apareceu e uma atualização falhar, ela continua na tela com o erro em cima.
- **RNF-CAD-2 (validação em 2 camadas):** o navegador confere antes de enviar (`lib/validacao.js`), com as mesmas regras e frases da API; a API confere de novo, porque é a regra de verdade. Conferido por um teste que manda 29 formulários aos dois: 28 iguais, mais 1 regra a mais de propósito no navegador.
- **RNF-CAD-3 (erros):** um formato único de erro em português (`{"detail", "erros": [{campo, mensagem}]}`); o 500 não mostra detalhes internos; todo erro leva o cabeçalho do CORS; a API desligada e a demora de mais de 10 s viram mensagens claras.
- **RNF-CAD-4 (acessibilidade):** `label` em todo campo; o erro ligado ao campo (`aria-invalid` + `aria-describedby`); o foco no 1º campo com erro; o aviso numa região `role="status"`; a confirmação num `<dialog>` modal que fecha com Esc; as abas no padrão da WAI-ARIA; o foco nunca cai no `<body>` depois de salvar, apagar ou tentar de novo; contraste medido de 4,5:1 ou mais nos 2 temas.
- **RNF-CAD-5 (robustez):** 2 cliques rápidos não criam 2 itens; fechar o formulário cancela a requisição; requisições ao mesmo tempo não dão erro (teste com 40 em paralelo).
- **RNF-CAD-6 (segurança):** a API aceita só os tipos certos (`strict`), ids de até 2^63 − 1, nomes com 3 letras visíveis e sem caracteres de controle; o CORS aceita só a origem do app.

### RN — Regras do cadastro
- **RN-CAD-1:** a latitude e a longitude ficam dentro de Porto Alegre (lat −30,27 a −29,93; lon −51,31 a −51,01). Ponto fora disso é erro de digitação (lat e lon trocadas, sinal esquecido).
- **RN-CAD-2:** os dois horários vazios = aberto 24 h; um só não vale; o de fechar vem depois do de abrir; não aceita horário que vira a noite. No formulário, desmarcar "Aberto 24 h" obriga a preencher os dois.
- **RN-CAD-3:** um local tem pelo menos 1 atividade (é por ela que a recomendação filtra).
- **RN-CAD-4:** um ponto desativado continua no cadastro, mas a recomendação não o usa.
- **RN-CAD-5:** os dados iniciais (sombra, bebedouro, atividades) são estimativa nossa, e a observação de cada um diz isso.

## Backlog: épicos
- **Épico — Cadastro (Web):** CRUD de locais e de pontos de hidratação, com estados, validação e acessibilidade (RF-CAD-1 a 6). *Feito em 16–17/11.* **Futuro:** login para quem edita (hoje qualquer pessoa com o app pode editar), escolher o ponto clicando no mapa e um histórico de mudanças.
- **Épico — Cobertura de parques grandes (futuro):** nós sensores com bateria + estação principal (gateway); o pior ponto no field5/field6 e o detalhe por nó no `status`; o mapa pinta um círculo de 50 m por nó funcionando. Detalhes no [README do Edge](../edge/README.md), na seção "Próximo passo: vários aparelhos no mesmo parque".

## Hardware real (anotar no relatório)
- Abrigo contra o sol e calibração do DHT22; o LDR não é um medidor de radiação (é uma aproximação).
- O nebulizador precisa de água e de limpeza (risco de *Legionella*), além de energia e de proteção contra vandalismo.
- Conexão fora do WiFi: LoRaWAN ou 4G.
