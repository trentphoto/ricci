# Ricci's Italian Sausage — working rules

Read `docs/WIKI.md` for architecture. This file is about how to behave in this repo.

## Do not invent product facts. Ever.

This is a real business selling real food. Wrong copy on this site is a wrong
claim to a paying customer, and some of it (packaging, ingredients, USDA status,
allergens) is a compliance problem, not a style problem.

**The rule:** if a product detail is not in `docs/WIKI.md` → "Product facts", you do
not write it. Not a plausible version, not a placeholder, not "something
reasonable to fill the slot." You ask.

This has already gone wrong twice:

- **"~20 links" for a 5 lb pack** — it's one continuous rope. Six pages.
- **"vacuum-sealed"** — it isn't. Fifteen places across the site, some of which
  predate any AI edit and got propagated further because it looked established.

Both were fabrications that read as confident and specific, which is exactly
what makes them dangerous — nobody re-checks a detail that sounds researched.

### What counts as a product fact

Packaging (box/bag/wrap/seal), weights, counts, dimensions, ingredients,
seasoning, fat percentage, cook temps and times, shelf life, pricing, shipping
method, cold-chain handling, certifications, dates, awards, press mentions.

### What to do when you don't know

1. Leave the slot empty, or use the `.includes-card-plate` / `.menu-item-plate`
   typographic stand-in, which is designed for exactly this.
2. Write the question down in "Open questions" in `docs/WIKI.md`.
3. Tell the user in your reply, plainly, that you left it blank and why.

Do **not** copy a detail from a sibling page and assume it transfers. The wrong
claims above spread that way — each page looked like it was confirming the last.

### Repeating an existing claim

Something already being on the site is not verification. If you are moving,
restyling, or duplicating copy that contains a product fact, it inherits the
same burden. If it isn't in the wiki, flag it rather than carrying it forward.

## Copy conventions

- Never write "no sugar" about sweet sausage — dextrose is in the blend.
- Sweet is not "hot minus the pepper." Different blends. See the wiki table.
- Prices: `$6.75` sandwich, `$3.50/pc` is a **cooked** link from the hot case.

## Verifying changes

After building/bundling, do not spin up a browser or take screenshots. Run a
build check and hand it back to the user to verify visually.
