# ViCAS — Visible Light Communication Audio System

> **ViCAS** (Visible Light Communication Audio System) is an Arduino-based Li-Fi system designed for Vehicle-to-Vehicle (V2V) communication. It transmits modulated audio data via visible light (LED), providing a safe, secure, and interference-free alternative to radio-based systems.

---

## Table of Contents
- [Project Vision](#project-vision)
- [The Problem](#the-problem)
- [Our Solution: VLC Technology](#our-solution-vlc-technology)
- [How It Works](#how-it-works)
- [Hardware & Circuitry](#hardware--circuitry)
- [Sender Module](#sender-module)
- [Receiver Module](#receiver-module)
- [Digital Li-Fi Messaging](#digital-li-fi-messaging)
- [Repository Contents](#repository-contents)
- [Experiments & Validation](#experiments--validation)
- [Survey & Real-World Feedback](#survey--real-world-feedback)
- [Future Scope](#future-scope)
- [Contributors](#contributors)
- [License](#license)

---

## Project Vision

Created for the **Bal Vigyan 2023** competition by students of *The Shishukunj International School, Indore*, ViCAS aims to bridge the communication gap between drivers on the road. Whether informing a fellow driver of an open trunk, a flat tire, or a medical emergency, ViCAS provides a clear and immediate voice-based link where traditional methods (honking, hand gestures) fail.

---

## The Problem

- **Communication Gap:** Drivers lack a safe way to convey specific messages (e.g., "Your boot is open", "Medical emergency").
- **Traffic Safety:** Honking is vague, and hand gestures can be distracting or dangerous in high-traffic areas.
- **V2V for the Future:** As autonomous vehicles enter the road, a hybrid communication system between human-driven and self-driving cars is essential to prevent pile-ups and accidents.

---

## Our Solution: VLC Technology

ViCAS utilizes **Visible Light Communication (VLC)**, often called Li-Fi. Unlike Wi-Fi which uses radio waves, VLC transmits data by flickering an LED at speeds imperceptible to the human eye.

### Why Visible Light?
| Wave Type | Direction | Security | Penetration | Why/Why Not? |
|-----------|-----------|----------|-------------|--------------|
| **Radio** | Omni | Poor | High | High interference, low bandwidth. |
| **Microwave** | Uni | Medium | Low | Bulky, expensive, high power draw. |
| **Infrared** | Uni | High | None | Slow data rate, very short distance. |
| **Laser** | Uni | Very High | None | Harmful to eyes, creates heat. |
| **Visible Light** | Uni | **Very High** | None | **Safe, low cost, no interference.** |

---

## How It Works

1. **Input:** The driver selects a message on a **4x4 Keypad** (e.g., Press '1' for "Your trunk is open").
2. **Transmission:** The Arduino reads the `.wav` file from an SD card and modulates a **Super Bright LED** using binary logic.
3. **Link:** The light travels through the air to the car in front.
4. **Reception:** A **Solar Panel** (acting as a high-speed photodetector) on the receiving car picks up the light signal.
5. **Output:** The signal is converted back to electrical waves, amplified via an **LM386 module**, and played through the car's speakers.

---

## Hardware & Circuitry

### Components List
- **Arduino Uno R3:** The brain of the sending/receiving modules.
- **4x4 Matrix Keypad:** For message selection.
- **SD Card Reader Module:** To store audio files.
- **Super Bright White LED:** Light modulator.
- **Solar Panel (4V):** High-sensitivity light receiver.
- **LM386 Audio Amplifier:** For clear audio output.
- **Micro SD Card (2GB):** Storing 8-bit, 16kHz Mono WAV files.

### Cost Efficiency
The total prototype cost is approximately **₹1,874 (INR)**, making it a highly feasible solution for mass implementation in countries like India.

---

## Sender Module
**File:** `Sender.ino`
- **Pins:** Keypad (9-2), SD CS (10), Speaker/LED out (3).
- **Messages:** Pre-recorded audio tracks triggered by keypad input.

## Receiver Module
- **Receiver_Final.ino:** Clean TMRpcm-based implementation.
- **Receiver_LowLevel.ino:** Experimental stereo version using Timer1 interrupts (A0/A1 out).

---

## Digital Li-Fi Messaging
**Files:** `lifi_sender/lifi_sender.ino`, `lifi_receiver/lifi_receiver.ino`

Alongside the audio link, ViCAS can send a keypad key as **digital data over light**. The receiving Arduino decodes it and prints the exact key it received, which makes the link easy to test and opens the way to on-screen messages for deaf drivers.

**Frame format** (UART-style, sent with light):

| Part | Light | Length |
|------|-------|--------|
| Idle | ON | until a key is pressed |
| Start bit | OFF | 1 bit |
| Data | ON = 1, OFF = 0 | 8 bits, least significant bit first |
| Stop bit + gap | ON | 2 bits |

Each bit lasts `BIT_MS` = 10 ms, so one key takes about 110 ms. `BIT_MS` must be the same in both sketches.

**Sender wiring:** keypad rows on pins 2–5, columns on pins 6–9, and the LED (through a resistor) or a transistor driving a headlight on pin 10.

**Receiver wiring:** solar panel, LDR or photodiode on **A0**. The status LED on pin 13 blinks for every key received, and each key is printed to the Serial Monitor at 9600 baud.

**Receiver calibration:**
1. Set `CALIBRATE = true`, upload, and open the Serial Monitor at 9600 baud.
2. Note the reading with the sender light ON and with it OFF.
3. Set `THRESHOLD` halfway between the two, set `CALIBRATE = false`, and upload again.

If keys arrive garbled, raise `BIT_MS` to 20–30 ms on **both** boards. The receiver checks the start bit twice to ignore flicker, and reports a frame error if the light is blocked mid-character.

---

## Repository Contents

| File | What it does |
|------|--------------|
| `Sender.ino` | Plays a pre-recorded WAV from the SD card through the LED when a keypad key is pressed (audio link). |
| `Receiver_Final.ino` | TMRpcm-based WAV playback on pin 9. |
| `Receiver_LowLevel.ino` | Experimental Timer1 interrupt-based stereo output on A0/A1. |
| `lifi_sender/lifi_sender.ino` | Sends keypad keys as digital light pulses (digital link). |
| `lifi_receiver/lifi_receiver.ino` | Decodes those pulses from a solar panel or LDR and prints each key. |

---

## Experiments & Validation

### Experiment 1: Range Test
Tests showed the prototype maintains clear audio transmission up to **10 feet** using standard components. High-powered LEDs and optimized lenses can extend this significantly.

### Experiment 2: Unfavorable Conditions
ViCAS was tested under simulated **Fog, Rain, and Mud** (partial sensor blockage).
- **Result:** The system remained functional across all conditions, proving its resilience for real-world road environments.

---

## Survey & Real-World Feedback

We conducted a survey at the **Integrated Command and Control Centre (AICTSL)** with **Mr. Roshan Agrawal** (Director, Chartered Speed).
- **Current State:** Bus drivers have no way to communicate other than stopping or using expensive/inefficient walkie-talkies.
- **Feedback:** "This project gives us a new and efficient way of communication... it has a very broad scope and should be implemented at a national level."

---

## Future Scope

- **Bi-Directional Link:** Lights/sensors on both front and back of cars.
- **ADAS Integration:** Incorporating ViCAS into Advanced Driver Assistance Systems.
- **Accessibility:** Adding visual screens for deaf drivers to read incoming messages instead of hearing them.
- **Smart Infrastructure:** Converting streetlights into "smart poles" that communicate with vehicles.

---

## Contributors

- **Palak Maheshwari**
- **Kenisha Vaidya**
- **Yuvraj Nikum** ([@yuvranikum](https://github.com/yuvranikum))
- **Akarsha Garg**
- **Anay Mehta** ([@AnayMehta976](https://github.com/AnayMehta976))

**Supervisors:** Mr. Rakesh Soni, Mr. Utkarsh Deshpande.
*The Shishukunj International School, Indore.*

---

## License
This project is licensed under the [MIT License](LICENSE).
