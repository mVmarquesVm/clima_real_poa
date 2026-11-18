import { numero, tempoDesde } from '../../lib/formato'
import { situacao } from '../../lib/leitura'
import { ehFrio } from '../../lib/risco'
import { ehDia } from '../../lib/sol'
import SeloRisco from '../risco/SeloRisco'

// Cartão curto de UMA estação: o nome, o nível (cor + ícone + texto + conselho),
// a sensação térmica e há quanto tempo foi a leitura. Só isso: para quem é
// idoso (ou está com pressa), menos números é mais fácil de ler. Os outros
// valores (umidade, vento, sol, nebulizador) ficam no painel do mapa.
// Quem busca é o App (useEstacoes, a cada 15 s), uma vez só para a página
// inteira: este cartão e o mapa usam a MESMA leitura.
// Quem decide o nível é a ESTAÇÃO (field6), e não o app: assim o selo da tela
// é igual ao LED da praça (a regra fica em lib/leitura.js).
export default function EstacaoAoVivo({ nome, estado, agora }) {
  const { carregando, erro, leitura } = estado
  const { idade, recente, nivel } = situacao(leitura, agora)
  // Dia ou noite AGORA, pela posição do sol: muda o conselho (sombra × lugar ventilado).
  const dia = ehDia(new Date(agora))

  return (
    <article aria-label={nome} className="flex w-full flex-col gap-2 rounded border border-borda bg-superficie p-4">
      <h3 className="font-bold">{nome}</h3>
      {/* Região "viva": o leitor de tela anuncia quando o texto MUDA. Como ela
          só tem o local e o nível, a pessoa ouve "Largo Glênio Peres: Laranja"
          na troca de nível, e não a cada 15 s. Ela fica SEMPRE na página:
          alguns leitores ignoram uma região recém-criada. */}
      <p aria-live="polite" className="sr-only">
        {!carregando && `${nome}: nível ${nivel.nome}`}
      </p>
      <Conteudo {...{ carregando, erro, leitura, idade, recente, nivel, dia }} />
    </article>
  )
}

function Conteudo({ carregando, erro, leitura, idade, recente, nivel, dia }) {
  if (!leitura) {
    return carregando ? (
      <p role="status">Buscando a leitura…</p>
    ) : (
      <p role="alert" className="text-erro">
        {erro ? 'Não deu para ler a estação agora. Tentando de novo em 15 s.' : 'A estação ainda não publicou.'}
      </p>
    )
  }

  return (
    <>
      <SeloRisco nivel={nivel} dia={dia} compacto />
      {/* Leitura velha: o número fica pequeno e "riscado" pelo texto, para
          ninguém ler 51 °C grande e achar que é agora. */}
      {recente ? (
        <p>
          Sensação térmica{' '}
          <strong className="font-mono text-2xl tabular-nums">{numero(leitura.sensacao)} °C</strong>
        </p>
      ) : null}
      {recente && ehFrio(leitura.sensacao) && <p className="font-semibold text-risco-frio">Frio: se agasalhe.</p>}
      <p className="text-texto-suave">
        {recente ? <>Atualizado {tempoDesde(idade)}.</> : <>Sem leitura agora (a última foi {tempoDesde(idade)}).</>}
      </p>
    </>
  )
}
