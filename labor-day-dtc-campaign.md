# Labor Day 2026 — DTC shipped box

Page: `site/labor-day-box.html` → **riccisausage.com/labor-day-box**
Offer: **The Labor Day Box, $149.** 10 lbs shipped frozen — 5 hot / 5 sweet,
10 lb all hot, or 10 lb all sweet, same price whichever — plus **2 quarts of
Lil's homemade tomato sauce** in every box. Free shipping to **PA, MD, NY, DE**.
Deadline: **order by Wed Sep 2**. Ships Tue/Wed, arrives Thu/Fri.

This is a *second, separate* offer from the in-store $29.99 Cookout Box at
`/labor-day` (`labor-day-campaign.md`). Two pages, two deadlines, two audiences
— cold paid traffic here, local list there. Don't merge them, and don't point
these ads at `/products` or `/shop`.

## Changed from the brief, on fact grounds

- **"Two ropes"** → *two 5 lb boxes of rope*. `WIKI.md` → Packaging: say "a
  5 lb box of rope," never anything implying one unbroken coil.
- **"Not a single ingredient changed since"** (sweet) → cut. Replaced with the
  verified blend from the Product facts table.
- **"Hot outsells sweet about seven to one"** → cut. Same unverified number
  already removed from the in-store campaign.
- **"One of only two USDA-inspected sausage makers in Pittsburgh with its own
  retail counter — and the only one that also cooks"** → **left off the page.**
  It's live on `hot-italian-sausage-pittsburgh.html` but has never been in the
  wiki. Confirm it and it goes straight back in — it's the strongest
  differentiator in the brief.
- **"A Ricci family recipe in your first email"** → cut. There is no recipe
  card; that promise was removed sitewide on 2026-08-06.
- **Reviews section** → not built. Brief says cut it rather than ship an empty
  block. Send 3 quotes (name + city) and it goes in.
- Typos in the brief that were reconstructed, not invented: "we make it rigrs"
  → *we make it right*; "Real paprikatural" → *real paprika … all natural*;
  "Iteekend" → *It's There Before the Weekend*; headline "Pittsburgh's 45" →
  dropped.

## Ads — Meta

**Primary text v1 — deadline**

> We're closed Sunday and Monday for Labor Day. Wednesday is the last day a box
> ships. Ten pounds of Ricci's Italian sausage — five hot, five sweet —
> hand-mixed in our own USDA-inspected shop in McKees Rocks since 1945. Packed
> frozen, at your door before the weekend — with two quarts of Lil's homemade
> tomato sauce in the box. $149, shipping included.

**Primary text v2 — product**

> Whole fennel seed. Real paprika. Crushed red pepper. Ground and hand-mixed in
> small batches in McKees Rocks, the same way since 1945 — no fillers, no MSG,
> nothing you can't pronounce. Ten pounds shipped frozen to your door, plus two
> quarts of our homemade tomato sauce, for $149.
> Order by Wednesday for Labor Day.

**Primary text v3 — Pittsburgh**

> If you know, you know. Ricci's has been on Pine Hollow Road since 1945, and
> for Labor Day we're shipping it. Five pounds hot, five pounds sweet, packed
> frozen, two quarts of Lil's sauce in the box, $149 with shipping. Order by Wednesday — we're closed for the holiday
> after that.

**Headlines**
- 10 lb of Ricci's + 2 Quarts of Sauce — $149
- Order by Wednesday for Labor Day
- Hot and Sweet, 10 lb + Sauce, $149 Shipped

**Descriptions**
- Free shipping to PA, MD, NY, DE. Arrives frozen.
- Hand-mixed in McKees Rocks. USDA-inspected since 1973.

**CTA button:** Shop Now

## Build checklist

- [x] Guarantee locked — full refund, identical wording in hero and FAQ
- [x] Arrival window locked — Thursday or Friday, kept soft on purpose
- [ ] **Checkout URLs.** `CHECKOUT` in `site/js/labor-day-box.js` has all three
      keys (`mixed`, `hot`, `sweet`) empty. One CTA, no phone-order path — so
      the buttons sit disabled with a loud warning strip until they're filled
      in. **This is the launch blocker.**
- [ ] Tell Angie and whoever answers the phone about the refund policy before
      ads run — a caller who gets "let me ask James" instead of a yes costs you
      the guarantee's whole value
- [ ] Fix the footer address: several pages still say 500 Pine Hollow, it's 590
- [ ] Point ads at `/labor-day-box` only, not `/products` or `/shop`
- [ ] Meta Pixel + Purchase event firing before spend starts (placeholder
      comment is in the page `<head>`; no pixel ID exists in this repo)
- [ ] Restrict shipping to PA, MD, NY, DE at checkout so an out-of-region order
      can't blow the margin
- [ ] Kill switch: pause ads when box 25 ships (30 in stock)
- [ ] Call the packaging supplier Monday for 100/500/1000 pricing and lead time
- [ ] Log actual shipping cost and pack-out time on every box
