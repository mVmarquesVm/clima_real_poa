import useFormulario from '../../ganchos/useFormulario'
import { ATIVIDADES, LOCAL_VAZIO, localParaApi, localParaFormulario, TIPOS_DE_LOCAL } from '../../lib/cadastro'
import { validarLocal } from '../../lib/validacao'
import { api } from '../../servicos/api'
import BotoesFormulario from '../comum/BotoesFormulario'
import CampoEscolha from '../comum/CampoEscolha'
import CampoMarcar from '../comum/CampoMarcar'
import CampoOpcoes from '../comum/CampoOpcoes'
import CampoTexto from '../comum/CampoTexto'
import MensagemErro from '../comum/MensagemErro'

// O formulário de um local de lazer: o MESMO para criar e para editar.
//   item:      o local da API que vai ser editado; sem ele, é um local novo;
//   aoSalvar:  (localDaApi) -> a API gravou;
//   aoCancelar: () -> a pessoa desistiu.
// A conferência vem em 2 camadas: o validarLocal no navegador (o erro aparece
// na hora) e a API (a regra de verdade; o 422 dela também vira erro por campo).
export default function FormularioLocal({ item, aoSalvar, aoCancelar }) {
  const editando = Boolean(item)
  const { formulario, enviar, campo, erroGeral, enviando } = useFormulario({
    inicial: editando ? localParaFormulario(item) : LOCAL_VAZIO,
    validar: validarLocal,
    // Criar = POST /locais; editar = PUT /locais/{id}, com o local inteiro.
    salvar: (valores, opcoes) =>
      editando
        ? api.locais.substituir(item.id, localParaApi(valores), opcoes)
        : api.locais.criar(localParaApi(valores), opcoes),
    aoSalvar,
  })
  const props = campo('local')

  return (
    <form
      ref={formulario}
      onSubmit={enviar}
      // noValidate: a conferência é a nossa (validarLocal + API), com as
      // mensagens em português. Sem isso, o navegador barraria o envio com o
      // balão dele, e só no 1º erro.
      noValidate
      aria-labelledby="titulo-formulario-local"
      className="space-y-4 rounded border border-borda-forte bg-superficie p-4"
    >
      <h4 id="titulo-formulario-local" className="text-lg font-semibold">
        {editando ? `Editar local: ${item.nome}` : 'Novo local de lazer'}
      </h4>

      {erroGeral && <MensagemErro titulo="Não deu para salvar o local" erro={erroGeral} />}

      <CampoTexto {...props('nome')} rotulo="Nome" obrigatorio maxLength={80} autoComplete="off" />
      <CampoEscolha {...props('tipo')} rotulo="Tipo" opcoes={TIPOS_DE_LOCAL} obrigatorio />

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          {...props('lat')}
          rotulo="Latitude"
          dica="Ex.: -30,0331 (vírgula ou ponto)"
          obrigatorio
          inputMode="decimal"
          autoComplete="off"
        />
        <CampoTexto
          {...props('lon')}
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
          <CampoMarcar {...props('tem_sombra')} rotulo="Sombra" />
          <CampoMarcar {...props('tem_bebedouro')} rotulo="Bebedouro" />
        </div>
      </fieldset>

      <CampoOpcoes {...props('atividades')} rotulo="Bom para" opcoes={ATIVIDADES} obrigatorio />

      <CampoTexto
        {...props('observacao')}
        rotulo="Observação"
        dica="Opcional, até 200 caracteres."
        multilinha
        maxLength={200}
      />

      <BotoesFormulario
        textoSalvar={editando ? 'Salvar alterações' : 'Salvar local'}
        enviando={enviando}
        aoCancelar={aoCancelar}
      />
    </form>
  )
}
