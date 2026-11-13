#pragma once
// ============================================================
// secrets.example.h — MODELO do secrets.h (este vai para o Git).
//
// Como usar:
//   1) copie este arquivo para secrets.h (na mesma pasta);
//   2) troque os valores pelos do SEU canal e do SEU dispositivo
//      MQTT do ThingSpeak (ver o README do Edge).
// O secrets.h está no .gitignore: as senhas nunca vão para o Git.
//
// Analogia: o secrets.example.h é o formulário em branco; o
// secrets.h é o formulário preenchido, que fica só com você.
// ============================================================

// Canal da estação no ThingSpeak (Channels > My Channels > Channel ID)
#define SECRET_CANAL_ID       "0000000"

// Dispositivo MQTT (Devices > MQTT > Add a new device). O ThingSpeak
// gera os 3 valores; autorize SÓ o canal desta estação, para que a
// credencial não sirva para mexer em mais nada.
#define SECRET_MQTT_CLIENT_ID "COLE_AQUI_O_CLIENT_ID"
#define SECRET_MQTT_USUARIO   "COLE_AQUI_O_USERNAME"
#define SECRET_MQTT_SENHA     "COLE_AQUI_A_PASSWORD"
