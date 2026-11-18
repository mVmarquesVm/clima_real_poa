import { useState } from 'react'

// O mesmo nome está no script do index.html, que aplica a letra ANTES de a
// página aparecer.
export const CHAVE_LETRA = 'forno-alegre:letra'

// Letra normal ou grande na página inteira, como o useTema: o atributo
// data-letra="grande" no <html> aumenta a letra base (index.css), e tudo o
// que é medido em rem cresce junto. A escolha fica guardada no aparelho.
export default function useLetra() {
  const [grande, setGrande] = useState(() => document.documentElement.dataset.letra === 'grande')

  function alternar() {
    const nova = !grande
    if (nova) document.documentElement.dataset.letra = 'grande'
    else delete document.documentElement.dataset.letra
    try {
      localStorage.setItem(CHAVE_LETRA, nova ? 'grande' : 'normal')
    } catch {
      /* sem armazenamento: troca do mesmo jeito, só não fica lembrado */
    }
    setGrande(nova)
  }

  return { grande, alternar }
}
