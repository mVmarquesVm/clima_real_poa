// Cliente da NOSSA API (FastAPI, pasta backend/): o CRUD de locais de lazer
// e de pontos de hidratação.
//
// Todo erro da API chega num formato único:
//   {"detail": "frase para a pessoa", "erros": [{"campo": "lat", "mensagem": "..."}]}
// Aqui ele vira um ErroApi, para as telas lerem sempre do mesmo jeito:
//   erro.message (a frase), erro.status (0 = não chegou na API) e erro.erros (por campo).

// O endereço vem do .env (VITE_API_URL); sem ele, a API rodando no próprio PC.
// O "?." deixa este arquivo rodar também fora do Vite (ex.: num teste em Node).
const BASE_PADRAO = import.meta.env?.VITE_API_URL ?? 'http://127.0.0.1:8000'

// Sem resposta em 10 s, desistimos: melhor um aviso claro que uma tela girando para sempre.
const TEMPO_MAXIMO_MS = 10_000

export const FORA_DO_AR = 'A API está fora do ar. Ligue o back-end e tente de novo.'
export const DEMOROU = 'A API demorou demais para responder. Tente de novo em instantes.'

export class ErroApi extends Error {
  constructor(mensagem, { status = 0, erros = [] } = {}) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
    this.erros = erros
  }
}

// [{campo: "atividades.0", mensagem}] -> {atividades: mensagem}: o formulário
// mostra o erro embaixo de cada campo. "atividades.0" é o 1º item da lista,
// mas o campo na tela é a lista inteira. Fica a 1ª mensagem de cada campo.
export function errosPorCampo(erro) {
  const porCampo = {}
  for (const { campo, mensagem } of erro?.erros ?? []) {
    const nome = String(campo).split('.')[0]
    if (!(nome in porCampo)) porCampo[nome] = mensagem
  }
  return porCampo
}

// Faz UMA requisição e devolve o JSON da resposta (ou null no 204 do DELETE).
async function pedir(base, caminho, { metodo = 'GET', corpo, signal } = {}) {
  // O tempo máximo e o "signal" de quem chamou: o que vier primeiro cancela.
  const limite = AbortSignal.timeout(TEMPO_MAXIMO_MS)
  const sinal = signal ? AbortSignal.any([signal, limite]) : limite

  let resposta
  try {
    resposta = await fetch(base + caminho, {
      method: metodo,
      headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: sinal,
    })
  } catch (erro) {
    // Quem chamou cancelou (ex.: a tela fechou): repassa, e a tela só ignora.
    if (signal?.aborted) throw erro
    if (limite.aborted) throw new ErroApi(DEMOROU)
    // O fetch lança TypeError quando não chega no servidor (desligado, sem rede, CORS).
    throw new ErroApi(FORA_DO_AR)
  }

  // 204 = "apagado, sem conteúdo": não há JSON para ler.
  if (resposta.status === 204) return null

  let dados = null
  try {
    dados = await resposta.json()
  } catch {
    // O corpo não era JSON (ex.: uma página de erro de um proxy). Tratado abaixo.
  }

  if (!resposta.ok) {
    throw new ErroApi(dados?.detail ?? `A API respondeu com o código ${resposta.status}.`, {
      status: resposta.status,
      erros: Array.isArray(dados?.erros) ? dados.erros : [],
    })
  }
  if (dados === null) {
    throw new ErroApi('A API mandou uma resposta que o app não entende.', { status: resposta.status })
  }
  return dados
}

// As 5 operações do CRUD de um recurso (/locais ou /hidratacao), sempre no mesmo molde.
function recurso(base, nome) {
  const item = (id) => `/${nome}/${encodeURIComponent(id)}`
  return {
    // filtros vira a "query string": {so_ativos: true} -> ?so_ativos=true
    listar: ({ signal, ...filtros } = {}) => {
      const query = new URLSearchParams(filtros).toString()
      return pedir(base, `/${nome}${query ? `?${query}` : ''}`, { signal })
    },
    mostrar: (id, { signal } = {}) => pedir(base, item(id), { signal }),
    criar: (dados, { signal } = {}) => pedir(base, `/${nome}`, { metodo: 'POST', corpo: dados, signal }),
    substituir: (id, dados, { signal } = {}) =>
      pedir(base, item(id), { metodo: 'PUT', corpo: dados, signal }),
    apagar: (id, { signal } = {}) => pedir(base, item(id), { metodo: 'DELETE', signal }),
  }
}

// Monta o cliente para um endereço. O app usa o "api" pronto, lá embaixo;
// o criarApi(outroEndereço) serve para testar contra outra porta.
export function criarApi(base = BASE_PADRAO) {
  const raiz = base.replace(/\/+$/, '')
  return {
    saude: ({ signal } = {}) => pedir(raiz, '/saude', { signal }),
    locais: recurso(raiz, 'locais'),
    hidratacao: recurso(raiz, 'hidratacao'),
  }
}

export const api = criarApi()
