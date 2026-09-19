/*
 * The Sunday Grill Box — shop/grill-box.html
 *
 * Two jobs, same pattern the retired js/labor-day-box.js used:
 *
 *   1. Three-way mix switch (hot & sweet / all hot / all sweet). It lives
 *      once, in the #box section — the hero has no picker and simply
 *      states the default box, the same shape the archived
 *      labor-day-box.html used. The code takes every [data-grill-switch]
 *      though, so a second instance would just work; each is kept in step
 *      along with every [data-grill-note], every [data-grill-manifest]
 *      (the hero's included, so it can't contradict the picker), and the
 *      two live qty badges on the rope cards ([data-grill-qty]). The
 *      selection also decides which checkout URL the CTAs point at.
 *
 *      The rope cards are live because the box can be all hot or all
 *      sweet: a fixed "5 lb" on each card would be a false manifest for
 *      two of the three mixes. A blend that isn't in the box gets
 *      .is-out on its card and OUT_LABEL in the badge.
 *   2. Checkout guard. CHECKOUT below is WIRED to the three flat-$189
 *      grill-box products in Shopify. This page has one CTA and NO
 *      phone-order path, so a mix with no URL has its [data-grill-cta]
 *      buttons disabled (href dropped, aria-disabled, .btn--no-checkout)
 *      rather than degrading quietly to tel:. The dashed on-page warning
 *      strips were removed 2026-09-18 at the owner's request, so that
 *      failure is now SILENT to visitors — if you blank a URL here,
 *      check the buttons yourself. Re-run ./tools/shopify/sync-grill-box.sh
 *      if the variant IDs change.
 *
 * Delete this file with the page.
 */
(function () {
  "use strict";

  /* Wired 2026-09-17 to the flat-$189 grill-box products (tools/shopify-grill-box-map.json).
     Empty string = that mix can't be bought. */
  var CHECKOUT = {
    mixed: "https://tiyndf-za.myshopify.com/cart/58926159691936:1",
    hot: "https://tiyndf-za.myshopify.com/cart/58926159823008:1",
    sweet: "https://tiyndf-za.myshopify.com/cart/58926159921312:1"
  };

  /* qty: what each rope card's badge reads for this mix. null = that blend
     isn't in the box. Weights here must match the manifest line. */
  var OUT_LABEL = "Not in this mix";

  var MIX = {
    mixed: {
      slabClass: "",
      manifest: "5 lb hot rope + 5 lb sweet rope — two labeled 5 lb boxes",
      note: "Half and half. Five pounds of hot, five pounds of sweet — the way most people order it when they can't decide.",
      qty: { hot: "5 lb", sweet: "5 lb" }
    },
    hot: {
      slabClass: "is-mid",
      manifest: "10 lb hot rope — two labeled 5 lb boxes",
      note: "All hot. Crushed red pepper, real paprika, whole fennel seed — medium heat that builds slowly.",
      qty: { hot: "10 lb", sweet: null }
    },
    sweet: {
      slabClass: "is-right slab-sweet",
      manifest: "10 lb sweet rope — two labeled 5 lb boxes",
      note: "All sweet. Cracked black pepper, no chili heat — a different blend, not the hot one with the pepper left out.",
      qty: { hot: null, sweet: "10 lb" }
    }
  };

  function all(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  var switches = all("[data-grill-switch]");
  if (!switches.length) return;

  var notes = all("[data-grill-note]");
  var manifests = all("[data-grill-manifest]");
  var qtys = all("[data-grill-qty]");
  var ctas = all("[data-grill-cta]");
  var warnings = all("[data-grill-warning]");

  function apply(key) {
    var mix = MIX[key];
    if (!mix) return;

    switches.forEach(function (sw) {
      sw.classList.remove("is-mid", "is-right", "slab-sweet");
      if (mix.slabClass) {
        mix.slabClass.split(" ").forEach(function (c) { sw.classList.add(c); });
      }
      /* Each switch is its own radio group, so check the matching input in
         all of them — otherwise the one you didn't click keeps its old face. */
      var radio = sw.querySelector('input[value="' + key + '"]');
      if (radio) radio.checked = true;
    });

    notes.forEach(function (el) { el.textContent = mix.note; });
    manifests.forEach(function (el) { el.textContent = mix.manifest; });

    qtys.forEach(function (el) {
      var blend = el.getAttribute("data-grill-qty");
      var weight = mix.qty ? mix.qty[blend] : null;
      var card = el.closest ? el.closest("[data-grill-card]") : null;
      el.textContent = weight || OUT_LABEL;
      if (card) card.classList.toggle("is-out", !weight);
    });

    var url = CHECKOUT[key];
    ctas.forEach(function (a) {
      if (url) {
        a.href = url;
        a.removeAttribute("aria-disabled");
        a.classList.remove("btn--no-checkout");
      } else {
        a.removeAttribute("href");
        a.setAttribute("aria-disabled", "true");
        a.classList.add("btn--no-checkout");
      }
    });
    warnings.forEach(function (el) { el.hidden = !!url; });
  }

  /* Delegated: one listener covers both switches, and any future instance. */
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t && t.name && t.name.indexOf("grill-mix") === 0) apply(t.value);
  });

  /* A disabled CTA still swallows the click in some browsers — belt and braces. */
  ctas.forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (a.getAttribute("aria-disabled") === "true") e.preventDefault();
    });
  });

  var checked = switches[0].querySelector("input:checked");
  apply(checked ? checked.value : "mixed");
})();
