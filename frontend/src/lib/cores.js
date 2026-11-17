// O MapLibre e o ECharts desenham num <canvas>/<svg> próprio e não leem as
// classes do Tailwind, então pegamos a cor do token (index.css) na hora de
// desenhar. Trocou o tema? Desenhe de novo, que a cor nova vem junto.
export function corDoToken(nome) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${nome}`).trim()
}
