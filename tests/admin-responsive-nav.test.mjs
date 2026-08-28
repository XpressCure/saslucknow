import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("narrow administrator navigation cannot stretch active buttons into large boxes", async () => {
  const css = await readFile(new URL("../app/admin/admin-responsive-nav-fix.css", import.meta.url), "utf8");
  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.match(css, /grid-template-rows:\s*max-content\s+minmax\(0,\s*1fr\)/);
  assert.match(css, /\.admin-body\s*>\s*aside button\s*\{[^}]*height:\s*48px[^}]*min-height:\s*48px/s);
  assert.match(css, /align-items:\s*center/);
});

test("administrator page imports the responsive navigation correction last", async () => {
  const page = await readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
  const correction = page.lastIndexOf('import "./admin-responsive-nav-fix.css";');
  assert.ok(correction > page.lastIndexOf('import "./admin.css";'));
  assert.ok(correction > page.lastIndexOf('import "./campaign-mobile-preview.css";'));
});
