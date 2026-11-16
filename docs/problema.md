# O problema do Forno Alegre

> Rascunho de 14/11/2026. É a base da Ficha da CitizenTech, do relatório de Total Experience e do pitch.
> Todas as fontes foram abertas e conferidas em 14/11/2026 (ver a seção 12). O que ainda depende de decisão do Matheus está marcado com **(decidir)**.

---

## 1. Contexto

Porto Alegre tem verões cada vez mais quentes. No Centro Histórico e na Praia de Belas, muita gente circula, trabalha e passeia ao ar livre, sobre concreto e asfalto e com pouca árvore. Nesses lugares, o calor que a pessoa sente pode ser bem maior que o da previsão, e essa diferença não aparece em lugar nenhum.

## 2. Evidências

| O quê | Valor | Tipo | Fonte |
|---|---|---|---|
| Largo Glênio Peres (lateral do Mercado), 10/02/2025, ~11h | ar **34 °C** e 46% de umidade; ladrilhos de **49 a 54 °C** | ar + superfície | GZH, 10/02/2025 (medição de Paulo Brack/UFRGS e Emerson Prates/InGá) |
| Mesmo ponto, sensação térmica estimada | ~**38 °C** na sombra; ~**45 °C** ao sol sem vento | estimativa nossa | fórmula de Steadman do ESP32 sobre os 34 °C e 46% acima (sem medida de vento e sol) |
| Parque Harmonia, 04/02/2025, ~13h–13h30 | piso de concreto com **mais de 60 °C**; gramado à sombra perto de 31 °C | superfície | Sul21, 05/02/2025 (61 °C) e GZH, 10/02/2025 (mais de 62 °C) |
| Parque Harmonia, 10/02/2025, ~10h30 | gramado: 33 °C ao sol e 26 °C na sombra; asfalto fresado 54 °C | ar + superfície | GZH, 10/02/2025 |
| Diferença entre bairros de POA | até **20 °C** (Sarandi e Rubem Berta com 47,3 °C × Morro São Pedro com 27,8 °C; Rodoviária 45,4 °C × Parque Farroupilha 35,2 °C) | superfície (Landsat 8, média de 10 verões) | Matinal, 18/12/2023 (estudo da Arquitetura/UFRGS de Carolina Cristófoli Falcão) |
| INMET A801, 04/02/2025 | ar 37,3 °C; sensação ao sol 47,0 °C; dose de **91,0 °C·h** acima de 34 °C (onde começa o laranja da nota técnica da SMS de POA) | ar (estação oficial, num gramado) | `python/` e `matematica/` deste repositório |
| Nossos 4 locais, satélite, 6 passagens de verão | piso médio de 41,7 °C (Harmonia) a 35,6 °C (calçadão), medido na área que cada estação representa; o piso fica de 8 a 14 °C acima do ar oficial | superfície | `python/` (Landsat 8/9 e Sentinel-2) |
| Bebedouros públicos | **menos da metade funciona** | levantamento jornalístico | Band RS, 06/02/2026 |
| Pessoas em situação de rua | a prefeitura distribuiu água a mais de 5 mil pessoas na força-tarefa do calor | — | Band RS, 06/02/2026 |

**A surpresa dos nossos dados:** o "refúgio" (Marinha) ficou em 3º no satélite, e o calçadão dos Andradas, sombreado pelos prédios, ficou em 4º (o mais fresco às 10h20). **O calor do local não se adivinha: se mede.**

## 3. Quem sofre

| Público | Como o calor afeta | Ponto de contato que funciona |
|---|---|---|
| **Cidadão em lazer**, sobretudo os grupos de risco (idosos, crianças, gestantes, pessoas com doença crônica) | Passa mal sem perceber que o calor ali é bem maior que o da previsão | O **app**: onde e quando ir, por atividade |
| **Quem trabalha parado na rua** (o exemplo principal é o ambulante do Largo Glênio Peres) | Não pode sair do posto | A **estação**: luz, display e nebulizador, sem precisar de celular |
| **Pessoas em situação de rua** | Não têm para onde ir, e muitas não têm celular | A **estação** e a rede de pontos de hidratação |
| **Gestão pública e quem organiza o trabalho na rua** (meio ambiente, Defesa Civil, empresas de limpeza) | Decidem sombra, arborização, horários e pausas sem saber onde o calor é pior | Os **dados**: ranking e horas em risco por local |

