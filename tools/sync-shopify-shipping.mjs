#!/usr/bin/env node
/**
 * Build the "Frozen boxes" Shopify shipping profile: one zone per shipping
 * group (states) with ONE flat rate per order. Rates and the state→zone map
 * are read from site/js/shipping.js, so checkout always matches the site.
 *
 * Staging-safe: the profile is created with NO products, so nothing changes
 * at checkout until products are moved into it (the cutover step).
 *
 * Usage (Node 22+, Shopify CLI; needs shipping + locations scopes, see below):
 *   node tools/sync-shopify-shipping.mjs            dry run: print the plan + current profiles
 *   node tools/sync-shopify-shipping.mjs --create   create the profile (no products)
 *   node tools/sync-shopify-shipping.mjs --assign   dry run of the cutover: list the variants
 *                                                   that would move into the profile
 *   node tools/sync-shopify-shipping.mjs --assign --apply   CUTOVER: move them (checkout
 *                                                   starts charging shipping by state)
 *
 * Cutover order: sync-bundles (collapse to one variant per mix) → --assign --apply
 * → deploy the site. Grill Box / Gameday stay on the General (free) profile.
 *
 * Auth once with shipping scopes:
 *   shopify store auth --store tiyndf-za.myshopify.com \
 *     --scopes read_products,write_products,read_shipping,write_shipping,read_locations
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STORE = (process.env.SHOPIFY_STORE || "tiyndf-za").replace(/\.myshopify\.com$/, "") + ".myshopify.com";
const CREATE = process.argv.includes("--create");
const ASSIGN = process.argv.includes("--assign");
const APPLY = process.argv.includes("--apply");
export const PROFILE_NAME = "Frozen boxes (shipping by state)";

/* Products that charge shipping as its own line (BUNDLES in sync-shopify-bundles.mjs). */
const LINE_ITEM_PRODUCTS = [
  "pittsburgh-italian-pack", "ricci-legacy-gift-box", "meatball-dinner-kit", "sausage-roll-box",
  "lils-tomato-sauce-quart", "italian-pack-addon-hot-10lb", "italian-pack-addon-hot-20lb",
  "italian-pack-addon-sweet-10lb", "italian-pack-addon-sweet-20lb",
];

const ZONE_LABEL = {
  A: "Nearby", B: "Mid", C: "Southeast / Plains", D: "South Central / Mountain", E: "West Coast", AK: "Alaska metro",
};
const METHOD_NAME = {
  A: "Free frozen shipping", B: "Frozen shipping", C: "Frozen shipping", D: "Frozen shipping", E: "Frozen shipping",
  AK: "UPS 2nd Day Air (ships Monday)",
};

/* Evaluate site/js/shipping.js with a tiny stub and read its rates. */
export function siteRates() {
  const noop = () => {};
  const doc = {
    readyState: "loading", addEventListener: noop, querySelectorAll: () => [], getElementById: () => null,
    createElement: () => ({}), dispatchEvent: noop,
  };
  const win = { document: doc, localStorage: { getItem: () => null, setItem: noop }, CustomEvent: function () {} };
  win.window = win;
  vm.runInNewContext(readFileSync(join(ROOT, "site/js/shipping.js"), "utf8"), win);
  const S = win.RicciShipping;
  const states = ("AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY " +
    "NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR").split(" ");
  const zones = {};
  for (const st of states) {
    const g = S.getGroup(st);
    if (!g || g === "X") continue;
    (zones[g] ||= { key: g, provinces: [], rate: S.addOn("med", st) }).provinces.push(st);
    if (S.addOn("large", st) !== zones[g].rate) throw new Error(`Pack and Legacy rates differ in ${st}; per-order profile needs one rate`);
  }
  return Object.values(zones);
}

