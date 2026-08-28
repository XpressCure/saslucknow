import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { campaignDestinationCatalog } from "../server/participation-campaign-core.mjs";

test("every approved campaign destination has a member-app route", async () => {
  const memberClient = await readFile(new URL("../app/member/member-client.tsx", import.meta.url), "utf8");
  for (const destination of campaignDestinationCatalog()) {
    assert.match(memberClient, new RegExp(`case ["']${destination.id}["']:`), `${destination.label} needs a member route`);
  }
});

test("Creative Studio displays the approved destination selector and guidance", async () => {
  const studio = await readFile(new URL("../app/admin/campaign-studio.tsx", import.meta.url), "utf8");
  assert.match(studio, /Button destination<select/);
  assert.match(studio, /BUTTON OPENS/);
  assert.match(studio, /selectedDestination\.description/);
});
