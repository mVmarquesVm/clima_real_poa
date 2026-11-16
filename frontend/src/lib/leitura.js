import { NIVEIS, SEM_DADO, nivelDoCampo } from './risco'

// A estação publica a cada 20 s. Com mais de 2 min sem nada novo, a leitura
// é "velha" e não decide o risco: a mesma regra do Edge ("leitura velha não
// é usada para decidir").
export const IDADE_MAXIMA_S = 120

// A situação de uma estação AGORA: há quanto tempo foi a leitura, se ela ainda
// vale e qual o nível. Sem leitura, ou com leitura velha, o nível é "sem dado".
// Quem decide o nível é a ESTAÇÃO (field6), e não o app: assim a cor da tela
// é igual ao LED da praça.
export function situacao(leitura, agora) {
  const idade = leitura ? (agora - leitura.criadoEm.getTime()) / 1000 : Infinity
  const recente = idade <= IDADE_MAXIMA_S
  const nivel = recente ? nivelDoCampo(leitura.risco) : NIVEIS[SEM_DADO]
  return { idade, recente, nivel }
}
