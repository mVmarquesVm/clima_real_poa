import useFormulario from '../../ganchos/useFormulario'
import {
  HIDRATACAO_VAZIA,
  hidratacaoParaApi,
  hidratacaoParaFormulario,
  TIPOS_DE_HIDRATACAO,
} from '../../lib/cadastro'
import { validarHidratacao } from '../../lib/validacao'
import { api } from '../../servicos/api'
import BotoesFormulario from '../comum/BotoesFormulario'
import CampoEscolha from '../comum/CampoEscolha'
import CampoMarcar from '../comum/CampoMarcar'
import CampoTexto from '../comum/CampoTexto'
import MensagemErro from '../comum/MensagemErro'
import CampoLocalizacao from './CampoLocalizacao'

// O formulário de um ponto de hidratação: o MESMO para criar e para editar
// (o mesmo molde do FormularioLocal, com o useFormulario).
// O horário: "Aberto 24 h" marcado = os dois horários vazios na API. Desmarcar
// mostra os campos "Abre às" e "Fecha às" (type="time", que já entrega HH:MM).
export default function FormularioHidratacao({ item, aoSalvar, aoCancelar }) {
  const editando = Boolean(item)
  const { formulario, enviar, campo, mudar, valores, erroGeral, enviando } = useFormulario({
    inicial: editando ? hidratacaoParaFormulario(item) : HIDRATACAO_VAZIA,
    validar: validarHidratacao,
    salvar: (v, opcoes) =>
      editando
        ? api.hidratacao.substituir(item.id, hidratacaoParaApi(v), opcoes)
        : api.hidratacao.criar(hidratacaoParaApi(v), opcoes),
    aoSalvar,
  })
  const props = campo('hidratacao')

  // Marcar "Aberto 24 h" limpa os horários (e os erros deles, pelo mudar).
  function mudar24h(marcado) {
    mudar('aberto_24h', marcado)
    if (marcado) {
      mudar('abre', '')
      mudar('fecha', '')
    }
  }

  return (
    <form
      ref={formulario}
      onSubmit={enviar}
      noValidate
      aria-labelledby="titulo-formulario-hidratacao"
      className="space-y-4 rounded border border-borda-forte bg-superficie p-4"
    >
      <h4 id="titulo-formulario-hidratacao" className="text-lg font-semibold">
        {editando ? `Editar ponto: ${item.nome}` : 'Novo ponto de hidratação'}
      </h4>

      {erroGeral && <MensagemErro titulo="Não deu para salvar o ponto" erro={erroGeral} />}

      <CampoTexto {...props('nome')} rotulo="Nome" obrigatorio maxLength={80} autoComplete="off" />
      <CampoEscolha {...props('tipo')} rotulo="Tipo" opcoes={TIPOS_DE_HIDRATACAO} obrigatorio />

      <CampoLocalizacao lat={props('lat')} lon={props('lon')} />

      <fieldset className="space-y-3">
        <legend className="font-semibold">Horário</legend>
        <CampoMarcar {...props('aberto_24h')} aoMudar={mudar24h} rotulo="Aberto 24 h" />
        {!valores.aberto_24h && (
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto {...props('abre')} rotulo="Abre às" type="time" obrigatorio />
            <CampoTexto {...props('fecha')} rotulo="Fecha às" type="time" obrigatorio />
          </div>
        )}
        <CampoMarcar {...props('abre_domingo')} rotulo="Abre no domingo" />
      </fieldset>

      <CampoMarcar
        {...props('ativo')}
        rotulo="Ativo"
        dica="Desmarque se o ponto não está funcionando (ex.: bebedouro quebrado): ele fica no cadastro, mas o app não recomenda."
      />

      <BotoesFormulario
        textoSalvar={editando ? 'Salvar alterações' : 'Salvar ponto'}
        enviando={enviando}
        aoCancelar={aoCancelar}
      />
    </form>
  )
}
