# Edge — Estação Forno Alegre (ESP32 no Wokwi)

> Ficha da CitizenTech: ver o [README principal](../README.md).

**Disciplina:** Edge Computing & Computer Systems

## O que esta estação faz (até agora)
- A cada **2 s**, com `millis()` e sem travar o programa, lê:
  - o **DHT22** (temperatura e umidade);
  - o **anemômetro** (vento), um chip customizado do Wokwi que imita o anemômetro de conchas da SparkFun;
  - o **LDR** (luz do sol), como aproximação da radiação solar.
- Calcula a **Temperatura Aparente de Steadman** completa, a sensação térmica real com umidade, vento e sol.
- **Watchdog do programa:** se o `loop()` travar por mais de 8 s, o ESP32 reinicia sozinho e, no boot, mostra o motivo.
- **Defesa da leitura** em 3 barreiras: faixa física do sensor, filtro de salto e contador de falhas seguidas.
- **Vigia do sensor:** detecta sensor em falha, instável ou travado, tenta consertá-lo em escada e **avisa**.
- **Autoteste no boot:** 137 testes das fórmulas, das conversões, das defesas, do vigia, do risco, do relé, do display, do dia e da noite, da reconexão e dos comandos da nuvem, rodando no próprio ESP32. Se algum falhar, entra em **modo seguro**.
- **LEDs de risco** (verde, amarelo, laranja, vermelho e roxo), nas 5 faixas da nota técnica da Secretaria Municipal de Saúde de Porto Alegre, com limites configuráveis e histerese.
- **Relé do nebulizador**, decidido no próprio ESP32: liga só com risco alto **seguido**, desliga com folga (histerese), respeita tempo mínimo desligado e máximo ligado, e **desliga na hora** se o dado não for confiável.
- **2 LCDs 20x4 (I2C):** o LCD 1 (medição) mostra a sensação, o nível de risco, as leituras (ou o problema), o sol e o status do relé; o LCD 2 (orientação) mostra o conselho do nível, o refúgio mais perto que esteja aberto, a hora e o status WiFi/MQTT, sem depender de app.
- **Nuvem (ThingSpeak):** publica por **MQTT** a cada 20 s, reconecta o WiFi e o MQTT com **espera crescente** sem travar o `loop()`, e recebe **comandos remotos** pelo field8 (limites de risco e ligar/desligar o relé), com validação completa.

## A sensação térmica: Temperatura Aparente de Steadman
```
TA = T + 0,348·e − 0,70·v + 0,70·Q/(v + 10) − 4,25
```
| Símbolo | O que é | De onde vem |
|---|---|---|
| `T` | temperatura do ar (°C) | DHT22 |
| `e` | pressão de vapor (hPa), calculada de T e da umidade | DHT22 |
| `v` | vento (m/s) | anemômetro |
| `Q` | radiação do sol absorvida pelo corpo (W/m²) | LDR, **por aproximação** (ver abaixo) |

O vento aparece **dividindo** o termo do sol: ele leva embora parte do calor que o corpo absorve. Exemplo para 30 °C e 50%: na sombra e sem vento, a TA é 33,1 °C; com sol forte (Q = 100), sobe para 40,1 °C.

Com Q = 0, a fórmula completa fica a menos de 0,2 °C da versão de sombra (`T + 0,33·e − 0,70·v − 4,00`), menos que o erro do DHT22 (±0,5 °C). Por isso a estação usa só a versão completa.

### Aproximação: do LDR (lux) para a radiação no corpo (Q)
1. **ADC → lux:** o módulo do Wokwi é um divisor de tensão (LDR em série com 10 kΩ). A resistência do LDR é calculada pela tensão e convertida em lux pela curva do componente (50 kΩ a 10 lux, gamma 0,7).
2. **lux → W/m²:** para a luz do sol, ~120 lux equivalem a 1 W/m².
3. **W/m² → Q:** consideramos que o corpo absorve, na média de toda a pele, **12%** da radiação que chega ao chão. Com isso, o sol forte (100.000 lux) dá Q ≈ 100 W/m² e soma cerca de 7 °C à sensação sem vento, o que fica perto do aviso da NOAA de que o sol pleno pode aumentar o índice de calor em até 8 °C.

**Limites dessa aproximação:**
- O LDR mede a luz visível, como o olho. Ele não mede o infravermelho, que também esquenta.
- Ele não separa o sol direto da luz do céu e do reflexo do chão.
- O fator de 12% é **uma estimativa nossa**, e não uma medida.

Uma estação de verdade usaria um **piranômetro** (sensor de radiação solar) ou um **termômetro de globo negro**.

## Níveis de risco (os LEDs)
| Cor | Sensação (TA) | O que significa |
|---|---|---|
| Verde | abaixo de 27 °C | sem efeitos adversos esperados |
| Amarelo | 27 a 33 °C | possível fadiga com exposição prolongada |
| Laranja | 34 a 39 °C | possível insolação ou fadiga. **O nebulizador pode ligar, e o LCD passa a orientar** |
| Vermelho | 40 a 51 °C | provável insolação; trabalho externo desaconselhado das 13h às 17h |
| Roxo | acima de 51 °C | recomendada a suspensão das atividades externas |
| Amarelo **piscando** | sem dado confiável | como o semáforo em pane: a estação não sabe, então **nunca mostra verde** |

