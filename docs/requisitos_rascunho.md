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
- **RF-CAD-7:** marcar onde fica o local sem digitar coordenadas: pelo **CEP + número** (ViaCEP → Nominatim) ou com **um toque no mini mapa**; a latitude e a longitude são preenchidas sozinhas e continuam editáveis.

### RNF — Como o cadastro deve ser
- **RNF-CAD-1 (estados):** toda tela de dados mostra os 4 estados: carregando, erro (com "Tentar de novo"), vazio e a lista. Se a lista já apareceu e uma atualização falhar, ela continua na tela com o erro em cima.
- **RNF-CAD-2 (validação em 2 camadas):** o navegador confere antes de enviar (`lib/validacao.js`), com as mesmas regras e frases da API; a API confere de novo, porque é a regra de verdade. Conferido por um teste que manda 29 formulários aos dois: 28 iguais, mais 1 regra a mais de propósito no navegador.
- **RNF-CAD-3 (erros):** um formato único de erro em português (`{"detail", "erros": [{campo, mensagem}]}`); o 500 não mostra detalhes internos; todo erro leva o cabeçalho do CORS; a API desligada e a demora de mais de 10 s viram mensagens claras.
- **RNF-CAD-4 (acessibilidade):** `label` em todo campo; o erro ligado ao campo (`aria-invalid` + `aria-describedby`); o foco no 1º campo com erro; o aviso numa região `role="status"`; a confirmação num `<dialog>` modal que fecha com Esc; as abas no padrão da WAI-ARIA; o foco nunca cai no `<body>` depois de salvar, apagar ou tentar de novo; contraste medido de 4,5:1 ou mais nos 2 temas.
- **RNF-CAD-5 (robustez):** 2 cliques rápidos não criam 2 itens; fechar o formulário cancela a requisição; requisições ao mesmo tempo não dão erro (teste com 40 em paralelo).
- **RNF-CAD-7 (serviços de endereço):** o CEP e o endereço do LOCAL só vão ao ViaCEP e ao Nominatim no clique em "Buscar endereço" (a regra do Nominatim: no máximo 1 busca por segundo e nada de busca automática); Enter no CEP busca, e não envia o formulário.
- **RNF-CAD-6 (segurança):** a API aceita só os tipos certos (`strict`), ids de até 2^63 − 1, nomes com 3 letras visíveis e sem caracteres de controle; o CORS aceita só a origem do app.

### RN — Regras do cadastro
- **RN-CAD-1:** a latitude e a longitude ficam dentro de Porto Alegre (lat −30,27 a −29,93; lon −51,31 a −51,01). Ponto fora disso é erro de digitação (lat e lon trocadas, sinal esquecido).
- **RN-CAD-2:** os dois horários vazios = aberto 24 h; um só não vale; o de fechar vem depois do de abrir; não aceita horário que vira a noite. No formulário, desmarcar "Aberto 24 h" obriga a preencher os dois.
- **RN-CAD-3:** um local tem pelo menos 1 atividade (é por ela que a recomendação filtra).
- **RN-CAD-4:** um ponto desativado continua no cadastro, mas a recomendação não o usa.
- **RN-CAD-6:** o CEP precisa ter 8 números e ser de Porto Alegre (o ViaCEP diz a cidade); a busca no mapa fica só dentro de Porto Alegre. Sem o número, o ponto cai no meio da rua, e a tela pede para a pessoa tocar no ponto certo.
- **RN-CAD-5:** os dados iniciais (sombra, bebedouro, atividades) são estimativa nossa, e a observação de cada um diz isso.

## Recomendação "Onde e quando ir" (Front: `frontend/src/componentes/recomendacao/` e `previsao/`)

### RF — O que a recomendação faz
- **RF-REC-1:** a pessoa escolhe a atividade (levar criança, caminhada, corrida, pedal, piquenique).
- **RF-REC-2:** mostrar a resposta primeiro, em letra grande ("Melhor horário para caminhada: hoje, das 7h às 10h"), e uma régua de horas com ✓ "Pode ir" / ✕ "Evite" para a atividade (pedido do Matheus em 17/11: "para quem é velho, não pode ter excesso de informação"). O gráfico (ao sol e na sombra, com as faixas e o limite), a tabela e a legenda das cores em palavras ficam em "Ver a previsão em detalhes".
- **RF-REC-3:** dizer se AGORA é uma boa hora e listar as janelas boas de hoje e de amanhã (das 6h às 22h); sem nenhuma, dizer a hora menos quente.
- **RF-REC-4:** recomendar o local do cadastro que serve para a atividade e listar até 3 outras opções.
- **RF-REC-5:** "Perto de mim": usar a localização do navegador (só no clique) para ordenar pela distância.
- **RF-REC-6:** indicar o ponto de hidratação ativo e aberto mais perto do local, na hora da visita, e traçar a rota a pé do local até ele no mapa.
- **RF-REC-7:** traçar a rota a pé de onde a pessoa está **até o local recomendado** (com a localização ligada).

