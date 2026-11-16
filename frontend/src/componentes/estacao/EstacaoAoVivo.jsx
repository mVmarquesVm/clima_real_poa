import { dataHora, numero, tempoDesde } from '../../lib/formato'
import { situacao } from '../../lib/leitura'
import { ehFrio } from '../../lib/risco'
import { ehDia } from '../../lib/sol'
import Dado from '../comum/Dado'
import SeloRisco from '../risco/SeloRisco'

// Cartão "agora no Largo": a última leitura da estação E1.
// Quem busca é o App (useEstacoes, a cada 15 s), uma vez só para a página
// inteira: este cartão e o mapa usam a MESMA leitura.
// Quem decide o nível é a ESTAÇÃO (field6), e não o app: assim o selo da tela
// é igual ao LED da praça (a regra fica em lib/leitura.js).
export default function EstacaoAoVivo({ estado, agora }) {
  const { carregando, erro, leitura } = estado
  const { idade, recente, nivel } = situacao(leitura, agora)
  // Dia ou noite AGORA, pela posição do sol: muda o conselho (sombra × lugar ventilado).
  const dia = ehDia(new Date(agora))

  return (
    <>
      {/* Região "viva": o leitor de tela anuncia quando o texto MUDA. Como ela
          só tem o nome do nível, a pessoa ouve "Laranja" na troca de nível, e
          não a cada 15 s. "polite" espera a pessoa terminar o que está ouvindo.
          Ela fica SEMPRE na página: alguns leitores ignoram uma região recém-criada. */}
      <p aria-live="polite" className="sr-only">
        {!carregando && `Nível de risco agora no Largo Glênio Peres: ${nivel.nome}`}
      </p>
      <Conteudo {...{ carregando, erro, leitura, idade, recente, nivel, dia }} />
    </>
  )
}

function Conteudo({ carregando, erro, leitura, idade, recente, nivel, dia }) {
  if (!leitura) {
    return carregando ? (
      <p role="status" className="rounded border border-borda bg-superficie p-4">
        Buscando a leitura da estação…
      </p>
    ) : (
      <p role="alert" className="rounded border border-risco-vermelho bg-superficie p-4">
        {erro
          ? `Não deu para ler a estação agora (${erro}). Tentando de novo em 15 s.`
          : 'A estação ainda não publicou nenhuma leitura.'}
      </p>
    )
  }

  return (
    <div className="space-y-3 rounded border border-borda bg-superficie p-4">
      <SeloRisco nivel={nivel} dia={dia} />

      {recente && ehFrio(leitura.sensacao) && (
        <p className="font-semibold text-risco-frio">Frio: se agasalhe.</p>
      )}

      <p className="text-sm text-texto-suave">
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
        className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${recente ? '' : 'text-texto-suave'}`}
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

      <p className="text-xs text-texto-suave">
        A estação E1 é um ESP32 que roda num simulador (Wokwi). Quando a simulação está desligada,
        aparece “sem dado recente”. Régua de risco: Nota Técnica nº 01/26 da Secretaria Municipal de
        Saúde de Porto Alegre; a sensação térmica é a Temperatura Aparente de Steadman, com vento e
        sol. Dados: canal público 3578427 do ThingSpeak.
      </p>
    </div>
  )
}
