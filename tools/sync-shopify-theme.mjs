#!/usr/bin/env node
/**
 * Push a minimal Shopify homepage (checkout handoff store).
 *
 * Replaces templates/index.json on the live theme with a single custom-liquid
 * section pointing shoppers back to riccisausage.com/products.html.
 *
 * Requires store auth with read_themes,write_themes:
 *   shopify store auth --store tiyndf-za.myshopify.com \
 *     --scopes read_products,write_products,read_themes,write_themes
 *
 * Usage:
 *   ./tools/shopify/sync-theme.sh
 *   ./tools/shopify/sync-theme.sh --dry-run
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS = join(ROOT, "tools");
const GRAPHQL = join(TOOLS, "shopify", "graphql");
const THEME_DIR = join(TOOLS, "shopify", "theme");

// local source → theme file path
const THEME_FILES = [
  ["index.json", "templates/index.json"],
  ["robots.txt.liquid", "templates/robots.txt.liquid"],
];
const DRY_RUN = process.argv.includes("--dry-run");

loadEnvFile(join(TOOLS, ".env.local"));

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
    console.error("✗ Set SHOPIFY_STORE in tools/.env.local or dev_store_url in shopify.app.toml");
    process.exit(1);
  }
  return raw.includes(".myshopify.com") ? raw : `${raw}.myshopify.com`;
}

function runGraphQL(queryFile, variables, { mutation = false } = {}) {
  const tmp = mkdtempSync(join(tmpdir(), "ricci-shopify-theme-"));
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
        `  shopify store auth --store ${storeDomain()} --scopes read_products,write_products,read_themes,write_themes`
      );
    }
    throw new Error(msg || "shopify store execute failed");
  }

  if (body?.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join("; "));
  }

  return body?.data || body;
}

function main() {
  const files = THEME_FILES.map(([source, filename]) => ({
    filename,
    body: { type: "TEXT", value: readFileSync(join(THEME_DIR, source), "utf8") },
  }));
  const store = storeDomain();

  console.log(DRY_RUN ? "=== DRY RUN ===\n" : "=== Shopify minimal theme sync ===\n");
  console.log(`Store: ${store}\n`);

  if (DRY_RUN) {
    console.log("Would upsert on the MAIN theme:");
    for (const file of files) {
      console.log(`  ${file.filename}`);
      console.log(`    ${file.body.value.slice(0, 100).replace(/\n/g, " ")}...`);
    }
    process.exit(0);
  }

  const themesData = runGraphQL(join(GRAPHQL, "themes.query.graphql"), {});
  const mainTheme = themesData?.themes?.nodes?.[0];
  if (!mainTheme?.id) {
    console.error("✗ Could not find MAIN theme.");
    process.exit(1);
  }

  console.log(`✓ Main theme: ${mainTheme.name} (${mainTheme.id})`);

  const data = runGraphQL(join(GRAPHQL, "theme-files-upsert.mutation.graphql"), {
    themeId: mainTheme.id,
    files,
  }, { mutation: true });

  const payload = data?.themeFilesUpsert;
  if (payload?.userErrors?.length) {
    console.error("✗ Theme upsert failed:");
    for (const err of payload.userErrors) console.error(`  ${err.message}`);
    console.error("\nShopify may block theme file edits unless your app has a theme exemption.");
    console.error("Use the manual steps in docs/WIKI.md → Shopify → Minimal homepage (Admin).");
    process.exit(1);
  }

  const upserted = payload?.upsertedThemeFiles || [];
  console.log(`✓ Updated ${upserted.map((f) => f.filename).join(", ") || files.map((f) => f.filename).join(", ")}`);
  if (payload?.job?.id) console.log(`  Job: ${payload.job.id}`);
  console.log("\nHomepage is minimal. Checkout handoff from riccisausage.com is unchanged.");
}

main();
