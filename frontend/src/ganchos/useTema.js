import { useState } from 'react'

// Onde a escolha da pessoa fica guardada no navegador. O mesmo nome está no
// script do index.html, que aplica o tema ANTES de a página aparecer.
export const CHAVE_TEMA = 'forno-alegre:tema'

// Tema claro/escuro da página inteira.
// Como funciona: o atributo data-tema="escuro" no <html> troca os valores dos
// tokens de cor (index.css), e todos os componentes mudam juntos, como um
// interruptor geral da casa.
// - 1ª visita: segue o sistema (celular ou PC no modo escuro) — o index.html decide;
// - depois que a pessoa aperta o botão, vale a escolha dela (fica salva).
export default function useTema() {
  const [tema, setTema] = useState(() =>
    document.documentElement.dataset.tema === 'escuro' ? 'escuro' : 'claro',
  )

  function alternar() {
    const novo = tema === 'escuro' ? 'claro' : 'escuro'
    // Troca o atributo na hora (antes do React redesenhar), para o mapa já
    // encontrar os tokens novos quando o estilo escuro carregar.
    document.documentElement.dataset.tema = novo
    // Em janela anônima ou com o armazenamento bloqueado, o navegador pode
    // recusar: o tema troca do mesmo jeito, só não fica lembrado.
    try {
      localStorage.setItem(CHAVE_TEMA, novo)
    } catch {
      /* sem armazenamento: segue sem lembrar */
    }
    setTema(novo)
  }

  return { escuro: tema === 'escuro', alternar }
}
