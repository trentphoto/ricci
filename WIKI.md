# Ricci's Italian Sausage — Architecture Wiki

Reference for the site's structure and conventions. Read this before making
changes; it captures things that are **not** obvious from the file tree.

> Ricci's Italian Sausage — a boutique, family-run Italian sausage maker in
> McKees Rocks, PA, est. 1945. This repo is the marketing + lead-gen website.

## TL;DR

- **Static HTML/CSS/vanilla-JS site.** No framework, no client bundler, no
  server-rendered HTML. Pages are plain `.html` files served as-is.
- **One shared stylesheet** (`css/styles.css`) and a handful of IIFE JS files in
  `js/`, each included with `defer`.
- **Forms talk to a live external CRM** (Fly.io app at `crm.riccisausage.com`).
- **E-commerce checkout is live on Shopify** at `shop.riccisausage.com`. The marketing
  site cart (`js/cart.js`) stores items in `localStorage`, then hands off to Shopify
  with the correct zone-priced variant for the customer's state.
- **All HTML is hand-authored**, including the `shop/` and `hot-foods/` product
  pages. (These were originally code-generated; that generator has been retired —
  see "History" below.)

## Directory layout

**Only `site/` is deployed** — Netlify's publish dir (`netlify.toml`). Everything
outside `site/` (tooling, this wiki, archives) is never served publicly. Put any
new page or asset **inside `site/`**.

```
site/                 ← Netlify publish dir. The entire public website.
  *.html              root-level pages (hand-authored):
                        index, story, menu, catering, press, shop, products,
                        lunch, wholesale, faq, shipping, returns,
                        privacy, terms, careers, 404
  shop/               product detail pages   — hand-authored (was generated; see History)
  hot-foods/          prepared-food pages    — hand-authored (was generated; see History)
  css/styles.css      single shared stylesheet (brand tokens at top)
  js/                 vanilla JS, one IIFE per file, loaded with defer
  assets/
    logo.png          green-oval Ricci's logo
    img/              webp photos + storefront-sketch.webp (homepage hero)
    favicon/          generated "R" monogram set (ico, 16/32 png, apple-touch, 512)
netlify.toml          publish dir config — do not delete
_build/               Shopify sync script, variant map, env example (NOT deployed)
shopify/              GraphQL queries/mutations + sync-bundles.sh wrapper (NOT deployed)
shopify.app.toml      linked Shopify CLI app config (app name: r1)
_archive/             old page/style snapshots — ignore
_drafts/              finished pages held back from launch (NOT deployed)
WIKI.md               this file (NOT deployed)
```

### `_drafts/` — pages deliberately not live

Complete, reviewed pages parked outside the publish dir. They are **not** served,
not in `sitemap.xml`, not in `_redirects`, and nothing in `site/` links to them.

To launch one: move it back into `site/`, add its `<loc>` to `sitemap.xml`, add
the `.html → clean URL` 301 to `_redirects`, and restore the internal links.
Then run `node _build/check-pages.mjs site/THE-PAGE.html`.

Currently parked:

- **Co-packing** (`co-packing.html`, `co-packing/private-label.html`,
  `co-packing/capabilities.html`) — deferred 2026-08-09. The wholesale footer's
  "For Business" column linked to all three while the files were untracked, so
  the live site was serving three 404s; those links were removed at the same
  time. Restore that footer block when these go live.

### Internal linking & breadcrumbs

Two pages look like catalogs but aren't the same thing:

| Page | In main nav? | Lists |
|---|---|---|
| `products.html` "What We Make" | **No** | All 6 `shop/` pages + all 8 `hot-foods/` pages — the only complete index |
| `shop.html` "Shop" | Yes | Only the 2 shippable bundles (Pittsburgh Pack, Legacy Gift Box) |

`shop.html` is a conversion page for the two things you can actually buy online,
not a directory. So the breadcrumb parent for `shop/*` is **`products.html`**,
even though it isn't in the nav — it's the only page that lists all six.
`hot-foods/*` breadcrumbs to `menu.html` (counter-only items; menu.html has the
prices and is in the nav).

Every `shop/*` and `hot-foods/*` page carries a `.breadcrumb` nav placed directly
after `</header>`. Same markup as the `co-packing/` pages. Add one to any new
subpage:

```html
<nav class="breadcrumb" aria-label="Breadcrumb">
  <ol>
    <li><a href="../index.html">Home</a></li>
    <li><a href="../products.html">What We Make</a></li>
    <li aria-current="page">Page Title</li>
  </ol>
</nav>
```

Known gap: `hot-foods/sweet-sausage-sandwich.html` is linked only from
`products.html` — menu, shop, and index all skip it.

Pages have **no templating** — the nav header and footer are copy-pasted into
every page. Subpages in `site/shop/` and `site/hot-foods/` reference assets with
`../` (e.g. `../css/styles.css`). Root pages use bare relative paths — except
`site/404.html`, which is served at any URL depth and must use absolute paths
(`/css/styles.css`). When changing shared nav/footer markup, update every page
(there are ~32).

## JavaScript (`js/`)

All files are IIFEs, no dependencies, included with `defer`.

| File | Role |
|------|------|
| `crm.js` | Auto-binds any `<form data-crm="TYPE">` and POSTs JSON to `https://crm.riccisausage.com/api/<type>`. Types: `subscribe`, `catering`, `wholesale`, `general`. Reads `data-source`, `data-success`; uses an `_hp` honeypot and a `.crm-status` element for feedback. Override the backend with `window.CRM_BASE`. |
| `catering-modal.js` | Builds the catering-request modal (tray menu, quantities, live total). On submit, POSTs to `/api/catering` with `source: "catering-modal"`; **only shows the success screen if the POST succeeds**, else prompts to call. Opened via `window.RicciCatering.open()` or any `[data-open-catering]` element. Collects name, **email (required)**, phone, pickup date/time, prep, notes. |
| `office-lunch.js` | Office-lunch ordering UI (served on `lunch.html`; script filename and CRM `source` tag kept as `office-lunch` so historical CRM data stays queryable). Keeps a profile/order history in `localStorage`; best-effort POST to `/api/catering` with `source: "office-lunch"`. |
| `order-modal.js` | "Order Now" chooser (`[data-open-order]`). Routes: catering → `RicciCatering.open()`, pickup → `menu.html`, ship → `shop.html`. |
| `nav-drawer.js` | Mobile nav toggle / backdrop. |
| `shipping.js` | State-based all-in pricing. Maps US state → shipping zone (A–E), updates `.product-price[data-base][data-tier]` elements, persists state in `localStorage` (`ricci_ship_state`), fires `ricci:ship-state` on change. Exposes `window.RicciShipping` (`getState`, `getGroup`, `canShip`, `priceFor`, `stateName`). Loaded on `products.html` and `shop.html`. |
| `cart.js` | localStorage cart + nav dropdown. `[data-add-to-cart]` buttons add bundle items; prices sync with `RicciShipping`. Checkout builds a Shopify cart URL from `js/shopify-variants.js` using the customer's zone variant. Exposes `window.RicciCart`. |
| `shopify-variants.js` | **Auto-generated** by `_build/sync-shopify-bundles.mjs`. Maps bundle slugs → Shopify variant GIDs per zone. Do not edit by hand — re-run sync after price changes. |
| `hero-slider.js` | Homepage hero image rotation. |
| `preorder-modal.js` | Pre-order modal UI. |
| `labor-day.js` / `labor-day-box.js` | Seasonal Labor Day pages. Each owns a date-derived countdown, a product switch, and a `CHECKOUT` map. Separate offers — `labor-day.js` is the in-store $29.99 box (two-way hot/sweet switch, empty `CHECKOUT` falls back to `tel:`); `labor-day-box.js` is the $129 shipped box (three-way mixed/hot/sweet switch, one CTA and **no** phone fallback, so empty `CHECKOUT` disables the buttons and shows a warning). Delete with their pages. |

### Forms — all routed to the Fly CRM

Every lead/order form uses `crm.riccisausage.com`:
- **Newsletter / email capture** (most pages): `data-crm="subscribe"` → `/api/subscribe`
- **Catering page form** (`catering.html`): `data-crm="catering"`
- **Catering modal** (`catering-modal.js`): direct POST to `/api/catering`
- **Wholesale** (`wholesale.html`): `data-crm="wholesale"`
- **Office lunch** (`office-lunch.js`): direct POST to `/api/catering`

