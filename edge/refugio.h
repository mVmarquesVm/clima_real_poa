#pragma once
// ============================================================
// refugio.h — para onde a estação manda a pessoa se refrescar.
//
// Com risco alto, o LCD orienta SEM depender de app: beber água,
// descansar e ir ao refúgio mais perto. O refúgio pode ser uma praça
// com sombra de árvore (aberta 24 h) ou um shopping (ar-condicionado,
// água e banheiro), se ele estiver mais perto e ABERTO agora.
//
// Analogia: a placa de "saída de emergência" do cinema. Ela não
// depende do celular de ninguém: aponta o caminho mais perto, ali
// mesmo, para quem estiver olhando.
//
// A estação é fixa, então a distância até cada refúgio também é:
// a lista fica no config.h, medida uma vez no mapa (OpenStreetMap).
// ============================================================

#include <stdio.h>

struct Refugio {
  const char* nome;        // curto e sem acento (o LCD não tem): até 10 letras
  unsigned int distanciaM; // em linha reta, da estação até a entrada
  int abreH;               // hora em que abre (0 a 23); -1 = aberto 24 h (praça)
  int fechaH;              // vale até esta hora (exclusiva): use 1 h antes de fechar, para dar tempo de chegar
  bool domingo;            // abre no domingo?
};

// Está aberto agora? "hora" (0 a 23) e "dia" (0 = domingo ... 6 = sábado)
// vêm do relógio da internet (NTP); -1 = a estação ainda não sabe.
inline bool refugioAberto(const Refugio& r, int hora, int dia) {
  if (r.abreH < 0)          return true;    // praça: sempre aberta
  if (hora < 0 || dia < 0)  return false;   // sem relógio, não arrisca mandar a pessoa para um lugar fechado
  if (dia == 0 && !r.domingo) return false;
  return hora >= r.abreH && hora < r.fechaH;
}

// O mais perto entre os que estão abertos agora. nullptr = nenhum.
// É o mesmo "achar o menor" que se faz em Python com min(..., key=...).
inline const Refugio* refugioMaisPerto(const Refugio* lista, int n, int hora, int dia) {
  const Refugio* melhor = nullptr;
  for (int i = 0; i < n; i++) {
    if (!refugioAberto(lista[i], hora, dia)) continue;
    if (melhor == nullptr || lista[i].distanciaM < melhor->distanciaM) melhor = &lista[i];
  }
  return melhor;
}

// 90 -> "90m"; 1250 -> "1.3km" (cabe em 6 letras até 99,9 km).
inline void textoDistancia(char* destino, size_t tamanho, unsigned int metros) {
  if (metros < 1000) snprintf(destino, tamanho, "%um", metros);
  else               snprintf(destino, tamanho, "%.1fkm", metros / 1000.0);
}
