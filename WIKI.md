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
- **E-commerce is NOT built yet.** "Add to Cart" buttons are `href="#"`
  placeholders; checkout is intended to live on a Shopify subdomain.
- **All HTML is hand-authored**, including the `shop/` and `hot-foods/` product
  pages. (These were originally code-generated; that generator has been retired —
  see "History" below.)

## Directory layout

```
/                     root-level pages (hand-authored)
  index, story, menu, catering, press, shop, products,
  office-lunch, wholesale, faq, shipping, returns, privacy, terms (.html)
shop/                 product detail pages   — hand-authored (was generated; see History)
hot-foods/            prepared-food pages    — hand-authored (was generated; see History)
css/styles.css        single shared stylesheet (brand tokens at top)
js/                   vanilla JS, one IIFE per file, loaded with defer
assets/
  logo.png            green-oval Ricci's logo
  img/                webp photos + storefront-sketch.webp (homepage hero)
  favicon/            generated "R" monogram set (ico, 16/32 png, apple-touch, 512)
_build/               only shopify-products.csv now (staged for Shopify import)
_archive/             old page/style snapshots — ignore
```

Pages have **no templating** — the nav header and footer are copy-pasted into
every page. Subpages in `shop/` and `hot-foods/` reference assets with `../`
(e.g. `../css/styles.css`). Root pages use bare relative paths. When changing
shared nav/footer markup, update every page (there are ~31).

## JavaScript (`js/`)

All files are IIFEs, no dependencies, included with `defer`.

| File | Role |
|------|------|
| `crm.js` | Auto-binds any `<form data-crm="TYPE">` and POSTs JSON to `https://crm.riccisausage.com/api/<type>`. Types: `subscribe`, `catering`, `wholesale`, `general`. Reads `data-source`, `data-success`; uses an `_hp` honeypot and a `.crm-status` element for feedback. Override the backend with `window.CRM_BASE`. |
| `catering-modal.js` | Builds the catering-request modal (tray menu, quantities, live total). On submit, POSTs to `/api/catering` with `source: "catering-modal"`; **only shows the success screen if the POST succeeds**, else prompts to call. Opened via `window.RicciCatering.open()` or any `[data-open-catering]` element. Collects name, **email (required)**, phone, pickup date/time, prep, notes. |
| `office-lunch.js` | Office-lunch ordering UI. Keeps a profile/order history in `localStorage`; best-effort POST to `/api/catering` with `source: "office-lunch"`. |
| `order-modal.js` | "Order Now" chooser (`[data-open-order]`). Routes: catering → `RicciCatering.open()`, pickup → `menu.html`, ship → `shop.html`. |
| `nav-drawer.js` | Mobile nav toggle / backdrop. |
| `cart.js` | Turns the nav `Cart (0)` into a dropdown. Cart is an **empty placeholder** (no real cart state yet) — shows "cart is empty" + a "Shop Now" link. Derives the relative path prefix from the stylesheet `href` so links work in subfolders. |

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

`_build/` now contains only `shopify-products.csv`, which stages products for a
future Shopify import (unrelated to the old generator).

## External services & integrations

- **CRM:** Fly.io app at `crm.riccisausage.com` — **live**. Handles all form
  submissions (`/api/subscribe`, `/api/catering`, `/api/wholesale`).
- **Shopify (planned):** real checkout is intended to live on
  `shop.riccisausage.com` (referenced in `privacy.html` / `terms.html`, and the
  footer "Track Order" link → `shop.riccisausage.com/account`). Not wired yet.

## Known gaps / pre-launch checklist

- **No working checkout.** All "Add to Cart" buttons are `href="#"`; the nav
  cart is a placeholder. Needs Shopify wiring (or removal) before selling.
- **Google Analytics (GA4) is wired into every page's `<head>`**, but still uses
  the placeholder ID `G-XXXXXXXXXX` — swap in the real Measurement ID (find/replace
  across all 31 pages) before launch.
- **No Open Graph / Twitter tags.** Favicon is done.
- **No `sitemap.xml` / `robots.txt`** (and no `CNAME` if hosting on GitHub Pages).
- **Claims to verify with the owner:** homepage "50 States We Now Ship To" and
  "the only [Pittsburgh sausage maker] that also cooks."

## Conventions

- **Git commit messages:** single concise line, under 72 chars. No body.
- **Images:** convert to `.webp` with `cwebp -q 86` before adding to `assets/img/`.
- Keep nav/footer markup in sync across **all** pages when editing by hand —
  there is no generator or shared template (see "History" above).
