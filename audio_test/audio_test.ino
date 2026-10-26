// ===================== ViCAS AUDIO TEST =====================
// Plays TEST.WAV from the SD card through AUDIO_PIN. Use it to check the
// SD card, the audio output and the LM386 amplifier and speaker before
// wiring up the light link. Send 'p' in the Serial Monitor to play again.
//
// Wiring (Arduino Uno):
//   SD card module   CS -> 10, MOSI -> 11, MISO -> 12, SCK -> 13
//   Audio out        9 -> LM386 input (or LED driver)
//
// WAV file: 8-bit, mono, unsigned PCM, 16 kHz, named TEST.WAV

#include <SPI.h>
#include <SD.h>
#include <TMRpcm.h>

const byte SD_CS_PIN = 10;
const byte AUDIO_PIN = 9;
const byte VOLUME    = 5;     // 0-7

TMRpcm audio;
bool sdReady = false;
char testFile[] = "TEST.WAV";   // TMRpcm::play() takes a non-const char*

void playTest() {
  if (!sdReady) {
    Serial.println(F("SD card not ready."));
    return;
  }
  if (!SD.exists(testFile)) {
    Serial.println(F("TEST.WAV not found on the card."));
    return;
  }
  audio.play(testFile);
  Serial.println(F("Playing TEST.WAV"));
}

void setup() {
  Serial.begin(9600);
  audio.speakerPin = AUDIO_PIN;
  audio.setVolume(VOLUME);
  audio.quality(1);

  sdReady = SD.begin(SD_CS_PIN);
  if (!sdReady) Serial.println(F("SD card not found. Check wiring and card format."));
  playTest();
}

void loop() {
  if (Serial.available() && Serial.read() == 'p') playTest();
}
