#!/usr/bin/env bun
// Generates product detail pages for shop/ and hot-foods/, plus the catering hub.
// Also rewrites the footer in all root-level HTML pages so the new product pages
// get internal links from every page on the site (the footer-link strategy).
//
// Usage:
//   bun run _build/generate.ts
//
// Edit content in _build/products.ts, then re-run.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { grocery, hotFoods, cateringItems, type GroceryProduct, type HotFoodProduct } from "./products";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// ─────────────────────────────────────────────────────────────────────────────
// Header (shared) — `depth` is 0 for root pages, 1 for shop/* and hot-foods/*
// ─────────────────────────────────────────────────────────────────────────────
const r = (depth: number, p: string) => (depth === 0 ? p : `../${p}`);

const head = (depth: number, title: string, desc: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400;1,700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="${r(depth, "css/styles.css")}" />
</head>
<body>`;

const header = (depth: number) => `
  <header class="site-header">
    <nav class="nav" aria-label="Primary">
      <a href="${r(depth, "index.html")}" class="nav-logo">
        Ricci's
        <span>Italian Sausage · Est. 1945</span>
      </a>
      <div class="nav-menu">
        <ul class="nav-links" id="primary-nav">
          <li><a href="${r(depth, "index.html")}">Home</a></li>
          <li><a href="${r(depth, "story.html")}">Our Story</a></li>
          <li><a href="${r(depth, "menu.html")}">Menu</a></li>
          <li class="nav-shop"><a href="${r(depth, "shop.html")}">Shop</a></li>
          <li><a href="${r(depth, "press.html")}">Press</a></li>
          <li><a href="${r(depth, "index.html")}#visit">Visit</a></li>
        </ul>
      </div>
      <div class="nav-cta">
        <span class="nav-cart">Cart (0)</span>
        <a href="tel:4123319531" class="btn btn-primary">Call · 412-331-9531</a>
      </div>
      <button type="button" class="nav-toggle" id="site-nav-toggle" aria-expanded="false" aria-controls="primary-nav" aria-label="Open menu">
        <span class="nav-toggle-inner" aria-hidden="true">
          <span class="nav-toggle-bar"></span>
          <span class="nav-toggle-bar"></span>
          <span class="nav-toggle-bar"></span>
        </span>
      </button>
    </nav>
    <div class="nav-backdrop" id="nav-backdrop" aria-hidden="true"></div>
  </header>`;

// ─────────────────────────────────────────────────────────────────────────────
// Footer — the strategy. Every page links to top products in both categories.
// ─────────────────────────────────────────────────────────────────────────────
const footerShopLinks = [
  { slug: "sweet-italian-sausage", label: "Sweet Italian Sausage" },
  { slug: "hot-italian-sausage", label: "Hot Italian Sausage" },
  { slug: "italian-meatballs", label: "Italian Meatballs" },
  { slug: "pittsburgh-italian-pack", label: "Pittsburgh Italian Pack" },
  { slug: "ricci-legacy-gift-box", label: "Legacy Gift Box" },
  { slug: "sausage-club", label: "The Sausage Club" },
];

const footerHotFoodLinks = [
  { slug: "hot-sausage-sandwich", label: "Famous Hot Sausage" },
  { slug: "meatball-sandwich", label: "Lil's Meatball Sandwich" },
  { slug: "banana-pepper-sandwich", label: "Ernie's Banana Pepper" },
  { slug: "sausage-rolls", label: "Lil's Sausage Rolls" },
  { slug: "sausage-lasagna", label: "Sausage Lasagna" },
  { slug: "catering", label: "Catering Trays" },
];

const footer = (depth: number) => `
  <footer class="site-footer">
    <div class="footer-grid">
      <div class="footer-brand">
        <div class="nav-logo">
          Ricci's
          <span>Italian Sausage · Est. 1945</span>
        </div>
        <p>
          A boutique Italian sausage maker — hand-mixed, small batches,
          all natural. A family recipe from Sulmona, Italy. Made in
          McKees Rocks, Pennsylvania since 1945. USDA-inspected.
          Shipped nationwide.
        </p>
        <p style="margin-top:12px;">
          <a href="tel:4123319531" style="color:var(--gold);font-family:var(--font-serif);font-size:1.05rem;">412-331-9531</a>
        </p>
      </div>
      <div class="footer-col">
        <h4>Shop · Ship Nationwide</h4>
        <ul>
${footerShopLinks.map(l => `          <li><a href="${r(depth, `shop/${l.slug}.html`)}">${l.label}</a></li>`).join("\n")}
          <li><a href="${r(depth, "shop.html")}">All Products</a></li>
          <li><a href="mailto:wholesale@riccisausage.com">Wholesale</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Hot Foods · McKees Rocks</h4>
        <ul>
${footerHotFoodLinks.map(l => `          <li><a href="${r(depth, `hot-foods/${l.slug}.html`)}">${l.label}</a></li>`).join("\n")}
          <li><a href="${r(depth, "menu.html")}">Full Menu</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <ul>
          <li><a href="${r(depth, "story.html")}">Our Story</a></li>
          <li><a href="${r(depth, "menu.html")}">Menu</a></li>
          <li><a href="${r(depth, "press.html")}">Press</a></li>
          <li><a href="${r(depth, "index.html")}#visit">Visit the Shop</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Help</h4>
        <ul>
          <li><a href="${r(depth, "shipping.html")}">Shipping Info</a></li>
          <li><a href="${r(depth, "faq.html")}">FAQ</a></li>
          <li><a href="${r(depth, "returns.html")}">Returns</a></li>
          <li><a href="https://shop.riccisausage.com/account">Track Order</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; 2026 Ricci's Italian Sausage. All rights reserved.</span>
      <span><a href="https://maps.app.goo.gl/9rDvQrZiuCKRCmFE9" target="_blank" rel="noopener noreferrer">500 Pine Hollow Rd, McKees Rocks, PA 15136</a> · 412-331-9531</span>
      <span><a href="${r(depth, "privacy.html")}">Privacy</a> · <a href="${r(depth, "terms.html")}">Terms</a></span>
    </div>
  </footer>

  <script src="${r(depth, "js/nav-drawer.js")}" defer></script>
</body>
</html>`;

// ─────────────────────────────────────────────────────────────────────────────
// GROCERY product page
// ─────────────────────────────────────────────────────────────────────────────
function groceryPage(p: GroceryProduct): string {
  const depth = 1;
  const related = grocery.filter(g => g.slug !== p.slug).slice(0, 3);
  const ldJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.metaDesc,
    brand: { "@type": "Brand", name: "Ricci's Italian Sausage" },
    image: `https://riccisausage.com/assets/img/${p.image}`,
    offers: {
      "@type": "Offer",
      price: p.price.replace(/[^0-9.]/g, ""),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `https://riccisausage.com/shop/${p.slug}.html`,
    },
  });

  return `${head(depth, p.metaTitle, p.metaDesc)}
${header(depth)}
  <main>
    <article class="product-detail">

      <!-- HERO -->
      <section class="product-hero">
        <div class="container product-hero-grid">
          <div class="product-hero-img">
            <img src="../assets/img/${p.image}" alt="${p.name}" />
          </div>
          <div class="product-hero-body">
            <span class="eyebrow">${p.tag}</span>
            <h1>${p.name}</h1>
            <p class="product-hero-lead">${p.hero}</p>
            <div class="product-hero-meta">
              <span class="product-price-lg">${p.price}</span>
              <span class="ship-note">${p.priceNote}</span>
            </div>
            <div class="product-hero-cta">
              <a href="#" class="btn ${p.ctaPrimary ? "btn-primary" : "btn-outline-dark"}">${p.ctaLabel}</a>
              <a href="tel:4123319531" class="btn btn-outline-dark">Call · 412-331-9531</a>
            </div>
            <p class="product-hero-weight">${p.weight}</p>
          </div>
        </div>
      </section>

      <!-- DESCRIPTION -->
      <section class="menu-section">
        <div class="container product-prose">
          <span class="eyebrow">About this product</span>
          <h2>${p.name}.</h2>
          <p>${p.description}</p>
          <h3>Ingredients</h3>
          <p>${p.ingredients}</p>
        </div>
      </section>

      <!-- HOW TO COOK -->
      <section class="menu-section menu-section-alt">
        <div class="container">
          <div class="menu-section-header">
            <span class="eyebrow">How to cook it</span>
            <h2>Three Ways to Cook It.</h2>
          </div>
          <div class="menu-grid">
${p.cookMethods.map(m => `            <div class="menu-item">
              <div class="menu-item-header"><h3>${m.title}</h3></div>
              <p>${m.body}</p>
            </div>`).join("\n")}
          </div>
        </div>
      </section>

      <!-- SERVING IDEAS -->
      <section class="menu-section">
        <div class="container product-prose">
          <span class="eyebrow">On the table</span>
          <h2>Ideas From the Counter.</h2>
          <p>${p.servingIdeas}</p>
        </div>
      </section>

      <!-- USDA -->
      <div class="section-usda">
        <div class="usda-inner">
          <div class="usda-badge">USDA<br />Federal<br />Inspected<br />Est. 1973</div>
          <div class="usda-copy">
            <h3>USDA Inspected Every Day Since 1973.</h3>
            <p>The same federal stamp you look for at the meat case. We've held that standard for fifty-plus years without missing a day — one of only two USDA-inspected sausage makers in Pittsburgh with a retail counter, and the only one that cooks.</p>
          </div>
          <a href="../story.html" class="btn btn-outline">Learn More</a>
        </div>
      </div>

      <!-- FAQ -->
      <section class="menu-section menu-section-alt">
        <div class="container product-prose">
          <span class="eyebrow">Questions</span>
          <h2>FAQ</h2>
${p.faq.map(f => `          <h3>${f.q}</h3>\n          <p>${f.a}</p>`).join("\n")}
        </div>
      </section>

      <!-- RELATED -->
      <section class="menu-section">
        <div class="container">
          <div class="menu-section-header">
            <span class="eyebrow">Goes well with</span>
            <h2>You Might Also Like.</h2>
          </div>
          <div class="products-grid">
${related.map(rp => `            <div class="product-card">
              <div class="product-card-img"><img src="../assets/img/${rp.image}" alt="${rp.name}" /></div>
              <div class="product-card-body">
                <span class="product-card-tag">${rp.tag}</span>
                <h3>${rp.name}</h3>
                <p>${rp.hero.split(".")[0]}.</p>
                <div class="product-card-footer">
                  <div class="product-price">${rp.price}<span class="ship-note">${rp.priceNote}</span></div>
                  <a href="${rp.slug}.html" class="btn btn-outline-dark">View</a>
                </div>
              </div>
            </div>`).join("\n")}
          </div>
        </div>
      </section>

      <!-- EMAIL -->
      <section class="section-email">
        <div class="container">
          <span class="eyebrow">Join the Family</span>
          <h2>Get Early Access &amp;<br />Members-Only Recipes.</h2>
          <p>Seasonal bundles, shop specials, and a Ricci family recipe in your first email.</p>
          <form class="email-form" onsubmit="return false;">
            <input type="email" placeholder="Your email address" />
            <button type="submit">Join</button>
          </form>
        </div>
      </section>

    </article>
  </main>

  <script type="application/ld+json">${ldJson}</script>
${footer(depth)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOT FOOD product page
// ─────────────────────────────────────────────────────────────────────────────
function hotFoodPage(p: HotFoodProduct): string {
  const depth = 1;
  const related = hotFoods.filter(h => h.slug !== p.slug).slice(0, 3);
  const ldJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name: p.name,
    description: p.metaDesc,
    offers: {
      "@type": "Offer",
      price: (p.price.match(/\$([0-9.]+)/) || ["", ""])[1],
      priceCurrency: "USD",
    },
  });

  return `${head(depth, p.metaTitle, p.metaDesc)}
