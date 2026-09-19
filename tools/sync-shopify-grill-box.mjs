#!/usr/bin/env node
/**
 * Sync the three Sunday Grill Box products to Shopify via Shopify CLI.
 *
 * Separate from sync-shopify-bundles.mjs and sync-shopify-labor-day.mjs on
 * purpose: the Pittsburgh/Legacy bundles price shipping into five zone
 * variants, the Labor Day box was a flat $149 with regional free shipping,
 * and this box is a FLAT $189 everywhere with no zones at all. Three
 * products, one variant each, so every mix on shop/grill-box.html gets its
 * own inventory count and its own checkout URL.
 *
 * Usage:
 *   ./tools/shopify/sync-grill-box.sh --ping
 *   ./tools/shopify/sync-grill-box.sh --dry-run
 *   ./tools/shopify/sync-grill-box.sh
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

const PRICE = 189.0;
// 12 lb of product + insulated shipper and cold packs. Same allowance style
// as the Pittsburgh pack (12 lb → 13 lb); confirm the real packed weight in
// Shopify admin before rates go live.
const WEIGHT_LB = 16;

/* Same standard product category the Pittsburgh pack, Legacy box and the
   Labor Day boxes carry. */
const CATEGORY_ID = "gid://shopify/TaxonomyCategory/fb-2-12-2-2"; // Fresh & Frozen Meats

const SHARED_TAGS = ["Grill Box", "Shipped Frozen", "Free Shipping", "Bundle"];

/* Every mix ships with the peppers and onions — not an upsell, not an option.
   The bag is described by name and weight only: whether it is cooked or raw
   is unconfirmed (docs/WIKI.md → Open questions). */
const PEPPERS_HTML =
  "<p><strong>Plus two pounds of peppers and onions.</strong> One 32 oz bag " +
  "— the classic pairing, in the pan or on the grill alongside the rope.</p>";

const SHIPPING_HTML =
  "<p><strong>Ships frozen.</strong> Everything goes out hard-frozen and " +
  "labeled in an insulated box with cold packs. Shipping is built into the " +
  "$189 — nothing added at checkout.</p>" +
  "<p>Uncooked rope sausage in natural casing, 22–25% fat. No fillers, " +
  "no MSG, no additives, no preservatives. Ground and hand-mixed in McKees " +
  "Rocks, PA, USDA-inspected since 1973.</p>";

const PRODUCTS = [
  {
    key: "mixed",
    handle: "grill-box-hot-and-sweet",
    /* Same three product shots the Labor Day boxes used — one per blend.
       Sourced by URL off Shopify's own CDN, so re-running this re-ingests
       rather than re-uploading from disk. */
    image: "https://cdn.shopify.com/s/files/1/1043/9239/2864/files/both.png?v=1788144303",
    imageAlt: "Ricci's hot and sweet Italian sausage coils, raw",
    title: "The Sunday Grill Box — Hot & Sweet (10 lb + 2 lb Peppers & Onions)",
    sku: "RIC-GRILL-MIX",
    description:
      "<p>Five pounds of hot and five pounds of sweet Italian sausage — ten " +
      "pounds total in two labeled 5 lb boxes, packed frozen and shipped to " +
      "your door. If you're feeding people who don't agree about pepper, this " +
      "is the one.</p>" +
      PEPPERS_HTML +
      SHIPPING_HTML,
  },
  {
    key: "hot",
    handle: "grill-box-all-hot",
    image: "https://cdn.shopify.com/s/files/1/1043/9239/2864/files/hot-raw-staged-square.png?v=1788144141",
    imageAlt: "Ricci's hot Italian sausage coil, raw",
    title: "The Sunday Grill Box — All Hot (10 lb + 2 lb Peppers & Onions)",
    sku: "RIC-GRILL-HOT",
    description:
      "<p>Ten pounds of Ricci's hot Italian sausage — crushed red pepper, real " +
      "paprika, whole fennel seed. Medium heat that builds slowly, in two " +
      "labeled 5 lb boxes, packed frozen and shipped to your door.</p>" +
      PEPPERS_HTML +
      SHIPPING_HTML,
  },
  {
    key: "sweet",
    handle: "grill-box-all-sweet",
    image: "https://cdn.shopify.com/s/files/1/1043/9239/2864/files/sweet-sausage-coil-raw_81386956-0cb0-416c-af40-e3e9d4eda7ab.jpg?v=1788144256",
    imageAlt: "Ricci's sweet Italian sausage coil, raw",
    title: "The Sunday Grill Box — All Sweet (10 lb + 2 lb Peppers & Onions)",
    sku: "RIC-GRILL-SWEET",
    description:
      "<p>Ten pounds of Ricci's sweet Italian sausage — cracked black pepper, " +
      "no chili heat. A different blend, not the hot one with the pepper left " +
      "out, in two labeled 5 lb boxes, packed frozen and shipped to your " +
      "door.</p>" +
      PEPPERS_HTML +
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
    category: CATEGORY_ID,
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
        /* Nothing at checkout keys off weight — the $0 domestic rate is
           price-conditioned — but it makes Shopify Shipping label rates
           accurate if a label is ever bought through the admin. */
        inventoryItem: {
          measurement: { weight: { value: WEIGHT_LB, unit: "POUNDS" } },
        },
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
    mediaCount: (node.media?.nodes || []).length,
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

/* productSet does not carry media, so images are a separate step. Only runs
   when the product has none — re-running the sync must not stack duplicate
   copies of the same shot. */
function addProductImage(productId, product) {
  const data = runGraphQL(join(GRAPHQL, "product-create-media.mutation.graphql"), {
    productId,
    media: [{
      originalSource: product.image,
      alt: product.imageAlt,
      mediaContentType: "IMAGE",
    }],
  }, { mutation: true });
  const errs = data?.productCreateMedia?.mediaUserErrors || [];
  if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
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

  console.log(DRY_RUN ? "=== DRY RUN ===\n" : "=== Shopify Sunday Grill Box sync (CLI) ===\n");
  console.log(`CLI: ${cliVersion}`);
  console.log(`Store: ${store}`);
  console.log(`Flat price: $${PRICE.toFixed(2)} — no shipping zones`);
  console.log(`Packed weight: ${WEIGHT_LB} lb\n`);

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
        if (verified?.id && product.image && !verified.mediaCount) {
          addProductImage(verified.id, product);
          result.imaged = true;
        }
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
    if (result.imaged) console.log("  Image added");
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
    const outPath = join(TOOLS, "shopify-grill-box-map.json");
    writeFileSync(outPath, JSON.stringify(map, null, 2) + "\n");
    console.log(`✓ Wrote ${outPath}`);
    console.log("\nPaste these into CHECKOUT in site/js/grill-box.js:");
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