function gql(query, variables = {}, { mutation = false } = {}) {
  const tmp = mkdtempSync(join(tmpdir(), "ricci-ship-"));
  const q = join(tmp, "q.graphql"), v = join(tmp, "v.json"), out = join(tmp, "out.json");
  writeFileSync(q, query);
  writeFileSync(v, JSON.stringify(variables));
  const args = ["store", "execute", "--store", STORE, "--query-file", q, "--variable-file", v, "--output-file", out, "--json"];
  if (mutation) args.push("--allow-mutations");
  const r = spawnSync("shopify", args, { encoding: "utf8", cwd: ROOT });
  const body = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : null;
  rmSync(tmp, { recursive: true, force: true });
  if (r.status !== 0) {
    const raw = (r.stdout || "") + (r.stderr || "");
    const msgs = [...raw.matchAll(/\\"message\\": \\"([^\\]+)\\"/g)].map((m) => m[1]);
    const hint = /ACCESS_DENIED/.test(raw)
      ? "\nRe-auth with: shopify store auth --store " + STORE + " --scopes read_products,write_products,read_shipping,write_shipping,read_locations"
      : "";
    throw new Error((msgs.length ? [...new Set(msgs)].join("; ") : "shopify store execute failed") + hint);
  }
  if (body?.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
  return body.data ?? body;
}

const PROFILES = `{ deliveryProfiles(first: 20) { nodes { id name default productVariantsCount { count }
  profileLocationGroups { locationGroup { locations(first: 10) { nodes { id name } } } } } } }`;

const CREATE_PROFILE = `mutation($profile: DeliveryProfileInput!) {
  deliveryProfileCreate(profile: $profile) { profile { id name } userErrors { field message } } }`;

const VARIANTS_BY_HANDLE = `query($handle: String!) { productByHandle(handle: $handle) {
  title variants(first: 50) { nodes { id sku price } } } }`;

const UPDATE_PROFILE = `mutation($id: ID!, $profile: DeliveryProfileInput!) {
  deliveryProfileUpdate(id: $id, profile: $profile) { profile { id productVariantsCount { count } } userErrors { field message } } }`;

function assign() {
  const { deliveryProfiles } = gql(PROFILES);
  const target = deliveryProfiles.nodes.find((p) => p.name === PROFILE_NAME);
  if (!target) throw new Error(`"${PROFILE_NAME}" doesn't exist. Run --create first.`);

  const ids = [];
  let zoneLeft = false;
  for (const handle of LINE_ITEM_PRODUCTS) {
    const p = gql(VARIANTS_BY_HANDLE, { handle }).productByHandle;
    if (!p) { console.log(`  ⚠ ${handle}: not found, skipped`); continue; }
    const zoned = p.variants.nodes.filter((v) => /-[B-E]$/.test(v.sku || ""));
    if (zoned.length) zoneLeft = true;
    console.log(`  ${p.title}: ${p.variants.nodes.map((v) => `${v.sku} $${v.price}`).join(", ")}` +
      (zoned.length ? `  ⚠ still has zone variants (${zoned.length}); run sync-bundles first` : ""));
    ids.push(...p.variants.nodes.map((v) => v.id));
  }
  console.log(`\n${ids.length} variants → "${PROFILE_NAME}" (now has ${target.productVariantsCount.count}).`);

  if (!APPLY) {
    console.log("Dry run. Add --apply to move them (checkout starts charging shipping by state).");
    return;
  }
  if (zoneLeft) throw new Error("Zone variants still exist. Run ./tools/shopify/sync-bundles.sh first.");
  const res = gql(UPDATE_PROFILE, { id: target.id, profile: { variantsToAssociate: ids } }, { mutation: true }).deliveryProfileUpdate;
  if (res.userErrors.length) throw new Error(res.userErrors.map((e) => `${e.field}: ${e.message}`).join("; "));
  console.log(`✓ Moved. "${PROFILE_NAME}" now has ${res.profile.productVariantsCount.count} variants.`);
}

function main() {
  if (ASSIGN) return assign();
  const zones = siteRates();
  console.log("Zones from site/js/shipping.js (one charge per order):");
  for (const z of zones) {
    console.log(`  ${ZONE_LABEL[z.key].padEnd(26)} ${("$" + z.rate).padStart(5)}  ${METHOD_NAME[z.key]}  [${z.provinces.join(" ")}]`);
  }
  console.log("  Not covered (can't check out): HI, PR, territories, international\n");

  const { deliveryProfiles } = gql(PROFILES);
  console.log("Current Shopify shipping profiles:");
  for (const p of deliveryProfiles.nodes) {
    console.log(`  ${p.name}${p.default ? " (default)" : ""} · ${p.productVariantsCount.count} variants`);
  }
  if (deliveryProfiles.nodes.some((p) => p.name === PROFILE_NAME)) {
    console.log(`\n"${PROFILE_NAME}" already exists. Nothing to create.`);
    return;
  }

  const general = deliveryProfiles.nodes.find((p) => p.default);
  const locations = general.profileLocationGroups.flatMap((g) => g.locationGroup.locations.nodes);
  console.log(`\nShips from: ${locations.map((l) => l.name).join(", ")}`);

  const profile = {
    name: PROFILE_NAME,
    locationGroupsToCreate: [{
      locations: locations.map((l) => l.id),
      zonesToCreate: zones.map((z) => ({
        name: ZONE_LABEL[z.key],
        countries: [{ code: "US", provinces: z.provinces.map((code) => ({ code })) }],
        methodDefinitionsToCreate: [{
          name: METHOD_NAME[z.key],
          active: true,
          rateDefinition: { price: { amount: z.rate.toFixed(2), currencyCode: "USD" } },
        }],
      })),
    }],
  };

  if (!CREATE) {
    console.log(`\nDry run. Re-run with --create to make "${PROFILE_NAME}" (no products, no checkout change).`);
    return;
  }
  const res = gql(CREATE_PROFILE, { profile }, { mutation: true }).deliveryProfileCreate;
  if (res.userErrors.length) throw new Error(res.userErrors.map((e) => `${e.field}: ${e.message}`).join("; "));
  console.log(`\n✓ Created ${res.profile.name} (${res.profile.id}) with 0 products.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(); } catch (e) { console.error("✗ " + e.message); process.exit(1); }
}
