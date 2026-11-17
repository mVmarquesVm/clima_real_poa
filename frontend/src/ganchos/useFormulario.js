import { useEffect, useRef, useState } from 'react'
import { ErroApi, errosPorCampo } from '../servicos/api'

// A lógica comum aos formulários do cadastro (local e ponto de hidratação):
//   - os valores dos campos e o mudar(campo, valor);
//   - os erros por campo e a caixa de erro do topo;
//   - o foco no 1º campo com erro, logo depois de enviar;
//   - a trava contra 2 cliques e o cancelamento se o formulário fechar.
//
// inicial:  os valores de partida (em branco, ou o item que vai ser editado);
// validar:  (valores) -> {campo: mensagem}; vazio = pode enviar (a mesma regra da API);
// salvar:   (valores, {signal}) -> a promessa da API (criar ou substituir);
// aoSalvar: (itemDaApi) -> deu certo.
export default function useFormulario({ inicial, validar, salvar, aoSalvar }) {
  const [valores, setValores] = useState(inicial)
  const [erros, setErros] = useState({}) // {campo: mensagem}
  const [erroGeral, setErroGeral] = useState(null) // um ErroApi, para a caixa do topo
  const [enviando, setEnviando] = useState(false)
  const formulario = useRef(null)
  const controle = useRef(null)
  // A trava é um ref, e não o estado "enviando": o estado só muda na próxima
  // renderização, e um 2º clique antes dela ainda leria "false". O ref muda na hora.
  const travado = useRef(false)
  const focarErro = useRef(false)

  // Ao abrir, o foco vai ao 1º campo: a pessoa clicou em "Adicionar"/"Editar" e já pode digitar.
  useEffect(() => {
    formulario.current?.querySelector('input, select, textarea')?.focus()
  }, [])

  // Fechou o formulário no meio do envio: cancela a requisição.
  useEffect(() => () => controle.current?.abort(), [])

  // Depois de um envio com erro, o foco vai ao 1º campo com erro (na ordem da tela).
  // Só logo depois do envio (focarErro): quando a pessoa corrige um campo, os
  // erros também mudam, e o foco não pode pular para outro campo enquanto ela digita.
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

  function mostrarErro(erro, porCampo) {
    setErroGeral(erro)
    focarErro.current = Object.keys(porCampo).length > 0
    setErros(porCampo)
  }

  async function enviar(evento) {
    evento.preventDefault()
    if (travado.current) return

    // 1º a conferência no navegador: o erro aparece na hora, sem ir à API.
    const errosDaTela = validar ? validar(valores) : {}
    if (Object.keys(errosDaTela).length) {
      mostrarErro(new ErroApi('Há campos com problema. Confira e tente de novo.', { status: 422 }), errosDaTela)
      return
    }

    travado.current = true
    setEnviando(true)
    setErroGeral(null)
    controle.current = new AbortController()
    try {
      const salvo = await salvar(valores, { signal: controle.current.signal })
      aoSalvar(salvo)
    } catch (e) {
      if (controle.current.signal.aborted) return // o formulário fechou: nada a mostrar
      // A API confere de novo (ela é a regra de verdade); o 422 dela cai aqui.
      mostrarErro(e, errosPorCampo(e))
      setEnviando(false)
      travado.current = false
    }
  }

  // Props comuns a todo campo: o id "<prefixo>-<campo>", o valor, o erro e o aoMudar.
  const campo = (prefixo) => (nome) => ({
    id: `${prefixo}-${nome}`,
    valor: valores[nome],
    erro: erros[nome],
    aoMudar: (v) => mudar(nome, v),
  })

  return { formulario, valores, mudar, erros, erroGeral, enviando, enviar, campo }
}
