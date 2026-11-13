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
- **Autoteste no boot:** 49 testes das fórmulas, das conversões, das defesas e do vigia, rodando no próprio ESP32. Se algum falhar, entra em **modo seguro**.

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

O LDR fica num pino do **ADC1** de propósito: o ADC2 do ESP32 para de funcionar quando o WiFi está ligado, e o WiFi entra no Passo 4.

## Como rodar no Wokwi
1. Em [wokwi.com](https://wokwi.com), crie um projeto novo de **ESP32 (Arduino)**.
2. Substitua o `sketch.ino`, o `diagram.json` e o `libraries.txt` pelos desta pasta.
3. Crie os arquivos `config.h`, `sensacao.h`, `conversao.h`, `defesa.h`, `vigia.h` e `autoteste.h` (botão de novo arquivo) e cole o conteúdo de cada um.
4. Crie os arquivos `anemometro.chip.json` e `anemometro.chip.c` e cole o conteúdo de cada um. O nome tem que ser exatamente esse: o `diagram.json` procura o chip pelo nome (`chip-anemometro`).
5. Clique em ▶ e veja o **Serial Monitor**.

## Comandos de teste (digite no Serial Monitor)
| Tecla | O que simula | O que deve acontecer |
|---|---|---|
| `w` | Programa travado | Em ~8 s o ESP32 reinicia, mostrando "WATCHDOG: o programa travou" |
| `f` | Sensor em falha por 60 s | ALERTA → degrau 1 → degrau 2 (religa o sensor) → degrau 3 (reinicia) → volta ao normal |
| `x` | Sensor louco por 60 s | Saltos suspeitos → ALERTA de valores instáveis → recuperação |
| `n` | Volta ao normal | A simulação para |

Para ver o **modo manutenção**, use `f` três vezes seguidas: depois de 2 reinícios, a estação para de reiniciar e pede técnico.

## O que conferir
- O autoteste mostra **"49 passaram, 0 falharam"**.
- A cada 2 s aparece uma linha como `[E1] T=30.0 C  UR=50%  Vento=2.0 m/s  Luz=50000 lux (Q=50 W/m2)  Sensacao=34.6 C | sensor=OK`.
- Clique no anemômetro e mexa no slider do vento: o `Vento=` acompanha, e a sensação cai.
- Clique no LDR e mude a luz: o `Q=` acompanha, e a sensação sobe com mais sol.
- Clique no DHT22 e mude a temperatura num pulo grande: a primeira leitura é **segurada** ("salto suspeito") e a seguinte é **aceita**.

## Testar no PC (sem abrir o Wokwi)
A pasta `teste_pc/` confere o código no próprio computador, em 3 etapas:
1. **g++** compila e **roda** os 49 autotestes. As funções de `sensacao.h`, `defesa.h` e `vigia.h` são lógica pura, então rodam em qualquer computador. O `teste_pc/Arduino.h` é um **dublê** do Arduino: troca o `Serial` por um `printf` comum.
2. **gcc** roda o **chip do anemômetro** com um Wokwi falso (`teste_pc/wokwi-api.h`) e confere se ele fecha a chave o número certo de vezes em 10 s (por exemplo, 30 vezes com 2 m/s).
3. **arduino-cli** compila o **firmware inteiro** para o ESP32. Ele acha erros de compilação antes do Wokwi, mas não roda nada: sem a placa, o comportamento só aparece no Wokwi.

```
powershell -ExecutionPolicy Bypass -File edge\teste_pc\testar.ps1
```

Precisa do g++ (WinLibs) e do arduino-cli com o núcleo `esp32:esp32` e a biblioteca `DHT sensor library for ESPx`. Os arquivos gerados ficam na pasta temporária do Windows, fora do repositório.

> **Não cole a pasta `teste_pc/` no Wokwi.** O `Arduino.h` e o `wokwi-api.h` falsos só servem no PC.

## Limitações conhecidas
- **Luz → radiação:** é uma aproximação (ver "Aproximação: do LDR (lux) para a radiação no corpo").
- **Anemômetro parado ou com fio partido:** os dois dão zero pulsos, e a estação não consegue diferenciar um do outro. Nesse caso, ela trata como "sem vento", que é o pior caso para a sensação.
- **ADC do ESP32 real:** no Wokwi o ADC é linear de 0 a 3,3 V. No ESP32 de verdade, ele perde precisão perto dos extremos e precisaria de calibração.
- **Energia do sensor:** no Wokwi, o "desligar e religar" o sensor roda de verdade no código, mas o simulador não modela a energia dos componentes. Então o efeito não aparece lá. No hardware real, é isso que destrava um DHT22 travado.

## A preencher
- Link da simulação no Wokwi, diagrama, instruções do display, plataforma IoT e vídeo de demonstração.
