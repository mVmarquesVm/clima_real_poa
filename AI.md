# Uso de Inteligência Artificial

## Qual IA foi usada
- **Claude (Anthropic)**, pelo Claude Code, no papel de par de programação e professor.

## Para quê
- Explicar conceitos e fórmulas antes de implementar.
- Propor código em passos pequenos, que eu reviso, testo e ajusto.
- Pesquisar e conferir fontes de dados públicos.
- Revisar textos e documentação.

## Como trabalhamos
- A IA **não muda nada sem o meu ok**: ela só trabalha no passo que eu combinei com ela, explicando o que faz e por quê, e eu reviso o código e testo. Instalar, apagar ou mudar uma decisão de projeto ela sempre me pergunta antes.
- As decisões de projeto são minhas (ver [`PROMPTS.md`](PROMPTS.md)).
- Quando peço, a IA me passa uma tarefa prática (prever, completar, achar o bug), que eu faço sozinho. Exemplo: no Passo 2, previ a Temperatura Aparente antes de rodar. A partir do Passo 3, pedi para acelerar: a IA implementa, e eu testo, reviso o código e tomo as decisões.

## Como validei o resultado
| Data | O que foi gerado | Como validei |
|---|---|---|
| 12/11/2026 | Estrutura do repositório e arquivos-base | Revisei os arquivos e fiz o primeiro commit sozinho |
| 12/11/2026 | Edge: leitura do DHT22, Temperatura Aparente, watchdog, defesas e autoteste | Autoteste no boot do ESP32; valores esperados conferidos em Python; testes manuais no Wokwi (salto de temperatura e travamento com `w`) |
| 12/11/2026 | Edge: teste no PC (`edge/teste_pc/`) | Os 31 autotestes rodam no PC com g++ (sem avisos com `-Wall -Wextra`) e o firmware compila para o ESP32 com arduino-cli |
| 12/11/2026 | Edge: anemômetro (chip customizado), LDR e fórmula completa de Steadman | Valores esperados calculados à parte, em Python; 49 autotestes no PC; o chip roda num Wokwi falso e gera os pulsos do datasheet da SparkFun; o firmware compila sem avisos; a especificação do anemômetro e do LDR foi conferida no guia da SparkFun e na documentação do Wokwi |
| 13/11/2026 | Edge: LEDs de risco, relé com histerese e fail-safe, LCD 20x4 | 77 autotestes no PC (incluindo casos de pico curto, histerese, descanso, fail-safe e largura das linhas do LCD); o firmware compila sem avisos no nosso código; teste no Wokwi feito por mim |
| 13/11/2026 | Edge: WiFi, MQTT no ThingSpeak, backoff e comandos remotos | 99 autotestes no PC (backoff, formato da mensagem, comandos válidos e inválidos, frequência, relé remoto e fail-safe); o firmware compila; teste no Wokwi com o canal real, feito pela IA pelo meu Chrome: MQTT conectado e publicando, `d` e `m` mostrando a queda no LCD (`WiFi:--`, `MQTT:--`) e reconexão depois de 30 s; esse teste achou um bug (o `m` reconectava na hora), corrigido antes do commit. Eu testei o comando pelo field8 pelo navegador |
| 13/11/2026 | Edge: dashboard no ThingSpeak e aviso de `FRIO` no LCD | 105 autotestes no PC e no ESP32; o `FRIO` foi conferido ao vivo no Wokwi (TA de 3,2 °C e de −3,9 °C) pela IA, pelo meu Chrome; o canal público abre sem login. A ideia de ampliar a escala do medidor (até 65 °C e abaixo de zero) foi minha |
| 13/11/2026 | Python: dados do INMET, satélite (Landsat e Sentinel-2) e ranking | 8 testes (fórmula igual à do ESP32, conversões conferidas na mão, leitura do arquivo real do INMET); rodei o `ranking.py`; cada frase do README foi conferida contra os dados, e 2 frases erradas foram corrigidas. Recusei a 1ª versão, que usava hipóteses, e pedi dados reais |
