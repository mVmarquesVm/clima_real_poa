// Formatação no padrão brasileiro (vírgula decimal, data dd/mm/aaaa).
// Intl é a "régua" de formatação que já vem no navegador: não precisa de biblioteca.

export function numero(valor, casas = 1) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor)
}

// "2025-02-04" -> "04/02/2025". O T12:00 evita que o fuso de Brasília
// (UTC-3) faça a data "voltar" um dia.
export function data(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR')
}

// O NDVI vai de 0 (concreto, asfalto) a ~0,8 (copa de árvore).
// Traduzimos em palavras para quem não conhece o índice.
export function descreverVerde(ndvi) {
  if (ndvi < 0.2) return 'pouco verde'
  if (ndvi < 0.5) return 'verde médio'
  return 'muito verde'
}
