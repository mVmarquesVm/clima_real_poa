// ============================================================
// main.cpp — roda no PC os MESMOS autotestes que o ESP32 roda
// no boot. Assim dá para conferir a lógica em segundos, sem
// abrir o Wokwi a cada mudança.
//
// O que este teste NÃO cobre: o sketch.ino (DHT22, pinos,
// watchdog, reinício). Isso só roda no ESP32/Wokwi.
// ============================================================

#include "../autoteste.h"

#ifdef _WIN32
#include <windows.h>
#endif

int main() {
#ifdef _WIN32
  SetConsoleOutputCP(CP_UTF8);   // para os acentos aparecerem certos no terminal do Windows
#endif

  // O ESP32 é 32 bits: lá, unsigned long tem 4 bytes. O teste da
  // "volta do millis()" só vale se aqui também tiver 4 bytes.
  static_assert(sizeof(unsigned long) == 4,
                "unsigned long precisa ter 4 bytes, como no ESP32");

  printf("=== Forno Alegre | estacao %s (%s) ===\n", ID_ESTACAO, NOME_ESTACAO);
  bool tudoPassou = rodarAutoteste();
  return tudoPassou ? 0 : 1;     // 0 = sucesso (padrão de programas de terminal)
}
