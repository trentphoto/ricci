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
                        office-lunch, wholesale, faq, shipping, returns,
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
WIKI.md               this file (NOT deployed)
```

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
| `office-lunch.js` | Office-lunch ordering UI. Keeps a profile/order history in `localStorage`; best-effort POST to `/api/catering` with `source: "office-lunch"`. |
| `order-modal.js` | "Order Now" chooser (`[data-open-order]`). Routes: catering → `RicciCatering.open()`, pickup → `menu.html`, ship → `shop.html`. |
| `nav-drawer.js` | Mobile nav toggle / backdrop. |
| `shipping.js` | State-based all-in pricing. Maps US state → shipping zone (A–E), updates `.product-price[data-base][data-tier]` elements, persists state in `localStorage` (`ricci_ship_state`), fires `ricci:ship-state` on change. Exposes `window.RicciShipping` (`getState`, `getGroup`, `canShip`, `priceFor`, `stateName`). Loaded on `products.html` and `shop.html`. |
| `cart.js` | localStorage cart + nav dropdown. `[data-add-to-cart]` buttons add bundle items; prices sync with `RicciShipping`. Checkout builds a Shopify cart URL from `js/shopify-variants.js` using the customer's zone variant. Exposes `window.RicciCart`. |
| `shopify-variants.js` | **Auto-generated** by `_build/sync-shopify-bundles.mjs`. Maps bundle slugs → Shopify variant GIDs per zone. Do not edit by hand — re-run sync after price changes. |
| `hero-slider.js` | Homepage hero image rotation. |
| `preorder-modal.js` | Pre-order modal UI. |

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
