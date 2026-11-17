import { useEffect, useRef, useState } from 'react'
import useLista from '../../ganchos/useLista'
import { CLASSE_BOTAO_SECUNDARIO } from '../../lib/formulario'
import Aviso from '../comum/Aviso'
import ConfirmarApagar from '../comum/ConfirmarApagar'
import EstadoCarregando from '../comum/EstadoCarregando'
import MensagemErro from '../comum/MensagemErro'

// O CRUD de UM recurso da API (locais de lazer ou pontos de hidratação): a
// mesma "máquina" para os dois; muda só o que vem nas props.
//   prefixo:  "local" / "hidratacao" (para os ids);
//   recurso:  api.locais / api.hidratacao (listar, criar, substituir, apagar);
//   Lista:    o componente dos cartões ({itens, aoEditar, aoApagar});
//   Formulario: o componente do formulário ({item, aoSalvar, aoCancelar});
//   textos:   {titulo, adicionar, carregando, vazio, item ("Local"), oQue ("o local")}.
//
// Estados da lista: carregando (1ª busca) -> erro sem lista -> vazio -> a lista.
// Se a lista já apareceu e uma nova busca falhar, ela fica na tela com o erro
// em cima: melhor um dado de agora há pouco que tela nenhuma.
export default function PainelCadastro({ prefixo, recurso, Lista, Formulario, textos }) {
  const { itens, erro, carregando, recarregar } = useLista(recurso.listar)
  const [formulario, setFormulario] = useState(null) // null | {item: null (novo) | o item (editar)}
  const [paraApagar, setParaApagar] = useState(null) // o item da caixa "Apagar?"
  const [aviso, setAviso] = useState(null) // {tipo, texto} depois de salvar/apagar

  // Para onde o foco vai DEPOIS da próxima renderização (o id de um elemento).
  // Quando uma ação fecha o formulário ou a caixa, o botão clicado pode ter
  // sumido, e o foco cairia no <body>: quem usa teclado voltaria ao topo da página.
  const focoDepois = useRef(null)
  useEffect(() => {
    if (!focoDepois.current) return
    const alvo = document.getElementById(focoDepois.current)
    if (alvo) {
      alvo.focus()
      focoDepois.current = null
    }
  })

  const idTitulo = `titulo-${prefixo}`
  const idAdicionar = `adicionar-${prefixo}`
  const idEditar = (item) => `editar-${prefixo}-${item.id}`

  function abrirFormulario(item) {
    setAviso(null)
    setFormulario({ item })
  }

  function fecharFormulario() {
    // Volta ao botão que abriu: o "Editar" daquele cartão ou o "Adicionar".
    focoDepois.current = formulario?.item ? idEditar(formulario.item) : idAdicionar
    setFormulario(null)
  }

  function salvo(itemDaApi) {
    const editou = Boolean(formulario?.item)
    fecharFormulario()
    setAviso({ tipo: 'sucesso', texto: `${textos.item} "${itemDaApi.nome}" ${editou ? 'atualizado' : 'salvo'}.` })
    recarregar()
  }

  function pedirApagar(item) {
    setAviso(null)
    setParaApagar(item)
  }

  function apagado() {
    const item = paraApagar
    setParaApagar(null)
    // Estava editando o item que foi apagado: o formulário não tem mais o que salvar.
    if (formulario?.item?.id === item.id) setFormulario(null)
    // O cartão e o botão "Apagar" somem: o foco vai ao título da lista.
    focoDepois.current = idTitulo
    setAviso({ tipo: 'sucesso', texto: `${textos.item} "${item.nome}" apagado.` })
    recarregar()
  }

  function fecharApagar() {
    focoDepois.current = `apagar-${prefixo}-${paraApagar.id}`
    setParaApagar(null)
  }

  // "Tentar de novo": o botão some junto com a caixa de erro, então o foco vai
  // ao título da lista antes, e não cai no <body>.
  function tentarDeNovo() {
    document.getElementById(idTitulo)?.focus()
    recarregar()
  }

  let conteudo
  if (itens === null && carregando) {
    conteudo = <EstadoCarregando texto={textos.carregando} />
  } else if (itens === null) {
    conteudo = <MensagemErro titulo={`Não deu para carregar ${textos.oQueLista}`} erro={erro} aoTentarDeNovo={tentarDeNovo} />
  } else {
    conteudo = (
      <>
        {erro && !carregando && (
          <MensagemErro titulo="Não deu para atualizar a lista" erro={erro} aoTentarDeNovo={tentarDeNovo} />
        )}
        {itens.length === 0 ? (
          <p className="rounded border border-dashed border-borda-forte bg-superficie p-4">{textos.vazio}</p>
        ) : (
          <Lista itens={itens} aoEditar={abrirFormulario} aoApagar={pedirApagar} />
        )}
      </>
    )
  }

  return (
    <div className="space-y-3">
      {/* tabIndex -1: o título pode receber o foco pelo código (depois de apagar),
          mas não entra no Tab. */}
      <h3 id={idTitulo} tabIndex={-1} className="text-lg font-semibold focus:outline-none">
        {textos.titulo}
      </h3>

      <Aviso aviso={aviso} aoFechar={() => setAviso(null)} />

      {formulario ? (
        // key: trocar de item (ou de "novo" para "editar") cria um formulário
        // novo, com os valores do item certo, em vez de reaproveitar o anterior.
        <Formulario
          key={formulario.item?.id ?? 'novo'}
          item={formulario.item}
          aoSalvar={salvo}
          aoCancelar={fecharFormulario}
        />
      ) : (
        <button
          type="button"
          id={idAdicionar}
          onClick={() => abrirFormulario(null)}
          className={CLASSE_BOTAO_SECUNDARIO}
        >
          <span aria-hidden="true">+ </span>
          {textos.adicionar}
        </button>
      )}

      {/* aria-busy: avisa o leitor de tela que a lista está sendo atualizada. */}
      <div aria-busy={carregando} className="space-y-3">
        {conteudo}
      </div>

      {paraApagar && (
        <ConfirmarApagar
          oQue={textos.oQue}
          nome={paraApagar.nome}
          apagar={(opcoes) => recurso.apagar(paraApagar.id, opcoes)}
          aoApagado={apagado}
          aoFechar={fecharApagar}
        />
      )}
    </div>
  )
}
