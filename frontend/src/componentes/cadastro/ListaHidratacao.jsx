import { descreverHorario, rotulo, TIPOS_DE_HIDRATACAO } from '../../lib/cadastro'
import AcoesDoItem from '../comum/AcoesDoItem'
import SimNao from '../comum/SimNao'

// Os pontos de hidratação cadastrados, em cartões (o mesmo molde da ListaLocais).
// aoEditar(ponto) e aoApagar(ponto): os botões de cada cartão.
export default function ListaHidratacao({ itens, aoEditar, aoApagar }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {itens.map((ponto) => (
        <li key={ponto.id} className="space-y-2 rounded border border-borda bg-superficie p-4">
          <h4 className="font-semibold">{ponto.nome}</h4>
          <p className="text-sm text-texto-suave">{rotulo(TIPOS_DE_HIDRATACAO, ponto.tipo)}</p>
          <ul className="text-sm">
            <li>
              <span aria-hidden="true">🕒 </span>
              {descreverHorario(ponto)}
            </li>
            <SimNao sim={ponto.abre_domingo} texto="Abre no domingo" naoTexto="Fechado no domingo" />
            {/* Desativado = continua no cadastro, mas a recomendação não usa
                (ex.: um bebedouro quebrado). */}
            <SimNao sim={ponto.ativo} texto="Ativo" naoTexto="Desativado (o app não recomenda)" />
          </ul>
          <AcoesDoItem prefixo="hidratacao" item={ponto} aoEditar={aoEditar} aoApagar={aoApagar} />
        </li>
      ))}
    </ul>
  )
}
