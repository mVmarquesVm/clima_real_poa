# Docs — Experiência e Pitch

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

**Disciplinas:** Software & Total Experience Design e Storytelling

## O que vai nesta pasta
- **[relatorio_total_experience.pdf](relatorio_total_experience.pdf):** o relatório de Total Experience (justificativa, escopo, público e entrevista, 30 RF, RNF, RN, backlog com 11 épicos e conclusão).
- Base do relatório: [problema.md](problema.md) (o problema e as fontes), [requisitos_rascunho.md](requisitos_rascunho.md) (os requisitos anotados parte por parte) e [entrevista.md](entrevista.md) (a entrevista com um usuário).
