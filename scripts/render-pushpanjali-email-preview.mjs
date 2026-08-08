import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(path.join(projectRoot, "server", "gallery-api.mjs"), "utf8");
const template = source.match(/const certificateHtml = `([\s\S]*?)`;\s+await transport\.sendMail/);

if (!template) throw new Error("Pushpanjali email certificate template was not found.");

const replacements = new Map([
  ["${escapedName}", "Meghna Singh"],
  ["${escapedFlower}", "Divine Love"],
  ["${escapedMeaning}", "A flower that is said to blossom even in the desert."],
  ["${escapedBotanical}", "Punica granatum - orange-red, double"],
  ["${escapedReference}", "UC02-000009"],
  ["${flower.cutout}", "https://www.saslucknow.in/pushpanjali-divine-love-cutout.png"],
]);

let html = template[1];
for (const [placeholder, value] of replacements) html = html.replaceAll(placeholder, value);

const output = path.resolve(process.argv[2] || path.join(projectRoot, "work", "pushpanjali-email-preview.html"));
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, html, "utf8");
console.log(output);
