import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { numeroDoCampo } from '../../lib/cadastro'
import { CLASSE_BOTAO_SECUNDARIO, CLASSE_CAMPO } from '../../lib/formulario'
import { LAT_MAX, LAT_MIN, LON_MAX, LON_MIN } from '../../lib/validacao'
import { buscarCep, buscarPonto } from '../../servicos/endereco'
import CampoTexto from '../comum/CampoTexto'

// O mapa só é baixado quando o formulário abre (o MapLibre é pesado).
const MapaEscolherPonto = lazy(() => import('../mapa/MapaEscolherPonto'))

// "Onde fica": 3 jeitos de dizer onde é o local, do mais fácil ao mais técnico:
//   1) CEP + número -> o app acha o ponto (ViaCEP + OpenStreetMap);
//   2) um toque no mini mapa;
//   3) a latitude e a longitude, que os 2 jeitos acima preenchem sozinhos
//      (continuam editáveis, para um ajuste fino ou para quem usa só o teclado).
// "lat" e "lon" são as props de campo do useFormulario (id, valor, aoMudar, erro):
// a validação e o envio continuam iguais; só mudou o jeito de preencher.
export default function CampoLocalizacao({ lat, lon }) {
  const [cep, setCep] = useState('')
  const [numero, setNumero] = useState('')
  const [busca, setBusca] = useState({ estado: 'parado', texto: '' })
  const [centrar, setCentrar] = useState(0)
  const pedido = useRef(null)
  useEffect(() => () => pedido.current?.abort(), [])

  // O ponto marcado AGORA (só se os 2 campos têm números dentro de Porto Alegre).
  const la = numeroDoCampo(lat.valor)
  const lo = numeroDoCampo(lon.valor)
  const ponto =
    typeof la === 'number' && typeof lo === 'number' && la >= LAT_MIN && la <= LAT_MAX && lo >= LON_MIN && lo <= LON_MAX
      ? { lat: la, lon: lo }
      : null

  // 5 casas decimais = cerca de 1 metro: mais que isso é precisão de mentira.
  function marcar(novo) {
    lat.aoMudar(novo.lat.toFixed(5).replace('.', ','))
    lon.aoMudar(novo.lon.toFixed(5).replace('.', ','))
  }

  // Um toque no mapa resolve o "onde fica": o aviso velho da busca sai da tela.
  function marcarPeloMapa(novo) {
    pedido.current?.abort()
    marcar(novo)
    setBusca({ estado: 'parado', texto: '' })
  }

  async function buscar() {
    pedido.current?.abort()
    const controle = new AbortController()
    pedido.current = controle
    setBusca({ estado: 'buscando', texto: 'Buscando o endereço…' })
    try {
      const endereco = await buscarCep(cep, { signal: controle.signal })
      const achado = await buscarPonto(endereco, numero, { signal: controle.signal })
      marcar(achado)
      setCentrar((c) => c + 1)
      const onde = [endereco.rua, numero.trim() && achado.exato ? numero.trim() : '', endereco.bairro]
        .filter(Boolean)
        .join(', ')
      setBusca({
        estado: 'ok',
        texto: achado.exato
          ? `Achamos: ${onde}. Confira o alfinete no mapa; se precisar, toque no ponto certo.`
          : `Achamos a rua (${onde}), mas não o número. O alfinete está no meio da rua: toque no ponto certo do mapa.`,
      })
    } catch (e) {
      if (controle.signal.aborted) return
      setBusca({ estado: 'erro', texto: e.message })
    }
  }

  // Enter no CEP ou no número busca o endereço (e não envia o formulário inteiro).
  function enterBusca(evento) {
    if (evento.key === 'Enter') {
      evento.preventDefault()
      buscar()
    }
  }

  const idCep = `${lat.id}-cep`
  const idNumero = `${lat.id}-numero`
  const idResultado = `${lat.id}-busca`

  return (
    <fieldset className="space-y-3 rounded border border-borda p-3">
      <legend className="px-1 font-semibold">
        Onde fica <span className="font-normal text-texto-suave">(obrigatório)</span>
      </legend>
      <p className="text-sm text-texto-suave">Busque pelo CEP e pelo número, ou toque no mapa.</p>

      <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
        <div>
          <label htmlFor={idCep} className="block font-semibold">
            CEP
          </label>
          <input
            id={idCep}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="90010-280"
            maxLength={10}
            value={cep}
            onChange={(e) => setCep(e.target.value)}
            onKeyDown={enterBusca}
            // Com erro na busca, o campo diz "inválido" e lê a mensagem de erro.
            aria-invalid={busca.estado === 'erro' ? true : undefined}
            aria-describedby={busca.estado === 'erro' ? idResultado : undefined}
            className={`mt-1 ${CLASSE_CAMPO}`}
          />
        </div>
        <div>
          <label htmlFor={idNumero} className="block font-semibold">
            Número
          </label>
          <input
            id={idNumero}
            type="text"
            autoComplete="off"
            maxLength={10}
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            onKeyDown={enterBusca}
            className={`mt-1 ${CLASSE_CAMPO}`}
          />
        </div>
        <button
          type="button"
          onClick={buscar}
          disabled={busca.estado === 'buscando'}
          className={`${CLASSE_BOTAO_SECUNDARIO} disabled:opacity-60`}
        >
          Buscar endereço
        </button>
      </div>
      <p className="text-sm text-texto-suave">
        O CEP vai para o ViaCEP e o endereço para o OpenStreetMap (Nominatim), só quando você toca em “Buscar
        endereço”.
      </p>
      {/* Sempre montada: o leitor de tela anuncia o resultado da busca. */}
      <p id={idResultado} role="status" className={busca.estado === 'erro' ? 'text-erro' : ''}>
        {busca.estado === 'erro' && <span aria-hidden="true">⚠ </span>}
        {busca.texto}
      </p>

      <Suspense fallback={<p className="h-64 rounded border border-borda p-4">Carregando o mapa…</p>}>
        <MapaEscolherPonto ponto={ponto} aoEscolher={marcarPeloMapa} centrar={centrar} />
      </Suspense>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          {...lat}
          rotulo="Latitude"
          dica="Preenchida sozinha pela busca ou pelo mapa. Dá para ajustar."
          obrigatorio
          inputMode="decimal"
          autoComplete="off"
        />
        <CampoTexto
          {...lon}
          rotulo="Longitude"
          dica="Preenchida sozinha pela busca ou pelo mapa. Dá para ajustar."
          obrigatorio
          inputMode="decimal"
          autoComplete="off"
        />
      </div>
    </fieldset>
  )
}
