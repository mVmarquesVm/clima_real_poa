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

// O formulário em branco. Tudo como TEXTO, igual ao que a pessoa digita
// (lat "-30,03" ainda não é número); a conversão fica no localParaApi.
export const LOCAL_VAZIO = {
  nome: '',
  tipo: '',
  lat: '',
  lon: '',
  tem_sombra: false,
  tem_bebedouro: false,
  atividades: [],
  observacao: '',
}

// "-30,0331" ou "−30.0331" -> -30.0331. Vazio -> undefined (o campo não vai,
// e a API responde "Campo obrigatório"). Texto que não é número vai como veio,
// e a API responde "Use um número": a regra fica num lugar só, no servidor.
export function numeroDoCampo(texto) {
  const limpo = texto.trim().replace(',', '.').replace('−', '-')
  if (limpo === '') return undefined
  const numero = Number(limpo)
  return Number.isFinite(numero) ? numero : texto
}

// Os valores do formulário -> o JSON que a API espera (backend/app/modelos.py).
// Campo vazio não vai no JSON: a API diz "Campo obrigatório" (e não "valor inválido").
export function localParaApi(valores) {
  return {
    nome: valores.nome,
    tipo: valores.tipo || undefined,
    lat: numeroDoCampo(valores.lat),
    lon: numeroDoCampo(valores.lon),
    tem_sombra: valores.tem_sombra,
    tem_bebedouro: valores.tem_bebedouro,
    atividades: valores.atividades,
    observacao: valores.observacao.trim() || null,
  }
}