${header(depth)}
  <main>
    <article class="product-detail">

      <!-- HERO -->
      <section class="product-hero">
        <div class="container product-hero-grid">
          <div class="product-hero-img product-hero-img--placeholder">[ ${p.shortName} ]</div>
          <div class="product-hero-body">
            ${p.tag ? `<span class="eyebrow">${p.tag}</span>` : ""}
            <h1>${p.name}</h1>
            <p class="product-hero-lead">${p.hero}</p>
            <div class="product-hero-meta">
              <span class="product-price-lg">${p.price}</span>
              <span class="ship-note">${p.availability}</span>
            </div>
            <div class="product-hero-cta">
              <a href="tel:4123319531" class="btn btn-primary">Call to Order · 412-331-9531</a>
              <a href="../menu.html" class="btn btn-outline-dark">See Full Menu</a>
            </div>
            <p class="product-hero-weight">500 Pine Hollow Rd, McKees Rocks, PA 15136</p>
          </div>
        </div>
      </section>

      <!-- DESCRIPTION -->
      <section class="menu-section">
        <div class="container product-prose">
          <span class="eyebrow">What's on it</span>
          <h2>${p.name}.</h2>
          <p>${p.description}</p>
          <h3>Ingredients</h3>
          <p>${p.ingredients}</p>
        </div>
      </section>

      ${p.story ? `<!-- STORY -->
      <section class="menu-section menu-section-alt">
        <div class="container product-prose">
          <span class="eyebrow">The Story</span>
          <h2>How it got on the menu.</h2>
          <p>${p.story}</p>
        </div>
      </section>` : ""}

      <!-- VISIT -->
      <section class="menu-section menu-section-dark">
        <div class="container">
          <div class="menu-section-header">
            <span class="eyebrow" style="color:var(--gold);">Stop By</span>
            <h2 style="color:var(--white);">Visit the Shop.</h2>
            <p style="color:rgba(255,255,255,0.55); margin-inline:auto;">
              500 Pine Hollow Rd, McKees Rocks, PA 15136<br />
              Open Monday–Saturday. Closed Sundays.<br />
              Call ahead, or stop in at the counter.
            </p>
          </div>
          <div style="text-align:center;">
            <a href="tel:4123319531" class="btn btn-primary">Call · 412-331-9531</a>
            <a href="https://maps.app.goo.gl/9rDvQrZiuCKRCmFE9" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="margin-left:12px;">Get Directions</a>
          </div>
        </div>
      </section>

      ${p.catering ? `<!-- CATERING -->
      <section class="menu-section">
        <div class="container product-prose">
          <span class="eyebrow">For a crowd</span>
          <h2>Catering.</h2>
          <p>${p.catering}</p>
          <p><a href="catering.html" class="btn btn-outline-dark">Catering Menu</a></p>
        </div>
      </section>` : ""}

      <!-- RELATED -->
      <section class="menu-section menu-section-alt">
        <div class="container">
          <div class="menu-section-header">
            <span class="eyebrow">Also at the counter</span>
            <h2>More From the Menu.</h2>
          </div>
          <div class="menu-grid">
