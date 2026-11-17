// Um "sim/não" com ícone + texto (nunca só a cor ou só o ícone), num <li>.
// naoTexto (opcional): o texto do "não"; sem ele, "Sem <texto>".
export default function SimNao({ sim, texto, naoTexto }) {
  return (
    <li>
      <span aria-hidden="true">{sim ? '✓' : '✕'} </span>
      {sim ? texto : (naoTexto ?? `Sem ${texto.toLowerCase()}`)}
    </li>
  )
}
