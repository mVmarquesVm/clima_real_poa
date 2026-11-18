import { useEffect, useRef, useState } from 'react'
import { CLASSE_BOTAO_SECUNDARIO, CLASSE_CAMPO } from '../../lib/formulario'
import { buscarCep, buscarPonto, ERROS_ENDERECO } from '../../servicos/endereco'

// As frases do serviço de endereço foram escritas para o CADASTRO (que tem um
// mapa para tocar). Aqui não há mapa: as que falam dele ganham outra versão.
const FRASE_DA_PARTIDA = {
  [ERROS_ENDERECO.naoAchou]: 'Não achamos esse endereço. Confira o CEP e o número.',
  [ERROS_ENDERECO.semServico]: 'Não deu para buscar o endereço agora. Tente de novo em instantes.',
  [ERROS_ENDERECO.foraDePoa]: 'Esse CEP não é de Porto Alegre. Digite um CEP de Porto Alegre.',
}

// "De onde você sai": 2 jeitos, do mais fácil ao plano B.
//   1) "Perto de mim": a localização do celular (o navegador pergunta antes);
//   2) o CEP + número: para quem negou a localização ou prefere não mostrar.
// O CEP aparece sozinho quando a localização falha, ou no botão "Digitar o CEP".
// O texto do resultado fica numa região role="status" SEMPRE montada: o leitor
// de tela anuncia quando a localização chega (ou dá erro) sem tirar o foco.
export default function BotaoPertoDeMim({ localizacao }) {
  const { estado, erro, posicao, pedir, usarEndereco, esquecer } = localizacao
  const [abrirCep, setAbrirCep] = useState(false)
  const [cep, setCep] = useState('')
  const [numero, setNumero] = useState('')
  const [busca, setBusca] = useState({ estado: 'parado', texto: '' })
  const pedido = useRef(null)
  const campoCep = useRef(null)
  useEffect(() => () => pedido.current?.abort(), [])

  const mostrarCep = (abrirCep || estado === 'erro') && estado !== 'ok'

  function abrirCampoCep() {
    setAbrirCep(true)
    // O campo só existe depois do próximo desenho da tela.
    setTimeout(() => campoCep.current?.focus(), 0)
  }

  async function buscar(evento) {
    evento.preventDefault()
    pedido.current?.abort()
    const controle = new AbortController()
    pedido.current = controle
    setBusca({ estado: 'buscando', texto: 'Buscando o endereço…' })
    try {
      const endereco = await buscarCep(cep, { signal: controle.signal })
      const achado = await buscarPonto(endereco, numero, { signal: controle.signal })
      const onde = [endereco.rua, achado.exato ? numero.trim() : ''].filter(Boolean).join(', ')
      setBusca({ estado: 'parado', texto: '' })
      setAbrirCep(false)
      usarEndereco(achado, onde)
    } catch (e) {
      if (controle.signal.aborted) return
      setBusca({ estado: 'erro', texto: FRASE_DA_PARTIDA[e.message] ?? e.message })
      campoCep.current?.focus() // de volta ao CEP, para corrigir (o campo já lê o erro)
    }
  }

  function esquecerTudo() {
    esquecer()
    setCep('')
    setNumero('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={pedir}
          disabled={estado === 'buscando'}
          className={`${CLASSE_BOTAO_SECUNDARIO} disabled:opacity-60`}
        >
          <span aria-hidden="true">⌖ </span>
          {estado === 'ok' && !posicao?.onde ? 'Atualizar minha localização' : 'Perto de mim'}
        </button>
        {!mostrarCep && estado !== 'ok' && (
          <button type="button" onClick={abrirCampoCep} className={CLASSE_BOTAO_SECUNDARIO}>
            Digitar o CEP
          </button>
        )}
        {estado === 'ok' && (
          <button type="button" onClick={esquecerTudo} className={CLASSE_BOTAO_SECUNDARIO}>
            {posicao?.onde ? 'Trocar o ponto de partida' : 'Esquecer minha localização'}
          </button>
        )}
      </div>
      <p role="status">
        {estado === 'buscando' && 'Descobrindo onde você está…'}
        {estado === 'ok' &&
          (posicao?.onde
            ? `Pronto: as distâncias são contadas a partir de ${posicao.onde}.`
            : 'Pronto: o local mais perto de você aparece primeiro.')}
        {estado === 'erro' && <span className="text-erro">⚠ {erro}</span>}
      </p>

      {mostrarCep && (
        <form onSubmit={buscar} className="space-y-2 rounded border border-borda p-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
            <div>
              <label htmlFor="partida-cep" className="block font-semibold">
                CEP de onde você sai
              </label>
              <input
                id="partida-cep"
                ref={campoCep}
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="90010-150"
                maxLength={10}
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                aria-invalid={busca.estado === 'erro' ? true : undefined}
                aria-describedby={busca.estado === 'erro' ? 'partida-busca' : undefined}
                className={`mt-1 ${CLASSE_CAMPO}`}
              />
            </div>
            <div>
              <label htmlFor="partida-numero" className="block font-semibold">
                Número <span className="font-normal text-texto-suave">(se souber)</span>
              </label>
              <input
                id="partida-numero"
                type="text"
                autoComplete="off"
                maxLength={10}
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className={`mt-1 ${CLASSE_CAMPO}`}
              />
            </div>
            <button
              type="submit"
              disabled={busca.estado === 'buscando'}
              className={`${CLASSE_BOTAO_SECUNDARIO} disabled:opacity-60`}
            >
              Usar este endereço
            </button>
          </div>
          <p className="text-texto-suave">O CEP é buscado no ViaCEP e no OpenStreetMap, só quando você toca no botão.</p>
          <p id="partida-busca" role="status" className={busca.estado === 'erro' ? 'text-erro' : ''}>
            {busca.estado === 'erro' && <span aria-hidden="true">⚠ </span>}
            {busca.texto}
          </p>
        </form>
      )}
    </div>
  )
}