${related.map(rp => `            <div class="menu-item">
              <div class="menu-item-header">
                <h3><a href="${rp.slug}.html" style="color:inherit;text-decoration:none;">${rp.name}</a></h3>
                <span class="menu-price">${rp.price}</span>
              </div>
              <p>${rp.hero}</p>
            </div>`).join("\n")}
          </div>
        </div>
      </section>

      <!-- EMAIL -->
      <section class="section-email">
        <div class="container">
          <span class="eyebrow">Join the Family</span>
          <h2>Monthly Specials &amp; Family Updates.</h2>
          <p>Seasonal items, shop news, and a heads-up when something good is happening at the counter.</p>
          <form class="email-form" onsubmit="return false;">
            <input type="email" placeholder="Your email address" />
            <button type="submit">Join</button>
          </form>
        </div>
      </section>

    </article>
  </main>

  <script type="application/ld+json">${ldJson}</script>
${footer(depth)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATERING hub page
// ─────────────────────────────────────────────────────────────────────────────
function cateringHubPage(): string {
  const depth = 1;
  return `${head(depth, "Catering — Ricci's Italian Sausage | Pittsburgh", "Ricci's Italian Sausage catering trays — sausage, meatballs, stuffed peppers, lasagna, mac and cheese, sausage rolls. McKees Rocks, PA. 24 hours notice.")}
${header(depth)}
  <main>
    <article class="product-detail">

      <section class="product-hero">
        <div class="container product-hero-grid">
          <div class="product-hero-img product-hero-img--placeholder">[ Catering Trays ]</div>
          <div class="product-hero-body">
            <span class="eyebrow">Feed the Family</span>
            <h1>Catering at Ricci's.</h1>
            <p class="product-hero-lead">The Italian family coming over? Homemade savories to please — even the Godfather.</p>
            <div class="product-hero-cta">
              <a href="tel:4123319531" class="btn btn-primary">Call to Order · 412-331-9531</a>
              <a href="../menu.html" class="btn btn-outline-dark">Full Menu</a>
            </div>
            <p class="product-hero-weight"><strong>24-hour notice</strong> on all trays and bread.</p>
          </div>
        </div>
      </section>

      <section class="menu-section">
        <div class="container">
          <div class="menu-section-header">
            <span class="eyebrow">Catering Menu</span>
            <h2>Trays &amp; Quantities.</h2>
          </div>
          <div class="catering-grid">
${cateringItems.map(c => `            <div class="catering-item">
              <div class="catering-item-name">${c.name}</div>
              <div class="catering-item-price">${c.price}</div>
            </div>`).join("\n")}
          </div>
          <div class="catering-notice">
            <p>If possible, we need <strong>24-hour notice</strong> on all trays and bread.</p>
          </div>
        </div>
      </section>

      <section class="menu-section menu-section-alt">
        <div class="container product-prose">
          <span class="eyebrow">How it works</span>
          <h2>Place a Catering Order.</h2>
          <p>Call the shop at <a href="tel:4123319531"><strong>412-331-9531</strong></a> with your headcount, the trays you want, and the day and time you need pickup. We'll confirm the order on the phone. Pay at pickup. Pittsburgh-area delivery available for larger orders — ask when you call.</p>
          <h3>Lead time</h3>
          <p>24 hours for trays. 48 hours preferred for orders over 4 trays. Holidays book up — call early.</p>
          <h3>Pickup</h3>
          <p>500 Pine Hollow Rd, McKees Rocks, PA 15136. Mon–Sat. We'll have it stacked and ready at the counter at the time you confirmed.</p>
        </div>
      </section>

      <section class="menu-section menu-section-dark">
        <div class="container">
          <div class="menu-section-header">
            <span class="eyebrow" style="color:var(--gold);">Catering Tray Lineup</span>
            <h2 style="color:var(--white);">What's in Each Tray.</h2>
          </div>
          <div class="menu-grid">
${hotFoods.filter(h => h.catering).map(h => `            <div class="menu-item">
              <div class="menu-item-header">
                <h3><a href="${h.slug}.html" style="color:inherit;text-decoration:none;">${h.shortName}</a></h3>
              </div>
              <p>${h.description}</p>
            </div>`).join("\n")}
          </div>
        </div>
      </section>

      <section class="section-email">
        <div class="container">
          <span class="eyebrow">Join the Family</span>
          <h2>Specials &amp; Catering Reminders.</h2>
          <p>Seasonal trays, holiday lead times, and the calendar specials worth knowing about.</p>
          <form class="email-form" onsubmit="return false;">
            <input type="email" placeholder="Your email address" />
            <button type="submit">Join</button>
          </form>
        </div>
      </section>

    </article>
  </main>
${footer(depth)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer rewrite for existing root-level pages
// ─────────────────────────────────────────────────────────────────────────────
function rewriteRootFooter(file: string) {
  const path = join(ROOT, file);
  let html = readFileSync(path, "utf8");
  // Match from <!-- FOOTER --> or <footer ...> through </html>
  const newFooterBlock = `  <!-- FOOTER -->
${footer(0).trimStart()}`;
  // Replace from the FOOTER comment (or the <footer tag) onward.
  const startMatch = html.match(/(\s*<!--\s*FOOTER\s*-->|\s*<footer class="site-footer">)/);
  if (!startMatch) {
    console.warn(`  ⚠ no footer marker in ${file} — skipping`);
    return;
  }
  html = html.slice(0, startMatch.index) + "\n  " + newFooterBlock;
  writeFileSync(path, html);
  console.log(`  ✓ ${file}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────────────────
console.log("Generating grocery product pages…");
for (const p of grocery) {
  const out = join(ROOT, "shop", `${p.slug}.html`);
  writeFileSync(out, groceryPage(p));
  console.log(`  ✓ shop/${p.slug}.html`);
}

console.log("Generating hot food pages…");
for (const p of hotFoods) {
  const out = join(ROOT, "hot-foods", `${p.slug}.html`);
  writeFileSync(out, hotFoodPage(p));
  console.log(`  ✓ hot-foods/${p.slug}.html`);
}

console.log("Generating catering hub page…");
writeFileSync(join(ROOT, "hot-foods", "catering.html"), cateringHubPage());
console.log("  ✓ hot-foods/catering.html");

console.log("Rewriting footers on existing root pages…");
const rootPages = readdirSync(ROOT).filter(f => f.endsWith(".html"));
for (const f of rootPages) rewriteRootFooter(f);

console.log("Done.");
