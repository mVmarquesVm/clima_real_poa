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

## Backlog: épicos
- **Épico — Cobertura de parques grandes (futuro):** nós sensores com bateria + estação principal (gateway); o pior ponto no field5/field6 e o detalhe por nó no `status`; o mapa pinta um círculo de 50 m por nó funcionando. Detalhes no [README do Edge](../edge/README.md), na seção "Próximo passo: vários aparelhos no mesmo parque".

## Hardware real (anotar no relatório)
- Abrigo contra o sol e calibração do DHT22; o LDR não é um medidor de radiação (é uma aproximação).
- O nebulizador precisa de água e de limpeza (risco de *Legionella*), além de energia e de proteção contra vandalismo.
- Conexão fora do WiFi: LoRaWAN ou 4G.
