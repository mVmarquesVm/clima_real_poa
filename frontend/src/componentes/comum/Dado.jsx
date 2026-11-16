// Um par "rótulo: valor" dentro de uma lista <dl> (termo + definição): o leitor
// de tela lê "Umidade, 50%", e não dois textos soltos.
// O número usa fonte monoespaçada com algarismos de mesma largura
// (font-mono tabular-nums): quando o valor muda de 9,8 para 10,1, o texto não
// "pula" para o lado.
export default function Dado({ rotulo, valor, destaque = false }) {
  return (
    <div>
      <dt className="text-sm text-texto-suave">{rotulo}</dt>
      <dd
        className={`font-mono tabular-nums ${destaque ? 'text-2xl font-bold' : 'text-lg font-semibold'}`}
      >
        {valor}
      </dd>
    </div>
  )
}
