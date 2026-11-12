#pragma once
// ============================================================
// Arduino.h FALSO — só para rodar os autotestes no PC.
// NÃO cole este arquivo no Wokwi: lá o Arduino.h é o de verdade.
//
// Analogia: é o dublê do ator. O autoteste.h "fala" com o Serial;
// aqui, quem escuta é o terminal do PC, por meio do printf.
// Só existe o que o autoteste usa: printf e println.
// ============================================================

#include <cstdio>
#include <cstdarg>

struct SerialFalso {
  void println(const char* texto = "") { std::printf("%s\n", texto); }

  void printf(const char* formato, ...) {
    va_list args;
    va_start(args, formato);
    std::vprintf(formato, args);
    va_end(args);
  }
};

inline SerialFalso Serial;
