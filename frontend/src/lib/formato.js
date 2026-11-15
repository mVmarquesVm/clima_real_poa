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

// Data e hora no fuso de Porto Alegre: "15/11/2026, 18:30".
export function dataHora(data) {
  return data.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

// Segundos -> "há 12 s", "há 3 min", "há 2 h", "há 4 dias".
export function tempoDesde(segundos) {
  const s = Math.max(0, Math.round(segundos))
  if (s < 60) return `há ${s} s`
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  const dias = Math.floor(s / 86400)
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}