- **Barreira da permanência:** muita gente não sai do lugar quente porque não tem para onde ir ou não pode largar o trabalho.
- **Lição de design:** *o app atende quem pode escolher para onde ir; a estação atende quem não pode sair de onde está.*
- O gari da coleta se move com o caminhão e quase não fica perto de uma estação fixa: o benefício dele é **indireto** (a empresa e a prefeitura usam os dados para mudar horários e pausas).

**Público (decidido em 15/11):** os dois, com papéis diferentes.
- **Principal: o cidadão.** O app existe para ele: diz onde e quando ir, conforme a atividade.
- **A gestão pública usa os dados:** o ranking e as horas em risco por local mostram onde sombrear e arborizar primeiro.
- **A proteção básica não depende do app.** A própria estação avisa o risco, manda procurar sombra e se hidratar e indica o refúgio mais perto para se refrescar. Assim, quem não tem celular, está sem bateria ou não pode parar para olhar a tela também é protegido.

## 4. Por que o problema acontece

1. **Física (a ilha de calor):** o concreto e o asfalto guardam o calor, os prédios bloqueiam o vento e falta árvore.
2. **Informação (o calor do local é invisível):**
   - por norma, as estações oficiais ficam sobre grama, na sombra e longe de prédios: medem o **piso** do problema;
   - os apps de clima usam modelos em grade de quilômetros: o Largo e o Marinha viram o mesmo ponto;
   - o satélite mede só a **superfície**, por volta das 10h20, e não passa todo dia;
   - os sensores da prefeitura medem o tempo, mas não calculam a sensação térmica e não ficam nos locais de lazer do Centro (seção 5).
3. **Comportamento:** o calor não se vê, e o risco é subestimado.
4. **Alerta demais vira paisagem ("fadiga de alerta"):** um painel sempre vermelho passa a ser ignorado.

## 5. O que já existe e a lacuna

| Já existe | O que não cobre |
|---|---|
| Apps de clima com "sensação térmica" | Um número para a região, não para o local |
| Alertas do INMET e da Defesa Civil | "Está quente na cidade", mas não onde é pior nem para onde ir |
| **10 totens da Defesa Civil** (desde 15/01/2025): medem chuva, vento, temperatura, umidade, pressão, radiação solar e qualidade do ar; têm sirene, luz e alto-falante | Ficam em áreas de risco de cheia e deslizamento (Ilhas, Sarandi, Lami...), **nenhum no Centro**; **não calculam sensação térmica** e o alerta é para cheia/deslizamento, não para calor |
| **6 estações de qualidade do ar da Smamus** (desde 17/03/2025), com dados ao vivo em qualidadedoarpoa.com | Uma fica na Rodoviária (Centro), nenhuma nos locais de lazer; mostram só as variáveis brutas, **sem sensação térmica** nem alerta de calor |
| **Observatório Térmico Urbano** (Smamus, 13/11/2026) | Estima a temperatura de **superfície**, por satélite, só de prédios certificados; não é um mapa do calor da cidade |
| **UrbVerde** (IAU-USP): base nacional de ilhas de calor | Temperatura de **superfície** (Landsat), não o ar nem a sensação |
| Refúgios climáticos (Barcelona, Buenos Aires, Rosário) | Mostram que a ideia funciona, mas não existem aqui |
| Projeto aprovado na Câmara de POA (17/12/2025) que protege servidores e terceirizados (garis, zeladoria) no calor extremo | **Não tem número nem índice**: depende dos alertas regionais da Defesa Civil |

**A lacuna:** Porto Alegre já mede o tempo em 16 pontos, mas nenhum deles transforma isso em **sensação térmica**, **alerta de calor** ou **alívio no local**, e nenhum está nos **espaços de lazer do Centro**. Também ninguém transforma a medição em uma recomendação para o cidadão.

## 6. A nossa proposta: um dado, dois usos

- **Agora (cidadão e trabalhador):** a estação mede ar, umidade, vento e sol, calcula a sensação real (Temperatura Aparente de Steadman), mostra o risco na luz e no display e liga o nebulizador; o app diz onde e quando ir, conforme a atividade.
- **Sem depender do app:** com risco alto, o display da estação manda procurar sombra e se hidratar e indica o refúgio mais perto para se refrescar (nome e distância).
- **Depois (cidade):** o ranking e as horas em risco por local mostram onde sombrear e arborizar primeiro, e dão dados locais para políticas como o projeto de proteção aos trabalhadores.
- **Não competimos com a prefeitura: completamos.** Ela já tem sensores; falta a camada que transforma a medição em sensação, alerta e ação.

