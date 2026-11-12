# Uso de Inteligência Artificial

## Qual IA foi usada
- **Claude (Anthropic)**, pelo Claude Code, no papel de par de programação e professor.

## Para quê
- Explicar conceitos e fórmulas antes de implementar.
- Propor código em passos pequenos, que eu reviso, testo e ajusto.
- Pesquisar e conferir fontes de dados públicos.
- Revisar textos e documentação.

## Como trabalhamos
- A IA **não muda nada sem o meu ok**: antes de cada mudança, ela diz o que vai fazer, por quê e quais as alternativas.
- As decisões de projeto são minhas (ver [`PROMPTS.md`](PROMPTS.md)).
- Depois de cada passo, faço uma tarefa prática sozinho, que entra no código com a minha autoria.

## Como validei o resultado
| Data | O que foi gerado | Como validei |
|---|---|---|
| 12/11/2026 | Estrutura do repositório e arquivos-base | Revisei os arquivos e fiz o primeiro commit sozinho |
| 12/11/2026 | Edge: leitura do DHT22, Temperatura Aparente, watchdog, defesas e autoteste | Autoteste no boot do ESP32; valores esperados conferidos em Python; testes manuais no Wokwi (salto de temperatura e travamento com `w`) |
| 12/11/2026 | Edge: teste no PC (`edge/teste_pc/`) | Os 31 autotestes rodam no PC com g++ (sem avisos com `-Wall -Wextra`) e o firmware compila para o ESP32 com arduino-cli |