These are cross-origin POSTs, so the CRM must keep **CORS open to the production
domain**. `wholesale.html` is a standalone, minimally-styled page (inline CSS,
no shared nav) — but it still loads `crm.js`.

## Styling

- `css/styles.css` is the only stylesheet. Brand tokens live in `:root` at the
  top: cream/butcher-paper `#F0E6D0`, oxblood/red `#7A261F`, charcoal `#2A221B`,
  warm gold `#D9B88A`, logo green `#05A650`, red `#ED1C25`.
- Fonts (Google): **Libre Caslon Text** (serif/display), **Source Sans 3**
  (body), **JetBrains Mono** (mono accents).
- **Hero variants:** `.hero--grill` and `.hero--story` are dark full-bleed photo
  heroes with light text. `.hero--storefront` (homepage) is a **light** variant:
  a cream pencil/ink storefront sketch as the background, dark text in a white
  `.hero-textblock`, and a fade to cream `rgb(247,230,210)` at the bottom for
  legibility.

### Color on dark backgrounds

Default `.eyebrow` color is `--oxblood` (`#7A261F`). That reads well on cream
and white, but it **disappears on charcoal or oxblood backgrounds** — same
family of dark reds/browns, almost no contrast.

**Rule:** on any dark section (`--charcoal`, `--oxblood`, dark photo heroes),
use **`--gold`** for eyebrows, small caps labels, and accent `<em>` — not
`--red` / `--oxblood`.

When you add a new dark section with an `.eyebrow`, add its parent selector to
the "Dark-bg variant" block near the top of `css/styles.css` (search for
`Dark-bg variant`). Current selectors:

- `.section-success`, `.section-usda`, `.page-hero`, `.hero`, `.site-footer`
- `.section-apply` (careers form), `.section-email`, `.menu-section-dark`
- Per-component overrides: `.visit-header .eyebrow`, `.cater-header .eyebrow`,
  `.order-header .eyebrow`, etc.

On light sections, keep eyebrows and headings in `--oxblood` / `--red` as usual.

## History: the retired page generator

`shop/*` and `hot-foods/*` were originally generated by `_build/generate.ts`
(run with `bun`), with content sourced from `_build/products.ts`. **That
generator has been retired** (both scripts deleted) because the live HTML had
drifted ahead of it — pages gained `crm.js`, `cart.js`, and favicon links that
were never in the generator's template, so re-running it would have *regressed*
the site.

**Going forward, the HTML files are the source of truth — edit them directly.**
There is no build step. If you ever need to recreate the generator, recover the
old scripts from git history (they were removed in the commit that added this
section) and re-sync their `<head>`/footer templates to current pages first.

`_build/` now holds the Shopify sync tooling (see **Shopify** below). The old
`shopify-products.csv` import file may still be present but the live catalog is
managed via GraphQL sync.

## External services & integrations

- **CRM:** Fly.io app at `crm.riccisausage.com` — **live**. Handles all form
  submissions (`/api/subscribe`, `/api/catering`, `/api/wholesale`).
- **Shopify:** **live** checkout at `shop.riccisausage.com`. Customer-facing shop
  domain; order tracking at `shop.riccisausage.com/account` (footer "Track Order").

## Shopify

### Domains (don't mix these up)

| Purpose | Value |
|---------|-------|
| Admin slug (Partner/org label) | `riccis-italian-sausage` |
| **myshopify domain** (CLI + Admin API) | **`tiyndf-za.myshopify.com`** |
| Customer shop URL | `shop.riccisausage.com` |
| Marketing site | `riccisausage.com` |
| Linked CLI app | **r1** (`shopify.app.toml`) |

Always pass `--store tiyndf-za.myshopify.com` (or `SHOPIFY_STORE=tiyndf-za` in
`_build/.env.local`) — **not** the admin slug.

### Product model

Two bundle products, each with **5 zone variants** (Shipping Zone option A–E).
Zone pricing matches `js/shipping.js` add-ons — the price shown on the marketing
site is the price charged at checkout.

| Bundle | Handle | Base (Zone A) | Tier |
|--------|--------|---------------|------|
| The Pittsburgh Italian Pack | `pittsburgh-italian-pack` | $189 | med |
| The Ricci Legacy Gift Box | `ricci-legacy-gift-box` | $289 | large |

Zone prices (med / large):

