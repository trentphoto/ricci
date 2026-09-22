# Grill Box: four-page Buy-click experiment

One offer on every page: $189, shipping included, 10 lb sausage and one 32 oz
bag of peppers and onions. All pages use `js/grill-box.js` for identical blend
choices and checkout links. No Shopify integration changes or purchase tracking.

| Version | Design | Preview path |
| --- | --- | --- |
| A / original | Existing page; visual layout preserved | `/shop/grill-box?preview=1` |
| B / minimal | Centered, narrow, white sales page | `/shop/grill-box-minimal?preview=1` |
| C / butcher | ButcherBox-inspired DTC structure: hero, benefits, products, steps | `/shop/grill-box-butcher?preview=1` |
| D / table | Custom editorial layout; food and complete order panel together | `/shop/grill-box-table?preview=1` |

C takes structural inspiration from https://www.butcherbox.com/; all copy,
photography, claims, branding, and the one-time offer are Ricci's. D's hypothesis:
clarifying the contents, price, and choice beside the food should reduce work
before a Buy click. Its performance is unknown until measured.

## Routing and measurement

- Campaign URL: `https://riccisausage.com/shop/grill-box`. Same URL for all ads.
- `js/grill-experiment.js` runs before paint/analytics. Random 25% allocation
  to each variant. A first-party cookie holds the anonymous browser ID and
  variant for 90 days, shared across www and apex. Returning browsers stay put.
- Redirects preserve query strings and hash. Direct variant links also honor
  assignment. `?preview=1` bypasses assignment and custom event tracking.
- Non-production hosts, common bot agents, unavailable crypto, and browsers
  refusing the assignment cookie do not enter the experiment. No-JS visitors
  see the directly requested page and are not counted.
- Count the first visible page exposure, then the first valid outbound Buy
  click. Section links such as “Choose your box” are not conversion events.
- `js/grill-events.js` posts to the CRM using `text/plain` and keepalive/beacon.
  It never delays checkout. `crm.js` supplies the existing backend base URL.
- The CRM deduplicates by experiment + browser ID, keeps the first observed
  variant, and counts no more than one click per browser. Out-of-order click
  delivery implies exposure, avoiding click rates above 100%.
- CRM results: `/admin/experiments`, behind existing admin authentication.
  Shows all-time visitors, clickers, traffic share, rates, and per-rate Wilson
  95% intervals. No automatic winner or traffic shifting.
- Preview URLs still load the existing GA/Meta pageview analytics, but never
  custom experiment events. Preview visits do not change an existing assignment.

## Launch order

1. Deploy the CRM addition first. It creates its own SQLite table without
   changing orders, contacts, Shopify hooks, or customer emails.
2. Check the authenticated `/admin/experiments` page; it should show four empty
   rows for a fresh experiment. Validate the public endpoint with a separate
   local test database, not fabricated production visitor events.
3. Review the four preview pages at desktop and mobile sizes. Repository rules
   ask the owner to do visual verification; no automated browser screenshots.
4. Publish the static site. Allocation becomes active on riccisausage.com and
   www.riccisausage.com only. Do not publish before the CRM endpoint is deployed.
5. Point ads at the campaign URL **without `preview=1`**. Agree on duration and
   sample target before judging results. Four variants divide the traffic four
   ways; small counts are exploratory, not evidence of a winner.

Buy-click rate measures purchase intent, not sales. Cookie deletion, multiple
devices, blocked tracking, unrecognized bots, and failed delivery affect counts.
The confidence intervals describe each rate; they are not a corrected test of
six pairwise comparisons. Do not declare a winner just from the highest rate.

Do not edit a running design and pool it with old results. For a new test,
change the experiment ID and cookie key in the client and the experiment ID in
the CRM. Historical records stay in SQLite. Pausing allocation requires a site
change; there is no automatic optimization.

## Checks

```
node tools/check-pages.mjs site/shop/grill-box.html site/shop/grill-box-minimal.html site/shop/grill-box-butcher.html site/shop/grill-box-table.html
node --test tools/grill-experiment/browser.test.mjs
```

CRM implementation lives in `../riccis-crm/src/experiments.ts` — since
2026-09-22 a registry of experiment specs shared with the meatball framing test
(`docs/meatball-framing-test.md`), storing every test in one
`experiment_visitors` table and serving `/api/experiments/:slug/events`. The
route and protected dashboard are mounted in `src/index.ts`. Its checks are
`bun test src/experiments.test.ts` and `./node_modules/.bin/tsc --noEmit`, run
from that repository. Route integration was also verified against an isolated
in-memory database, including CORS, invalid/oversized payloads, and admin login.

Existing offer questions (arrival window, shipping coverage, peppers/onions
preparation) remain in `docs/WIKI.md`; the new pages make no new promises there.
