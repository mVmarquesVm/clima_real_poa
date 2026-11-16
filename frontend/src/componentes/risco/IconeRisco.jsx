// Um FORMATO diferente para cada nível (como as placas de trânsito): quem não
// distingue cores (daltonismo) ainda diferencia o círculo, o triângulo, o
// losango e o octógono. O ícone é decorativo (aria-hidden): o texto do selo
// já diz o nível para o leitor de tela.
const FORMAS = {
  verde: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>
  ),
  amarelo: (
    <>
      <path d="M12 3l9.5 17h-19z" />
      <path d="M12 10v4M12 17.5v.01" />
    </>
  ),
  laranja: (
    <>
      <path d="M12 2.5l9.5 9.5-9.5 9.5-9.5-9.5z" />
      <path d="M12 8v5M12 16.5v.01" />
    </>
  ),
  vermelho: (
    <>
      <path d="M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3z" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </>
  ),
  roxo: (
    <>
      <path d="M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3z" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  semdado: (
    <>
      <circle cx="12" cy="12" r="9" strokeDasharray="3 2.5" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.4M12 16.5v.01" />
    </>
  ),
}

export default function IconeRisco({ nivel, className = 'size-6' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {FORMAS[nivel.id]}
    </svg>
  )
}
