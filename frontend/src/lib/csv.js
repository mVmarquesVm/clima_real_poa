// Planilha CSV feita no próprio navegador, sem servidor.
// Formato pensado para o Excel em português, que é onde a pessoa vai abrir:
//   - separador ";" (o Excel brasileiro usa a vírgula para os decimais);
//   - números com vírgula decimal ("41,7");
//   - BOM no começo (um caractere invisível que avisa "isto é UTF-8"):
//     sem ele, o Excel mostra "Calçadão" como "CalÃ§adÃ£o".

const BOM = '﻿'

// Um valor -> texto seguro para uma célula. Texto com ; " ou quebra de linha
// vai entre aspas, e a aspa de dentro vira "" (a regra do CSV).
// Texto que começa com = + - @ ganha um ' na frente: assim o Excel não o
// executa como fórmula (a "injeção de CSV").
export function celula(valor) {
  if (valor === null || valor === undefined) return ''
  if (typeof valor === 'number') return String(valor).replace('.', ',')
  let texto = String(valor)
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`
  return /[;"\n\r]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}

// colunas: [{titulo, valor: (linha) -> valor}]; linhas: a lista de itens.
export function paraCsv(colunas, linhas) {
  const cabecalho = colunas.map((c) => celula(c.titulo)).join(';')
  const corpo = linhas.map((l) => colunas.map((c) => celula(c.valor(l))).join(';'))
  return BOM + [cabecalho, ...corpo].join('\r\n') + '\r\n'
}

// Entrega o arquivo para a pessoa salvar (o "download" de um texto feito aqui).
export function baixarArquivo(nome, texto, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.append(link)
  link.click()
  link.remove()
  // Dá tempo ao navegador de começar o download antes de liberar a memória.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
