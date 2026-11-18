# Frontend — Interface do Clima Real POA

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

**Disciplinas:** Front-end Design e Web Development

## Integrantes
| Nome completo | RM |
|---|---|
| Matheus Marques De Souza | 573203 |

Trabalho individual. Os arquivos pedidos estão na raiz do repositório: [INTEGRANTES.md](../INTEGRANTES.md), [AI.md](../AI.md) (como a IA foi usada e validada) e [PROMPTS.md](../PROMPTS.md) (os pedidos feitos à IA, passo a passo).

## O que o app faz
Um app de uma página só, pensado primeiro para quem tem mais dificuldade com o celular (a avó da [entrevista](../docs/entrevista.md)): letra de 18 px, um botão "A+" que aumenta a letra, pouco texto e nenhum jargão na parte de cima. O menu tem 3 itens:

| Tela | Para quem | O que mostra |
|---|---|---|
| **Planejar** | quem vai passear | 3 passos: (1) escolher a atividade (caminhada, corrida, pedal, piquenique ou levar criança); (2) a resposta grande ("Agora pode ir" ou não) e a régua das horas de hoje, com ✓ e ✕, pela previsão do tempo; (3) o cartão "Vá para:", com o local mais seguro (sombra, distância e água), a rota a pé de onde a pessoa está e o caminho até a água |
| **Calor agora** | quem já está na rua | as 4 estações ao vivo (cor + ícone + texto + conselho) e o mapa com as áreas de cada estação pintadas na cor do risco |
| **Gestão** (fechada no começo) | a prefeitura | o cadastro de locais de lazer e de pontos de hidratação (o CRUD da parte de Web) e o ranking do satélite, com download em CSV |

No fim da página, "Sobre os dados e as fontes" junta todas as explicações técnicas. O botão de tema troca entre claro e escuro, e a escolha fica salva.

## Como rodar (Windows)
Precisa do **Node 20.19 ou mais novo** (o mínimo do Vite 8; usamos o Node 24). A parte de Gestão também precisa da [API](../backend/README.md) rodando; o resto do app funciona sem ela.

1. Suba a API (num terminal, de dentro de `backend/`):
   ```powershell
   .venv\Scripts\python.exe -m uvicorn app.main:app --reload
   ```
2. Suba o app (noutro terminal, de dentro de `frontend/`):
   ```powershell
   npm install
   npm run dev
   ```
3. Abra http://localhost:5173.

Se a API estiver noutro endereço, copie o `.env.example` para `.env` e troque o `VITE_API_URL`. Não há chave nem senha no app: tudo o que ele lê é público.

**Conferir o código:** `npm run lint` (o oxlint) e `npm run build` (gera a versão final em `dist/`).

## Tecnologias
- **React 19 + Vite 8 + Tailwind CSS 4.** As cores saem só dos tokens do `src/index.css` (pelo papel: `fundo`, `texto`, `borda`, `foco`, e as 5 cores de risco, iguais às dos LEDs da estação).
- **MapLibre GL + OpenFreeMap** no mapa (grátis e sem chave). O mapa é baixado em separado, depois do resto, por ser a parte mais pesada.
- **Apache ECharts** no gráfico da previsão, só com os módulos usados e com a opção `aria` ligada.
- Sem roteador e sem servidor próprio: o app lê as APIs públicas direto do navegador.

