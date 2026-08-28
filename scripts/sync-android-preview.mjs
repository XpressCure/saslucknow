import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const wrapperPath = path.join(root, "android-app-design", "qa", "sas-lucknow-android-redesign-preview.html");
const sourcePath = path.join(root, "android-app-design", "qa", "sas-lucknow-android-redesign-source.html");

function decode(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function encode(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const mode = process.argv[2] || "decode";
if (mode === "decode") {
  const wrapper = await readFile(wrapperPath, "utf8");
  const match = wrapper.match(/srcdoc="([\s\S]*?)"><\/iframe>/);
  if (!match) throw new Error("The embedded Android preview could not be found.");
  await writeFile(sourcePath, decode(match[1]), "utf8");
  console.log(sourcePath);
} else if (mode === "encode") {
  const [wrapper, source] = await Promise.all([readFile(wrapperPath, "utf8"), readFile(sourcePath, "utf8")]);
  if (!/srcdoc="[\s\S]*?"><\/iframe>/.test(wrapper)) throw new Error("The embedded Android preview could not be found.");
  await writeFile(wrapperPath, wrapper.replace(/srcdoc="[\s\S]*?"><\/iframe>/, `srcdoc="${encode(source)}"></iframe>`), "utf8");
  console.log(wrapperPath);
} else {
  throw new Error("Use decode or encode.");
}
