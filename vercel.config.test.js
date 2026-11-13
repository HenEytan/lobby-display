// vercel.json is a public contract: the kiosk auto-update (src/lib/autoUpdate.js) polls /index.html
// and only sees a new build when / and /index.html are never cached, and the SPA rewrite must leave
// /api/* to the functions. A move to another Vercel account carries this file over as-is; this test
// keeps an edit along the way from dropping either.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf8"));

function cacheControl(source) {
  const rule = (config.headers || []).find((h) => h.source === source);
  const header = rule && rule.headers.find((h) => h.key.toLowerCase() === "cache-control");
  return header ? header.value : null;
}

for (const source of ["/", "/index.html"]) {
  test(`${source} is served with Cache-Control no-store`, () => {
    assert.match(String(cacheControl(source)), /\bno-store\b/);
  });
}

test("the SPA rewrite sends page routes to / and spares /api/", () => {
  const rewrite = (config.rewrites || []).find((r) => r.destination === "/");
  assert.ok(rewrite, "no SPA rewrite to /");
  // The source is a path-to-regexp pattern; this one is also a valid JS regex.
  const pattern = new RegExp(`^${rewrite.source}$`);
  assert.ok(pattern.test("/admin"), "page route not rewritten");
  assert.ok(!pattern.test("/api/state"), "/api/state would be rewritten to the SPA");
});

test("the build writes dist/ with npm run build", () => {
  assert.equal(config.buildCommand, "npm run build");
  assert.equal(config.outputDirectory, "dist");
});
