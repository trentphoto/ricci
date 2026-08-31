#!/usr/bin/env node
/**
 * Sync the three Labor Day Box products to Shopify via Shopify CLI.
 *
 * Separate from sync-shopify-bundles.mjs on purpose: the Pittsburgh/Legacy
 * bundles price shipping into five zone variants, the Labor Day box is one
 * flat $149 with free shipping restricted to PA/MD/NY/DE in Shopify's
 * shipping settings. Three products, one variant each, so every mix on
 * labor-day-box.html gets its own inventory count and its own checkout URL.
 *
 * Usage:
 *   ./tools/shopify/sync-labor-day.sh --ping
 *   ./tools/shopify/sync-labor-day.sh --dry-run
 *   ./tools/shopify/sync-labor-day.sh
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

const PRICE = 149.0;
// 10 lb of meat + two quart tubs of sauce + insulated shipper and cold packs.
// Same allowance style as the Pittsburgh pack (12 lb → 13 lb); confirm the
// real packed weight in Shopify admin before rates go live.
const WEIGHT_LB = 17;

const SHARED_TAGS = ["Labor Day", "Shipped Frozen", "Free Shipping", "Bundle"];

/* Every mix ships with the sauce — not an upsell, not an option. */
const SAUCE_HTML =
  "<p><strong>Plus two quarts of Lil's homemade tomato sauce.</strong> Two " +
  "32 oz tubs made at the shop and packed in the same box \u2014 fresh " +
  "tomatoes, saut\u00e9ed onions, olive oil.</p>";

const SHIPPING_HTML =
  "<p><strong>Ships frozen.</strong> Boxes go out Tuesday and Wednesday in an " +
  "insulated shipper with cold packs and arrive Thursday or Friday. Free " +
  "shipping to Pennsylvania, Maryland, New York and Delaware. Order by " +
  "Wednesday, September 2 to get it before the holiday weekend.</p>" +
  "<p>Uncooked rope sausage in natural casing. No fillers, no MSG, no " +
  "additives, no preservatives. Ground and hand-mixed in McKees Rocks, PA, " +
  "USDA-inspected since 1973.</p>";

const PRODUCTS = [
  {
    key: "mixed",
    handle: "labor-day-box-hot-and-sweet",
    title: "The Labor Day Box — Hot & Sweet (10 lb + 2 qt Sauce)",
    sku: "RIC-LABOR-MIX",
    description:
      "<p>Five pounds of hot and five pounds of sweet Italian sausage — ten " +
      "pounds total, packed frozen and shipped to your door before Labor Day. " +
      "If you're feeding people who don't agree about pepper, this is the one.</p>" +
      SAUCE_HTML +
      SHIPPING_HTML,
  },
  {
    key: "hot",
    handle: "labor-day-box-all-hot",
    title: "The Labor Day Box — All Hot (10 lb + 2 qt Sauce)",
    sku: "RIC-LABOR-HOT",
    description:
      "<p>Ten pounds of Ricci's hot Italian sausage — crushed red pepper, real " +
      "paprika, whole fennel seed. The one Pittsburgh grew up on, packed frozen " +
      "and shipped to your door before Labor Day.</p>" +
      SAUCE_HTML +
      SHIPPING_HTML,
  },
  {
    key: "sweet",
    handle: "labor-day-box-all-sweet",
    title: "The Labor Day Box — All Sweet (10 lb + 2 qt Sauce)",
    sku: "RIC-LABOR-SWEET",
    description:
      "<p>Ten pounds of Ricci's sweet Italian sausage — pork, salt, cracked " +
      "black pepper, no chili heat. One of the two recipes the family brought " +
      "over from Sulmona in 1945, packed frozen and shipped to your door before " +
      "Labor Day.</p>" +
      SAUCE_HTML +
      SHIPPING_HTML,
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

function buildProductSetInput(product, existingId) {
  const input = {
    title: product.title,
    handle: product.handle,
    descriptionHtml: product.description,
    vendor: "Ricci's Italian Sausage",
    productType: "Bundle",
    tags: SHARED_TAGS,
    status: "ACTIVE",
    /* productSet rejects a variant with null optionValues, so a single-variant
       product still has to spell out Shopify's implicit Title/Default Title. */
    productOptions: [{ name: "Title", values: [{ name: "Default Title" }] }],
    variants: [
      {
        optionValues: [{ optionName: "Title", name: "Default Title" }],
        price: PRICE,
        sku: product.sku,
        inventoryPolicy: "CONTINUE",
      },
    ],
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
    })),
  };
}

function fetchProductByHandle(handle) {
  const data = runGraphQL(join(GRAPHQL, "product-by-handle.query.graphql"), { handle });
  return normalizeProduct(data?.productByHandle);
}

