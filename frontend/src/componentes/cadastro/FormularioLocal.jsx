import { useEffect, useRef, useState } from 'react'
import { ATIVIDADES, LOCAL_VAZIO, localParaApi, TIPOS_DE_LOCAL } from '../../lib/cadastro'
import { api, errosPorCampo } from '../../servicos/api'
import CampoEscolha from '../comum/CampoEscolha'
import CampoOpcoes from '../comum/CampoOpcoes'
import CampoTexto from '../comum/CampoTexto'
import MensagemErro from '../comum/MensagemErro'

const BOTAO =
  'rounded px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco'

// O formulário de "Adicionar local". Quem confere os dados é a API (o 422 diz
// campo por campo o que está errado); o formulário mostra cada erro embaixo
// do seu campo e leva o foco ao 1º deles.
//   aoSalvar(localCriado): a API gravou (a seção fecha o formulário e recarrega a lista);
//   aoCancelar(): a pessoa desistiu.
export default function FormularioLocal({ aoSalvar, aoCancelar }) {
  const [valores, setValores] = useState(LOCAL_VAZIO)
  const [erros, setErros] = useState({}) // {campo: mensagem}, vindo do 422
  const [erroGeral, setErroGeral] = useState(null) // o ErroApi, para a caixa do topo
  const [enviando, setEnviando] = useState(false)
  const formulario = useRef(null)
  const controle = useRef(null)
  const travado = useRef(false) // true do clique em "Salvar" até a resposta da API

  // Ao abrir, o foco vai ao 1º campo: a pessoa clicou em "Adicionar" e já pode digitar.
  useEffect(() => {
    formulario.current?.querySelector('input')?.focus()
  }, [])

  // Fechou o formulário no meio do envio: cancela a requisição.
  useEffect(() => () => controle.current?.abort(), [])

  // Depois de um 422, o foco vai ao 1º campo com erro (na ordem da tela).
  // Só logo depois do envio (focarErro): quando a pessoa corrige um campo, os
  // erros também mudam, e o foco não pode pular para outro campo enquanto ela digita.
  const focarErro = useRef(false)
  useEffect(() => {
    if (!focarErro.current) return
    focarErro.current = false
    formulario.current?.querySelector('[aria-invalid="true"]')?.focus()
  }, [erros])

  // Mudar um campo apaga o erro DELE: o aviso some quando a pessoa já está corrigindo.
  function mudar(campo, valor) {
    setValores((v) => ({ ...v, [campo]: valor }))
    setErros((e) => {
      if (!(campo in e)) return e
      const resto = { ...e }
      delete resto[campo]
      return resto
    })
  }

  async function enviar(evento) {
    evento.preventDefault()
    // 2 cliques rápidos não criam 2 locais. A trava é um ref, e não o estado
    // "enviando": o estado só muda na próxima renderização, e um 2º clique antes
    // dela ainda leria "false". O ref muda na hora.
    if (travado.current) return
    travado.current = true
    setEnviando(true)
    setErroGeral(null)
    controle.current = new AbortController()
    try {
      const criado = await api.locais.criar(localParaApi(valores), { signal: controle.current.signal })
      aoSalvar(criado)
    } catch (e) {
      if (controle.current.signal.aborted) return // o formulário fechou: nada a mostrar
      setErroGeral(e)
      focarErro.current = true
      setErros(errosPorCampo(e))
      setEnviando(false)
      travado.current = false
    }
  }

  // Props comuns a todo campo: o id "local-<campo>", o valor, o erro e o aoMudar.
  const campo = (nome) => ({
    id: `local-${nome}`,
    valor: valores[nome],
    erro: erros[nome],
    aoMudar: (v) => mudar(nome, v),
  })

  return (
    <form
      ref={formulario}
      onSubmit={enviar}
      // noValidate: quem valida é a API, com as mensagens em português dela.
      // Sem isso, o navegador barraria o envio com o balão dele (e só no 1º erro).
      noValidate
      aria-labelledby="titulo-formulario-local"
      className="space-y-4 rounded border border-borda-forte bg-superficie p-4"
    >
      <h4 id="titulo-formulario-local" className="text-lg font-semibold">
        Novo local de lazer
      </h4>

      {erroGeral && <MensagemErro titulo="Não deu para salvar o local" erro={erroGeral} />}

      <CampoTexto {...campo('nome')} rotulo="Nome" obrigatorio maxLength={80} autoComplete="off" />
      <CampoEscolha {...campo('tipo')} rotulo="Tipo" opcoes={TIPOS_DE_LOCAL} obrigatorio />

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          {...campo('lat')}
          rotulo="Latitude"
          dica="Ex.: -30,0331 (vírgula ou ponto)"
          obrigatorio
          inputMode="decimal"
          autoComplete="off"
        />
        <CampoTexto
          {...campo('lon')}
          rotulo="Longitude"
          dica="Ex.: -51,2300 (vírgula ou ponto)"
          obrigatorio
          inputMode="decimal"
          autoComplete="off"
        />
      </div>

      <fieldset>
        <legend className="font-semibold">O local tem</legend>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
          {[
            ['tem_sombra', 'Sombra'],
            ['tem_bebedouro', 'Bebedouro'],
          ].map(([nome, texto]) => (
            <label key={nome} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`local-${nome}`}
                checked={valores[nome]}
                onChange={(e) => mudar(nome, e.target.checked)}
                className="size-4 accent-foco focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
              />
              {texto}
            </label>
          ))}
        </div>
      </fieldset>

      <CampoOpcoes {...campo('atividades')} rotulo="Bom para" opcoes={ATIVIDADES} obrigatorio />

      <CampoTexto
        {...campo('observacao')}
        rotulo="Observação"
        dica="Opcional, até 200 caracteres."
        multilinha
        maxLength={200}
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          // aria-disabled (e não disabled): o botão continua no Tab e o leitor
          // de tela lê "Salvando…"; a trava do enviar barra o 2º clique.
          aria-disabled={enviando}
          // text-fundo, e não text-white: no escuro, o foco é um laranja claro, e o
          // branco por cima ficaria ilegível. Medido: 4,99:1 no claro e 8,0:1 no escuro.
          className={`${BOTAO} bg-foco text-fundo aria-disabled:cursor-wait`}
        >
          {enviando ? 'Salvando…' : 'Salvar local'}
        </button>
        <button
          type="button"
          onClick={aoCancelar}
          className={`${BOTAO} border border-borda-forte bg-superficie hover:bg-superficie-2`}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
