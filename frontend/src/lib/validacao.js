// A conferência no NAVEGADOR, igual à da API (backend/app/modelos.py e erros.py):
// as mesmas regras e as mesmas frases. Ela não substitui a API, que confere de
// novo (quem chama a API sem o app não passa por aqui); ela só poupa a ida e
// volta e mostra o erro na hora. Mudou uma regra lá, muda aqui também.
//
// Cada função recebe os valores do formulário (texto, como a pessoa digitou) e
// devolve {campo: mensagem}; vazio = pode enviar.

// Com o ".js": assim o arquivo também roda no Node (o teste que compara com a API).
import { numeroDoCampo } from './cadastro.js'

// Caixa que contém o município de Porto Alegre (a mesma da API).
export const LAT_MIN = -30.27
export const LAT_MAX = -29.93
export const LON_MIN = -51.31
export const LON_MAX = -51.01

const NOME_MINIMO = 3
const NOME_MAXIMO = 80
const OBSERVACAO_MAXIMA = 200
const HORARIO = /^([01]\d|2[0-3]):[0-5]\d$/ // HH:MM, de 00:00 a 23:59

const OBRIGATORIO = 'Campo obrigatório.'
const NUMERO = 'Use um número.'
const CONTROLE = 'Tem caracteres invisíveis de controle, que não são permitidos.'

// O Python conta letras (code points), e o .length do JS conta pedaços de
// UTF-16 (um emoji vale 2). O [...texto] conta como o Python.
const tamanho = (texto) => [...texto].length
// Cc = caracteres de controle (ex.: o byte nulo); Cf = de formatação, invisíveis
// (ex.: o espaço de largura zero). As mesmas categorias Unicode da API.
const temControle = (texto) => /\p{Cc}/u.test(texto)
const visiveis = (texto) => [...texto].filter((c) => !/\s|\p{Cc}|\p{Cf}/u.test(c)).length

// Na mesma ordem da API: o tamanho primeiro, depois os invisíveis.
function erroDoNome(nome) {
  const limpo = nome.trim() // a API também tira os espaços das pontas
  if (tamanho(limpo) < NOME_MINIMO) return `Use pelo menos ${NOME_MINIMO} caracteres.`
  if (tamanho(limpo) > NOME_MAXIMO) return `Use no máximo ${NOME_MAXIMO} caracteres.`
  if (temControle(limpo)) return CONTROLE
  if (visiveis(limpo) < NOME_MINIMO) return `Use pelo menos ${NOME_MINIMO} letras ou números visíveis.`
  return null
}

// lat/lon: vazio, não número ou fora de Porto Alegre.
function erroDaCoordenada(texto, eixo) {
  const numero = numeroDoCampo(texto)
  if (numero === undefined) return OBRIGATORIO
  if (typeof numero !== 'number') return NUMERO
  const [min, max, nome] = eixo === 'lat' ? [LAT_MIN, LAT_MAX, 'latitude'] : [LON_MIN, LON_MAX, 'longitude']
  if (numero < min || numero > max) return `Fora de Porto Alegre: a ${nome} vai de ${min} a ${max}.`
  return null
}

// Junta só os campos que têm erro: {nome: null, lat: "..."} -> {lat: "..."}.
const soOsErros = (erros) => Object.fromEntries(Object.entries(erros).filter(([, m]) => m))

export function validarLocal(v) {
  const observacao = v.observacao.trim()
  return soOsErros({
    nome: erroDoNome(v.nome),
    tipo: v.tipo ? null : OBRIGATORIO,
    lat: erroDaCoordenada(v.lat, 'lat'),
    lon: erroDaCoordenada(v.lon, 'lon'),
    atividades: v.atividades.length ? null : 'Escolha pelo menos 1.',
    observacao:
      tamanho(observacao) > OBSERVACAO_MAXIMA
        ? `Use no máximo ${OBSERVACAO_MAXIMA} caracteres.`
        : temControle(observacao)
          ? CONTROLE
          : null,
  })
}

// Os horários, na ordem da API: o formato de cada um; depois, se o "abre" está
// certo, os dois juntos (ou nenhum) e o de fechar depois do de abrir (no "fecha").
function errosDoHorario(v) {
  if (v.aberto_24h) return {}
  const abre = v.abre.trim()
  const fecha = v.fecha.trim()
  const formato = 'Use o formato HH:MM, de 00:00 a 23:59 (ex.: 09:00).'
  const erros = {
    abre: abre && !HORARIO.test(abre) ? formato : null,
    fecha: fecha && !HORARIO.test(fecha) ? formato : null,
  }
  if (!erros.abre && !erros.fecha) {
    if (!abre && !fecha) {
      // A ÚNICA regra que a API não tem: para ela, os dois vazios = 24 h. Mas
      // quem desmarcou "Aberto 24 h" quis dar um horário, e gravar "24 h" sem
      // avisar seria um erro silencioso.
      erros.abre = 'Preencha os dois horários, ou marque "Aberto 24 h".'
    } else if (Boolean(abre) !== Boolean(fecha)) {
      erros.fecha = 'Preencha os dois horários, ou deixe os dois vazios (aberto 24 h).'
    } else if (abre && fecha <= abre) {
      // "09:00" < "18:00" vale como texto, porque os dois têm sempre 5 caracteres.
      erros.fecha = 'O horário de fechar tem de ser depois do de abrir.'
    }
  }
  return erros
}

export function validarHidratacao(v) {
  return soOsErros({
    nome: erroDoNome(v.nome),
    tipo: v.tipo ? null : OBRIGATORIO,
    lat: erroDaCoordenada(v.lat, 'lat'),
    lon: erroDaCoordenada(v.lon, 'lon'),
    ...errosDoHorario(v),
  })
}
