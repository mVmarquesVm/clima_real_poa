# Edge — Estação Forno Alegre (ESP32 no Wokwi)

> Ficha da CitizenTech: ver o [README principal](../README.md).

**Disciplina:** Edge Computing & Computer Systems

## O que esta estação faz (até agora)
- Lê o **DHT22** (temperatura e umidade) a cada **2 s**, com `millis()`, sem travar o programa.
- Calcula a **Temperatura Aparente de Steadman**, a sensação térmica real. Por enquanto é a versão sem vento e sem sol.
- **Watchdog do programa:** se o `loop()` travar por mais de 8 s, o ESP32 reinicia sozinho e, no boot, mostra o motivo.
- **Defesa da leitura** em 3 barreiras: faixa física do sensor, filtro de salto e contador de falhas seguidas.
- **Vigia do sensor:** detecta sensor em falha, instável ou travado, tenta consertá-lo em escada e **avisa**.
- **Autoteste no boot:** 31 testes das fórmulas, das defesas e do vigia, rodando no próprio ESP32. Se algum falhar, entra em **modo seguro**.

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
| `defesa.h` | As 3 barreiras contra leitura ruim |
| `vigia.h` | Detectores de sensor instável ou travado e a escada de recuperação |
| `autoteste.h` | Testes que rodam a cada boot |
| `diagram.json` | O circuito no Wokwi |
| `libraries.txt` | Bibliotecas que o Wokwi instala |
| `teste_pc/` | Roda os autotestes e compila o firmware no PC (não vai para o Wokwi) |

## Ligações
| DHT22 | ESP32 |
|---|---|
| VCC | GPIO 4 (energia controlada pelo ESP32) |
| GND | GND |
| SDA (dados) | GPIO 15 |

## Como rodar no Wokwi
1. Em [wokwi.com](https://wokwi.com), crie um projeto novo de **ESP32 (Arduino)**.
2. Substitua o `sketch.ino`, o `diagram.json` e o `libraries.txt` pelos desta pasta.
3. Crie os arquivos `config.h`, `sensacao.h`, `defesa.h`, `vigia.h` e `autoteste.h` (botão de novo arquivo) e cole o conteúdo de cada um.
4. Clique em ▶ e veja o **Serial Monitor**.

## Comandos de teste (digite no Serial Monitor)
| Tecla | O que simula | O que deve acontecer |
|---|---|---|
| `w` | Programa travado | Em ~8 s o ESP32 reinicia, mostrando "WATCHDOG: o programa travou" |
| `f` | Sensor em falha por 60 s | ALERTA → degrau 1 → degrau 2 (religa o sensor) → degrau 3 (reinicia) → volta ao normal |
| `x` | Sensor louco por 60 s | Saltos suspeitos → ALERTA de valores instáveis → recuperação |
| `n` | Volta ao normal | A simulação para |

Para ver o **modo manutenção**, use `f` três vezes seguidas: depois de 2 reinícios, a estação para de reiniciar e pede técnico.

## O que conferir
- O autoteste mostra **"31 passaram, 0 falharam"**.
- A cada 2 s aparece uma linha como `[E1] T=30.0 C  UR=50%  Sensacao=33.0 C | sensor=OK`.
- Clique no DHT22 e mude a temperatura num pulo grande: a primeira leitura é **segurada** ("salto suspeito") e a seguinte é **aceita**.

## Testar no PC (sem abrir o Wokwi)
A pasta `teste_pc/` confere o código no próprio computador, em 2 etapas:
1. **g++** compila e **roda** os 31 autotestes. As funções de `sensacao.h`, `defesa.h` e `vigia.h` são lógica pura, então rodam em qualquer computador. O `teste_pc/Arduino.h` é um **dublê** do Arduino: troca o `Serial` por um `printf` comum.
2. **arduino-cli** compila o **firmware inteiro** para o ESP32. Ele acha erros de compilação antes do Wokwi, mas não roda nada: sem a placa, o comportamento só aparece no Wokwi.

```
powershell -ExecutionPolicy Bypass -File edge\teste_pc\testar.ps1
```

Precisa do g++ (WinLibs) e do arduino-cli com o núcleo `esp32:esp32` e a biblioteca `DHT sensor library for ESPx`. Os arquivos gerados ficam na pasta temporária do Windows, fora do repositório.

> **Não cole a pasta `teste_pc/` no Wokwi.** O `Arduino.h` falso só serve no PC.

## Limitação conhecida
No Wokwi, o "desligar e religar" o sensor roda de verdade no código, mas o simulador não modela a energia dos componentes. Então o efeito não aparece lá. No hardware real, é isso que destrava um DHT22 travado.

## A preencher
- Link da simulação no Wokwi, diagrama, instruções do display, plataforma IoT e vídeo de demonstração.