## 7. Decisões de design que respondem ao problema

| Problema | Resposta no projeto |
|---|---|
| Fadiga de alerta | Histerese de 0,5 °C na cor e relé que só liga com 10 s de risco confirmado (`edge/risco.h`, `edge/rele.h`) |
| Quem não tem ou não pode usar celular | LEDs, display e nebulizador na própria estação; com risco alto, o display manda procurar sombra e água e indica o refúgio mais perto que esteja aberto (na E1, a Praça XV, a 24 m; ver `edge/refugio.h`) |
| Saber se o refúgio é mesmo fresco | Estação de controle no Marinha (E4), que valida o refúgio |
| Falta de água | Cadastro de pontos de hidratação (parte do Web) |
| Calor invisível nos dados oficiais | Sensação térmica com vento e sol, medida no ponto |

## 8. O que o protótipo prova e o que não prova

- **Prova:** dá para medir a sensação térmica com vento e sol num ponto, alertar, agir no local, mandar para a nuvem e recomendar no app.
- **Ainda não prova:** a diferença no **ar** entre os 4 locais. Para isso, as estações precisam ser instaladas e medir um verão inteiro. É o próximo passo do projeto.

## 9. Visão (fora da entrega de 19/11)

- Levar a rede aos bairros mais quentes, como Sarandi e Rubem Berta (os mais quentes na superfície, segundo o estudo da UFRGS).
- Rodar a lógica de sensação térmica e alerta de calor sobre os sensores que a prefeitura já tem (os totens já têm vento, radiação, temperatura, umidade, luz e alto-falante).
- Mapa de pontos de hidratação que funcionam, em parceria com a prefeitura e o comércio.
- Recomendação em linguagem natural, com IA.

## 10. Como medir o sucesso

- Horas por dia em nível de risco, por local.
- A diferença entre o calor oficial e o medido.
- No futuro: quantas pessoas mudaram de horário ou de local, e onde a prefeitura agiu.

## 11. Limites e cuidados (para não ser pego de surpresa)

- A Temperatura Aparente **não é** o índice legal do calor no trabalho. A NHO 06 (Fundacentro) e a NR-15 usam o **IBUTG**, que pede termômetro de globo e de bulbo úmido. O Forno Alegre é um **alerta e um indicador**, e pode mostrar onde vale fazer a avaliação oficial.
- O projeto de POA para os trabalhadores foi **aprovado na Câmara**; a sanção não foi confirmada, e um parecer da Câmara questiona se o município pode legislar sobre o tema. Diga "projeto aprovado", não "lei".
- As medições do InGá e da GZH são pontuais, de ONG e de jornal, não oficiais.
- A sensação de ~38/45 °C no Largo é uma estimativa nossa, sem medida de vento e de sol.
- Números que **não** usamos, por falta de fonte: "3 °C a 12 °C entre bairros de POA" (na GZH de 26/01/2026, os 12 °C são de Balneário Camboriú) e "32 de 87 bebedouros funcionando".

## 12. A frase do problema (decidida em 15/11)

> **"Porto Alegre já mede o tempo em 16 pontos, mas nenhum diz quanto calor a pessoa sente na praça, nem avisa, nem refresca."**

- Escolhida por ter um número que dá para conferir (os 16 pontos da seção 5) e por mostrar a lacuna: medir não é avisar nem refrescar.
- As outras candidatas ficam como apoio para o pitch:
  - *"Os alertas de calor falam da cidade, mas o risco acontece no metro quadrado onde a pessoa está, e ninguém transforma esse metro quadrado em alerta."*
  - *"No Centro de Porto Alegre, nem quem está na rua sabe quanto calor sente onde está, nem a cidade sabe onde sombrear primeiro."*

## 13. Pendente do Matheus

- [x] Público: o cidadão como principal, a gestão pública usando os dados, e a proteção básica na própria estação, sem depender do app (seção 3).
- [ ] A história pessoal com o calor (para o pitch, até 18/11).
- [x] A frase do problema (seção 12).
- [x] A IA do primeiro rascunho da pesquisa: Gemini (registrado no `AI.md`).

## 14. Fontes (abertas e conferidas em 14/11/2026)

