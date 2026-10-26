// ===================== Li-Fi RECEIVER =====================
// Reads light on a solar panel / LDR / photodiode connected to A0,
// decodes the frames sent by lifi_sender.ino and prints each key.
//
// Frame format:
//   idle  = light ON
//   start = 1 bit light OFF
//   data  = 8 bits, LSB first (ON = 1, OFF = 0)
//   stop  = light ON
//
// SETUP STEPS
// 1. Set CALIBRATE = true, upload, open Serial Monitor (9600).
//    Note the reading with the sender light ON and with it OFF.
// 2. Set THRESHOLD halfway between the two numbers.
// 3. Set CALIBRATE = false and upload again.

const byte SENSOR_PIN = A0;
const byte STATUS_LED = 13;          // blinks when a key is received
const unsigned long BIT_MS = 10;     // MUST match the sender
int THRESHOLD = 500;                 // set from calibration
const bool CALIBRATE = false;

const unsigned long BIT_US = BIT_MS * 1000UL;

bool isLight() {
  return analogRead(SENSOR_PIN) > THRESHOLD;
}

// Wait until the given micros() time is reached
void waitUntil(unsigned long target) {
  while ((long)(micros() - target) < 0) { }
}

void setup() {
  pinMode(STATUS_LED, OUTPUT);
  Serial.begin(9600);
  Serial.println(CALIBRATE ? F("Calibration mode: raw sensor values")
                           : F("Li-Fi receiver ready."));
}

void loop() {
  if (CALIBRATE) {
    Serial.println(analogRead(SENSOR_PIN));
    delay(100);
    return;
  }

  // Idle: light is ON. Wait for it to go OFF (start bit).
  if (isLight()) return;

  unsigned long t0 = micros();               // start bit began roughly now

  // Re-check in the middle of the start bit to ignore flicker
  waitUntil(t0 + BIT_US / 2);
  if (isLight()) return;

  // Sample each data bit in the middle of its period
  char c = 0;
  for (byte i = 0; i < 8; i++) {
    waitUntil(t0 + BIT_US * (i + 1) + BIT_US / 2);
    if (isLight()) c |= (1 << i);
  }

  // Stop bit must be light ON
  waitUntil(t0 + BIT_US * 9 + BIT_US / 2);
  if (!isLight()) {
    Serial.println(F("Frame error (light blocked or sender off)"));
    while (!isLight()) { }                   // wait for light to come back
    return;
  }

  Serial.print(F("Received: "));
  Serial.println(c);

  digitalWrite(STATUS_LED, HIGH);
  delay(50);
  digitalWrite(STATUS_LED, LOW);
}
