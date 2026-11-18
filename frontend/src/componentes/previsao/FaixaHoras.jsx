import { useState } from 'react'
import { CLASSE_BOTAO_SECUNDARIO } from '../../lib/formulario'
import { diaLocal, horaBoa, horaLocal } from '../../lib/recomendacao'

// A previsão do jeito mais simples possível: uma "régua" de horas, cada uma
// com ✓ "Pode ir" ou ✕ "Evite" para a atividade escolhida. Sem números de
// temperatura e sem as 5 cores da régua: só sim ou não, que qualquer pessoa
// lê de longe. Cada hora tem COR + SÍMBOLO + PALAVRA (nunca só a cor).
// Mostra só HOJE; amanhã fica num botão (menos coisa na tela de uma vez).
// Se hoje já acabou (depois das 22h), mostra amanhã direto.
export default function FaixaHoras({ horas, atividade, hoje }) {
  const [verAmanha, setVerAmanha] = useState(false)
  const deHoje = horas.filter((h) => diaLocal(h.hora) === hoje)
  const deAmanha = horas.filter((h) => diaLocal(h.hora) !== hoje)
  const soAmanha = deHoje.length === 0

  return (
    <div className="space-y-4">
      {!soAmanha && <Dia titulo="Hoje" horas={deHoje} atividade={atividade} />}
      {(soAmanha || verAmanha) && deAmanha.length > 0 && (
        <Dia titulo="Amanhã" horas={deAmanha} atividade={atividade} />
      )}
      {!soAmanha && deAmanha.length > 0 && (
        <button
          type="button"
          onClick={() => setVerAmanha((v) => !v)}
          aria-expanded={verAmanha}
          className={CLASSE_BOTAO_SECUNDARIO}
        >
          {verAmanha ? 'Esconder amanhã' : 'Ver amanhã'}
        </button>
      )}
    </div>
  )
}

function Dia({ titulo, horas, atividade }) {
  return (
    <div>
      <h4 className="text-lg font-semibold">{titulo}</h4>
      {/* Grade de colunas de 4,5rem: 3 por linha no celular, mesmo com a letra maior (A+). */}
      <ol className="mt-1 grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
        {horas.map((h) => {
          const boa = horaBoa(h, atividade)
          return (
            <li
              key={h.hora.getTime()}
              className={`flex flex-col items-center rounded border py-2 ${
                boa ? 'border-risco-verde bg-risco-verde text-white' : 'border-borda-forte bg-superficie-2 text-texto'
              }`}
            >
              <span className="text-lg font-bold tabular-nums">{horaLocal(h.hora)}h</span>
              <span aria-hidden="true" className="text-xl leading-none">
                {boa ? '✓' : '✕'}
              </span>
              <span>{boa ? 'Pode ir' : 'Evite'}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
