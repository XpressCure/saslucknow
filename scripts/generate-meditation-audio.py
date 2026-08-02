"""Generate the original, loopable meditation soundscape used on the homepage."""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path


SAMPLE_RATE = 22_050
DURATION = 96.0
TAU = math.tau
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "audio" / "quiet-aspiration.wav"
CHORDS = (
    (130.81, 164.81, 196.00, 246.94),
    (110.00, 130.81, 164.81, 196.00),
    (87.31, 130.81, 164.81, 196.00),
    (98.00, 146.83, 196.00, 220.00),
)


def chord_weights(time: float) -> list[float]:
    position = (time / DURATION) * len(CHORDS)
    left = math.floor(position)
    fraction = position - left
    eased = 0.5 - 0.5 * math.cos(math.pi * fraction)
    weights = [0.0] * len(CHORDS)
    weights[left % len(CHORDS)] = 1.0 - eased
    weights[(left + 1) % len(CHORDS)] = eased
    return weights


def sample(time: float) -> float:
    weights = chord_weights(time)
    breath = 0.82 + 0.18 * math.sin(TAU * time / 12.0)
    sound = 0.0
    for chord_index, chord in enumerate(CHORDS):
        weight = weights[chord_index]
        if weight == 0:
            continue
        for note_index, frequency in enumerate(chord):
            phase = note_index * 0.71 + chord_index * 0.29
            sound += weight * (
                0.105 * math.sin(TAU * frequency * time + phase)
                + 0.028 * math.sin(TAU * frequency * 2.0 * time + phase * 1.3)
                + 0.011 * math.sin(TAU * frequency * 3.0 * time + phase * 0.8)
            )

    sound += 0.07 * math.sin(TAU * 65.405 * time)
    sound += 0.035 * math.sin(TAU * 98.0 * time + 0.4)
    sound += 0.012 * math.sin(TAU * 523.25 * time + 0.9 * math.sin(TAU * time / 16.0))
    for start, frequency in ((7.0, 659.25), (31.0, 783.99), (55.0, 698.46), (79.0, 587.33)):
        elapsed = time - start
        if 0.0 <= elapsed <= 10.0:
            envelope = (1.0 - math.exp(-elapsed * 3.0)) * math.exp(-elapsed * 0.48)
            sound += envelope * (
                0.055 * math.sin(TAU * frequency * elapsed)
                + 0.022 * math.sin(TAU * frequency * 2.01 * elapsed)
            )
    return math.tanh(sound * breath * 1.08) * 0.72


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    total_frames = int(SAMPLE_RATE * DURATION)
    with wave.open(str(OUTPUT), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(SAMPLE_RATE)
        block = bytearray()
        for frame in range(total_frames):
            value = max(-1.0, min(1.0, sample(frame / SAMPLE_RATE)))
            block.extend(struct.pack("<h", round(value * 32_767)))
            if len(block) >= 65_536:
                audio.writeframesraw(block)
                block.clear()
        if block:
            audio.writeframesraw(block)
    print(f"Created {OUTPUT} ({OUTPUT.stat().st_size / 1_048_576:.2f} MB)")


if __name__ == "__main__":
    main()
