// Leva a pessoa a uma parte da página: abre a "gaveta" (<details>) que
// estiver fechada em volta, rola até lá e põe o foco no alvo. Assim quem usa
// teclado ou leitor de tela continua dali, e não do topo.
// O alvo precisa poder receber foco (um título com tabIndex -1, ou um <summary>).
export function irPara(id) {
  const alvo = document.getElementById(id)
  if (!alvo) return false
  for (let gaveta = alvo.closest('details'); gaveta; gaveta = gaveta.parentElement?.closest('details')) {
    gaveta.open = true
  }
  // Movimento reduzido: pula direto, sem a rolagem suave.
  const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  alvo.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' })
  alvo.focus({ preventScroll: true })
  history.replaceState(null, '', `#${id}`)
  return true
}

// Para usar no onClick de um link <a href="#id">: troca o pulo comum do
// navegador pelo irPara (que também abre a gaveta e move o foco).
export function aoClicarLink(evento, id) {
  if (irPara(id)) evento.preventDefault()
}