function upsertProduct(product, existingId) {
  const data = runGraphQL(join(GRAPHQL, "product-set.mutation.graphql"), {
    synchronous: true,
    input: buildProductSetInput(product, existingId),
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

function verifyProduct(product, fetched) {
  const errors = [];
  if (!fetched) return { ok: false, errors: ["product not found after write"] };
  if (fetched.handle !== product.handle) errors.push(`handle mismatch: ${fetched.handle}`);
  if (fetched.status && fetched.status !== "active") errors.push(`status is ${fetched.status}`);
  const variant = (fetched.variants || []).find((v) => v.sku === product.sku);
  if (!variant) errors.push(`missing variant ${product.sku}`);
  else if (variant.price !== PRICE.toFixed(2)) {
    errors.push(`${product.sku}: price ${variant.price} ≠ ${PRICE.toFixed(2)}`);
  }
  if ((fetched.variants || []).length !== 1) {
    errors.push(`expected 1 variant, got ${(fetched.variants || []).length}`);
  }
  return { ok: errors.length === 0, errors };
}

/* Cart permalink — /cart/<numericVariantId>:1. Requires the product to be
   published to Online Store or Shopify returns 410. */
function checkoutUrl(store, variantGid) {
  return `https://${store}/cart/${variantGid.split("/").pop()}:1`;
}

async function main() {
  const cliVersion = ensureShopifyCli();
  const store = storeDomain();

  console.log(DRY_RUN ? "=== DRY RUN ===\n" : "=== Shopify Labor Day sync (CLI) ===\n");
  console.log(`CLI: ${cliVersion}`);
  console.log(`Store: ${store}`);
  console.log(`Shipping weight assumed: ${WEIGHT_LB} lb (set in Shopify admin)\n`);

  if (!DRY_RUN) {
    try {
      const shop = runGraphQL(join(GRAPHQL, "shop.query.graphql"), {});
      console.log("✓ Connected via shopify store execute");
      console.log(`Shop: ${shop.shop.name}\n`);
    } catch (err) {
      console.error("✗ Could not connect via Shopify CLI");
      console.error(`  ${err.message}`);
      console.error("\nOne-time setup:");
      console.error(`  shopify store auth --store ${store} --scopes read_products,write_products`);
      process.exit(1);
    }
  }

  if (PING_ONLY) {
    console.log("✓ Ping successful.");
    process.exit(0);
  }

  let publicationId = null;
  if (!DRY_RUN) {
    try {
      publicationId = fetchOnlineStorePublicationId();
      if (!publicationId) console.warn("⚠ Online Store publication not found — skipping publish step\n");
    } catch (err) {
      console.warn("⚠ Could not read publications (re-auth with read_publications,write_publications to auto-publish)");
      console.warn(`  ${err.message}\n`);
    }
  }

  const results = [];
  for (const product of PRODUCTS) {
    const result = { key: product.key, handle: product.handle, title: product.title, ok: false, errors: [] };
    try {
      if (DRY_RUN) {
        result.action = "dry-run";
        result.ok = true;
      } else {
        const existing = fetchProductByHandle(product.handle);
        result.action = existing ? "updated" : "created";
        upsertProduct(product, existing?.id);
        const verified = fetchProductByHandle(product.handle);
        const check = verifyProduct(product, verified);
        result.product = verified;
        result.ok = check.ok;
        result.errors = check.errors;
        if (publicationId && verified?.id) {
          publishProduct(verified.id, publicationId);
          result.published = true;
        }
      }
    } catch (err) {
      result.errors.push(err.message);
    }

    console.log(`${result.ok ? "✓" : "✗"} ${result.title} (${result.handle})`);
    if (result.action) console.log(`  Action: ${result.action}`);
    console.log(`  ${product.sku} → $${PRICE.toFixed(2)}`);
    if (result.product?.variants?.[0]) {
      console.log(`  Checkout: ${checkoutUrl(store, result.product.variants[0].id)}`);
    }
    if (result.published) console.log("  Published to Online Store");
    for (const err of result.errors) console.log(`  ✗ ${err}`);
    console.log();
    results.push(result);
  }

  const allOk = results.every((r) => r.ok);
  if (!DRY_RUN && allOk) {
    const map = {};
    for (const r of results) {
      const variant = r.product?.variants?.[0];
      if (!variant) continue;
      map[r.key] = {
        handle: r.handle,
        productId: r.product.id,
        variantId: variant.id,
        sku: variant.sku,
        price: variant.price,
        title: r.title,
        checkoutUrl: checkoutUrl(store, variant.id),
      };
    }
    const outPath = join(TOOLS, "shopify-labor-day-map.json");
    writeFileSync(outPath, JSON.stringify(map, null, 2) + "\n");
    console.log(`✓ Wrote ${outPath}`);
    console.log("\nPaste these into CHECKOUT in site/js/labor-day-box.js:");
    for (const key of ["mixed", "hot", "sweet"]) {
      if (map[key]) console.log(`  "${key}": "${map[key].checkoutUrl}",`);
    }
  }

  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
