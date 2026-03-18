#include <Keypad.h>
#include <Wire.h>
#include <SPI.h>
#include <SD.h>
#define SD_ChipSelectPin 10
#include "TMRpcm.h"

const byte rows = 4;
const byte columns = 4;
TMRpcm tmrpcm;

char keys[rows][columns] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};

byte rowPins[rows] = {9, 8, 7, 6};
byte colPins[columns] = {5, 4, 3, 2};

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, rows, columns);

// Pin for SD card module
const int chipSelect = 10; // brown_cable

void setup() {
  Serial.begin(9600);
  tmrpcm.speakerPin = 3; // white_cable spk out
  Serial.begin(9600);
  if (!SD.begin(SD_ChipSelectPin)) {
    Serial.println("SD fail");
    return;
  }
  pinMode(A0, OUTPUT);
}

void loop() {
  char key = keypad.getKey();
  if (key) {
    Serial.println(key);
    switch (key) {
      case '1':
        Serial.print("Hello");
        tmrpcm.setVolume(6);
        tmrpcm.play("1.wav"); // replace with actual filename
        break;
      case '2':
        tmrpcm.setVolume(6);
        tmrpcm.play("2.wav"); // replace with actual filename
        break;
      case '3':
        tmrpcm.play("3.wav"); // replace with actual filename
        break;
      case '4':
        tmrpcm.play("4.wav"); // replace with actual filename
        break;
      case '5':
        tmrpcm.play("track5.wav");
        break;
      case '6':
        tmrpcm.play("track6.wav");
        break;
    }
  }
}
