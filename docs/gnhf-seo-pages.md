# Objective: non-branded SEO content pages

Add search-entry pages that capture people who have never heard of Ricci's, and
funnel them to `/shop` and `/menu`. One page per iteration. Commit each page on
its own.

## The pages, in priority order

Build these in order. One per iteration — do not start a second page in the
same iteration.

1. `site/how-to-cook-italian-sausage.html` — highest volume, broadest intent.
2. `site/pittsburgh-sausage-and-peppers.html` — regional dish, links the local
   angle to the product pages.
3. `site/sunday-gravy-italian-sausage.html` — high-intent, long-dwell recipe
   search, strong fit with the brand's voice.
4. `site/italian-sausage-shipped-nationwide.html` — the DTC page. Targets
   "italian sausage shipped" / "best italian sausage online". This one funnels
   to `/shop` specifically (the two shippable bundles).

Stop after page 4. Do not invent a page 5.

## Hard constraint: no invented product facts

**Read `CLAUDE.md` in full before the first edit. It is not boilerplate — the
site has already shipped fabricated claims twice, and this objective is in the
exact category where it happened.**

The short version, which the linter enforces:

- **No temperatures. No cook times. No quantities.** Not "until it reaches
  160°F", not "about 15 minutes", not "4 quarts of sauce". These were all on the
  site, all invented, all removed on 2026-08-06.
- Write **method and feel** instead: "brown it in a heavy pan with a splash of
  water", "let it sit in simmering San Marzano sauce", "cook it through before
  serving". That is the register the whole site is already in.
- Never "vacuum-sealed" (it isn't). Never "N links" (the 5 lb box is one
  continuous rope). Never "no sugar" about sweet (dextrose is in the blend).
- Any product detail not in `docs/WIKI.md` → "Product facts" does not get written.
  Leave the slot blank, add the question to `docs/WIKI.md` → "Open questions", and
  note it in `notes.md` so the morning review catches it.

This means the recipe pages are **not** step-numbered recipes. They are
narrative how-to pages. Accept that tradeoff — it is deliberate.

### Corollary: do not add Recipe JSON-LD

Schema.org `Recipe` effectively requires `cookTime`, `prepTime`, and
`recipeIngredient` with quantities. Emitting it would either mean inventing the
numbers or shipping invalid structured data. Use `Article` schema on all four
pages instead. If you think this is wrong, write the argument in `notes.md` —
do not decide it yourself at 3am.

## Conventions to match

Copy the structure of `site/hot-italian-sausage-pittsburgh.html`. It is the
closest existing model and it passes the checker.

- No templating in this repo. Nav header and footer are **copy-pasted** into
  every page — copy them verbatim from the model page, don't hand-write them.
- Root-level pages use bare relative asset paths (`css/styles.css`), not `../`.
- Full head block: title, meta description, canonical (extensionless), OG tags,
  Twitter tags, analytics script. The checker verifies all of it.
- Root pages do **not** get a `.breadcrumb` nav. That is for `shop/*`,
  `hot-foods/*`, and `co-packing/*` only.

Each page must also be registered in two places, or the checker fails:

- `site/sitemap.xml` — `<url><loc>https://riccisausage.com/SLUG</loc></url>`
- `site/_redirects` — `/SLUG.html  /SLUG  301!` (in the `.html -> clean URL`
  block, keep it alphabetical)

## Internal linking

Every page links to at least one product page and one buyable page:

- Recipe pages (1–3) → `shop/hot-italian-sausage.html`,
  `shop/sweet-italian-sausage.html`, or `shop/italian-meatballs.html`, plus
  `menu.html` for the counter angle.
- DTC page (4) → `shop.html` and both bundles.
- Add a link **to** each new page from `products.html` so nothing is orphaned.
  (There is already a known orphan problem — `hot-foods/sweet-sausage-sandwich.html`
  is linked only from `products.html`. Don't add to it.)

## Verification — the gate for each iteration

```
node tools/check-pages.mjs site/THE-NEW-PAGE.html
```

Must exit 0. It fact-lints all 38+ pages and runs structure, head, canonical,
tag-balance, dead-link, sitemap, and `_redirects` checks on the named page.
Baseline is green as of 2026-08-09 — any fact-lint failure is something this
run introduced.

There is no build step. This is a static site published from `site/`. Do not
add a bundler, a framework, a templating layer, or npm dependencies.

## Commit convention

Single concise line, under 72 characters, no body. Example:

```
Add how-to-cook-italian-sausage landing page
```

No `Co-Authored-By` line. No trailer of any kind.

## Notes to carry between iterations

Record in `notes.md` after each page:

- Which page was completed and its slug.
- Every blank slot you left, and the fact you needed for it.
- Anything you added to `docs/WIKI.md` → "Open questions".
- Any judgment call that should be reviewed rather than accepted.

## Out of scope

- `story.html` enrichment — voice-sensitive, wants the owner's own memories.
- Images. There is no photo for these pages. Use the existing
  `.includes-card-plate` / `.menu-item-plate` typographic stand-in rather than
  referencing an image file that doesn't exist.
- Any change to nav, footer, or `css/styles.css` shared markup. If a page needs
  a new component, add a scoped class, don't edit shared rules.
