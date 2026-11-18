import { aoClicarLink } from '../../lib/navegacao'

// Menu do cabeçalho: links para as seções da MESMA página (âncoras), sem
// roteador. O <nav> com nome avisa o leitor de tela que ali é a navegação.
// Ao clicar, o foco vai junto para o título da seção (lib/navegacao.js); a
// "Área da gestão", que começa fechada, abre sozinha.
// "secoes" = [{ id do alvo, texto do link }].
export default function Menu({ secoes }) {
  return (
    <nav aria-label="Seções da página" className="w-full">
      {/* 3 colunas iguais: no celular os 3 itens cabem numa linha só (antes, "Gestão" caía sozinho na 2ª). */}
      <ul className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        {secoes.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={(e) => aoClicarLink(e, s.id)}
              className="block rounded border border-white/60 px-2 py-1.5 text-center font-semibold sm:px-3 text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {s.texto}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
