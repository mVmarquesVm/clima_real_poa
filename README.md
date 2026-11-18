# Clima Real POA

> Medindo a ilha de calor do Centro de Porto Alegre (projeto *Hot Island in the City*).

Estações de "calor real" em locais de lazer de Porto Alegre: medem a sensação térmica onde as pessoas realmente ficam, avisam o risco e recomendam o local e o horário mais seguros para cada atividade.

## Ficha da CitizenTech
- **Nome:** Clima Real POA
- **Cidade e bairro:** Porto Alegre — região central (Centro Histórico e Praia de Belas)
- **Cidadão beneficiado:** quem vai a locais ao ar livre para lazer, com atenção aos grupos de risco (idosos, crianças, gestantes e pessoas com doença crônica); a estação também protege quem não usa o app, e a prefeitura usa os dados para decidir onde sombrear
- **Problema em uma frase:** Porto Alegre já mede o tempo em 16 pontos, mas nenhum diz quanto calor a pessoa sente na praça, nem avisa, nem refresca.
- **Como funciona:** estações com ESP32 em locais de lazer medem temperatura, umidade, vento e sol, calculam a sensação térmica real, avisam o risco e ligam a refrigeração do local; o app recomenda o local e o horário mais seguros para cada atividade, e os dados formam um mapa do calor real da cidade.
- **O que cada parte faz:** Sensor (mede e alerta) · Lógica (ranking dos locais críticos) · Matemática (taxa de aquecimento e dose de calor) · Interface (mapa acessível) · Interação (cadastro de locais de lazer e pontos de hidratação) · Experiência (requisitos e backlog) · Pitch (história)
- **Link do repositório:** https://github.com/mVmarquesVm/clima_real_poa
- **Indicador de impacto:** horas/dia em nível de risco por local; diferença entre o calor oficial e o medido
- **ODS conectados:** 3, 10, 11 e 13

## Partes do projeto

| Pasta | Disciplina | O que tem |
|---|---|---|
| [`edge/`](edge/) | Edge Computing & Computer Systems 4 estações (ESP32 no Wokwi, o mesmo firmware): sensores, sensação térmica, LEDs, relé do nebulizador, 2 visores e MQTT no ThingSpeak |
| [`python/`](python/) | Computational Thinking with Python | Cruzamento de dados (satélite, estações oficiais e nossas estações) e ranking dos locais |
| [`matematica/`](matematica/) | Differentiated Problem Solving | Taxa de aquecimento (derivada), dose de calor (integral) e comportamento à noite (limite) |
| [`backend/`](backend/) | Web Development | API em FastAPI + Uvicorn + SQLite |
| [`frontend/`](frontend/) | Front-end Design e Web Development | Interface em React + Vite: mapa, gráficos e recomendação |
| [`docs/`](docs/) | Software & Total Experience Design e Storytelling | Relatório de Total Experience (PDF), entrevista e problema com as fontes |

## Vídeos
- **Pitch (até 3 min):** (link do YouTube, entra depois da gravação)
- **Demonstração do Edge:** (link do YouTube, entra depois da gravação)

## Arquivos do projeto
- [`INTEGRANTES.md`](INTEGRANTES.md) — quem fez o trabalho
- [`AI.md`](AI.md) — como a IA foi usada e validada
- [`PROMPTS.md`](PROMPTS.md) — registro dos pedidos feitos à IA, passo a passo
