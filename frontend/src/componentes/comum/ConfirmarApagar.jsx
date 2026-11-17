import { useEffect, useRef, useState } from 'react'
import { CLASSE_BOTAO, CLASSE_BOTAO_SECUNDARIO } from '../../lib/formulario'
import MensagemErro from './MensagemErro'

// A pergunta "Apagar X?" antes de apagar de verdade.
// É um <dialog> nativo aberto com showModal(): o navegador deixa o resto da
// página inerte (o Tab e o leitor de tela não saem da caixa) e fecha com Esc,
// sem precisarmos programar a "prisão do foco" à mão.
//   oQue:        "o local" / "o ponto de hidratação", para a frase;
//   nome:        o nome do item, para a pessoa ter certeza de qual é;
//   apagar:      ({signal}) -> a promessa da API (o DELETE);
//   aoApagado(): deu certo;  aoFechar(): desistiu (Cancelar ou Esc).
export default function ConfirmarApagar({ oQue, nome, apagar, aoApagado, aoFechar }) {
  const caixa = useRef(null)
  const cancelar = useRef(null)
  const controle = useRef(null)
  const travado = useRef(false) // contra 2 cliques (ver o useFormulario)
  const [apagando, setApagando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    const dialogo = caixa.current
    dialogo.showModal()
    // O foco começa no "Cancelar", o botão SEGURO: um Enter sem querer não apaga nada.
    cancelar.current?.focus()
    return () => {
      controle.current?.abort()
      dialogo.close()
    }
  }, [])

  async function confirmar() {
    if (travado.current) return
    travado.current = true
    setApagando(true)
    setErro(null)
    controle.current = new AbortController()
    try {
      await apagar({ signal: controle.current.signal })
      aoApagado()
    } catch (e) {
      if (controle.current.signal.aborted) return
      // 404 = alguém já apagou: para a pessoa, o resultado é o mesmo.
      if (e.status === 404) {
        aoApagado()
        return
      }
      setErro(e)
      setApagando(false)
      travado.current = false
    }
  }

  return (
    <dialog
      ref={caixa}
      // Esc: o navegador dispara "cancel". Fechamos pelo React (aoFechar), e
      // não deixamos o navegador fechar sozinho; durante o envio, o Esc não vale.
      onCancel={(e) => {
        e.preventDefault()
        if (!apagando) aoFechar()
      }}
      aria-labelledby="titulo-apagar"
      aria-describedby="texto-apagar"
      className="m-auto w-[calc(100%-2rem)] max-w-md space-y-4 rounded border border-borda-forte bg-superficie p-4 text-texto backdrop:bg-veu"
    >
      <h2 id="titulo-apagar" className="text-lg font-bold">
        Apagar {oQue}?
      </h2>
      <p id="texto-apagar">
        <strong>{nome}</strong> vai sair do cadastro. <strong>Isso não pode ser desfeito.</strong>
      </p>
      {erro && <MensagemErro titulo="Não deu para apagar" erro={erro} />}
      <div className="flex flex-wrap justify-end gap-3">
        <button
          ref={cancelar}
          type="button"
          onClick={aoFechar}
          disabled={apagando}
          className={CLASSE_BOTAO_SECUNDARIO}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={confirmar}
          aria-disabled={apagando}
          // O vermelho de erro com o texto da cor do fundo. Medido: 5,26:1 no claro e 7,82:1 no escuro.
          className={`${CLASSE_BOTAO} bg-erro text-fundo aria-disabled:cursor-wait`}
        >
          {apagando ? 'Apagando…' : 'Sim, apagar'}
        </button>
      </div>
    </dialog>
  )
}
