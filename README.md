# ViCAS — Visible Light Communication Audio System

**Car-to-car voice messages, carried by light.**

ViCAS is an Arduino-based Li-Fi system for vehicle-to-vehicle (V2V) communication. A driver presses one key, and a short spoken message ("Your trunk is open", "There is a medical emergency") travels from an LED on their car to a solar panel on the car ahead, where it plays through the speaker. There's no radio, no Wi-Fi and no mobile network involved.

Designed and built by **Anay Mehta** for the Computer Science category of **Bal Vigyan 2023**, The Shishukunj International School, Indore.

---

## Contents
- [The problem](#the-problem)
- [The solution](#the-solution)
- [How it works](#how-it-works)
- [Why visible light](#why-visible-light)
- [Hardware and cost](#hardware-and-cost)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Digital Li-Fi messaging](#digital-li-fi-messaging)
- [Experiments](#experiments)
- [Field feedback](#field-feedback)
- [Applications](#applications)
- [Future work](#future-work)
- [Author](#author)
- [License](#license)

---

## The problem

On the road, one driver has no reliable way to tell another something specific, however urgent it is. A door or boot might be open, luggage might be slipping off a roof rack, or a passenger might need a hospital.

- **A horn is vague.** It says "look at me", not what is wrong.
- **Stopping to signal is dangerous** in traffic, and gestures are often missed.
- **Mixed traffic makes it worse.** Driverless cars can talk to each other, but not to cars with human drivers, and the reverse is also true.

That communication gap contributes to collisions, pile-ups and injuries.

## The solution

ViCAS uses **Visible Light Communication (VLC)**, also called Li-Fi. An LED on the front of one vehicle flickers far faster than the eye can see, and a solar panel on the back of the vehicle ahead turns that flicker back into sound.

A 4×4 keypad holds pre-recorded messages, for example:

| Key | Message |
|-----|---------|
| 1 | Your trunk is open |
| 2 | There is a medical emergency |
| 3 | Your fuel is low |
| 4 | Someone is in danger (e.g. a child's hand out of the window) |
| 5–9 | Free for custom messages |

The link is quick, it needs no internet connection, and it can be fitted to a car, a two-wheeler or a truck at low cost.

---

## How it works

```
 SENDING VEHICLE                                        RECEIVING VEHICLE
 ┌─────────┐   ┌─────────────┐   ┌───────────┐  light  ┌─────────────┐   ┌────────┐   ┌─────────┐
 │ Keypad  │──▶│ Arduino Uno │──▶│ White LED │ ~~~~~▶  │ Solar panel │──▶│ LM386  │──▶│ Speaker │
 └─────────┘   │ + SD card   │   └───────────┘         └─────────────┘   └────────┘   └─────────┘
               └─────────────┘
```

1. **Select.** The driver presses a key on the keypad.
2. **Play.** The Arduino reads the matching WAV file from the SD card and plays it with the TMRpcm library. The audio leaves pin 9 as a high-frequency PWM signal.
3. **Transmit.** That signal drives a super-bright white LED, so the LED's brightness follows the audio waveform. The flicker is far too fast to see.
4. **Receive.** A solar panel on the vehicle ahead works as a light sensor. Its output voltage follows the LED's brightness, which recreates the audio signal.
5. **Play back.** An LM386 amplifier boosts that signal and plays it through the speaker. The receiving side needs no microcontroller.

A second, **digital** mode sends the key itself as data rather than audio. See [Digital Li-Fi messaging](#digital-li-fi-messaging).

---

## Why visible light

| | Radio | Microwave | Infrared | Laser | **Visible light** |
|---|---|---|---|---|---|
| Direction | All directions | Line of sight | Line of sight | Narrow beam | **Line of sight** |
| Passes through walls | Yes | Partly | No | No | **No** |
| Licence needed | Some bands | Some bands | No | Some types | **No** |
| Equipment cost | Moderate | High | Low | Low to high | **Very low** |
| Safety | Safe | Safe | Safe | Can damage eyes | **Safe** |
| Interference | Crowded spectrum | Possible | Sunlight | Low | **Doesn't affect radio** |

Visible light suits V2V messages well:
- **It's private.** The beam stays in a line of sight, so it's hard to intercept from outside that line.
- **It's cheap.** Cars already carry LEDs and headlights.
- **It needs no licence**, and it adds nothing to the crowded radio spectrum.

---

## Hardware and cost

| Item | Qty | Cost (₹) |
|------|-----|---------:|
| Arduino Uno R3 | 1 | 700 |
| 4×4 matrix keypad | 1 | 50 |
| Micro SD card reader module | 1 | 40 |
| Micro SD card (2 GB) | 1 | 114 |
| LM386 audio amplifier module | 1 | 150 |
| Solar panel | 4 | 600 (150 each) |
| Male-to-male jumper cables | 1 set | 60 |
| Male-to-female jumper cables | 1 set | 60 |
| Audio AUX cable | 1 | 100 |
| **Total** | | **≈ 1,874** |

The super-bright white LED and the speaker are also needed.

---

## Repository layout

Each sketch is in its own folder so it opens directly in the Arduino IDE.

| Sketch | What it does |
|--------|--------------|
| [`sender/`](sender/sender.ino) | **Audio sender.** Plays the message for the pressed key through the LED. |
| [`audio_test/`](audio_test/audio_test.ino) | Plays `TEST.WAV` to check the SD card, amplifier and speaker before testing the light link. |
| [`lifi_sender/`](lifi_sender/lifi_sender.ino) | **Digital sender.** Sends the pressed key as light pulses. |
| [`lifi_receiver/`](lifi_receiver/lifi_receiver.ino) | **Digital receiver.** Decodes the pulses from the solar panel and prints the key. |

All four compile for an Arduino Uno without warnings.

---

## Getting started

### 1. Install the libraries
In the Arduino IDE, open **Library Manager** and install:
- **Keypad** by Mark Stanley and Alexander Brevig
- **TMRpcm** by TMRh20

`SD` and `SPI` come with the IDE.

### 2. Prepare the audio
Record each message and convert it to **8-bit, mono, unsigned PCM WAV at 16 kHz**. For example, in Audacity set the project rate to 16000 Hz, then export as "WAV (Microsoft), Unsigned 8-bit PCM". Name the files `1.WAV` to `9.WAV`, then copy them to the root of a FAT16 or FAT32 SD card.

### 3. Wire the audio sender (Arduino Uno)

| Part | Arduino pin |
|------|-------------|
| SD module CS / MOSI / MISO / SCK | 10 / 11 / 12 / 13 |
| Audio out to the LED (through a resistor, or a transistor for a brighter LED or headlight) | 9 |
| Keypad rows | 8, 7, 6, 5 |
| Keypad columns | 4, 3, 2, A0 |

TMRpcm plays audio through Timer1, which is pin 9 on the Uno. That's why the audio is on pin 9 and the keypad's fourth column is on A0.

### 4. Wire the receiver
Connect the solar panel's output to the LM386 module's input, and connect the speaker to the module's output. The audio receiver needs no microcontroller.

### 5. Upload and test
1. Upload `audio_test` first and check that `TEST.WAV` plays.
2. Upload `sender`, point the LED at the solar panel and press **1**.
3. Open the Serial Monitor at 9600 baud to see each message as it's sent.

---

## Digital Li-Fi messaging

**Sketches:** `lifi_sender`, `lifi_receiver`

Alongside the audio link, ViCAS can send the pressed key as **digital data over light**. The receiving Arduino decodes it and prints the exact key it received. That makes the link measurable, and it's the basis for showing messages on a screen for deaf drivers.

**Frame format** (like UART, but sent as light):

| Part | Light | Length |
|------|-------|--------|
| Idle | ON | until a key is pressed |
| Start bit | OFF | 1 bit |
| Data | ON = 1, OFF = 0 | 8 bits, least significant bit first |
| Stop bit + gap | ON | 2 bits |

Each bit lasts `BIT_MS` = 10 ms, so one key takes about 110 ms. `BIT_MS` must be the same in both sketches.

**Wiring:**

| Board | Connections |
|-------|-------------|
| Sender | Keypad rows on pins 2–5, columns on pins 6–9. LED (through a resistor) or a transistor driving a headlight on pin 10. |
| Receiver | Solar panel, LDR or photodiode on A0. The status LED on pin 13 blinks for every key received, and each key is printed to the Serial Monitor at 9600 baud. |

**Calibrating the receiver:**
1. Set `CALIBRATE = true`, upload, and open the Serial Monitor at 9600 baud.
2. Note the reading with the sender's light ON and with it OFF.
3. Set `THRESHOLD` halfway between the two readings, set `CALIBRATE = false`, and upload again.

If keys arrive garbled, raise `BIT_MS` to 20–30 ms on **both** boards. The receiver checks the start bit twice to ignore flicker, and it reports a frame error if the light is blocked partway through a character.

---

## Experiments

### Experiment 1: Range
**Aim:** find how far the LED can be from the solar panel while the message still plays.
**Method:** start close enough that the speaker definitely plays, step back, and check at each distance.

| Distance (ft) | 0 | 2 | 5 | 7 | 10 |
|---|---|---|---|---|---|
| Message plays? | Yes | Yes | Yes | Yes | Yes |

**Result:** the prototype worked at every distance tested, up to **10 ft**, the furthest point tested. A higher-power LED or a lens would extend the range further.

### Experiment 2: Unfavourable conditions
**Aim:** check whether the link survives road conditions.
**Method:** repeat Experiment 1 under three simulated conditions:
- **Fog:** steam between the LED and the panel.
- **Rain:** water sprayed into the beam.
- **Mud:** brown paint sprayed to partly cover the panel.

| Condition | 0 ft | 2 ft | 5 ft | 7 ft | 10 ft |
|---|---|---|---|---|---|
| Fog | Yes | Yes | Yes | Yes | Yes |
| Rain | Yes | Yes | Yes | Yes | Yes |
| Mud | Yes | Yes | Yes | Yes | Yes |

**Result:** the message still played at every tested distance in all three conditions.

---

## Field feedback

I demonstrated the prototype at the **Integrated Command and Control Centre (AICTSL), Indore**, to **Mr. Roshan Agrawal**, Director of Chartered Speed, which runs city buses.

- **Today's situation:** bus drivers have no direct way to talk to each other on the road. They have to stop, or go through the service centre, and walkie-talkies were judged too expensive and inefficient.
- **Their response to ViCAS:** *"This is a completely new concept… This project gives us a new and efficient way of communication and works to solve a major problem we face every day."*
- **Next step they asked for:** once ViCAS is two-way, they would like to take it to their company's leadership for use in their buses.

---

## Applications

- **Everyday driving:** clear warnings between cars for safer, smoother traffic.
- **Mixed traffic:** a common channel between driverless and human-driven cars.
- **Convoys and the military:** private messages that are hard to intercept.
- **Wildlife reserves:** silent vehicle-to-vehicle messages that don't disturb animals.
- **Areas with no network:** works without Wi-Fi or mobile signal.
- **Accessibility:** messages shown on a screen for deaf drivers.

---

## Future work

- **Two-way links:** add a light at the back and a sensor at the front of every vehicle.
- **Headlights as transmitters,** and the car's own speakers and screens as receivers.
- **Integration with ADAS** (Advanced Driver Assistance Systems).
- **On-screen messages** for deaf drivers, building on the digital Li-Fi mode.
- **Priority messages** for ambulances, police cars and fire engines.
- **A head-up display:** a screen angled under the windscreen so the message reflects into the driver's view.
- **Longer range** with higher-power LEDs and focusing lenses.

---

## Author

**Anay Mehta** ([@AnayMehta976](https://github.com/AnayMehta976)), The Shishukunj International School, Indore.

## License

This project is licensed under the [MIT License](LICENSE).
