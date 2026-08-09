import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(path.join(projectRoot, "server", "gallery-api.mjs"), "utf8");
const template = source.match(/const emailHtml = `([\s\S]*?)`;\s+await transport\.sendMail/);

if (!template) throw new Error("Pushpanjali certificate email template was not found.");

const replacements = new Map([
  ["${escapedReference}", "UC02-000009"],
]);

let html = template[1];
for (const [placeholder, value] of replacements) html = html.replaceAll(placeholder, value);

const certificatePath = process.argv[3];
if (certificatePath) {
  const certificate = await readFile(path.resolve(certificatePath));
  html = html.replace("cid:pushpanjali-certificate-UC02-000009", `data:image/png;base64,${certificate.toString("base64")}`);
}

const output = path.resolve(process.argv[2] || path.join(projectRoot, "work", "pushpanjali-email-preview.html"));
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, html, "utf8");
console.log(output);