- GZH, Jean Peixoto, 10/02/2025. "Ilhas de calor no centro de Porto Alegre registram 54ºC nesta segunda-feira". https://gauchazh.clicrbs.com.br/ambiente/noticia/2025/02/ilhas-de-calor-no-centro-de-porto-alegre-chegam-a-54oc-nesta-segunda-feira-cm6zgxvj2003s013793p6zcwj.html
- Sul21, 05/02/2025. "Piso de concreto do Parque Harmonia chega a 61 ºC...". https://sul21.com.br/noticias/geral/2025/02/piso-de-concreto-do-parque-harmonia-chega-a-61-oc-formando-ilha-de-calor-no-centro-de-porto-alegre/
- Matinal, Gregório Mascarenhas, 18/12/2023. "Ilhas de calor: temperatura média do solo de Porto Alegre pode variar até 20ºC no verão". https://www.matinaljornalismo.com.br/matinal/reportagem-matinal/ilhas-de-calor-temperatura-media-do-solo-de-porto-alegre-pode-variar-ate-20oc-no-verao/
- GZH, Isabella Sander, 26/01/2026. "Forno Alegre: como concreto e asfalto criam ilhas de calor na capital gaúcha e o que pode ser feito". https://gauchazh.clicrbs.com.br/ambiente/noticia/2026/01/forno-alegre-como-concreto-e-asfalto-criam-ilhas-de-calor-na-capital-gaucha-e-o-que-pode-ser-feito-cmkd1hd8900t1013o7afyq8bs.html
- GZH, Rodrigo Lopes, 13/11/2026. "Porto Alegre apresenta, na COP31, plataforma que demonstra a redução de temperatura em prédios...". https://gauchazh.clicrbs.com.br/ambiente/noticia/2026/11/porto-alegre-apresenta-na-cop31-plataforma-que-demonstra-a-reducao-de-temperatura-em-predios-com-praticas-sustentaveis-cmwf183qa00q001e8gc8zw3c3.html
- Prefeitura de Porto Alegre/Smamus, 13/11/2026. Observatório Térmico Urbano. https://prefeitura.poa.br/smamus/noticias/porto-alegre-apresenta-plataforma-que-demonstra-reducao-de-temperatura-em
- Prefeitura de Porto Alegre/Defesa Civil. Totens de monitoramento e alerta. https://prefeitura.poa.br/defesa-civil/projetos/totens-de-monitoramento-e-alerta
- Prefeitura de Porto Alegre/Smamus. Monitoramento da qualidade do ar. https://prefeitura.poa.br/smamus/noticias/porto-alegre-implementa-modelo-de-monitoramento-de-qualidade-do-ar-inedito-no-pais e painel https://qualidadedoarpoa.com/
- Brasil de Fato, 19/12/2025. "Porto Alegre aprova projeto que protege trabalhadores expostos ao calor extremo". https://www.brasildefato.com.br/2025/12/19/porto-alegre-aprova-projeto-que-protege-trabalhadores-expostos-ao-calor-extremo/
- Instituto Ar e Médicos pelo Clima, 2026. "Mudança do Clima: Calor e Saúde do Trabalhador – Guia Prático para Empresas" (PDF). https://institutoar.org.br/wp-content/uploads/2026/02/instituto-ar-publicacoes-mudanca-do-clima-calor-e-saude-do-trabalhador-guia-pratico-para-empresas.pdf
- IAU-USP. "UrbVerde lança base nacional de dados sobre ilhas de calor urbanas". https://www.iau.usp.br/institucional/destaque-do-instituto/urbverde-lanca-base-nacional-de-dados-sobre-ilhas-de-calor-urbanas/
- UOL Ecoa, Rone Carvalho, 03/01/2026. "O que são ilhas de calor e o que elas têm a ver com sua cidade mais quente". https://www.uol.com.br/ecoa/faq/o-que-sao-ilhas-de-calor-e-o-que-elas-tem-a-ver-com-sua-cidade-mais-quente.htm
- Band RS, 06/02/2026. "Bebedouros públicos: Menos da metade funcionam em Porto Alegre". https://www.youtube.com/watch?v=Ipnk5_DG_wI
- Dialogue Earth. "Grandes cidades criam abrigos climáticos contra ondas de calor" (a página não abriu para a ferramenta; os números de Barcelona vieram do trecho da busca: **conferir antes de citar**). https://dialogue.earth/pt-br/clima/grandes-cidades-abrigos-climaticos-ondas-de-calor/
- Dados próprios: INMET A801 (2025), Landsat 8/9 e Sentinel-2 via Microsoft Planetary Computer, áreas do OpenStreetMap (ver `python/` e `matematica/`).
