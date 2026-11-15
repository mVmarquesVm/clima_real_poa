// Régua de risco do Forno Alegre: a MESMA da estação (edge/config.h e edge/risco.h).
// Fonte: Nota Técnica nº 01/26 da SMS de Porto Alegre (atualizada em 04/02/2026):
//   < 27 verde · 27–33 amarelo · 34–39 laranja · 40–51 vermelho · > 51 roxo.
// A nota só dá as cores; os conselhos são os mesmos do LCD de Orientação da estação.

export const LIMITES = { amarelo: 27, laranja: 34, vermelho: 40, roxo: 52 }

// Abaixo disto o app avisa "frio", mas o nível continua verde: o Forno Alegre
// só alerta calor (decisão de 13/11, igual ao LIMITE_FRIO_C do Edge).
export const LIMITE_FRIO = 9

// O índice de cada nível é o número que a estação manda no field6 do ThingSpeak.
// "classe" usa só tokens do tema (index.css). O texto escuro no amarelo e no
// laranja é para passar no contraste mínimo de 4,5:1 (WCAG AA).
export const NIVEIS = [
  { id: 'verde', nome: 'Verde', conselho: 'Sem risco de calor', classe: 'bg-risco-verde text-white' },
  { id: 'amarelo', nome: 'Amarelo', conselho: 'Calor: beba água e faça pausas na sombra', classe: 'bg-risco-amarelo text-black' },
  { id: 'laranja', nome: 'Laranja', conselho: 'Beba água e descanse', classe: 'bg-risco-laranja text-black' },
  { id: 'vermelho', nome: 'Vermelho', conselho: 'Saia do sol e beba água', classe: 'bg-risco-vermelho text-white' },
  { id: 'roxo', nome: 'Roxo', conselho: 'Suspenda as atividades ao ar livre', classe: 'bg-risco-roxo text-white' },
  { id: 'semdado', nome: 'Sem dado', conselho: 'Sem leitura agora. Na dúvida, fique na sombra', classe: 'bg-risco-semdado text-white' },
]

export const SEM_DADO = 5

// Número do field6 -> nível. Qualquer coisa fora de 0..5 vira "sem dado":
// na dúvida, o app não inventa um nível.
// Atenção: antes de 15/11/2026 o 4 queria dizer "sem dado" (eram 4 níveis).
// Essas entradas antigas nunca decidem, porque a leitura velha vira "sem dado
// recente" antes (ver servicos/thingspeak.js).
export function nivelDoCampo(valor) {
  // Cuidado: Number(null) e Number('') dão 0, que seria "verde". Sem valor = sem dado.
  const n = valor === null || valor === undefined || valor === '' ? NaN : Number(valor)
  return Number.isInteger(n) && n >= 0 && n <= SEM_DADO ? NIVEIS[n] : NIVEIS[SEM_DADO]
}

// Sensação térmica -> índice do nível, como o nivelPorTA() do Edge (sem a
// histerese, que só serve para o LED não piscar). Vai ser usado na previsão.
export function indicePorTA(ta, limites = LIMITES) {
  if (!Number.isFinite(ta)) return SEM_DADO
  if (ta >= limites.roxo) return 4
  if (ta >= limites.vermelho) return 3
  if (ta >= limites.laranja) return 2
  if (ta >= limites.amarelo) return 1
  return 0
}

export function ehFrio(ta) {
  return Number.isFinite(ta) && ta < LIMITE_FRIO
}
