import { writeFile, readFile } from "node:fs/promises";

// Original synthetic PCM tone. No recordings or media downloads are required.
const rate = 48000,
  duration = 4,
  count = rate * duration;
const bytes = Buffer.alloc(44 + count * 2);
bytes.write("RIFF", 0);
bytes.writeUInt32LE(bytes.length - 8, 4);
bytes.write("WAVEfmt ", 8);
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(1, 22);
bytes.writeUInt32LE(rate, 24);
bytes.writeUInt32LE(rate * 2, 28);
bytes.writeUInt16LE(2, 32);
bytes.writeUInt16LE(16, 34);
bytes.write("data", 36);
bytes.writeUInt32LE(count * 2, 40);
for (let i = 0; i < count; i++) {
  const t = i / rate;
  const fade = Math.min(1, t / 0.05, (duration - t) / 0.05);
  bytes.writeInt16LE(
    Math.round(1200 * fade * Math.sin(2 * Math.PI * 220 * t)),
    44 + i * 2,
  );
}
const output = new URL("./tone.wav", import.meta.url);
try {
  await writeFile(output, bytes, { flag: "wx" });
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  if (!(await readFile(output)).equals(bytes))
    throw new Error(
      "tone.wav already exists with different contents; move it before regenerating.",
    );
}
console.log("Synthetic example audio is ready.");
