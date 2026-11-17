// Regras da recomendação "onde e quando ir". Sem IA: só regras que dá para
// explicar numa frase cada uma.
//
// QUANDO: cada atividade tem uma sensação térmica máxima. Uma hora é "boa"
// quando a TA AO SOL prevista fica abaixo dela (o sol é o pior caso, o mesmo
// lado seguro da estação). Horas boas seguidas viram uma "janela".

import { ATIVIDADES } from './cadastro.js'
import { distanciaMetros } from './geo.js'
import { LIMITES } from './risco.js'

// A partir deste valor de TA, a atividade não é recomendada.
// Base: a régua da SMS de POA (27/34) e as categorias do índice de calor da
// NOAA (weather.gov/ama/heatindex), que já no 1º nível ("Caution", 80–90 °F,
// ~27–32 °C) dizem: "Fatigue possible with prolonged exposure and/or physical
// activity". Decisão do projeto, pelo lado seguro:
// - levar criança (grupo de risco) e correr (esforço forte): só no verde (< 27 °C);
// - caminhada, pedal e piquenique: até o amarelo (< 34 °C).
export const LIMITE_POR_ATIVIDADE = {
  crianca: LIMITES.amarelo,
  corrida: LIMITES.amarelo,
  caminhada: LIMITES.laranja,
  pedal: LIMITES.laranja,
  piquenique: LIMITES.laranja,
}

// Por que cada limite, em linguagem simples (aparece na tela).
export const MOTIVO_DO_LIMITE = {
  crianca: 'Criança é grupo de risco no calor: só com o risco verde.',
  corrida: 'O esforço forte esquenta o corpo: só com o risco verde.',
  caminhada: 'Esforço leve: até o risco amarelo, com água e pausas.',
  pedal: 'Esforço moderado, com o vento do movimento: até o risco amarelo.',
  piquenique: 'Parado e perto da sombra: até o risco amarelo.',
}

export const LISTA_DE_ATIVIDADES = Object.keys(ATIVIDADES)

// Horário de lazer que o app considera: das 6h às 22h. De madrugada ninguém
// leva a criança na praça, e sugerir "3h da manhã" não ajuda ninguém.
export const HORA_INICIO = 6
export const HORA_FIM = 22

const FUSO = 'America/Sao_Paulo'

// A hora do relógio de Porto Alegre (0 a 23), seja qual for o fuso do computador.
export function horaLocal(data) {
  return Number(data.toLocaleString('pt-BR', { timeZone: FUSO, hour: '2-digit', hourCycle: 'h23' }))
}

// "2026-11-17" no fuso de POA: para separar "hoje" de "amanhã".
export function diaLocal(data) {
  return data.toLocaleDateString('sv-SE', { timeZone: FUSO }) // sv-SE = formato aaaa-mm-dd
}

// As horas que ainda interessam: da hora atual em diante, dentro do horário de lazer.
export function horasDeLazer(previsao, agora) {
  const inicioDaHora = agora.getTime() - (agora.getTime() % 3600000)
  return previsao.filter((h) => {
    const hl = horaLocal(h.hora)
    return h.hora.getTime() >= inicioDaHora && hl >= HORA_INICIO && hl < HORA_FIM
  })
}

// Compara com 1 casa decimal, a mesma que a tela mostra: senão 26,98 °C seria
// "boa" e apareceria como "27,0 °C", contradizendo o "abaixo de 27".
export const arredondar = (ta) => Math.round(ta * 10) / 10
export const horaBoa = (h, atividade) => arredondar(h.taSol) < LIMITE_POR_ATIVIDADE[atividade]

// Junta as horas boas SEGUIDAS numa janela: {inicio, fim, taMax}.
// "fim" é o fim da última hora boa (14h boa -> a janela vai até 15h).
// Uma hora ruim no meio, ou a troca de dia, fecha a janela.
export function janelasBoas(horas, atividade) {
  const janelas = []
  let atual = null
  for (const h of horas) {
    const continua =
      atual && h.hora.getTime() === atual.fim.getTime() && diaLocal(h.hora) === diaLocal(atual.inicio)
    if (horaBoa(h, atividade)) {
      if (continua) {
        atual.fim = new Date(h.hora.getTime() + 3600000)
        atual.taMax = Math.max(atual.taMax, h.taSol)
      } else {
        atual = { inicio: h.hora, fim: new Date(h.hora.getTime() + 3600000), taMax: h.taSol }
        janelas.push(atual)
      }
    } else {
      atual = null
    }
  }
  return janelas
}

// Sem nenhuma hora boa: a hora MENOS quente, para a pessoa ao menos saber.
export function horaMenosQuente(horas) {
  return horas.reduce((melhor, h) => (melhor === null || h.taSol < melhor.taSol ? h : melhor), null)
}

// ---- ONDE ----
// Os locais do cadastro (GET /locais) que servem para a atividade, do melhor
// para o pior. A previsão é a mesma para todos (modelo em grade), então o que
// deixa um local mais SEGURO é a sombra. As regras, em ordem:
//   1) com sombra antes de sem sombra;
//   2) o mais perto de você (se você mostrou onde está);
//   3) com bebedouro antes de sem bebedouro;
//   4) o nome, para a ordem nunca "pular" entre uma busca e outra.
export function rankearLocais(locais, atividade, posicao = null) {
  return locais
    .filter((l) => l.atividades.includes(atividade))
    .map((l) => ({ ...l, distancia: posicao ? distanciaMetros(posicao, l) : null }))
    .sort(
      (a, b) =>
        Number(b.tem_sombra) - Number(a.tem_sombra) ||
        (posicao ? a.distancia - b.distancia : 0) ||
        Number(b.tem_bebedouro) - Number(a.tem_bebedouro) ||
        a.nome.localeCompare(b.nome, 'pt-BR'),
    )
}

// O ponto de hidratação está aberto nessa data e hora (de Porto Alegre)?
// Sem horário (abre = null) = 24 h. "fecha" é a hora em que já está fechado.
export function abertoEm(ponto, data) {
  if (!ponto.ativo) return false
  const domingo = data.toLocaleDateString('en-US', { timeZone: FUSO, weekday: 'short' }) === 'Sun'
  if (domingo && !ponto.abre_domingo) return false
  if (ponto.abre === null) return true
  const hhmm = data.toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  return ponto.abre <= hhmm && hhmm < ponto.fecha // "09:00" <= "14:30" funciona como texto
}

// Mais longe que isto (~12 min a pé), o app avisa "leve a sua água".
export const AGUA_LONGE_M = 1000

// O ponto mais perto de um lugar que esteja ABERTO em algum momento da visita
// (de "inicio" até "fim"). Confere o início e cada hora cheia no meio: uma
// janela das 6h às 10h conta o shopping que abre às 9h.
export function pontoMaisPerto(pontos, lugar, inicio, fim = inicio) {
  const momentos = [inicio]
  const primeiraHoraCheia = Math.ceil(inicio.getTime() / 3600000) * 3600000
  for (let t = primeiraHoraCheia; t < fim.getTime(); t += 3600000) momentos.push(new Date(t))
  return pontos
    .filter((p) => momentos.some((m) => abertoEm(p, m)))
    .map((p) => ({ ...p, distancia: distanciaMetros(lugar, p) }))
    .sort((a, b) => a.distancia - b.distancia)[0] ?? null
}
