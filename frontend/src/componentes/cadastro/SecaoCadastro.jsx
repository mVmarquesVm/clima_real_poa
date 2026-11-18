import { useState } from 'react'
import { api } from '../../servicos/api'
import Abas from '../comum/Abas'
import FormularioHidratacao from './FormularioHidratacao'
import FormularioLocal from './FormularioLocal'
import ListaHidratacao from './ListaHidratacao'
import ListaLocais from './ListaLocais'
import PainelCadastro from './PainelCadastro'

// A seção "Cadastro" do app: o CRUD da parte de Web, em 2 abas.
// Os 2 painéis ficam montados (o inativo com "hidden"): trocar de aba não
// perde um formulário pela metade nem busca a lista de novo.
const ABAS = [
  { id: 'locais', rotulo: 'Locais de lazer' },
  { id: 'hidratacao', rotulo: 'Pontos de hidratação' },
]

export default function SecaoCadastro() {
  const [ativa, setAtiva] = useState('locais')

  return (
    <section aria-labelledby="titulo-cadastro" className="space-y-3">
      <h2 id="titulo-cadastro" tabIndex={-1} className="text-xl font-bold">
        Cadastro
      </h2>
      <p className="text-texto-suave">
        Locais de lazer e pontos de hidratação que o app usa para recomendar onde ir.
      </p>

      <Abas rotulo="O que cadastrar" abas={ABAS} ativa={ativa} aoMudar={setAtiva} />

      <div role="tabpanel" id="painel-locais" aria-labelledby="aba-locais" hidden={ativa !== 'locais'}>
        <PainelCadastro
          prefixo="local"
          recurso={api.locais}
          Lista={ListaLocais}
          Formulario={FormularioLocal}
          textos={{
            titulo: 'Locais de lazer',
            adicionar: 'Adicionar local',
            carregando: 'Carregando os locais…',
            vazio: 'Nenhum local cadastrado ainda.',
            item: 'Local',
            oQue: 'o local',
            oQueLista: 'os locais',
          }}
        />
      </div>

      <div role="tabpanel" id="painel-hidratacao" aria-labelledby="aba-hidratacao" hidden={ativa !== 'hidratacao'}>
        <PainelCadastro
          prefixo="hidratacao"
          recurso={api.hidratacao}
          Lista={ListaHidratacao}
          Formulario={FormularioHidratacao}
          textos={{
            titulo: 'Pontos de hidratação',
            adicionar: 'Adicionar ponto',
            carregando: 'Carregando os pontos de hidratação…',
            vazio: 'Nenhum ponto de hidratação cadastrado ainda.',
            item: 'Ponto',
            oQue: 'o ponto de hidratação',
            oQueLista: 'os pontos de hidratação',
          }}
        />
      </div>
    </section>
  )
}
