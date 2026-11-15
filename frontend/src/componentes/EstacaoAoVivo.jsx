import useEstacaoE1, { useAgora } from '../ganchos/useEstacaoE1'
import { dataHora, numero, tempoDesde } from '../lib/formato'
import { NIVEIS, SEM_DADO, ehFrio, nivelDoCampo } from '../lib/risco'
import { IDADE_MAXIMA_S } from '../servicos/thingspeak'
import SeloRisco from './SeloRisco'

// Cartão "agora no Largo": a última leitura da estação E1, que se atualiza
// sozinha a cada 15 s. Quem decide o nível é a ESTAÇÃO (field6), e não o app:
// assim o selo da tela é igual ao LED da praça.
export default function EstacaoAoVivo() {
  const { carregando, erro, leitura } = useEstacaoE1()
  const agora = useAgora()

  const idade = leitura ? (agora - leitura.criadoEm.getTime()) / 1000 : Infinity
  const recente = idade <= IDADE_MAXIMA_S
  // Leitura velha (ou nenhuma) não decide: vira "sem dado", como na estação.
  const nivel = recente ? nivelDoCampo(leitura.risco) : NIVEIS[SEM_DADO]

  return (
    <>
      {/* Região "viva": o leitor de tela anuncia quando o texto MUDA. Como ela
          só tem o nome do nível, a pessoa ouve "Laranja" na troca de nível, e
          não a cada 15 s. "polite" espera a pessoa terminar o que está ouvindo.
          Ela fica SEMPRE na página: alguns leitores ignoram uma região recém-criada. */}
      <p aria-live="polite" className="sr-only">
        {!carregando && `Nível de risco agora no Largo Glênio Peres: ${nivel.nome}`}
      </p>
      <Conteudo {...{ carregando, erro, leitura, idade, recente, nivel }} />
    </>
  )
}

function Conteudo({ carregando, erro, leitura, idade, recente, nivel }) {
  if (!leitura) {
    return carregando ? (
      <p role="status" className="rounded border border-gray-300 bg-white p-4">
        Buscando a leitura da estação…
      </p>
    ) : (
      <p role="alert" className="rounded border border-risco-vermelho bg-white p-4">
        {erro
          ? `Não deu para ler a estação agora (${erro}). Tentando de novo em 15 s.`
          : 'A estação ainda não publicou nenhuma leitura.'}
      </p>
    )
  }

  return (
    <div className="space-y-3 rounded border border-gray-300 bg-white p-4">
      <SeloRisco nivel={nivel} />

      {recente && ehFrio(leitura.sensacao) && (
        <p className="font-semibold text-risco-frio">Frio: se agasalhe.</p>
      )}

      <p className="text-sm text-gray-700">
        {recente ? (
          <>Atualizado {tempoDesde(idade)}.</>
        ) : (
          <>
            <strong>Sem dado recente.</strong> A última leitura foi em {dataHora(leitura.criadoEm)} (
            {tempoDesde(idade)}). Os valores abaixo são dessa leitura e não valem para agora.
          </>
        )}
        {erro && ' A última atualização falhou; tentando de novo em 15 s.'}
      </p>

      <dl
        className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${recente ? '' : 'text-gray-600'}`}
      >
        <Dado rotulo="Sensação térmica" valor={`${numero(leitura.sensacao)} °C`} destaque />
        <Dado rotulo="Temperatura do ar" valor={`${numero(leitura.temperatura)} °C`} />
        <Dado rotulo="Umidade" valor={`${numero(leitura.umidade, 0)}%`} />
        <Dado
          rotulo="Vento"
          valor={`${numero(leitura.vento)} m/s (${numero(leitura.vento * 3.6, 0)} km/h)`}
        />
        <Dado rotulo="Luz do sol" valor={`${numero(leitura.luz, 0)} lux`} />
        <Dado rotulo="Nebulizador" valor={leitura.releLigado ? 'Ligado' : 'Desligado'} />
      </dl>

      <p className="text-xs text-gray-700">
        A estação E1 é um ESP32 que roda num simulador (Wokwi). Quando a simulação está desligada,
        aparece “sem dado recente”. Régua de risco: Nota Técnica nº 01/26 da Secretaria Municipal de
        Saúde de Porto Alegre; a sensação térmica é a Temperatura Aparente de Steadman, com vento e
        sol. Dados: canal público 3578427 do ThingSpeak.
      </p>
    </div>
  )
}

function Dado({ rotulo, valor, destaque = false }) {
  return (
    <div>
      <dt className="text-sm text-gray-700">{rotulo}</dt>
      <dd className={destaque ? 'text-2xl font-bold' : 'text-lg font-semibold'}>{valor}</dd>
    </div>
  )
}
