# ViCAS — Visible Light Communication Audio System

> Arduino-based Li-Fi audio transmission system that uses modulated visible light (LED) to wirelessly transmit audio signals decoded by a photodiode receiver.

---

## Table of Contents
- [Overview](#overview)
- [How It Works](#how-it-works)
- [Repository Structure](#repository-structure)
- [Sender](#sender)
- [Receiver](#receiver)
  - [Receiver Final (Recommended)](#receiver-final-recommended)
  - [Receiver Low-Level (Experimental)](#receiver-low-level-experimental)
- [Hardware Requirements](#hardware-requirements)
- [Pin Configuration](#pin-configuration)
- [Required Libraries](#required-libraries)
- [WAV File Setup](#wav-file-setup)
- [Getting Started](#getting-started)
- [Contributors](#contributors)
- [License](#license)

---

## Overview

ViCAS (Visible Light Communication Audio System) is a Li-Fi based project that transmits audio wirelessly using modulated light instead of radio waves. A keypad-controlled Arduino sender selects and plays a WAV audio track through an LED. A photodiode on the receiver side picks up the modulated light signal and reconstructs the audio through a speaker.

This project demonstrates the core principle of Li-Fi: high-speed data transmission through visible light, applied to audio communication.

---

## How It Works

```
[SD Card WAV] --> [Sender Arduino] --> [LED (modulated light)] 
                                              |
                                     (line-of-sight)
                                              |
                                      [Photodiode] --> [Receiver Arduino] --> [Speaker]
```

1. The **Sender** reads a WAV file from an SD card and modulates the brightness of an LED according to the audio signal.
2. A **photodiode** detects the light fluctuations and passes the signal to the **Receiver** Arduino.
3. The **Receiver** reconstructs and amplifies the audio signal and plays it through a speaker.

---

## Repository Structure

```
ViCAS/
├── Sender.ino               # Sender: keypad-triggered WAV transmitter via LED
├── Receiver_Final.ino       # Receiver: TMRpcm-based WAV playback (recommended)
├── Receiver_LowLevel.ino    # Receiver: Timer1 interrupt-based audio output (experimental)
├── LICENSE
└── README.md
```

---

## Sender

**File:** `Sender.ino`

The sender unit uses a **4x4 matrix keypad** to select which WAV audio track to transmit. The selected track is read from an SD card and played through the TMRpcm library on a speaker pin that also drives the LED modulator.

### Key Features
- 4x4 keypad input (keys `1`–`6` mapped to audio tracks)
- TMRpcm library for WAV playback
- SD card module for audio file storage
- Speaker/LED output on **Pin 3**
- Volume control via `tmrpcm.setVolume(6)`

### Keypad Mapping

| Key | Action |
|-----|--------|
| `1` | Play `1.wav` |
| `2` | Play `2.wav` |
| `3` | Play `3.wav` |
| `4` | Play `4.wav` |
| `5` | Play `track5.wav` |
| `6` | Play `track6.wav` |

### Sender Pin Configuration

| Component | Pin |
|-----------|-----|
| SD Card CS | 10 |
| Speaker / LED out | 3 |
| Keypad Row Pins | 9, 8, 7, 6 |
| Keypad Col Pins | 5, 4, 3, 2 |
| Output | A0 |

---

## Receiver

Two receiver implementations are provided — use `Receiver_Final.ino` for standard use.

### Receiver Final (Recommended)

**File:** `Receiver_Final.ino`

A clean, production-ready receiver that uses the **TMRpcm** library to play back a WAV file (`test.wav`) stored on an SD card. Audio output is on **Pin 9**.

#### Key Features
- Uses `TMRpcm` for reliable WAV playback
- Minimal code footprint
- Speaker output on **Pin 9**
- Volume set to 6 by default
- Plays `test.wav` on startup

#### Receiver Final Pin Configuration

| Component | Pin |
|-----------|-----|
| SD Card CS | 10 |
| Speaker out | 9 |

---

### Receiver Low-Level (Experimental)

**File:** `Receiver_LowLevel.ino`

A lower-level implementation using **Timer1 hardware interrupts** to manually schedule audio sample output at a fixed sample rate (8000 Hz). Outputs stereo audio to two separate analog pins.

#### Key Features
- Manual `Timer1` ISR for precise sample timing
- Sample rate: **8000 Hz**
- Frame buffer: **512 samples**
- Stereo output on **A0 (left)** and **A1 (right)**
- Reads WAV file from SD card (`test.wav`)

#### Receiver LowLevel Pin Configuration

| Component | Pin |
|-----------|-----|
| SD Card CS | 10 |
| Left Audio out | A0 |
| Right Audio out | A1 |

---

## Hardware Requirements

### Sender Unit
- Arduino Uno / Nano
- 4x4 Matrix Keypad
- SD Card Module
- High-brightness LED (for light modulation)
- Resistors (current limiting for LED)
- MicroSD card with WAV files

### Receiver Unit
- Arduino Uno / Nano
- SD Card Module
- Photodiode or phototransistor (to detect modulated light)
- Small speaker or buzzer
- Amplifier circuit (optional, for better audio)
- MicroSD card with `test.wav`

---

## Required Libraries

Install the following libraries via Arduino Library Manager (`Sketch > Include Library > Manage Libraries`):

| Library | Purpose |
|---------|------|
| `TMRpcm` | WAV audio playback via Timer |
| `SD` | SD card read/write |
| `SPI` | SPI communication for SD module |
| `Keypad` | 4x4 matrix keypad input (Sender only) |
| `TimerOne` | Hardware Timer1 interrupts (LowLevel Receiver only) |

---

## WAV File Setup

1. Format your SD card as **FAT32**.
2. Copy your WAV audio files to the **root** of the SD card.
3. Ensure files are named exactly as referenced in code:
   - Sender: `1.wav`, `2.wav`, `3.wav`, `4.wav`, `track5.wav`, `track6.wav`
   - Receiver: `test.wav`
4. WAV files must be **8-bit, 8000–16000 Hz, mono** for best TMRpcm compatibility.

---

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AnayMehta976/ViCAS.git
   ```

2. **Install required libraries** (see [Required Libraries](#required-libraries)).

3. **Prepare SD cards** with appropriate WAV files.

4. **Upload `Sender.ino`** to the Sender Arduino and wire as per [Sender Pin Configuration](#sender-pin-configuration).

5. **Upload `Receiver_Final.ino`** to the Receiver Arduino and wire as per [Receiver Final Pin Configuration](#receiver-final-pin-configuration).

6. **Power both units**, aim the LED at the photodiode, press a key on the sender keypad, and hear audio on the receiver speaker.

---

## Contributors

| Name | GitHub |
|------|--------|
| Anay Mehta | [@AnayMehta976](https://github.com/AnayMehta976) |
| Yuvraj Nikum | [@yuvranikum](https://github.com/yuvranikum) |

---

## License

This project is licensed under the [MIT License](LICENSE).
