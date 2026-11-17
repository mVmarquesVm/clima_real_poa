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
  int abreH;               // de segunda a sábado: hora em que abre (0 a 23); -1 = aberto 24 h (praça)
  int fechaH;              // vale até esta hora (exclusiva): use 1 h antes de fechar, para dar tempo de chegar
  int domAbreH;            // no domingo, o horário é outro (muitos shoppings abrem mais tarde):
  int domFechaH;           //   domAbreH = -1 quer dizer que NÃO abre no domingo
  bool refrigerado;        // tem ar-condicionado (shopping)? Com risco VERMELHO ou ROXO, pode ganhar da sombra
};

// Está aberto agora? "hora" (0 a 23) e "dia" (0 = domingo ... 6 = sábado)
// vêm do relógio da internet (NTP); -1 = a estação ainda não sabe.
inline bool refugioAberto(const Refugio& r, int hora, int dia) {
  if (r.abreH < 0)          return true;    // praça: sempre aberta
  if (hora < 0 || dia < 0)  return false;   // sem relógio, não arrisca mandar a pessoa para um lugar fechado
  // É o if/else do horário: domingo tem a sua própria faixa de horas.
  // (Em Python: abre, fecha = (dom_abre, dom_fecha) if dia == 0 else (abre, fecha))
  int abre  = (dia == 0) ? r.domAbreH  : r.abreH;
  int fecha = (dia == 0) ? r.domFechaH : r.fechaH;
  if (abre < 0) return false;               // não abre neste dia
  return hora >= abre && hora < fecha;
}

// O mais perto entre os que estão abertos agora. nullptr = nenhum.
// É o mesmo "achar o menor" que se faz em Python com min(..., key=...).
// soRefrigerados = true olha só os que têm ar-condicionado.
inline const Refugio* maisPertoAberto(const Refugio* lista, int n, int hora, int dia, bool soRefrigerados) {
  const Refugio* melhor = nullptr;
  for (int i = 0; i < n; i++) {
    if (!refugioAberto(lista[i], hora, dia)) continue;
    if (soRefrigerados && !lista[i].refrigerado) continue;
    if (melhor == nullptr || lista[i].distanciaM < melhor->distanciaM) melhor = &lista[i];
  }
  return melhor;
}

// Para onde mandar a pessoa AGORA.
// preferirRefrigerado = true (o sketch liga com risco VERMELHO ou ROXO,
// nas estações em que a regra vale): primeiro tenta o refrigerado mais
// perto que está aberto; se nenhum estiver (de noite, domingo cedo, sem
// relógio), fica o mais perto de todos, como sempre.
// Em Python: return mais_perto(so_frio=True) or mais_perto()
inline const Refugio* refugioMaisPerto(const Refugio* lista, int n, int hora, int dia,
                                       bool preferirRefrigerado = false) {
  if (preferirRefrigerado) {
    const Refugio* frio = maisPertoAberto(lista, n, hora, dia, true);
    if (frio != nullptr) return frio;
  }
  return maisPertoAberto(lista, n, hora, dia, false);
}

// 90 -> "90m"; 1250 -> "1.3km" (cabe em 6 letras até 99,9 km).
inline void textoDistancia(char* destino, size_t tamanho, unsigned int metros) {
  if (metros < 1000) snprintf(destino, tamanho, "%um", metros);
  else               snprintf(destino, tamanho, "%.1fkm", metros / 1000.0);
}
