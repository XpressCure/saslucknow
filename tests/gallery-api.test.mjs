import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

test("saves a public photo or video submission as pending", async () => {
  const uploadDir = await mkdtemp(path.join(os.tmpdir(), "sas-gallery-test-"));
  process.env.UPLOAD_DIR = uploadDir;
  delete process.env.MONGODB_URI;
  delete process.env.STORAGE_PROVIDER;
  const { createGalleryServer } = await import(`../server/gallery-api.mjs?test=${Date.now()}`);
  const server = createGalleryServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();

  try {
    const form = new FormData();
    form.set("title", "Sunday gathering");
    form.set("date", "2026-07-26");
    form.set("category", "Sunday meeting");
    form.set("name", "Test contributor");
    form.set("email", "contributor@example.com");
    form.set("description", "A short reflection and community video.");
    form.set("permission", "yes");
    form.append("media", new Blob(["test-image"], { type: "image/jpeg" }), "gathering.jpg");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/gallery-submissions`, { method: "POST", body: form });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.status, "pending");
    assert.match(result.reference, /^[A-F0-9]{8}$/);

    const manifests = await readdir(path.join(uploadDir, "manifests"));
    assert.equal(manifests.length, 1);
    const manifest = JSON.parse(await readFile(path.join(uploadDir, "manifests", manifests[0]), "utf8"));
    assert.equal(manifest.status, "pending");
    assert.equal(manifest.media[0].kind, "image");
    assert.equal(manifest.title, "Sunday gathering");
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(uploadDir, { recursive: true, force: true });
  }
});
