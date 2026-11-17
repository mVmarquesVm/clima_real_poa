#pragma once
// ============================================================
// acentos.h — acentos e ç nos LCDs.
//
// O chip dos LCDs (HD44780) já vem com as letras gravadas de fábrica,
// mas sem ç, ã, é... Em compensação, ele tem 8 "gavetas" (CGRAM) onde
// a gente DESENHA uma letra nova, ponto por ponto (5 x 8 pontos).
// Analogia: o carimbo de letras de uma papelaria, que vem sem "ç";
// a gente compra 8 carimbos em branco e entalha os que faltam.
//
// As 8 gavetas viram: á Á ç ã â é í ú (o que os textos dos LCDs usam).
// A seta "→" não gasta gaveta: ela já existe de fábrica (código 0x7E).
// Uma letra sem desenho vira a letra sem acento (ó -> o): melhor
// "o" do que um quadradinho na tela.
//
// Os códigos são 1 a 8, e não 0 a 7: o 0 marca o FIM do texto em C,
// então não dá para usá-lo no meio da linha. O LCD repete a gaveta 0
// no código 8, então a gaveta 0 é usada pelo código 8.
// ============================================================

#include <stdint.h>
#include <stddef.h>
#include <string.h>

struct Acento {
  const char* utf8;      // como a letra está escrita no código (UTF-8)
  char        codigo;    // o byte que vai para o LCD (1 a 8)
  uint8_t     desenho[8];// 8 linhas de 5 pontos (1 = ponto aceso)
};

const Acento ACENTOS[8] = {
  { "á", 1, { 0b00010, 0b00100, 0b01110, 0b00001, 0b01111, 0b10001, 0b01111, 0b00000 } },
  { "Á", 2, { 0b00010, 0b00100, 0b01110, 0b10001, 0b11111, 0b10001, 0b10001, 0b00000 } },
  { "ç", 3, { 0b00000, 0b01110, 0b10000, 0b10000, 0b10001, 0b01110, 0b00100, 0b01100 } },
  { "ã", 4, { 0b01101, 0b10010, 0b01110, 0b00001, 0b01111, 0b10001, 0b01111, 0b00000 } },
  { "â", 5, { 0b00100, 0b01010, 0b01110, 0b00001, 0b01111, 0b10001, 0b01111, 0b00000 } },
  { "é", 6, { 0b00010, 0b00100, 0b01110, 0b10001, 0b11111, 0b10000, 0b01110, 0b00000 } },
  { "í", 7, { 0b00010, 0b00100, 0b00000, 0b01100, 0b00100, 0b00100, 0b01110, 0b00000 } },
  { "ú", 8, { 0b00010, 0b00100, 0b10001, 0b10001, 0b10001, 0b10011, 0b01101, 0b00000 } },
};

// Sem gaveta: troca pela letra sem acento.
struct TrocaSemAcento { const char* utf8; char letra; };
const TrocaSemAcento SEM_ACENTO[] = {
  { "à", 'a' }, { "À", 'A' }, { "Â", 'A' }, { "Ã", 'A' },
  { "ê", 'e' }, { "É", 'E' }, { "Ê", 'E' }, { "Í", 'I' },
  { "ó", 'o' }, { "ô", 'o' }, { "õ", 'o' }, { "Ó", 'O' }, { "Ô", 'O' }, { "Õ", 'O' },
  { "Ú", 'U' }, { "ü", 'u' }, { "Ç", 'C' },
};

const char SETA_DIREITA = (char)0x7E;   // "→" de fábrica no HD44780

// Traduz um texto UTF-8 para os bytes do LCD: cada letra vira 1 byte
// (1 byte = 1 coluna da tela). Em Python seria um texto.translate(...).
inline void paraLcd(char* destino, size_t tamanho, const char* texto) {
  size_t n = 0;
  while (*texto != '\0' && n + 1 < tamanho) {
    if ((unsigned char)*texto < 0x80) {          // letra comum (ASCII): passa direto
      destino[n++] = *texto++;
      continue;
    }
    if (strncmp(texto, "→", strlen("→")) == 0) {
      destino[n++] = SETA_DIREITA;
      texto += strlen("→");
      continue;
    }
    bool achou = false;
    for (const Acento& a : ACENTOS) {
      size_t t = strlen(a.utf8);
      if (strncmp(texto, a.utf8, t) == 0) { destino[n++] = a.codigo; texto += t; achou = true; break; }
    }
    if (!achou) {
      for (const TrocaSemAcento& s : SEM_ACENTO) {
        size_t t = strlen(s.utf8);
        if (strncmp(texto, s.utf8, t) == 0) { destino[n++] = s.letra; texto += t; achou = true; break; }
      }
    }
    if (!achou) {                                 // letra desconhecida: "?" e pula os bytes dela
      destino[n++] = '?';
      texto++;
      while (((unsigned char)*texto & 0xC0) == 0x80) texto++;
    }
  }
  destino[n] = '\0';
}

// Quantas colunas o texto ocupa no LCD (e não quantos bytes tem em UTF-8).
inline size_t colunasNoLcd(const char* texto) {
  char tmp[64];
  paraLcd(tmp, sizeof(tmp), texto);
  return strlen(tmp);
}
