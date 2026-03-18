#include <SPI.h>
#include <SD.h>

// Pin configuration
const int chipSelect = 10;    // Chip select pin for SD card
const int pinleft  = A0;      // Left audio output pin
const int pinright = A1;      // Right audio output pin

// Playback configuration
const int sampleRate       = 8000;
const int samplesPerFrame  = 512;
const int sampleSizeInBytes = sizeof(int16_t);

// Audio data buffer
File    myFile;
byte    buffer[samplesPerFrame * sizeof(int16_t)];

void setup() {
  // Open serial communications
  Serial.begin(9600);
  while (!Serial) {
    // Wait for serial port to connect (needed for native USB)
  }

  // Initialize SD card
  if (!SD.begin(chipSelect)) {
    Serial.println("Card failed, or not present");
    return;
  }

  // Open the WAV file
  myFile = SD.open("test.wav", FILE_READ);
  if (!myFile) {
    Serial.println("Error opening file");
    return;
  }

  // Initialize analog output pins
  pinMode(pinleft,  OUTPUT);
  pinMode(pinright, OUTPUT);

  // Set up Timer1 interrupt at sample rate frequency
  Timer1.initialize(1000000 / sampleRate);
  Timer1.attachInterrupt(generateSample);
}

void loop() {
  // Read a chunk of audio data
  int bytesRead = myFile.read(buffer, sizeof(buffer));

  if (bytesRead == 0) {
    // Reached the end of the file
    return;
  }

  // If buffer wasn't filled completely, no more data remains
  if (bytesRead < sizeof(buffer)) {
    return;
  }
}

// ISR: called at sample rate frequency to output audio samples
void generateSample() {
  // Calculate buffer index from timer counter
  int bufferIndex = (timer1Counter / (1000000 / sampleRate)) %
                    (samplesPerFrame * sampleSizeInBytes);

  // Extract 16-bit sample (big-endian)
  int16_t sample = ((int16_t)buffer[bufferIndex] << 8) |
                    (int16_t)buffer[bufferIndex + 1];

  // Output sample to left and right channels
  analogWrite(pinleft,  sample);
  analogWrite(pinright, sample);
}
