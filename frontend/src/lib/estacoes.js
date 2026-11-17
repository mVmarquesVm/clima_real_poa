// As estações do Forno Alegre e o canal do ThingSpeak de cada uma.
// O ponto e a área de cada estação vêm do locais.json (gerado pelo Python);
// aqui fica só o que o app precisa para buscar a leitura ao vivo.
//
// canal = null quer dizer que a estação ainda não tem equipamento publicando:
// o local aparece no mapa só com os dados do satélite.
export const ESTACOES = [
  { id: 'E1', canal: 3578427 }, // Largo Glênio Peres (Wokwi)
  { id: 'E2', canal: 3584100 }, // Calçadão da Rua dos Andradas (Wokwi)
  { id: 'E3', canal: 3584102 }, // Parque Harmonia, piso (Wokwi)
  { id: 'E4', canal: 3584103 }, // Parque Marinha do Brasil, sob as árvores (Wokwi)
]

export const ESTACOES_AO_VIVO = ESTACOES.filter((e) => e.canal !== null)
