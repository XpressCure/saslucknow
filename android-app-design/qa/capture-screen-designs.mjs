import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/Meghna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 });
const source = pathToFileURL("C:/Users/Meghna/Documents/Codex/2026-07-29/we/android-app-design/qa/screen-designs-final.html").href;
await page.goto(source, { waitUntil: "load" });
await page.screenshot({ path: "C:/Users/Meghna/Documents/Codex/2026-07-29/we/android-app-design/qa/screen-designs-final-home.png", fullPage: true });
const visual = page.frameLocator("iframe");
await visual.locator('[data-screen="darshan"]').click();
await page.screenshot({ path: "C:/Users/Meghna/Documents/Codex/2026-07-29/we/android-app-design/qa/screen-designs-final-darshan.png", fullPage: true });
await visual.locator('[data-screen="sangha"]').click();
await page.screenshot({ path: "C:/Users/Meghna/Documents/Codex/2026-07-29/we/android-app-design/qa/screen-designs-final-sangha.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 1000 });
await visual.locator('[data-screen="innerSetup"]').click();
await page.screenshot({ path: "C:/Users/Meghna/Documents/Codex/2026-07-29/we/android-app-design/qa/screen-designs-final-mobile-inner-room.png", fullPage: true });
await browser.close();
