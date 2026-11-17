// Os valores que a API guarda (iguais ao backend/app/modelos.py) e o texto que
// a pessoa vê na tela. Mudou um tipo lá, muda aqui também.

export const TIPOS_DE_LOCAL = {
  praca: 'Praça',
  parque: 'Parque',
  calcadao: 'Calçadão',
}

export const ATIVIDADES = {
  crianca: 'Levar criança',
  caminhada: 'Caminhada',
  corrida: 'Corrida',
  pedal: 'Pedal',
  piquenique: 'Piquenique',
}

export const TIPOS_DE_HIDRATACAO = {
  bebedouro: 'Bebedouro',
  fonte: 'Fonte',
  comercio: 'Comércio',
}

// Valor desconhecido (ex.: a API ganhou um tipo novo) aparece como veio, em vez de sumir.
export const rotulo = (tabela, valor) => tabela[valor] ?? valor