- **Fonte dos limites:** as 5 faixas da **Nota Técnica nº 01/26 da Secretaria Municipal de Saúde de Porto Alegre** ("Atividades externas de agentes de combate a endemias e agentes comunitários de saúde em calor extremo", de 08/01/2026, atualizada em 04/02/2026): https://prefeitura.poa.br/sites/default/files/usu_doc/hotsites/sms/vigilancia-em-saude/NT%201_26_Calor%20extremo.pdf. A nota não dá nomes aos níveis, só cores; os efeitos da tabela são os dela. Ela adapta as categorias do índice de calor da NOAA (26,7 / 32,2 / 39,4 / 51,7 °C), e o índice da NOAA é uma regressão (Rothfusz, 1990) das tabelas do próprio Steadman, por isso as faixas servem para a nossa Temperatura Aparente.
- **Faixas de números inteiros:** a nota escreve "27 a 33", "34 a 39", "40 a 51" e "> 51". Então cada cor **começa** em 27, 34, 40 e 52 °C: 33,9 °C ainda é amarelo, e 51,9 °C ainda é vermelho.
- **A nota mede na sombra; a estação, no sol:** a nota usa o índice de calor, que só leva em conta a temperatura e a umidade, e a NOAA avisa que o sol pleno pode somar até 8 °C a ele (https://www.noaa.gov/jetstream/synoptic/heat-index). A nossa TA já inclui o sol, então, quando bate sol, a estação é **mais rigorosa** que a nota. É de propósito: a pessoa no Largo está no sol. Exemplo: com 30 °C e 50%, a TA é 33,1 °C na sombra (amarelo) e 36,6 °C no sol sem vento (laranja).
- **Por que mudamos (15/11/2026):** a régua anterior (27/32/41, da NOAA) deixava um dia comum de Porto Alegre (30 °C e 50% na sombra) no laranja e acendia a orientação o tempo todo, o que leva à fadiga de alerta. A régua da própria prefeitura é mais adequada à cidade e mais fácil de defender.
- **Configuráveis:** os limites ficam numa variável (`LimitesRisco`), e não fixos no código, para a nuvem poder mudá-los. A função `limitesValidos` confere a ordem (amarelo < laranja < vermelho < roxo, com pelo menos 1 °C entre eles) e a faixa (15 a 60 °C).
- **Histerese de 0,5 °C:** a cor **sobe na hora**, mas só **desce** quando a sensação fica 0,5 °C abaixo do limite. Sem isso, com a TA oscilando entre 33,9 e 34,0 °C, a luz ficaria piscando entre amarelo e laranja. A folga de 0,5 °C é a mesma do erro do DHT22.
- **E o frio?** A TA não tem teto nem piso no código: com 2 °C, umidade de 80% e minuano de 8 m/s, ela dá **−5,9 °C**; com 40 °C, 60% e sol forte sem vento, dá **58,1 °C** (os dois casos estão no autoteste). Os níveis medem **só o risco de calor**, que é o foco do projeto, então no frio o LED fica verde (sem risco de calor) e o nebulizador nunca liga. Os 58,1 °C caem no **roxo**. Para o verde não passar a ideia de "tudo bem", com a TA **abaixo de 9 °C** o LCD mostra `FRIO` em vez de `VERDE`. É só um aviso: o frio não tem alerta, nem LED próprio, nem valor no field6. Os 9 °C vêm da escala UTCI, onde começa o "estresse por frio leve"; ela é outro índice, então serve só de referência.

## O relé do nebulizador (lógica na borda)
O ESP32 decide sozinho, sem depender da nuvem: se a internet cair, o nebulizador continua funcionando. No Wokwi, o nebulizador é o **LED azul** ligado ao contato do relé.

| Regra | Valor no Wokwi | Valor numa estação real | Por quê |
|---|---|---|---|
| Liga só com TA ≥ limite do laranja por um tempo **seguido** | 10 s | 2 min | um pico de 2 s não é calor de verdade |
| Desliga só com TA abaixo de **limite − 2 °C** por um tempo seguido | 20 s | 5 min | histerese: não fica liga-desliga perto do limite |
| Tempo mínimo desligado (descanso) | 30 s | 5 min | bomba e motor se desgastam com liga-desliga |
| Tempo máximo ligado | 10 min | 30 min | não esvazia a caixa d'água nem encharca o chão |
| Sem dado confiável (sensor em falha, modo seguro) | na hora | na hora | **fail-safe**: melhor sem névoa do que névoa sem controle |

Os tempos do Wokwi são curtos para dar para ver tudo no vídeo; ficam em `config.h`. O relé também nasce **desligado**: é a primeira coisa do `setup()`, antes até do autoteste.

## Os displays (2 LCDs 20x4 I2C)
São duas telas no mesmo fio I2C, com endereços diferentes: uma para **o que a estação mede** e outra para **o que a pessoa deve fazer**. Assim nada precisa ficar trocando na tela.

**LCD 1 — Medição (endereço 0x27)**
```
TA  36.6C  LARANJA       <- sensação térmica e nível de risco
T30.0C U50% V0.0m/s      <- temperatura, umidade e vento (ou o problema, com "!")
Sol  50000lx Q 50        <- luz do sol (lux) e a radiação que entra na conta (Q, W/m²)
Rele:LIGADO   02:15      <- relé e há quanto tempo está ligado
```
- **Linha 1:** a sensação térmica (`TA`) e a cor do risco. `TA --.-C SEM DADO` quer dizer que não há leitura confiável. `TA  -5.9C  FRIO` aparece no lugar de `VERDE` quando a TA está abaixo de 9 °C.
- **Linha 2:** as leituras. Se houver problema, ela mostra o mais grave, começando com `!`: `!MODO SEGURO`, `!MANUTENCAO SENSOR`, `!SENSOR EM FALHA`, `!SENSOR INSTAVEL`, `!SENSOR TRAVADO`, `!AGUARDANDO SENSOR`, `!VENTO ERRO: usa 0` ou `!LDR ERRO: usa sol`.
- **Linha 3:** o sol. Com o LDR ruim, mostra `Sol  --  Q100 pior`: a conta usa o pior caso (sol forte).
- **Linha 4:** o relé.
  - `LIGADO mm:ss`: ligado há tanto tempo (`REMOTO` = ligado pela nuvem);
  - `desligado`: sem risco alto;
  - `DESL confirma`: risco alto, esperando se confirmar;
  - `DESL descanso`: no tempo mínimo desligado;
  - `DESL (falha)`: bloqueado pelo fail-safe.

**LCD 2 — Orientação (endereço 0x26)**
```
Beba agua e descanse     <- o conselho do nível
Va: Praca XV 24m         <- o refúgio mais perto que está aberto agora
Hora 15:42               <- relógio da internet (NTP)
E1 WiFi:OK  MQTT:OK      <- estação e conexão
```

| Nível | Linha 1 (conselho) | Linha 2 | À noite |
|---|---|---|---|
| Verde | `Sem risco de calor` (abaixo de 9 °C: `Frio: se agasalhe`) | vazia | igual |
| Amarelo | `Calor: beba agua` | `Pausas na sombra` | linha 2: `Lugar ventilado` |
| Laranja | `Beba agua e descanse` | `Va: <refúgio> <distância>` | igual |
| Vermelho | `SAIA DO SOL + AGUA` | `Va: <refúgio> <distância>` | linha 1: `LUGAR FRESCO + AGUA` |
| Roxo | `SUSPENDA ATIVIDADES` | `Va: <refúgio> <distância>` | igual |
| Sem dado | `Sem leitura agora` | `Na duvida: sombra` (nunca manda ao refúgio: não sabe se há risco) | linha 2: `Abafado? Beba agua` |

Os conselhos seguem a nota técnica da SMS de POA: hidratação e pausas na sombra no amarelo; evitar o sol do laranja para cima; suspender as atividades no roxo. A linha 4 mostra o ID da estação e o status do WiFi e do MQTT (`OK` ou `--`).

**Dia ou noite (`sol.h`):** à noite, "procure uma sombra" não faz sentido, então o que fala de sol ou de sombra troca por "lugar fresco" ou "ventilado" (coluna "À noite"). Para saber o período, a estação usa, nesta ordem:
1. o relógio da internet (NTP) e a **posição do sol no céu**, pela conta aproximada do Observatório Naval dos EUA (USNO). Em 16/11/2026, ela dá o nascer às 05:21 e o pôr às 19:00, e o Open-Meteo dá 05:20 e 18:59;
2. sem relógio, a luz do LDR: abaixo de 50 lux (`LUX_NOITE`) é noite;
3. sem os dois, **dia**. É o lado seguro: o conselho do dia à noite é só inútil, mas o da noite de dia poderia deixar alguém no sol.

O relógio vence o LDR porque um poste perto da estação acenderia o LDR à noite. O app usa a mesma conta (`frontend/src/lib/sol.js`).

### Orientação sem app (refúgio mais perto)

Quem não tem celular, está sem bateria ou não pode parar para olhar a tela (o ambulante do Largo, por exemplo) também precisa saber o que fazer. Por isso, o LCD 2 orienta **sem depender de app**.

- **Quais refúgios:** uma praça com sombra de árvore (aberta 24 h) ou um shopping (ar-condicionado, água e banheiro). O LCD indica o **mais perto que estiver aberto agora**. O shopping só ganha se estiver mais perto que a praça.
- **Como a estação sabe se o shopping está aberto:** pela hora e pelo dia da semana do relógio da internet (NTP, fuso UTC−3), pedidos quando o WiFi conecta. Sem hora, ela só indica o que é 24 h, para nunca mandar alguém a um lugar fechado. Sem nenhum refúgio aberto, mostra `Procure uma sombra`.
- **A lista da E1** fica no `config.h`. Ela foi medida em 15/11/2026 no OpenStreetMap, em linha reta da estação até a borda do local:

| Refúgio | Distância | Horário usado | Fonte |
|---|---|---|---|
| Praça XV de Novembro | 24 m (é vizinha do Largo) | 24 h | OSM (9 árvores mapeadas) |
| Rua da Praia Shopping (R. dos Andradas, 1001) | 448 m | seg. a sáb., 9h às 19h (vale até as 18h, para dar tempo de chegar) | O horário mais curto entre o OSM (9h–21h) e o Jornal do Comércio (03/07/2024: 9h–19h, fechado aos domingos). O site oficial não abriu (certificado vencido) |

Na E1, a Praça XV ganha sempre, porque fica colada no Largo. O shopping fica na lista para a regra valer se a praça não puder ser usada (é só tirá-la da lista) e como modelo para as outras estações.

As telas são atualizadas a cada 2 s, só nas linhas que mudaram, sem `lcd.clear()` (que faria a tela piscar). O texto das linhas é montado em `display.h`, uma função pura testada no autoteste (por exemplo: "as 4 linhas têm exatamente 20 caracteres").

## A nuvem: MQTT no ThingSpeak
**Plataforma IoT:** [ThingSpeak](https://thingspeak.mathworks.com) (MathWorks), plano gratuito. Cada estação tem **1 canal**; o canal guarda o histórico (persistência) e mostra os gráficos (dashboard).

Analogia: o MQTT é um grupo de WhatsApp. A estação **posta** os dados no tópico `channels/<id>/publish` e está **inscrita** no tópico do field8 (`channels/<id>/subscribe/fields/field8`). Quando alguém escreve um comando no field8, a mensagem chega na estação.

| Campo | Conteúdo | Quem escreve |
|---|---|---|
| field1 | Temperatura (°C) | estação |
| field2 | Umidade (%) | estação |
| field3 | Vento (m/s) | estação |
| field4 | Luz (lux) | estação |
| field5 | Sensação térmica, a TA (°C) | estação |
| field6 | Nível de risco: 0 verde, 1 amarelo, 2 laranja, 3 vermelho, 4 roxo, 5 sem dado (até 15/11/2026, com 4 níveis, o "sem dado" era 4) | estação |
| field7 | Relé: 0 desligado, 1 ligado | estação |
| field8 | **Comando** para a estação | nuvem (back-end ou navegador) |
| status | Último aviso, último comando, limites atuais e modo do relé | estação |

- **A cada 20 s:** o ThingSpeak grátis aceita 1 gravação a cada 15 s por canal. Numa estação de verdade, 1 por minuto bastaria e cabe no limite anual de mensagens das 4 estações.
- **Dado não confiável não vai para a nuvem:** com o sensor em falha, os campos de temperatura, umidade e sensação vão vazios e o risco vai como 5 (sem dado).
- **Reconexão com espera crescente (backoff):** o WiFi tenta de novo em 5 s, 10 s, 20 s... até 1 min; o MQTT, em 2 s, 4 s, 8 s... até 1 min. Analogia: ligar para quem não atende, esperando cada vez mais entre as ligações. O `loop()` nunca fica parado esperando a rede: os sensores, os LEDs e o relé continuam funcionando sem internet.
- **Avisos:** queda e volta do WiFi e do MQTT aparecem no Serial (`ALERTA`/`OK`), na linha 4 do LCD 2 (`WiFi:--`, `MQTT:--`) e no status do canal.

### Dashboard
**Canal público da E1:** https://thingspeak.mathworks.com/channels/3578427 (Public View: qualquer pessoa com o link vê os dados, mas só escreve no canal quem tem a chave).

Além dos 8 gráficos (um por campo, com o histórico), o painel tem 3 widgets que se atualizam a cada 15 s:

| Widget | Campo | Como ler |
|---|---|---|
| Medidor "Sensacao termica (TA)" | field5 | Ponteiro de −10 a 65 °C, com marcas de 15 em 15. A TA passa de 50 no calor extremo (43 °C, 55% e sol forte, sem vento, já dão 62 °C), e a folga até 65 é para o aquecimento global e a urbanização sem verde. Com frio e vento, ela fica negativa. Faixas: azul abaixo de 9 (frio, só aviso), verde de 9 a 27, amarelo de 27 a 34, laranja de 34 a 40, vermelho de 40 a 52 e roxo acima de 52, nas cores dos LEDs. Fora da escala, o ponteiro para no fim, mas o número embaixo mostra o valor real |
| Lâmpada "Nebulizador (rele)" | field7 | Azul = relé ligado; apagada = desligado |
| Número "Nivel de risco (0 verde, 1 amarelo, …)" | field6 | 0 verde, 1 amarelo, 2 laranja, 3 vermelho, 4 roxo, 5 sem dado (a legenda está no próprio título do widget) |

As faixas do medidor são fixas (são as padrão, 27/34/40/52). Se a nuvem mudar os limites com `lim:`, os LEDs e o LCD seguem os novos valores, mas o medidor continua com as faixas padrão.

No ThingSpeak, a visão pública (*Public View*) e a privada (*Private View*) têm layouts separados, e os widgets acima estão na **pública**.

### Comandos remotos (field8)
| Comando | O que faz |
|---|---|
| `lim:28,35,41,52` | Muda onde começam o amarelo, o laranja, o vermelho e o roxo (°C). Ficam guardados na flash (NVS) e valem depois de um reinício |
| `rele:on` | Liga o nebulizador na hora (o LCD mostra `Rele:REMOTO`). Volta sozinho ao automático depois de 10 min |
| `rele:off` | Desliga e segura desligado (por exemplo, para a manutenção do nebulizador) |
| `rele:auto` | Volta à decisão automática da estação |

**Tudo o que chega é conferido antes de valer**, e o que não passa é ignorado e registrado no Serial (`[CONFIG][E1] ... REJEITADO: motivo`) e no status do canal:
- tamanho máximo de 40 letras;
- formato exato (`lim:A,B,C,D` com 4 números; `rele:` com `on`, `off` ou `auto`); comando desconhecido é rejeitado;
- limites entre 15 e 60 °C, **em ordem** (amarelo < laranja < vermelho < roxo) e com pelo menos 1 °C entre eles;
- no máximo 1 comando a cada 5 s (anti-enxurrada).

O **fail-safe vale mesmo com comando remoto**: sem dado confiável, o relé desliga, até com `rele:on`. A nuvem não liga o nebulizador às cegas. O modo do relé não é guardado na flash: depois de um reinício, ele volta ao automático.

**Testar um comando pelo navegador** (troque `SUA_WRITE_API_KEY` pela chave de escrita do canal, em *API Keys*; não compartilhe essa URL):
```
https://api.thingspeak.com/update?api_key=SUA_WRITE_API_KEY&field8=lim:28,35,41,52
```
A resposta é o número da gravação. Se vier `0`, o ThingSpeak recusou porque a estação publicou há menos de 15 s: espere uns segundos e tente de novo. No back-end (FastAPI), essa nova tentativa será automática.

### Senhas: o `secrets.h`
As credenciais ficam no `secrets.h`, que está no `.gitignore` e **nunca vai para o Git**. O repositório tem só o modelo, `secrets.example.h`.
- **Por que uma credencial MQTT só do canal:** o projeto no Wokwi é visível para quem tem o link (projeto privado exige o plano pago), então o `secrets.h` de lá fica visível também. Por isso, o dispositivo MQTT do ThingSpeak é autorizado **só no canal desta estação**: no pior caso, alguém consegue escrever dados falsos nesse canal, e nada além disso. Depois da avaliação, basta gerar uma senha nova no ThingSpeak.
- A **Write API Key** (para testar comandos pelo navegador) **não** entra no firmware nem no Wokwi.

### Como criar o canal e a credencial no ThingSpeak
1. Crie uma conta grátis em [thingspeak.mathworks.com](https://thingspeak.mathworks.com).
2. *Channels > My Channels > New Channel*: nome `Forno Alegre - E1 Largo Glênio Peres`, marque os 8 campos e dê os nomes da tabela acima. Salve e anote o **Channel ID**.
3. *Devices > MQTT > Add a new device*: nome `estacao-E1`; em *Authorize channels*, escolha **só** o canal da E1, com *Publish* e *Subscribe*. Salve e baixe as credenciais (Client ID, Username e Password).
4. Copie o `secrets.example.h` para `secrets.h` e preencha o Channel ID e as 3 credenciais. No Wokwi, abra o arquivo `secrets.h` e cole os mesmos valores.

## O anemômetro (chip customizado)
O chip imita o anemômetro de conchas do kit **SparkFun Weather Meter (SEN-15901)**. Segundo o guia da SparkFun, um ímã fecha uma chave magnética (reed switch) a cada volta, e **1 fechamento por segundo = 2,4 km/h** (0,667 m/s).

- **No chip** (`anemometro.chip.c`): a chave fechada puxa o pino `SIG` para o GND, e a chave aberta deixa o pino solto. A velocidade vem do slider **"Vento (m/s)"**.
- **No ESP32:** o pino usa o pull-up interno, e uma **interrupção** conta cada fechamento, mesmo com o `loop()` ocupado. Pulsos a menos de 5 ms um do outro são descartados, porque são a "tremida" da chave (debounce). A cada 2 s, o vento é calculado pelo número de pulsos dividido pelo tempo **real** que passou.
- Um pulso a cada 2 s vale 0,33 m/s: essa é a menor variação que a estação enxerga.

## Defesa da leitura do vento e da luz
- **Faixa física:** vento acima de 50 m/s (180 km/h) é ruído; ADC do LDR grudado no 0 ou no máximo é fio solto ou curto.
- **Sem filtro de salto no vento:** rajadas são normais, então um pulo de vento não é suspeito.
- **Pior caso:** com a leitura ruim, o cálculo usa **vento 0** e **sol forte**, a combinação que dá a sensação mais alta. É melhor errar para o lado do alerta do que deixar alguém passar mal. O Serial avisa com `ALERTA`, e com `OK` quando o sensor volta.

## A escada de recuperação do sensor
| Degrau | Quando | O que faz |
|---|---|---|
| 1 | Assim que o problema é detectado | Configura a leitura do sensor de novo |
| 2 | 10 s depois, se não resolveu | **Desliga e religa a energia** do DHT22 (ele é alimentado pelo GPIO 4) |
| 3 | Mais 10 s depois | Reinicia o ESP32 inteiro, **no máximo 2 vezes** |
| Manutenção | Se já reiniciou 2 vezes | Para de reiniciar (evita o reinício em loop), avisa que precisa de técnico e tenta religar o sensor a cada 10 min |

Depois de 10 min funcionando bem, o contador de reinícios volta a zero.

**Como o vigia detecta o problema:**
- **Falha:** 3 leituras ruins seguidas.
- **Instável:** 5 saltos suspeitos em 1 minuto, ou seja, um "sensor louco".
- **Travado:** o mesmo valor por 30 min. Fica desligado no Wokwi, porque lá o valor fica parado de propósito; no hardware real, é para ligar.

## Arquivos
| Arquivo | Papel |
|---|---|
| `sketch.ino` | Programa principal: `setup()`, `loop()`, watchdog, leitura, vigia e comandos de teste |
| `config.h` | Todos os ajustes: pinos, tempos e limites |
| `sensacao.h` | A física: pressão de vapor e Temperatura Aparente |
| `conversao.h` | Traduz pulsos em vento (m/s) e o ADC do LDR em lux e em Q |
| `anemometro.chip.json` e `anemometro.chip.c` | O chip customizado do anemômetro no Wokwi |
| `defesa.h` | As 3 barreiras contra leitura ruim |
| `vigia.h` | Detectores de sensor instável ou travado e a escada de recuperação |
| `risco.h` | Os níveis de risco, a histerese da cor e qual LED acende |
| `rele.h` | A máquina de estados do relé (confirmação, histerese, descanso, fail-safe) |
| `display.h` | O texto das 4 linhas de cada LCD (medição e orientação) |
| `refugio.h` | Escolhe o refúgio mais perto que está aberto agora |
| `sol.h` | Dia ou noite, pela posição do sol (ou pelo LDR, sem relógio) |
| `rede.h` | A espera crescente (backoff) das reconexões |
| `nuvem.h` | Monta a mensagem para o ThingSpeak e valida os comandos do field8 |
| `secrets.example.h` | Modelo do `secrets.h` (o `secrets.h` de verdade fica fora do Git) |
| `autoteste.h` | Testes que rodam a cada boot |
| `diagram.json` | O circuito no Wokwi |
| `libraries.txt` | Bibliotecas que o Wokwi instala |
| `teste_pc/` | Roda os autotestes, testa o chip e compila o firmware no PC (não vai para o Wokwi) |

## Ligações
| Componente | Pino | ESP32 |
|---|---|---|
| DHT22 | VCC | GPIO 4 (energia controlada pelo ESP32) |
| DHT22 | GND | GND |
| DHT22 | SDA (dados) | GPIO 15 |
| Anemômetro | SIG | GPIO 27 (pull-up interno, interrupção) |
| Anemômetro | GND | GND |
| LDR (módulo) | VCC | 3V3 |
| LDR (módulo) | GND | GND |
| LDR (módulo) | AO | GPIO 34 (ADC1) |
| LED verde / amarelo / laranja / vermelho / roxo | ânodo (via resistor de 220 Ω) | GPIO 32 / 33 / 25 / 26 / 19 |
| LEDs | cátodo | GND |
| Relé | IN | GPIO 18 |
| Relé | VCC / GND | 5V / GND |
| Relé | COM → NO | 3V3 → resistor de 220 Ω → LED azul (nebulizador) → GND |
| LCD 1 (0x27) e LCD 2 (0x26), 20x4 I2C | SDA / SCL | GPIO 21 / GPIO 22 (os dois no mesmo I2C padrão do ESP32) |
| LCDs | VCC / GND | 5V / GND |

O GPIO 12 ficou de fora de propósito: no ESP32 real, ele decide a tensão da memória flash na hora do boot, e um LED nele pode impedir a placa de ligar.

O LDR fica num pino do **ADC1** de propósito: o ADC2 do ESP32 para de funcionar quando o WiFi está ligado.

## Como rodar no Wokwi
1. Em [wokwi.com](https://wokwi.com), crie um projeto novo de **ESP32 (Arduino)**.
2. Substitua o `sketch.ino`, o `diagram.json` e o `libraries.txt` pelos desta pasta.
3. Crie os arquivos `config.h`, `sensacao.h`, `conversao.h`, `defesa.h`, `vigia.h`, `risco.h`, `rele.h`, `display.h`, `refugio.h`, `sol.h`, `rede.h`, `nuvem.h` e `autoteste.h` (botão de novo arquivo) e cole o conteúdo de cada um. Crie também o `secrets.h` a partir do `secrets.example.h`, com os valores do seu canal (ver "Como criar o canal e a credencial no ThingSpeak").
4. Crie os arquivos `anemometro.chip.json` e `anemometro.chip.c` e cole o conteúdo de cada um. O nome tem que ser exatamente esse: o `diagram.json` procura o chip pelo nome (`chip-anemometro`).
5. Clique em ▶ e veja o **Serial Monitor**.

## Comandos de teste (digite no Serial Monitor)
| Tecla | O que simula | O que deve acontecer |
|---|---|---|
| `w` | Programa travado | Em ~8 s o ESP32 reinicia, mostrando "WATCHDOG: o programa travou" |
| `f` | Sensor em falha por 60 s | ALERTA → degrau 1 → degrau 2 (religa o sensor) → degrau 3 (reinicia) → volta ao normal |
| `x` | Sensor louco por 60 s | Saltos suspeitos → ALERTA de valores instáveis → recuperação |
| `n` | Volta ao normal | A simulação para |
| `d` | Queda do WiFi por 30 s | O LCD 2 mostra `WiFi:--  MQTT:--`, o Serial mostra `ALERTA`, e depois a estação reconecta sozinha |
| `m` | Queda só do MQTT por 30 s | O LCD 2 mostra `WiFi:OK  MQTT:--` e o Serial avisa a queda; depois dos 30 s, a estação reconecta sozinha |

Para ver o **modo manutenção**, use `f` três vezes seguidas: depois de 2 reinícios, a estação para de reiniciar e pede técnico.

## O que conferir
- O autoteste mostra **"137 passaram, 0 falharam"**, e o LCD 1 mostra "Autoteste OK".
- Em poucos segundos, o Serial mostra `OK: WiFi conectado` e `OK: MQTT conectado ao ThingSpeak`, e a linha 4 do LCD 2 fica `E1 WiFi:OK  MQTT:OK`; a linha 3 passa a mostrar a hora (`Hora 15:42`). A cada 20 s aparece `MQTT: publicado -> field1=...`, e o gráfico do canal no ThingSpeak ganha um ponto.
- A cada 2 s aparece uma linha como `[E1] T=30.0 C  UR=50%  Vento=0.0 m/s  Luz=50000 lux (Q=50 W/m2)  Sensacao=36.6 C | risco=LARANJA rele=OFF(confirmando) | sensor=OK`. O vento começa em 0 (ver o aviso abaixo).
- Com 36,6 °C de sensação, o LED **laranja** acende e, 10 s depois, o relé liga (o LED azul acende e o LCD mostra `Rele:LIGADO`).
- Com o risco em LARANJA, o LCD 2 mostra `Beba agua e descanse` e `Va: Praca XV 24m`, e o LCD 1 continua com as leituras. Suba a temperatura até o VERMELHO (TA ≥ 40 °C): o conselho vira `SAIA DO SOL + AGUA`. Com 40 °C e 60% no DHT22 e o LDR no máximo, a TA passa de 52 °C: o LED **roxo** acende e o conselho vira `SUSPENDA ATIVIDADES`.
- Com 30 °C e 50% no DHT22 e o LDR no escuro (sem sol), a TA fica em ~33,1 °C: **amarelo**, e o LCD 2 mostra `Calor: beba agua` e `Pausas na sombra`, sem mandar ao refúgio. É o "dia comum" de Porto Alegre. Se você testar à noite, a linha 2 mostra `Lugar ventilado`: a estação usa a hora de verdade (NTP).
- Baixe a temperatura do DHT22 até a sensação ficar abaixo de 30 °C: o LCD mostra `DESL` só 20 s depois, e o relé não religa antes de 30 s de descanso.
- Digite `f`: o amarelo pisca, o LCD mostra `!SENSOR EM FALHA` e o relé desliga **na hora**.
- Clique no anemômetro e mexa no slider do vento: o `Vento=` acompanha, e a sensação cai. Com 7 m/s, ela vai para ~30 °C e o risco desce para AMARELO, mas o relé continua ligado (`esfriando`) até a TA ficar abaixo de 30 °C por 20 s: é a histerese.
- Clique no LDR e mude a luz: o `Q=` acompanha, e a sensação sobe com mais sol.
- Clique no DHT22 e mude a temperatura num pulo grande: a primeira leitura é **segurada** ("salto suspeito") e a seguinte é **aceita**.
- Mande `lim:28,35,41,52` pelo field8: o Serial mostra `[CONFIG][E1] lim:28,35,41,52 OK`. Mande `lim:40,30,20,10`: aparece `REJEITADO: limites fora da faixa ou da ordem`, e nada muda.

> **Atenção:** no `diagram.json`, o anemômetro tem `"attrs": {}` de propósito. Se ele tiver um valor fixo (como `"vento": "2"`), o Wokwi usa esse valor e **ignora o slider**: o vento fica parado, mesmo com o slider se mexendo.

## Testar no PC (sem abrir o Wokwi)
A pasta `teste_pc/` confere o código no próprio computador, em 3 etapas:
1. **g++** compila e **roda** os 137 autotestes. As funções de `sensacao.h`, `defesa.h`, `vigia.h`, `risco.h`, `rele.h`, `display.h`, `refugio.h`, `sol.h`, `rede.h` e `nuvem.h` são lógica pura, então rodam em qualquer computador. O `teste_pc/Arduino.h` é um **dublê** do Arduino: troca o `Serial` por um `printf` comum.
2. **gcc** roda o **chip do anemômetro** com um Wokwi falso (`teste_pc/wokwi-api.h`) e confere se ele fecha a chave o número certo de vezes em 10 s (por exemplo, 30 vezes com 2 m/s).
3. **arduino-cli** compila o **firmware inteiro** para o ESP32 (sem o `secrets.h`, ele usa o `secrets.example.h`). Ele acha erros de compilação antes do Wokwi, mas não roda nada: sem a placa, o comportamento só aparece no Wokwi.

```
powershell -ExecutionPolicy Bypass -File edge\teste_pc\testar.ps1
```

Precisa do g++ (WinLibs) e do arduino-cli com o núcleo `esp32:esp32` e as bibliotecas `DHT sensor library for ESPx`, `LiquidCrystal I2C` e `PubSubClient` (os avisos de `B00000001` obsoleto vêm de dentro dessa biblioteca, não do nosso código). Os arquivos gerados ficam na pasta temporária do Windows, fora do repositório.

> **Não cole a pasta `teste_pc/` no Wokwi.** O `Arduino.h` e o `wokwi-api.h` falsos só servem no PC.

## Próximo passo: vários aparelhos no mesmo parque (proposta, não simulada)
**O problema:** uma estação representa só a área em volta dela. No local misto (piso, árvore e grama), isso é um raio de cerca de 50 m (Guia de Instrumentos da OMM, WMO-No. 8, seção 11.1.1.4: "algumas dezenas de metros"). Num parque grande, como o Harmonia ou o Marinha do Brasil, um aparelho só cobre um pedaço.

**A ideia: nós sensores + 1 gateway por local.** É como uma casa com um termômetro em cada cômodo: todos avisam a mesma pessoa, e só ela liga para o médico.

```
  nó 1 (piso)      nó 2 (gramado)      nó 3 (entrada)
  DHT22 + LDR      DHT22 + LDR         DHT22 + LDR
       \               |                  /
        \   rádio (ESP-NOW ou LoRa)      /
         v             v                v
        ESTAÇÃO PRINCIPAL (gateway): vento, LEDs, relé, 2 LCDs
                       |  MQTT (o mesmo de hoje)
                       v
        ThingSpeak: 1 canal por local, 1 mensagem a cada 20 s
```

- **Os nós** são ESP32 pequenos, com bateria, só com o DHT22 e o LDR. Eles mandam a leitura por rádio para a estação principal: **ESP-NOW** (o rádio do próprio ESP32, sem roteador, para dezenas a poucas centenas de metros) ou **LoRa** (para distâncias maiores, com um módulo a mais). O vento continua só na principal, para os nós ficarem baratos. Isso é uma simplificação: árvores e prédios mudam o vento de um ponto para outro, e um local muito irregular pediria um segundo anemômetro.
- **Continua no plano grátis:** só a principal fala com a nuvem, no mesmo canal e no mesmo ritmo. Com mais nós, o número de mensagens não muda: continuam **4 canais**, um por local.
- **O que vai no canal: o PIOR ponto.** Os 8 campos já estão ocupados, então a principal publica no field5 e no field6 a **maior TA** entre os nós válidos. É a mesma regra do "pior caso" que a estação já usa com o vento e a luz: na dúvida, protege. O detalhe de cada nó vai no `status` (um texto curto, por exemplo `n1:41.2 n2:35.0 n3:FALHA`), que o app pode ler para pintar o mapa por ponto.
- **Defesa da leitura em cada nó:** as mesmas barreiras de hoje (NaN, faixa do sensor, filtro de salto). Leitura com mais de 2 min não entra na conta. Nó em falha aparece como `FALHA` no status e sai da cobertura. Se todos falharem, o local fica "sem dado", como hoje.
- **Segurança do rádio:** o ESP-NOW tem criptografia, e só os nós cadastrados na principal são aceitos. Assim, ninguém finge ser um nó para apagar um alerta.
- **No mapa:** a área coberta passa a ser a soma dos círculos de 50 m dos nós que estão funcionando.

**Por que não está no Wokwi:** cada simulação do Wokwi roda isolada, e dois projetos não conversam por ESP-NOW. Simular os nós exigiria um broker MQTT público entre vários projetos abertos ao mesmo tempo, o que ficou fora do prazo. Por isso, esta parte é uma **proposta de arquitetura**: ela também está no backlog do relatório de Total Experience (`docs/requisitos_rascunho.md`).

## Limitações conhecidas
- **Uma estação por local:** cada estação representa só a área em volta dela (ver a proposta de vários nós por local, logo acima).
- **Luz → radiação:** é uma aproximação (ver "Aproximação: do LDR (lux) para a radiação no corpo").
- **Anemômetro parado ou com fio partido:** os dois dão zero pulsos, e a estação não consegue diferenciar um do outro. Nesse caso, ela trata como "sem vento", que é o pior caso para a sensação.
- **ADC do ESP32 real:** no Wokwi o ADC é linear de 0 a 3,3 V. No ESP32 de verdade, ele perde precisão perto dos extremos e precisaria de calibração.
- **Comando no field8 e o limite de 15 s:** o ThingSpeak grátis recusa uma gravação feita menos de 15 s depois da anterior, e a estação grava a cada 20 s. Então um comando pode ser recusado e precisa ser repetido; o back-end fará isso sozinho.
- **Comando perdido com a estação desligada:** o MQTT do ThingSpeak não guarda a mensagem para quem estava fora. Se a estação estiver desconectada quando o comando chegar, ele precisa ser mandado de novo.
- **Sem alerta de frio:** os níveis de risco, os LEDs e o field6 tratam só do calor. No frio, o LCD avisa `FRIO`, mas não há alerta; isso fica como trabalho futuro.
- **Os 61 °C do Parque Harmonia não são sensação térmica:** esse valor é a temperatura do **piso de concreto** (superfície), medida pelo InGá em 04/02/2025. A estação mede o **ar** com o DHT22 e calcula a TA a partir dele, então os dois números não se comparam diretamente.
- **Refúgios:** a distância é em linha reta, e não pelo caminho a pé. A estação não sabe dos feriados, quando o shopping pode estar fechado. O horário do Rua da Praia Shopping não foi confirmado no site oficial, por isso usamos o mais curto entre as fontes. Também não há bebedouro público mapeado no OSM a menos de 1 km da E1: o mais perto fica a cerca de 1,5 km. A água fica com o shopping e com o cadastro de pontos de hidratação (parte do Web).
- **Energia do sensor:** no Wokwi, o "desligar e religar" o sensor roda de verdade no código, mas o simulador não modela a energia dos componentes. Então o efeito não aparece lá. No hardware real, é isso que destrava um DHT22 travado.

## A preencher
- **Simulação no Wokwi:** https://wokwi.com/projects/480541510887151617
- **Canal no ThingSpeak (dashboard):** https://thingspeak.mathworks.com/channels/3578427
- Ainda falta: diagrama, vídeo de demonstração e integrantes.
