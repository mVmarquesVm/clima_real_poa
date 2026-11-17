import { useEffect, useRef, useState } from 'react'
import useLista from '../../ganchos/useLista'
import { api } from '../../servicos/api'
import EstadoCarregando from '../comum/EstadoCarregando'
import MensagemErro from '../comum/MensagemErro'
import FormularioLocal from './FormularioLocal'
import ListaLocais from './ListaLocais'

// A seção "Cadastro" do app: o CRUD da parte de Web.
// Cada estado da lista tem a sua tela:
//   carregando (1ª busca) → erro sem lista → vazio → a lista.
// Se a lista já apareceu e uma nova busca falhar, a lista fica na tela e o
// erro aparece em cima dela: melhor um dado de agora há pouco que tela nenhuma.
export default function SecaoCadastro() {
  const { itens, erro, carregando, recarregar } = useLista(api.locais.listar)
  const [criando, setCriando] = useState(false)

  // O formulário fechou (salvou ou cancelou): o foco volta ao botão "Adicionar
  // local", que reaparece. Sem isso, ele cairia no <body>, e quem usa teclado
  // teria de voltar do topo da página. O ref "abriu" pula a 1ª renderização.
  const botaoAdicionar = useRef(null)
  const abriu = useRef(false)
  useEffect(() => {
    if (criando) abriu.current = true
    else if (abriu.current) botaoAdicionar.current?.focus()
  }, [criando])

  function salvo() {
    setCriando(false)
    recarregar()
  }

  let conteudo
  if (itens === null && carregando) {
    conteudo = <EstadoCarregando texto="Carregando os locais…" />
  } else if (itens === null) {
    conteudo = <MensagemErro titulo="Não deu para carregar os locais" erro={erro} aoTentarDeNovo={recarregar} />
  } else if (itens.length === 0) {
    conteudo = (
      <p className="rounded border border-dashed border-borda-forte bg-superficie p-4">
        Nenhum local cadastrado ainda.
      </p>
    )
  } else {
    conteudo = (
      <>
        {erro && !carregando && (
          <MensagemErro titulo="Não deu para atualizar a lista" erro={erro} aoTentarDeNovo={recarregar} />
        )}
        <ListaLocais locais={itens} />
      </>
    )
  }

  return (
    <section aria-labelledby="titulo-cadastro" className="space-y-3">
      <h2 id="titulo-cadastro" className="text-xl font-bold">Cadastro</h2>
      <p className="text-texto-suave">
        Locais de lazer e pontos de hidratação que o app usa para recomendar onde ir.
      </p>
      <h3 className="text-lg font-semibold">Locais de lazer</h3>
      {criando ? (
        <FormularioLocal aoSalvar={salvo} aoCancelar={() => setCriando(false)} />
      ) : (
        <button
          ref={botaoAdicionar}
          type="button"
          onClick={() => setCriando(true)}
          className="rounded border border-borda-forte bg-superficie px-4 py-2 font-semibold hover:bg-superficie-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          <span aria-hidden="true">+ </span>
          Adicionar local
        </button>
      )}
      {/* aria-busy: avisa o leitor de tela que a lista está sendo atualizada. */}
      <div aria-busy={carregando} className="space-y-3">
        {conteudo}
      </div>
    </section>
  )
}
