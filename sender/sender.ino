// ===================== ViCAS AUDIO SENDER =====================
// Press a key on the 4x4 keypad and the matching pre-recorded voice
// message is played from the SD card as an audio signal on AUDIO_PIN.
// That pin drives the super-bright LED (through a transistor), so the
// LED's brightness carries the audio to the solar panel on the other car.
//
// WAV files: 8-bit, mono, unsigned PCM, 16 kHz, saved in the root of a
// FAT16/FAT32 card with short names: 1.WAV, 2.WAV ... 9.WAV
//
// Wiring (Arduino Uno):
//   SD card module   CS -> 10, MOSI -> 11, MISO -> 12, SCK -> 13
//   Audio out / LED  9   (TMRpcm plays through Timer1, which is pin 9 on the Uno)
//   Keypad rows      8, 7, 6, 5
//   Keypad columns   4, 3, 2, A0
//
// Libraries: Keypad (Mark Stanley, Alexander Brevig), TMRpcm (TMRh20), SD, SPI

#include <SPI.h>
#include <SD.h>
#include <Keypad.h>
#include <TMRpcm.h>

// ---------- Pins and settings ----------
const byte SD_CS_PIN = 10;
const byte AUDIO_PIN = 9;
const byte VOLUME    = 5;     // 0-7; 6 and 7 can distort through the LED

// ---------- Keypad ----------
const byte ROWS = 4;
const byte COLS = 4;

char keys[ROWS][COLS] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};

byte rowPins[ROWS] = {8, 7, 6, 5};
byte colPins[COLS] = {4, 3, 2, A0};

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);
TMRpcm audio;
bool sdReady = false;

// What each key says (for the Serial Monitor). Keys 5-9 are free for
// extra messages: record them and save them as 5.WAV ... 9.WAV.
void printMessage(char key) {
  switch (key) {
    case '1': Serial.println(F("Your trunk is open"));           break;
    case '2': Serial.println(F("There is a medical emergency")); break;
    case '3': Serial.println(F("Your fuel is low"));             break;
    case '4': Serial.println(F("Someone is in danger"));         break;
    default:  Serial.println(F("Custom message"));               break;
  }
}

void setup() {
  Serial.begin(9600);

  audio.speakerPin = AUDIO_PIN;
  audio.setVolume(VOLUME);
  audio.quality(1);           // 2x oversampling for smoother audio

  sdReady = SD.begin(SD_CS_PIN);
  Serial.println(sdReady ? F("ViCAS sender ready. Press 1-9.")
                         : F("SD card not found. Check wiring and card format."));
}

void loop() {
  char key = keypad.getKey();
  if (!key) return;

  if (key < '1' || key > '9') {
    Serial.println(F("No message on this key."));
    return;
  }
  if (!sdReady) {
    Serial.println(F("SD card not ready."));
    return;
  }

  char fileName[] = "1.WAV";
  fileName[0] = key;          // "1.WAV" ... "9.WAV"

  if (!SD.exists(fileName)) {
    Serial.print(F("Missing file: "));
    Serial.println(fileName);
    return;
  }

  audio.stopPlayback();       // a new key interrupts the current message
  audio.play(fileName);

  Serial.print(F("Sending "));
  Serial.print(fileName);
  Serial.print(F(": "));
  printMessage(key);
}