| Zone | Pittsburgh | Legacy |
|------|------------|--------|
| A | $189 | $289 |
| B | $197 | $301 |
| C | $205 | $311 |
| D | $213 | $321 |
| E | $221 | $331 |

AK and HI are zone X — no cold-ship; checkout is blocked in the cart UI.

SKUs: `RIC-PITT-A` … `RIC-PITT-E`, `RIC-LEGACY-A` … `RIC-LEGACY-E`.

### Cart → checkout handoff

**Architecture:** `riccisausage.com` is the storefront. `shop.riccisausage.com` is
**checkout only** — customers normally never browse the Shopify homepage. They add
bundles on the marketing site, hit **Checkout**, and land on Shopify's checkout with
the correct zone-priced variant pre-loaded.

1. Customer adds bundles on `products.html` / `shop.html` (stored in
   `localStorage` key `ricci_cart`).
2. Shipping state is in `localStorage` key `ricci_ship_state` (set on shop
   pages via `shipping.js`).
3. **Checkout** resolves state → zone (A–E), looks up the Shopify variant ID from
   `js/shopify-variants.js`, and redirects to:
   `https://shop.riccisausage.com/cart/{variantId}:{qty},...`
4. Shopify cart permalinks **go straight to checkout by default** (use
   `?storefront=true` only if you want the cart page instead).
5. Shopify handles payment, tax, and order confirmation.

If zone variants aren't loaded or state is AK/HI, checkout shows an alert and
prompts the customer to call.

**Is it set up?** Yes, end-to-end. Marketing site (`js/cart.js` + `js/shopify-variants.js`)
builds the permalink; both bundles are **published to the Online Store channel** (the sync
script auto-publishes — see below), password is off, and permalinks 302 straight to checkout
(verified 2026-07-04). Remaining optional: minimal Shopify homepage (see below).

> **Gotcha:** cart permalinks return **HTTP 410** if the product isn't published to the
> Online Store sales channel. The sync script now publishes automatically on every run
> (requires `read_publications,write_publications` scopes on the store auth token).

### Minimal Shopify homepage

Shoppers who visit `shop.riccisausage.com` directly (not via checkout link) should
see a simple page pointing them to `riccisausage.com/products.html` — not a full
Dawn catalog.

**Via API** (after re-auth with theme scopes):

```bash
shopify store auth --store tiyndf-za.myshopify.com \
  --scopes read_products,write_products,read_themes,write_themes

./shopify/sync-theme.sh
```

Source template: `shopify/theme/index.json` (single custom-liquid section).

If the API returns a theme exemption error, do it manually in Admin:

1. **Online Store → Themes → Customize**
2. Homepage → remove extra sections → add **Custom liquid**
3. Paste the HTML from `shopify/theme/index.json` → `custom_liquid` setting (or link to riccisausage.com)
4. **Save**

You do **not** need a polished Shopify theme for the cart handoff to work.

### Sync workflow (CLI)

**Requirements:** Node 22+, Shopify CLI (`npm install -g @shopify/cli@latest`).

**One-time auth** (store-scoped token, not the Partner app client secret):

```bash
nvm use 22
shopify store auth --store tiyndf-za.myshopify.com \
  --scopes read_products,write_products,read_themes,write_themes,read_publications,write_publications
```

**Link app config** (already done for r1):

```bash
shopify app config link
```

**Sync bundles** (creates/updates products + regenerates variant map):

```bash
./shopify/sync-bundles.sh          # live sync
./shopify/sync-bundles.sh --dry-run
./shopify/sync-bundles.sh --ping   # test connection only
./shopify/sync-theme.sh            # minimal homepage on shop subdomain
```

On success, writes:

- `_build/shopify-variant-map.json` — reference copy for tooling
- `site/js/shopify-variants.js` — loaded by `cart.js` at runtime

**Re-run sync** whenever bundle base prices or zone add-ons change in
`_build/sync-shopify-bundles.mjs` / `js/shipping.js`.

Implementation: `_build/sync-shopify-bundles.mjs` calls `shopify store execute`
with GraphQL in `shopify/graphql/`. Variant weights are **not** set via API
(Shopify `productSet` limitation) — set manually in Admin if needed.

### Manual Shopify checklist

- [x] Publish both bundle products to **Online Store** sales channel (now automated by sync)
- [ ] Confirm **free shipping** profile on bundles (shipping is baked into price)
- [ ] Set variant weights in Admin if shipping labels need them
- [x] Verify checkout permalinks resolve for zones A and E (curl-verified 2026-07-04; still do a real test purchase)

