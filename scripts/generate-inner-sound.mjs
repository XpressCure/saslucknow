import fs from "node:fs";
import path from "node:path";

const sampleRate = 22050;
const seconds = 42;
const count = sampleRate * seconds;
const output = path.resolve("public", "inner-sound");
fs.mkdirSync(output, { recursive: true });

const soundscapes = [
  { file: "silence-space.wav", root: 73.42, chord: [1, 1.5, 2, 3], pulse: 23, bell: 21, air: 0.003 },
  { file: "dawn-bells.wav", root: 146.83, chord: [1, 1.25, 1.5, 2], pulse: 13, bell: 3.1, air: 0.010 },
  { file: "sunrise-glow.wav", root: 164.81, chord: [1, 1.2, 1.5, 2.4], pulse: 11, bell: 4.7, air: 0.008 },
  { file: "evening-stillness.wav", root: 110, chord: [1, 1.333, 1.5, 2], pulse: 17, bell: 6.4, air: 0.006 },
  { file: "peace-before-sleep.wav", root: 98, chord: [1, 1.25, 1.5, 1.875], pulse: 19, bell: 8.2, air: 0.012 },
  { file: "peace-bowl.wav", root: 130.81, chord: [1, 1.5, 2, 3], pulse: 15, bell: 5.5, air: 0.005 },
  { file: "concentration-drone.wav", root: 110, chord: [1, 1.5, 2, 2.5], pulse: 9, bell: 10.5, air: 0.003 },
  { file: "gratitude-chimes.wav", root: 174.61, chord: [1, 1.25, 1.5, 2], pulse: 12, bell: 2.8, air: 0.008 },
  { file: "courage-flame.wav", root: 146.83, chord: [1, 1.2, 1.5, 2], pulse: 7, bell: 4.1, air: 0.006 },
  { file: "nature-breeze.wav", root: 123.47, chord: [1, 1.333, 1.5, 2], pulse: 16, bell: 7.3, air: 0.025 },
];

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function writeWav(definition, seed) {
  const random = seeded(seed);
  const dataSize = count * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  let smoothNoise = 0;
  for (let index = 0; index < count; index += 1) {
    const time = index / sampleRate;
    const loopFade = Math.min(1, time / 2.5, (seconds - time) / 2.5);
    const breath = 0.68 + 0.32 * Math.sin((Math.PI * 2 * time) / definition.pulse - 0.8);
    let sample = 0;
    definition.chord.forEach((ratio, chordIndex) => {
      const frequency = definition.root * ratio;
      const drift = 1 + 0.0018 * Math.sin(time * (0.09 + chordIndex * 0.017));
      sample += Math.sin(Math.PI * 2 * frequency * drift * time + chordIndex * 0.8) * (0.10 / (1 + chordIndex * 0.4));
    });
    const bellPhase = time % definition.bell;
    const bellEnvelope = bellPhase < 3 ? Math.exp(-bellPhase * 1.15) : 0;
    const bellFrequency = definition.root * (definition.file.includes("gratitude") ? 4 : 3);
    sample += bellEnvelope * (Math.sin(Math.PI * 2 * bellFrequency * time) * 0.055 + Math.sin(Math.PI * 2 * bellFrequency * 2.01 * time) * 0.018);
    smoothNoise = smoothNoise * 0.992 + (random() * 2 - 1) * 0.008;
    sample += smoothNoise * definition.air;
    if (definition.file.includes("nature")) {
      const birdPhase = time % 9.5;
      if (birdPhase > 1.2 && birdPhase < 2.2) {
        const local = birdPhase - 1.2;
        sample += Math.sin(Math.PI * 2 * (950 + 420 * local) * time) * Math.sin(Math.PI * local) * 0.018;
      }
    }
    const value = Math.max(-1, Math.min(1, sample * breath * loopFade * 0.78));
    buffer.writeInt16LE(Math.round(value * 32767), 44 + index * 2);
  }
  fs.writeFileSync(path.join(output, definition.file), buffer);
}

soundscapes.forEach((soundscape, index) => writeWav(soundscape, 9041 + index * 137));
console.log(`Generated ${soundscapes.length} Inner Sound soundscapes in ${output}`);
