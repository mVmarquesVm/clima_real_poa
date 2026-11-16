# Frontend — Interface do Forno Alegre

> Ficha da CitizenTech: ver o [README principal](../README.md).

**Disciplinas:** Front-end Design e Web Development

## O que vai nesta pasta
- App em **React + Vite + Tailwind**.
- Mapa com **MapLibre GL** + OpenFreeMap e gráficos com **Apache ECharts**.
- Geolocalização para achar o local de lazer ou o ponto de hidratação mais perto.
- Recomendação de local e horário por atividade.
- Acessibilidade: lista dos locais ao lado do mapa, risco em ícone + texto, contraste e teclado.

## Estrutura de `src/`
```
src/
├── componentes/   as peças da tela, agrupadas por assunto
│   ├── estacao/   EstacaoAoVivo (a leitura da E1 ao vivo)
│   ├── risco/     SeloRisco e IconeRisco (cor + ícone + texto)
│   ├── locais/    TabelaLocais (o ranking do satélite)
│   ├── mapa/      Mapa (MapLibre + OpenFreeMap; carregado em separado, por ser pesado),
│   │              MarcadorEstacao (botão de cada estação) e PainelEstacao (detalhes)
│   └── comum/     Dado (rótulo + valor) e BarraStatus (hora, dia/noite, estações ao vivo)
├── ganchos/       hooks do React (useEstacoes: busca todas as estações a cada 15 s; useAgora: relógio)
├── servicos/      quem conversa com APIs externas (ThingSpeak)
├── lib/           funções puras: régua de risco, leitura recente, estações, sol, formatação e geografia (GeoJSON)
└── dados/         JSON gerado pelo python/processamento/exportar_front.py
```

## A preencher
- Como rodar, componentes e telas.
