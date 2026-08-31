#!/usr/bin/env node
/**
 * Sync Ricci's bundle products to Shopify via Shopify CLI.
 *
 * Uses: shopify app execute (GraphQL Admin API)
 * Requires: Node 22+, linked shopify.app.toml, app installed on store
 *
 * Usage:
 *   ./tools/shopify/sync-bundles.sh --ping
 *   ./tools/shopify/sync-bundles.sh --dry-run
 *   ./tools/shopify/sync-bundles.sh
 *
 * Optional tools/.env.local:
 *   SHOPIFY_STORE=tiyndf-za   (permanent myshopify subdomain — see Settings → Domains)
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS = join(ROOT, "tools");
const GRAPHQL = join(TOOLS, "shopify", "graphql");
const ARGS = new Set(process.argv.slice(2));
const DRY_RUN = ARGS.has("--dry-run");
const PING_ONLY = ARGS.has("--ping");

loadEnvFile(join(TOOLS, ".env.local"));

const SHIP = {
  A: { med: 0, large: 0 },
  B: { med: 8, large: 12 },
  C: { med: 16, large: 22 },
  D: { med: 24, large: 32 },
  E: { med: 32, large: 42 },
};

const ZONES = [
  { key: "A", label: "Zone A — Nearby" },
  { key: "B", label: "Zone B — Mid" },
  { key: "C", label: "Zone C — Southeast" },
  { key: "D", label: "Zone D — Central" },
  { key: "E", label: "Zone E — West" },
];

const BUNDLES = [
  {
    handle: "pittsburgh-italian-pack",
    title: "The Pittsburgh Italian Pack",
    base: 189,
    tier: "med",
    skuPrefix: "RIC-PITT",
    // TODO: confirm shipping weight incl. cold packs (12 lb of meat + 1 sausage roll)
    weightLb: 13,
    description:
      "<p>5 lb sweet sausage, 5 lb hot sausage, 2 lb hand-rolled meatballs, and one of Lil's sausage rolls — " +
      "the full Sunday table. Shipped frozen with shipping included in price.</p>",
    tags: ["Bundle", "Gift", "Free Shipping", "Frozen"],
  },
  {
    handle: "ricci-legacy-gift-box",
    title: "The Ricci Legacy Gift Box",
    base: 289,
    tier: "large",
    skuPrefix: "RIC-LEGACY",
    // TODO: confirm shipping weight incl. cold packs (12 lb of meat + peppers, 2 rolls, qt of sauce)
    weightLb: 17,
    description:
      "<p>5 lb sweet sausage, 5 lb hot sausage, 2 lb meatballs, stuffed banana peppers, two sausage rolls, " +
      "and a quart of homemade sauce — beautifully packaged. Shipped frozen with shipping included in price.</p>",
    tags: ["Bundle", "Gift Box", "Free Shipping", "Frozen"],
  },
];

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

function readTomlDevStore() {
  const toml = join(ROOT, "shopify.app.toml");
  if (!existsSync(toml)) return null;
  const match = readFileSync(toml, "utf8").match(/^\s*dev_store_url\s*=\s*"([^"]+)"/m);
  return match ? match[1].replace(/\.myshopify\.com$/, "") : null;
}

function storeDomain() {
  const raw = process.env.SHOPIFY_STORE || readTomlDevStore();
  if (!raw) {
    console.error("✗ Set SHOPIFY_STORE in tools/.env.local or [build].dev_store_url in shopify.app.toml");
    process.exit(1);
  }
  return raw.includes(".myshopify.com") ? raw : `${raw}.myshopify.com`;
}

function priceFor(base, tier, zoneKey) {
  return (base + (SHIP[zoneKey]?.[tier] ?? 0)).toFixed(2);
}

function buildProductSetInput(bundle, existingId) {
  const input = {
    title: bundle.title,
    handle: bundle.handle,
    descriptionHtml: bundle.description,
    vendor: "Ricci's Italian Sausage",
    productType: "Bundle",
    tags: bundle.tags,
    status: "ACTIVE",
    productOptions: [
      { name: "Shipping Zone", values: ZONES.map((z) => ({ name: z.label })) },
    ],
    variants: ZONES.map((zone) => ({
      optionValues: [{ optionName: "Shipping Zone", name: zone.label }],
      price: parseFloat(priceFor(bundle.base, bundle.tier, zone.key)),
      sku: `${bundle.skuPrefix}-${zone.key}`,
      inventoryPolicy: "CONTINUE",
    })),
  };
  if (existingId) input.id = existingId;
  return input;
}

function ensureShopifyCli() {
  const check = spawnSync("shopify", ["version"], { encoding: "utf8" });
  if (check.status !== 0) {
    console.error("✗ Shopify CLI not available. Use Node 22+ and: npm install -g @shopify/cli@latest");
    console.error(check.stderr || check.stdout);
    process.exit(1);
  }
  return check.stdout.trim();
}

function runGraphQL(queryFile, variables, { mutation = false } = {}) {
  const tmp = mkdtempSync(join(tmpdir(), "ricci-shopify-"));
  const outFile = join(tmp, "out.json");
  const varFile = join(tmp, "vars.json");
  writeFileSync(varFile, JSON.stringify(variables));

  const args = [
    "store", "execute",
    "--store", storeDomain(),
    "--query-file", queryFile,
    "--variable-file", varFile,
    "--output-file", outFile,
    "--json",
  ];
  if (mutation) args.push("--allow-mutations");

  const result = spawnSync("shopify", args, { encoding: "utf8", cwd: ROOT });
  let body = null;
  if (existsSync(outFile)) {
    try {
      body = JSON.parse(readFileSync(outFile, "utf8"));
    } catch {
      body = { raw: readFileSync(outFile, "utf8") };
    }
  }

  rmSync(tmp, { recursive: true, force: true });

  if (result.status !== 0) {
    const msg = (result.stderr || result.stdout || "").trim();
    if (msg.includes("No stored app authentication")) {
      throw new Error(
        "No store auth yet. Run once:\n" +
        `  shopify store auth --store ${storeDomain()} --scopes read_products,write_products`
      );
    }
    throw new Error(msg || "shopify store execute failed");
  }

  if (body?.errors?.length) {
    const msgs = body.errors.map((e) => {
      if (e.extensions?.problems?.length) {
        return e.extensions.problems.map((p) => `${p.path?.join(".")}: ${p.explanation}`).join("; ");
      }
      return e.message;
    });
    throw new Error(msgs.join("; "));
  }

  return body?.data || body;
}

function normalizeProduct(node) {
  if (!node) return null;
  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    status: (node.status || "").toLowerCase(),
    variants: (node.variants?.nodes || []).map((v) => ({
      id: v.id,
      sku: v.sku,
      price: String(parseFloat(v.price).toFixed(2)),
      option1: v.selectedOptions?.[0]?.value || "",
    })),
  };
}

function fetchProductByHandle(handle) {
  const data = runGraphQL(join(GRAPHQL, "product-by-handle.query.graphql"), { handle });
  return normalizeProduct(data?.productByHandle);
}

function upsertProduct(bundle, existingId) {
  const data = runGraphQL(join(GRAPHQL, "product-set.mutation.graphql"), {
    synchronous: true,
    input: buildProductSetInput(bundle, existingId),
  }, { mutation: true });
  const payload = data?.productSet;
  if (payload?.userErrors?.length) {
    throw new Error(payload.userErrors.map((e) => e.message).join("; "));
  }
  return normalizeProduct(payload?.product);
}

function fetchOnlineStorePublicationId() {
  const data = runGraphQL(join(GRAPHQL, "publications.query.graphql"), {});
  const nodes = data?.publications?.nodes || [];
  return nodes.find((p) => p.name === "Online Store")?.id || null;
}

function publishProduct(productId, publicationId) {
  const data = runGraphQL(join(GRAPHQL, "publishable-publish.mutation.graphql"), {
    id: productId,
    input: [{ publicationId }],
  }, { mutation: true });
  const errs = data?.publishablePublish?.userErrors || [];
  if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
}

function verifyProduct(bundle, product) {
  const errors = [];
  const desired = ZONES.map((z) => ({
    sku: `${bundle.skuPrefix}-${z.key}`,
    price: priceFor(bundle.base, bundle.tier, z.key),
    option1: z.label,
  }));
  const bySku = new Map((product.variants || []).map((v) => [v.sku, v]));

  if (product.handle !== bundle.handle) errors.push(`handle mismatch: ${product.handle}`);
  if (product.status && product.status !== "active") errors.push(`status is ${product.status}`);

  for (const want of desired) {
    const got = bySku.get(want.sku);
    if (!got) {
      errors.push(`missing variant ${want.sku}`);
      continue;
    }
    if (got.price !== want.price) errors.push(`${want.sku}: price ${got.price} ≠ ${want.price}`);
    if (got.option1 !== want.option1) errors.push(`${want.sku}: option mismatch`);
  }

  return { ok: errors.length === 0, errors };
}

function extractVariantMap(synced) {
  const map = {};
  for (const { bundle, product } of synced) {
    map[bundle.handle] = { productId: product.id, title: bundle.title, zones: {} };
    for (const variant of product.variants || []) {
      const zoneKey = variant.sku?.split("-").pop();
      if (zoneKey && SHIP[zoneKey]) {
        map[bundle.handle].zones[zoneKey] = {
          variantId: variant.id,
          sku: variant.sku,
          price: variant.price,
          label: variant.option1,
        };
      }
    }
  }
  return map;
}

function printBundleResult(result) {
  console.log(`${result.ok ? "✓" : "✗"} ${result.title} (${result.handle})`);
  if (result.action === "dry-run") {
    for (const v of result.changes) console.log(`    · ${v.sku} → $${v.price}`);
    return;
  }
  if (result.action) console.log(`  Action: ${result.action}`);
  for (const c of result.changes || []) {
    console.log(`    · ${c.label} ${c.sku} → $${c.price}`);
  }
  if (result.variantCount != null) console.log(`  Verified: ${result.variantCount} variants`);
  if (result.published) console.log("  Published to Online Store");
  for (const err of result.errors) console.log(`  ✗ ${err}`);
}

async function main() {
  const cliVersion = ensureShopifyCli();
  const store = storeDomain();

  console.log(DRY_RUN ? "=== DRY RUN ===\n" : "=== Shopify bundle sync (CLI) ===\n");
  console.log(`CLI: ${cliVersion}`);
  console.log(`Store: ${store}\n`);

  if (!DRY_RUN) {
    try {
      const shop = runGraphQL(join(GRAPHQL, "shop.query.graphql"), {});
      console.log("✓ Connected via shopify store execute");
      console.log(`Shop: ${shop.shop.name}`);
      console.log(`Domain: ${shop.shop.myshopifyDomain}\n`);
    } catch (err) {
      console.error("✗ Could not connect via Shopify CLI");
      console.error(`  ${err.message}`);
      console.error("\nOne-time setup:");
      console.error(`  shopify store auth --store ${store} --scopes read_products,write_products`);
      console.error("\nThen run:");
      console.error("  ./tools/shopify/sync-bundles.sh");
      process.exit(1);
    }
  }

  if (PING_ONLY) {
    console.log("✓ Ping successful.");
    process.exit(0);
  }

  /* Online Store publication — products must be published there or cart
     permalinks return 410 and checkout handoff fails. */
  let publicationId = null;
  if (!DRY_RUN) {
    try {
      publicationId = fetchOnlineStorePublicationId();
      if (!publicationId) console.warn("⚠ Online Store publication not found — skipping publish step\n");
    } catch (err) {
      console.warn("⚠ Could not read publications (re-auth with read_publications,write_publications scopes to auto-publish)");
      console.warn(`  ${err.message}\n`);
    }
  }

  const results = [];
  for (const bundle of BUNDLES) {
    const result = { handle: bundle.handle, title: bundle.title, ok: false, errors: [], changes: [] };
    try {
      if (DRY_RUN) {
        result.action = "dry-run";
        result.ok = true;
        result.changes = ZONES.map((z) => ({
          sku: `${bundle.skuPrefix}-${z.key}`,
          price: priceFor(bundle.base, bundle.tier, z.key),
        }));
      } else {
        const existing = fetchProductByHandle(bundle.handle);
        result.action = existing ? "updated" : "created";
        const product = upsertProduct(bundle, existing?.id);
        const verified = fetchProductByHandle(bundle.handle);
        const check = verifyProduct(bundle, verified);
        result.product = verified;
        result.ok = check.ok;
        result.errors = check.errors;
        result.variantCount = verified?.variants?.length || 0;
        result.changes = (product?.variants || []).map((v) => ({
          label: result.action === "created" ? "Created" : "Synced",
          sku: v.sku,
          price: v.price,
        }));
        if (publicationId && verified?.id) {
          publishProduct(verified.id, publicationId);
          result.published = true;
        }
      }
    } catch (err) {
      result.errors.push(err.message);
    }
    printBundleResult(result);
    console.log();
    results.push(result);
  }

  const allOk = results.every((r) => r.ok);
  if (!DRY_RUN && allOk) {
    const map = extractVariantMap(results.filter((r) => r.product).map((r) => ({
      bundle: BUNDLES.find((b) => b.handle === r.handle),
      product: r.product,
    })));
    const outPath = join(TOOLS, "shopify-variant-map.json");
    writeFileSync(outPath, JSON.stringify(map, null, 2) + "\n");
    console.log(`✓ Wrote ${outPath}`);

    const jsPath = join(ROOT, "site", "js", "shopify-variants.js");
    writeFileSync(
      jsPath,
      "/* AUTO-GENERATED by tools/sync-shopify-bundles.mjs — do not edit by hand */\n" +
        "window.RicciShopifyVariants = " +
        JSON.stringify(map, null, 2) +
        ";\n"
    );
    console.log(`✓ Wrote ${jsPath}`);
  }

  console.log("=== Summary ===");
  console.log(`${results.filter((r) => r.ok).length}/${results.length} bundles ${DRY_RUN ? "validated" : "synced"}`);
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error("✗", err.message || err);
  process.exit(1);
});
