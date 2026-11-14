// Per-page static checks: every line-item-shipping page carries the right
// base price + tier, loads shipping.js, and makes no all-in shipping claim.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { SITE } from "./helpers/fake-dom.mjs";

const PAGES = {
  "shop.html": [["189.00", "med"], ["289.00", "large"]],
  "shop/pittsburgh-italian-pack.html": [["189.00", "med"]],
  "shop/pittsburgh-italian-pack-free.html": [["189.00", "med"]],
  "shop/pittsburgh-italian-pack-grill-pan.html": [["189.00", "med"]],
  "shop/pittsburgh-italian-pack-sauce.html": [["189.00", "med"]],
  "shop/pittsburgh-italian-pack-butcher.html": [["189.00", "med"]],
  "shop/pittsburgh-italian-pack-minimal.html": [["189.00", "med"]],
  "shop/pittsburgh-italian-pack-table.html": [["189.00", "med"]],
  "shop/ricci-legacy-gift-box.html": [["289.00", "large"]],
  "shop/meatball-dinner-kit.html": [["189.00", "med"]],
  "shop/sausage-roll-box.html": [["189.00", "med"]],
  "shop/thanksgiving-sausage.html": [["189.00", "med"]],
};
// Static product cards (no shipping.js) — copy only.
const CARD_PAGES = ["shop/sweet-italian-sausage.html", "shop/hot-italian-sausage.html", "shop/italian-meatballs.html",
  "sweet-italian-sausage-pittsburgh.html", "hot-italian-sausage-pittsburgh.html", "italian-meatballs-pittsburgh.html"];

// All-in claims that are false once shipping is a line item. Grill Box /
// Gameday keep their own "shipping included" model and aren't listed.
const BANNED = [
  /shipping included/i,
  /includes shipping/i,
  /shipping is included/i,
  /include shipping/i,
  /no separate shipping/i,
  /free shipping nationwide/i,
  /Order Now &middot; Free Shipping/i,
  /Free Shipping(?! Nearby| to|\s*&middot; Ships)(?=\s*[<"|])/,
];

const read = (rel) => readFileSync(path.join(SITE, rel), "utf8");

for (const [rel, prices] of Object.entries(PAGES)) {
  // The sauce split-test variant isn't committed yet; skip it until it is.
  test(rel, { skip: !existsSync(path.join(SITE, rel)) && "not in this checkout" }, () => {
    const html = read(rel);
    assert.match(html, /js\/shipping\.js/, "loads shipping.js");
    const found = new Set([...html.matchAll(/data-base="([^"]+)" data-tier="([^"]+)"/g)].map((m) => m[1] + "|" + m[2]));
    assert.deepEqual([...found].sort(), prices.map((p) => p.join("|")).sort(), "base price + tier");
    for (const re of BANNED) assert.doesNotMatch(html, re, `no "${re.source}"`);
  });
}

for (const rel of CARD_PAGES) {
  test(rel + " (cards)", () => {
    const html = read(rel);
    for (const re of BANNED) assert.doesNotMatch(html, re, `no "${re.source}"`);
  });
}

test("Pack pages with a buy button offer the upsells (buy-options.js)", () => {
  for (const rel of Object.keys(PAGES)) {
    if (!existsSync(path.join(SITE, rel))) continue;
    const html = read(rel);
    if (!/data-buy-now[^>]*data-id="pittsburgh-italian-pack"/.test(html)) continue;
    assert.match(html, /js\/buy-options\.js/, rel);
  }
});

test("shipping.html rate table matches shipping.js", () => {
  const html = read("shipping.html");
  for (const [zone, med, large] of [["Mid", 20, 30], ["Southeast / Plains", 50, 60], ["South Central / Mountain", 60, 70], ["West Coast", 80, 90], ["Alaska metro", 139, 179]]) {
    const row = html.split("<tr>").find((r) => r.includes(`<strong>${zone}</strong>`));
    assert.ok(row, zone);
    assert.match(row, new RegExp(`<td>\\$${med}</td><td>\\$${large}</td>`), zone);
  }
});

test("Black Friday page is not on the live site", () => {
  assert.throws(() => read("products-black-friday.html"));
  assert.doesNotMatch(read("_redirects"), /black-friday/);
});