| API externa | Para quê |
|---|---|
| [ThingSpeak](https://thingspeak.mathworks.com) | as leituras das 4 estações, a cada 15 s (canais públicos) |
| [Open-Meteo](https://open-meteo.com) | a previsão hora a hora (temperatura, umidade, vento e sol) para o Planejar |
| OSRM da FOSSGIS (`routing.openstreetmap.de`) | a rota a pé; só é chamada quando a pessoa toca no botão. Sem resposta, o app mostra a linha reta e um link para o OpenStreetMap |
| [ViaCEP](https://viacep.com.br) + Nominatim (OpenStreetMap) | transformar o CEP em ponto no mapa (no cadastro e como ponto de partida, quando o celular não libera a localização) |
| A nossa API (`backend/`) | o CRUD de locais de lazer e de pontos de hidratação |

## Componentes (47)
Cada pasta de `src/componentes/` é um assunto:

| Pasta | Componentes |
|---|---|
| `recomendacao/` | `SecaoRecomendacao` (os 3 passos do Planejar), `BotaoPertoDeMim` (localização ou CEP), `CartaoRecomendacao` ("Vá para:", rota e água) |
| `previsao/` | `SeletorAtividade`, `MelhorHorario`, `FaixaHoras` (a régua das horas), `DetalhesPrevisao`, `GraficoPrevisao` (ECharts), `TabelaPrevisao` (os mesmos números, em tabela) |
| `estacao/` | `ListaEstacoes` (os cartões das 4 estações), `EstacaoAoVivo` |
| `risco/` | `SeloRisco` (cor + ícone + texto + conselho), `IconeRisco` (um formato por nível), `LegendaRisco` |
| `mapa/` | `Mapa`, `MarcadorEstacao` (um botão por estação), `PainelEstacao` (os detalhes), `MapaEscolherPonto` (tocar no mapa para marcar o ponto no cadastro) |
| `locais/` | `TabelaLocais` (o ranking do satélite), `BaixarCsvLocais` |
| `cadastro/` | `SecaoCadastro` (as abas), `PainelCadastro` (o CRUD genérico: estados, formulário, apagar, avisos e foco), `ListaLocais`, `ListaHidratacao`, `FormularioLocal`, `FormularioHidratacao`, `CampoLocalizacao` (CEP ou mapa) |
| `comum/` | `Menu`, `BarraStatus`, `BotaoLetra`, `BotaoTema`, `Rodape`, `NumeroPasso`, `Dado`, `Abas`, `Aviso`, `MensagemErro`, `EstadoCarregando`, `ConfirmarApagar`, `AcoesDoItem`, `BotoesFormulario`, `CampoTexto`, `CampoEscolha`, `CampoOpcoes`, `CampoMarcar`, `ErroDoCampo`, `SimNao` |

## O CRUD (parte de Web)
O cadastro fica na tela **Gestão** e conversa com a nossa API em FastAPI ([backend/](../backend/README.md)), por `GET`, `POST`, `PUT` e `DELETE`:
- **Estados:** carregando, lista vazia, erro (com "Tentar de novo") e lista com itens. Depois de salvar ou apagar, um aviso diz o que aconteceu, e o foco volta para o botão que abriu o formulário.
- **Validação:** o navegador confere os campos com as mesmas regras e as mesmas frases da API (`lib/validacao.js`) antes de enviar. O erro aparece embaixo do campo, ligado a ele por `aria-describedby`, e o foco vai para o 1º campo com erro.
- **Erros:** a API sempre responde no mesmo formato (`detail` + a lista `erros` por campo). O app mostra a frase em português e trata o caso da API fora do ar e o da resposta que demora mais de 10 s.
- **Apagar** pede confirmação num `<dialog>`; dois cliques seguidos em "Salvar" não criam dois itens.

## Acessibilidade e responsividade
- O risco **nunca vai só na cor:** sempre com ícone e texto. Contraste de pelo menos 4,5:1 nos 2 temas, medido pela fórmula da WCAG.
- Tudo funciona pelo teclado: link "Pular para o conteúdo", foco visível, abas com as setas, e o Esc fecha o diálogo e o painel do mapa.
- O mapa é desenhado em `canvas`, que o leitor de tela não enxerga, então as estações também aparecem em texto, nos cartões acima dele.
- Funciona a partir de 375 px de largura, sem rolagem para o lado, também com a letra grande. Com "reduzir movimento" ligado no sistema, o mapa troca de lugar sem voar, e o anel "AO VIVO" e o sinal de carregando ficam parados.

## Estrutura de `src/`
```
src/
├── componentes/   as peças da tela, agrupadas por assunto (tabela acima)
├── ganchos/       hooks do React: estações a cada 15 s, relógio, localização, formulário, lista, tema e letra
├── servicos/      quem conversa com APIs externas: ThingSpeak, Open-Meteo, rota a pé, CEP e a nossa API
├── lib/           funções puras: régua de risco, sensação térmica, recomendação, validação, sol, geografia, CSV e formatação
└── dados/         locais.json, gerado pelo python/processamento/exportar_front.py
```
