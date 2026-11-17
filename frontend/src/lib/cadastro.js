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

// -30.0331 -> "-30,0331": o número da API volta para o campo como a pessoa escreveria.
const numeroParaCampo = (numero) => String(numero).replace('.', ',')

// Um local da API -> os valores do formulário de editar (o caminho inverso do localParaApi).
export function localParaFormulario(local) {
  return {
    nome: local.nome,
    tipo: local.tipo,
    lat: numeroParaCampo(local.lat),
    lon: numeroParaCampo(local.lon),
    tem_sombra: local.tem_sombra,
    tem_bebedouro: local.tem_bebedouro,
    atividades: local.atividades,
    observacao: local.observacao ?? '',
  }
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

// ---- Pontos de hidratação ----

// "aberto_24h" não existe na API: é só a caixa do formulário. Marcada, os
// dois horários vão vazios (null), que na API quer dizer "aberto 24 h".
export const HIDRATACAO_VAZIA = {
  nome: '',
  tipo: '',
  lat: '',
  lon: '',
  aberto_24h: true,
  abre: '',
  fecha: '',
  abre_domingo: true,
  ativo: true,
}

export function hidratacaoParaFormulario(ponto) {
  return {
    nome: ponto.nome,
    tipo: ponto.tipo,
    lat: numeroParaCampo(ponto.lat),
    lon: numeroParaCampo(ponto.lon),
    aberto_24h: ponto.abre === null,
    abre: ponto.abre ?? '',
    fecha: ponto.fecha ?? '',
    abre_domingo: ponto.abre_domingo,
    ativo: ponto.ativo,
  }
}

// Horário vazio vai como null: a API responde "Preencha os dois horários" se
// só um veio, e "aberto 24 h" se nenhum veio.
export function hidratacaoParaApi(valores) {
  return {
    nome: valores.nome,
    tipo: valores.tipo || undefined,
    lat: numeroDoCampo(valores.lat),
    lon: numeroDoCampo(valores.lon),
    abre: valores.aberto_24h ? null : valores.abre || null,
    fecha: valores.aberto_24h ? null : valores.fecha || null,
    abre_domingo: valores.abre_domingo,
    ativo: valores.ativo,
  }
}

// O horário do ponto em texto: "Aberto 24 h" ou "09:00 às 18:00".
export const descreverHorario = (ponto) =>
  ponto.abre === null ? 'Aberto 24 h' : `${ponto.abre} às ${ponto.fecha}`