### Página e métricas (Front)
- **RF-PAG-1:** a página segue a ordem do uso: planejar o passeio (3 passos numerados) → o calor agora nas 4 estações (cartões curtos + mapa) → cadastro → métricas; um menu no topo leva a cada seção e move o foco para o título dela.
- **RF-PAG-2:** cada estação aparece num cartão curto: nome, nível (cor + ícone + texto + conselho) e sensação térmica; os outros valores ficam no painel do mapa.
- **RNF-PAG-1 (idosos):** letra base de 18 px e um botão "A+ Letra maior" (21 px) lembrado no aparelho; nenhum texto menor que 15,75 px; termos técnicos e fontes só no rodapé "Sobre os dados"; cadastro e métricas numa "Área da gestão" fechada; com as estações desligadas, um aviso só (pedido do Matheus em 17/11: "tira excesso de informações").
- **RF-MET-1:** baixar o ranking do satélite em CSV (posição, local, piso médio e máximo, piso acima do ar, NDVI, cobertura do solo e o ponto da estação), feito no próprio navegador.
- **RNF-MET-1:** o CSV abre certo no Excel em português (`;`, vírgula decimal, BOM para os acentos) e não deixa uma célula virar fórmula (texto que começa com `=`, `+`, `-` ou `@` ganha um `'` na frente).

### RNF — Como a recomendação deve ser
- **RNF-REC-1 (mesma régua):** a previsão usa a MESMA fórmula da estação e do Python (`lib/sensacao.js`), conferida com o Python em 3 casos (os mesmos números até a 4ª casa).
- **RNF-REC-2 (acessibilidade):** o gráfico tem `role="img"` com um resumo em frase e uma tabela com todos os números; o nível vai em ícone + texto; as atividades são botões de rádio de verdade (setas do teclado); os resultados da localização e da rota são anunciados numa região `role="status"`.
- **RNF-REC-3 (privacidade):** a localização só é pedida no clique, fica só na página e não vai para a nossa API; a rota avisa antes que a origem e o destino vão para a FOSSGIS.
- **RNF-REC-4 (degradação):** sem previsão, a seção mostra o erro com "Tentar de novo"; sem a API, o "Onde ir" mostra o erro e o "Quando ir" continua funcionando; sem o serviço de rotas, a linha reta e um link para o OpenStreetMap.
- **RNF-REC-5 (peso):** o ECharts entra só com os módulos usados e é baixado só quando a pessoa abre os detalhes da previsão.

### RN — Regras da recomendação (sem IA)
- **RN-REC-1:** limite de sensação por atividade: levar criança e corrida < 27 °C (só verde); caminhada, pedal e piquenique < 34 °C (até o amarelo). Base: a régua da SMS e as categorias da NOAA, que já no 1º nível citam o esforço físico.
- **RN-REC-2:** decide a TA AO SOL (o pior caso); a da sombra aparece só para comparar.
- **RN-REC-3:** a previsão é igual para os locais do Centro (modelo em grade), então a ordem dos locais é: com sombra → mais perto → com bebedouro → nome.
- **RN-REC-4:** um ponto de hidratação só conta se estiver ativo e aberto na hora da visita (horário, e domingo só se `abre_domingo`).

## Orientação na estação, sem app (Edge: `edge/display.h`, `refugio.h`, `botao.h`)
Base: entrevista com um usuário do grupo sensível ao calor (`docs/entrevista.md`, 17/11/2026).

- **RF-EST-1:** do laranja para cima, o visor indica para onde ir: o nome do refúgio por extenso, com acento, e a distância.
- **RF-EST-2:** um botão físico de manutenção desliga o nebulizador por um tempo limitado.
- **RNF-EST-1:** o aviso aparece na rua, sem depender de celular (o entrevistado não usaria o app; a avó dele, idosa, precisa ver a informação no local).
- **RNF-EST-2:** o visor mostra ç e acentos (8 letras desenhadas no LCD) e não usa abreviações como "Pc".
- **RN-EST-1:** do laranja para cima, o refúgio refrigerado (shopping) **aberto** ganha da sombra, mesmo mais longe. Fechado ou sem relógio, vale o refúgio aberto mais perto. Motivo: com 35 °C de sensação, o entrevistado sente tontura em 15 min e prefere o ar-condicionado "não importa a distância".
- **RN-EST-2:** o visor só indica refúgio aberto agora (hora e dia da semana); por isso não mostra horário ("se está indicando, é porque está aberto").
- **RN-EST-3:** a manutenção pelo botão vence até o comando remoto `rele:on` e acaba sozinha (2 min no Wokwi, 30 min numa estação real).

## Backlog: épicos
- **Épico — Recomendação "onde e quando ir" (Front):** RF-REC-1 a 7. *Feito em 17/11; a régua de horas e a rota até o local também em 17/11.* **Futuro:** usar a leitura ao vivo de cada estação quando os 4 canais existirem; recomendar em linguagem natural com IA.
- **Épico — Cadastro (Web):** CRUD de locais e de pontos de hidratação, com estados, validação e acessibilidade (RF-CAD-1 a 6). *Feito em 16–17/11.* *CEP + número e toque no mapa: feitos em 17/11 (RF-CAD-7).* **Futuro:** login para quem edita (hoje qualquer pessoa com o app pode editar) e um histórico de mudanças.
- **Épico — Cobertura de parques grandes (futuro):** nós sensores com bateria + estação principal (gateway); o pior ponto no field5/field6 e o detalhe por nó no `status`; o mapa pinta um círculo de 50 m por nó funcionando. Detalhes no [README do Edge](../edge/README.md), na seção "Próximo passo: vários aparelhos no mesmo parque".

## Hardware real (anotar no relatório)
- Abrigo contra o sol e calibração do DHT22; o LDR não é um medidor de radiação (é uma aproximação).
- O nebulizador precisa de água e de limpeza (risco de *Legionella*), além de energia e de proteção contra vandalismo.
- Conexão fora do WiFi: LoRaWAN ou 4G.
