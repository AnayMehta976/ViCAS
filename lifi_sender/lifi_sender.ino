// ===================== Li-Fi SENDER =====================
// Reads a key from the 4x4 keypad and sends it as light pulses
// through an LED / headlight on LIGHT_PIN.
//
// Frame format (same as UART, sent with light):
//   idle  = light ON
//   start = 1 bit light OFF
//   data  = 8 bits, least significant bit first (ON = 1, OFF = 0)
//   stop  = light ON
// BIT_MS must be identical on the sender and the receiver.

#include <Keypad.h>

// ---------- Keypad ----------
const byte ROWS = 4;
const byte COLS = 4;

byte rowPins[ROWS] = {2, 3, 4, 5};
byte colPins[COLS] = {6, 7, 8, 9};

char keys[ROWS][COLS] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// ---------- Light source ----------
const byte LIGHT_PIN = 10;          // LED (via resistor) or transistor driving the headlight
const unsigned long BIT_MS = 10;    // time per bit; raise to 20-30 if the receiver makes errors

// Hold the light at one level for exactly one bit period
void sendBit(bool bitValue) {
  digitalWrite(LIGHT_PIN, bitValue ? HIGH : LOW);
  delay(BIT_MS);
}

void sendByte(char c) {
  sendBit(0);                          // start bit (light OFF)
  for (byte i = 0; i < 8; i++) {
    sendBit((c >> i) & 1);             // data bits, LSB first
  }
  sendBit(1);                          // stop bit (light ON)
  sendBit(1);                          // extra gap so frames don't run together
}

void setup() {
  pinMode(LIGHT_PIN, OUTPUT);
  digitalWrite(LIGHT_PIN, HIGH);       // idle = light ON
  Serial.begin(9600);
  Serial.println(F("Li-Fi sender ready. Press a key."));
}

void loop() {
  char key = keypad.getKey();          // returns 0 (NO_KEY) when nothing is pressed
  if (key) {
    sendByte(key);
    Serial.print(F("Sent: "));
    Serial.println(key);
  }
}