## Product facts (get these right in copy)

Source of truth for ingredient/pricing claims. Do not improvise seasoning
details — if it isn't listed here, ask before writing it.

**Sweet Italian sausage is NOT "the hot recipe minus the pepper."** They are two
different blends.

**Both came over from Sulmona with the family in 1945** — confirmed by the owner
2026-08-30. Neither one is "the original" at the other's expense, and the hot is
not a later house invention. Earlier wording here ("Sweet is the Abruzzo/Sulmona
original; hot is the spiced one") read as though only sweet had the 1945
provenance, and copy was written from it that way. Say 1945 and Sulmona for
either blend, or for both together.

| | Sweet | Hot |
|---|---|---|
| Seasoning | Pork, water, salt, **cracked black pepper**, dextrose | Crushed red pepper, **real paprika**, whole fennel seed |
| Explicitly NOT in it | No fennel, no paprika, no crushed red pepper | — |
| Heat | None | Medium, builds slowly — "third bite, not the first" |

- Both: natural casing, 22–25% fat, hand-mixed in ~200 lb batches daily,
  all natural — no fillers, MSG, additives, or preservatives. USDA-inspected
  daily since 1973.
- **Neither blend contains garlic** — corrected by the owner 2026-08-30. The
  table used to list garlic in the hot seasoning and "no garlic" as a sweet-only
  exclusion; both were wrong. Don't write garlic into either sausage, and don't
  write "no garlic" as a thing that distinguishes sweet from hot — it doesn't.
  (Meatballs *do* contain garlic. Different product.)
- **Never claim "no sugar"** on sweet — dextrose is in the blend. "Sweet" refers
  to the absence of chili heat, nothing else; say that instead.
### Packaging (got this wrong twice — read before writing any copy)

Confirmed by the owner 2026-08-06. Write these exactly; don't embellish.

| Item | How it's packed |
|---|---|
| Sweet / hot sausage, shipped | **A 5 lb box of rope.** Just a box. |
| Sweet / hot sausage, counter | Loose by the pound, **or** bulk in 1 lb, 5 lb, and 10 lb bags. Same for both. |
| Meatballs | Clear plastic bag. ~16 at 2 oz each = 2 lb. Raw, frozen. |
| Stuffed banana peppers | Frozen, clear bag — same as the meatballs. |
| Lil's sausage rolls | **Baked at the shop, then frozen.** |
| San Marzano sauce | Plastic deli container (the cylinder tub). |
| Bundle boxes | Items are labeled, packed in an insulated box with cold packs. |

**Phrasing rules — these are the exact mistakes already made:**

- Say **"a 5 lb box of rope."** Do **not** say "continuous," "one continuous
  rope," "single coil," or anything implying it's unbroken end to end. That was
  an embellishment on top of a correction — say only what's above.
- **Never write a link count** ("~20 links") for a 5 lb box. Wrong, fixed
  2026-08-06 across 6 pages. Links are a *counter* thing — hand-stuffed and
  twisted at the shop.
- **Never write "vacuum-sealed."** Nothing is. Removed from 15 places on
  2026-08-06; 7 of those predated any AI edit and got propagated because they
  looked established. Being already on the site ≠ verified.
- **There is no recipe card.** The Sausage Club never included one — removed
  from 9 places (body copy, meta description, og:, twitter:, JSON-LD) on
  2026-08-06. Also killed the "Ricci family recipe in your first email" promise
  on the waitlist form: same nonexistent thing, different delivery.
- **No founding-member bonus sample.** The "+1 lb preview of next month's cut"
  was not real. Removed 2026-08-06.
- **Don't write copy that argues with a past mistake.** "A 5 lb box of rope —
  *not links*" leaked an internal correction onto a product page. Customers
  never saw the wrong version and don't need the rebuttal. State the fact.

### Cooking directions: no numbers

**No temperatures, no times, no quantities.** The specific ones on the site were
all invented and were removed 2026-08-06 (meatballs 400°F/18–20 min/45 min
covered; sausage 12–15 min stovetop, 15–18 min grill, 90 min in gravy, 160°F
internal; "4 quarts of sauce"). None came from the shop.

Write method and feel instead — "brown it in a heavy pan with a splash of
water," "let it sit in simmering San Marzano sauce," "cook them through before
serving." That's the register the rest of the site is in anyway.

> Note for the owner: there is now **no doneness temperature anywhere** on the
> site, including for raw pork products sold frozen. That was deliberate per
> instruction. If you want a safe-handling line back, USDA's published figure
> for ground pork is 160°F — that's a federal standard, not a Ricci claim, so
> it's citable. Your call.

- **Counter pricing:** $6.75 sandwich on a Mancini's roll · **$3.50/pc is a
  cooked single link from the hot case**, not raw take-home. Raw is sold by the
  pound at the counter or in a 5 lb box (rope, per above).
- **Office lunch pricing** (confirmed 2026-08-26): **$10.99/person** hot or
  sweet sausage sandwich · **$12.99/person** Lil's meatball sandwich. Chips and
  a fresh-baked cookie included at both. **10-person minimum.** Pickup only.
  Prices live in `ITEMS` / `MIN_PEOPLE` in `js/office-lunch.js`.

### Open questions — DO NOT write copy on these until answered

Fill in an answer and move it up into the verified list above. Until then, leave
the slot blank or use the typographic plate stand-in. See `CLAUDE.md`.

1. **Is the Sausage Club monthly box also a 5 lb box of rope?** TBD as of
   2026-08-06. The page currently says it is — if that turns out wrong, fix
   `shop/sausage-club.html`.

2. **Is the pepperoni roll $16.99?** TBD as of 2026-08-11. The figure is live in
   three places (`js/preorder-modal.js`, and two JSON-LD blocks in `menu.html`
   and `mckees-rocks-lunch.html`) but has never been verified against the wiki.
   It now also decides what a real card gets charged: prepaid Square pre-orders
   read the price from `PREORDER_UNIT_PRICE_CENTS` in the CRM env. That variable
   has **no default** — until it is set, `/api/preorder` returns 503 and the
   modal tells customers to call. Set it only from a confirmed price.

3. **Labor Day 2026 campaign (`site/labor-day.html`).** Added 2026-08-29,
   scoped down to a single offer 2026-08-30. Confirmed by the owner: **The
   Cookout Box, $29.99** — 5 lb rope (**hot or sweet, one or the other**,
   chosen at Square checkout), **½ lb peppers and onions**, **18 Mancini's
   sausage rolls**. **Five pounds of rope feeds about 20 people.** Prepaid, pickup only, through Sat 9/5. The second offer
   ("Feed the Whole Block", 10 lbs at case price) was **dropped** — it never
   had verified numbers and is gone from the page and the campaign doc.

   The page has a hot/sweet switch (`.heat-switch`) that drives the rope card
   image, name and seasoning copy, the blurb beneath it, and which Square item
   the checkout button points at. Both blends' copy is read straight from the
   Product facts table above — if that table changes, update `ROPE` in
   `js/labor-day.js` too.

   Still open:
   - **Sauce naming.** The shipped box now includes **2 quarts of sauce**
     (added 2026-08-30, price moved $129 → $149). The product photo's label
     reads *"Lil's Famous Homemade Tomato Sauce," net wt. 32 oz (1 quart)*, but
     the rest of the site calls it **San Marzano sauce**. `labor-day-box.html`
     and the Shopify sync copy follow the label. Confirm which name is correct
     and make the site consistent.
   - **Packed shipping weight with the sauce.** `WEIGHT_LB` in
     `_build/sync-shopify-labor-day.mjs` was bumped 12 → 17 as an allowance
     (10 lb meat + 2 quart tubs + shipper). Not weighed — confirm before
     shipping rates go live.
   - **`labor-day-box.html` (the shipped 10 lb box) has no checkout URLs yet.**
     `CHECKOUT` in `js/labor-day-box.js` is empty for all three mixes; that page
     disables its buttons rather than degrading to tel:, so it must not run ads
     until they're set. The pickup page (`labor-day.html`) **is** wired —
     Square payment links, hot and sweet, set 2026-08-30.
   - **The pickup page's Square links are Payment Links (`square.link/u/…`),
     not Square Online items.** Payment Links don't track inventory, so there
     is no automatic sold-out and no dashboard number for the Friday "[X] boxes
     left" email. If a real cap matters, rebuild them as Online items.
   - **Peppers & onions: cooked or raw?** The owner-supplied photo
     (`peppers-onions.webp`) shows them charred. The card gives the name and
     the weight and claims neither state.
   - **Mancini's is 18 rolls, not loaves.** The original brief said "loaves of
     Mancini's bread"; the owner's photo and confirmation are **sausage rolls**
     (the buns). Ad copy says rolls.
   - Not blocking, but flagged to the owner: ½ lb of peppers and onions across
     5 lbs of sausage and 18 rolls is ~⅓ oz per roll.

4. **Labor Day 2026 DTC shipped box (`site/labor-day-box.html`).** Added
   2026-08-30. A **second, separate** offer from the in-store Cookout Box at
   `/labor-day` — cold paid traffic (PA, MD, NY, DE), one offer, one CTA, no
   nav and no catalog footer. Do not "sync the nav" onto it.

   Owner-supplied in the campaign brief, treated as confirmed: **$129 for
   10 lbs shipped frozen** — 5 lb hot + 5 lb sweet, **10 lb all hot**, or
   **10 lb all sweet**, same price whichever — **free shipping to PA, MD, NY and DE**, **order by Wed
   Sep 2**, ships Tue/Wed, arrives **Thu or Fri**. Guarantee: **full refund if
   it isn't the best sausage you've had**, no forms, no photos, nothing to send
   back, handled on the phone. The guarantee wording appears twice on the page
   (hero and FAQ) and must stay identical in both.

   Packaging on the page follows the table above: **two labeled 5 lb boxes of
   rope inside an insulated shipper with cold packs.** The brief said "two
   ropes" — that was rewritten, not copied.

   Still open:
   - **Checkout URLs.** `CHECKOUT` in `js/labor-day-box.js` has all three keys
     (`mixed`, `hot`, `sweet`) empty. The page has **one CTA ("Order Now") and
     no phone-order path**, so a missing URL disables every button and shows a
     loud dashed warning strip under the offer rather than degrading to `tel:`
     — it cannot reach paid traffic like that. **Launch blocker.** There is no
     Shopify variant for a $129 10 lb box — the two existing bundles are
     $189/$289 with zone pricing — so this needs its own product, and the
     PA/MD/NY/DE restriction has to be enforced at checkout or an out-of-region
     order eats the margin.
   - **"One of only two USDA-inspected sausage makers in Pittsburgh with its
     own retail counter — and the only one that also cooks."** In the brief and
     already live on `hot-italian-sausage-pittsburgh.html`, but never verified
     here. **Left off the new page** pending confirmation.
   - **Reviews.** No section built — the brief says cut it rather than ship an
     empty block. Needs 3 quotes with name + city.
   - **Meta Pixel.** Not installed anywhere in the repo; the page carries a
     commented placeholder in `<head>`.
   - Cut as unverified, same as on the in-store page: "hot outsells sweet seven
     to one," and "not a single ingredient changed since" on the sweet.

   Campaign doc: `labor-day-dtc-campaign.md` (ads + build checklist).

The club is unlaunched, so treat the rest of that page as unverified too. Still
live on it and never confirmed: the seasonal cut calendar (December = Feast of
the Seven Fishes, May = fennel-and-orange, October = smoke-paprika), gift
subscriptions in 3/6/12 months, and founding-member pricing.

Answered and moved into the table above on 2026-08-06: 5 lb box is a plain box ·
meatball bag · bundle labeling · insulated box + cold packs · rolls baked then
frozen · peppers frozen in clear bags · sauce in a deli container · counter bulk
bags · no recipe card · no bonus sample · no cooking numbers.
- Hours/address: 590 Pine Hollow Rd, McKees Rocks · Mon–Fri 8:30–5, Sat 9–4.

## Known gaps / pre-launch checklist

- **Google Analytics (GA4) is wired into every page's `<head>`**, but still uses
  the placeholder ID `G-XXXXXXXXXX` — swap in the real Measurement ID (find/replace
  across all 31 pages) before launch.
- **No Open Graph / Twitter tags.** Favicon is done.

## Conventions

- **Git commit messages:** single concise line, under 72 chars. No body.
- **Images:** convert to `.webp` before adding to `assets/img/`, using `cwebp`
  (Homebrew: `brew install webp`). For photos wider than ~1200px, resize on the
  way down to cut file size: `cwebp -q 78 -resize 1200 0 input.png -o output.webp`
  (`-resize 1200 0` scales width to 1200 keeping aspect ratio). Aim for
  ~80–200KB per image, in line with the rest of `assets/img/`.
- **Image gotchas (`assets/img/`):**
  - `sausage-peppers.webp` is actually **hot sausage** with peppers, despite the
    generic filename — only use it on hot-sausage (or Pittsburgh Pack) content.
  - `sausage-roll.webp` is **Lil's baked sausage roll** (the hot-foods product,
    literally a roll) — only use it on sausage-roll content, never as a stand-in
    for hot/sweet sausage links. Sausage rolls are an **in-store hot food only**
    — they don't ship, so the image doesn't belong on shop/products pages
    (story.html is fine).
  - Sandwich photos (added Jul 2026): `hot-sausage-sandwich.webp`,
    `sweet-sausage-sandwich.webp`, `meatball-sandwich.webp`,
    `meatball-sandwich-alt.webp`, `banana-pepper-sandwich.webp`. The banana pepper
    one is **not in use yet** — no confirmed photo; the page shows a placeholder.
  - Rope/link photos (added Jul 2026): `hot-links-pan.webp`, `sweet-links-pan.webp`
    — grilled links in a pan. Use on **raw product pages** (shop, product cards),
    **not** on hot-foods/sandwich content.
  - `mancinis-sausage-rolls-bag.webp` (added 2026-08-29, owner-supplied) — a
    retail bag of **Mancini's Bakery sausage rolls**, i.e. the *buns*.
    **Name collision, read carefully:** this is NOT `sausage-roll.webp` or
    `sausage-rolls-tray.webp`, which are **Lil's sausage rolls** — our baked
    hot-sausage-in-dough hot-foods item. Two unrelated products, nearly the
    same name. Never swap one image for the other.
  - `peppers-onions.webp` (added 2026-08-29, owner-supplied) — sliced red,
    green and orange peppers with onions, **charred/cooked**, not raw. Used on
    the Labor Day Cookout Box card. Whether the box item itself is cooked or
    raw is unconfirmed — see "Open questions".
  - Hero placeholders use the text "Photo coming soon"
    (`product-hero-img--placeholder`).
  - "What's in the box" photos on `shop/pittsburgh-italian-pack.html` (added
    Jul 2026): `sweet-sausage-coil-raw.webp`, `hot-sausage-coil-raw.webp`
    (raw staged coils), `homemade-meatballs-bag.webp` (bagged, uncooked),
    `sausage-rolls-tray.webp` (baked rolls). Used in `.menu-item-img` cards —
    specific to this bundle page, not general-purpose product shots.
