#!/usr/bin/env node
/*
 * Creates the two Labor Day 2026 catalog items in Square:
 *
 *   Labor Day Bundle Pickup — Hot     $29.99
 *   Labor Day Bundle Pickup — Sweet   $29.99
 *
 * Two separate ITEMs (not one item with hot/sweet variations) so each gets its
 * own checkout URL and its own inventory count.
 *
 * Usage:
 *   SQUARE_ACCESS_TOKEN=... node tools/square/create-labor-day-items.mjs --dry-run
 *   SQUARE_ACCESS_TOKEN=... node tools/square/create-labor-day-items.mjs
 *   SQUARE_ENV=sandbox SQUARE_ACCESS_TOKEN=... node tools/square/create-labor-day-items.mjs
 *
 * The token needs ITEMS_WRITE (add INVENTORY_WRITE if you want to set counts
 * from here rather than in the dashboard). Production tokens come from
 * Square Dashboard → Developer → Applications → Credentials.
 *
 * WHAT THIS DOES NOT DO: it creates catalog items. Publishing them to your
 * Square Online site and getting the shareable checkout URL is a dashboard
 * step — the Catalog API doesn't mint those links. Once you have the two URLs,
 * paste them into CHECKOUT at the top of site/js/labor-day.js.
 *
 * Re-running is safe: the idempotency key is derived from the item names, so a
 * second run updates rather than duplicating.
 */

const TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const ENV = process.env.SQUARE_ENV === 'sandbox' ? 'sandbox' : 'production';
const HOST = ENV === 'sandbox'
  ? 'https://connect.squareupsandbox.com'
  : 'https://connect.squareup.com';
// Bump if Square deprecates it; any recent dated version works for Catalog.
const API_VERSION = process.env.SQUARE_VERSION || '2025-01-23';

const DRY = process.argv.includes('--dry-run');
const PRICE_CENTS = 2999;

const DESCRIPTION = [
  '5 lb rope sausage, 1/2 lb peppers and onions, and 18 Mancini\'s sausage rolls.',
  'Prepaid pickup only at 590 Pine Hollow Rd, McKees Rocks.',
  'Pick up through Saturday, September 5. Closed Sunday 9/6 and Monday 9/7.'
].join(' ');

function item(slug, heat) {
  return {
    type: 'ITEM',
    id: `#labor-day-${slug}`,
    present_at_all_locations: true,
    item_data: {
      name: `Labor Day Bundle Pickup — ${heat}`,
      description: DESCRIPTION,
      abbreviation: `LD${heat[0]}`,
      product_type: 'REGULAR',
      variations: [{
        type: 'ITEM_VARIATION',
        id: `#labor-day-${slug}-var`,
        present_at_all_locations: true,
        item_variation_data: {
          item_id: `#labor-day-${slug}`,
          name: 'Regular',
          pricing_type: 'FIXED_PRICING',
          price_money: { amount: PRICE_CENTS, currency: 'USD' },
          track_inventory: true
        }
      }]
    }
  };
}

const objects = [item('hot', 'Hot'), item('sweet', 'Sweet')];

const body = {
  idempotency_key: 'ricci-labor-day-2026-bundle-pickup-v1',
  batches: [{ objects }]
};

if (DRY) {
  console.log(`DRY RUN — would POST to ${HOST}/v2/catalog/batch-upsert\n`);
  console.log(JSON.stringify(body, null, 2));
  process.exit(0);
}

if (!TOKEN) {
  console.error('SQUARE_ACCESS_TOKEN is not set. Aborting — nothing was sent.');
  process.exit(1);
}

const res = await fetch(`${HOST}/v2/catalog/batch-upsert`, {
  method: 'POST',
  headers: {
    'Square-Version': API_VERSION,
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

const json = await res.json().catch(() => ({}));

if (!res.ok || json.errors) {
  console.error(`FAILED (HTTP ${res.status})`);
  console.error(JSON.stringify(json.errors || json, null, 2));
  process.exit(1);
}

console.log(`Created/updated in ${ENV}:\n`);
for (const obj of json.objects || []) {
  if (obj.type !== 'ITEM') continue;
  console.log(`  ${obj.item_data.name}`);
  console.log(`    item id: ${obj.id}`);
  for (const v of obj.item_data.variations || []) {
    const amt = v.item_variation_data?.price_money?.amount;
    console.log(`    variation id: ${v.id}  ($${(amt / 100).toFixed(2)})`);
  }
}
console.log(`
Next, in the Square dashboard:
  1. Publish both items to your Square Online site (pickup fulfillment only).
  2. Set inventory on each — that's what enforces the box cap.
  3. Restrict the pickup window to close Sat 9/5; block Sun 9/6 and Mon 9/7.
  4. Copy each item's link into CHECKOUT in site/js/labor-day.js.
`);
