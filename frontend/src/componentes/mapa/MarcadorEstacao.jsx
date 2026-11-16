import IconeRisco from '../risco/IconeRisco'

// O marcador de uma estação no mapa. Ele é um <button> de verdade (e não um
// desenho no canvas): dá para chegar nele com Tab, abrir com Enter ou Espaço,
// e o leitor de tela lê o nome, o nível e se está ao vivo.
// Cor + formato do ícone + texto (o rótulo do mapa e o aria-label), nunca só a cor.
// O anel que pulsa aparece SÓ na estação publicando agora; com "menos movimento"
// ligado no sistema, a regra do index.css para a animação e o anel fica parado.
// O "ref" deixa o Mapa devolver o foco a este botão quando o painel fecha
// (no React 19, o ref chega como uma prop comum).
// temCanal = a estação tem equipamento publicando no ThingSpeak;
// aoVivo = tem canal E a última leitura é recente (até 2 min).
export default function MarcadorEstacao({ ref, local, nivel, temCanal, aoVivo, aberto, aoClicar }) {
  let estado = 'sem estação publicando'
  if (aoVivo) estado = `ao vivo, nível ${nivel.nome.toLowerCase()}`
  else if (temCanal) estado = 'sem dado recente'

  return (
    <button
      ref={ref}
      type="button"
      onClick={aoClicar}
      aria-expanded={aberto}
      aria-label={`${local.nome}, estação ${local.id}, ${estado}. Abrir detalhes`}
      className="pointer-events-auto relative grid size-8 cursor-pointer place-items-center rounded-full focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
    >
      {aoVivo && (
        <span
          aria-hidden="true"
          // pointer-events-none: o anel cresce para FORA do botão na animação e
          // "roubava" o toque da estação vizinha (o Calçadão, a 245 m do Largo).
          className={`pointer-events-none absolute inset-0 animate-ping rounded-full opacity-60 ${nivel.classe}`}
        />
      )}
      <span
        aria-hidden="true"
        className={`relative grid place-items-center rounded-full border-2 border-white shadow ${nivel.classe} ${aoVivo ? 'size-8' : 'size-6'}`}
      >
        <IconeRisco nivel={nivel} className={aoVivo ? 'size-5' : 'size-4'} />
      </span>
    </button>
  )
}