- Keep nav/footer markup in sync across **all** pages when editing by hand —
  there is no generator or shared template (see "History" above).

## Merchandising rules (2026-07: informational vs buyable)

Every page has exactly one commerce job — do not blur these when editing:

- **`shop.html`** — the only sales page. Buy buttons exist here and on the two
  bundle PDPs (`shop/pittsburgh-italian-pack.html`, `shop/ricci-legacy-gift-box.html`).
- **`products.html`** ("What We Make") — informational catalog. Bundles appear
  with prices linking to their PDPs; everything else (case items, hot foods) is
  informational with availability tags, never a price.
- **`shop/{sweet-italian-sausage,hot-italian-sausage,italian-meatballs}.html`** —
  story pages, NOT buyable. Hero uses `.avail-badges` (`--store` green /
  `--ships` oxblood) instead of a price, and CTAs are "Order Pickup" (tel:) +
  a link to the Pittsburgh Pack. Do not add prices or Add to Cart here.
- **`shop/sausage-club.html`** — waitlist mode until subscriptions launch.
  CTA anchors to `#club-waitlist` (email form, `data-source="sausage-club-waitlist"`).
- **Suggestion cards** ("You Might Also Like" / catalog cards): bundles show
  price + "Ships Nationwide"; individual products show
  `<span class="ship-note">At the counter · In our bundles</span>` and no price.
- **JSON-LD**: only the two bundle PDPs carry an `offers` block (prices must
  match Zone A: $189 / $289). Story pages are `Product` schema without offers.

When Square online pickup ordering launches, swap the "Order Pickup" tel: links
for the Square ordering URL.
