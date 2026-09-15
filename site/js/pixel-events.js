/*
 * Ricci's pixel events — Meta Pixel + GA4 ecommerce events on the static site.
 *
 * Shopify fires Purchase on its own. This file covers the two steps before
 * that, which happen here on riccisausage.com:
 *
 *   ViewContent / view_item        — on load, when the page has a product CTA
 *                                    ([data-buy-now] or [data-add-to-cart])
 *   InitiateCheckout / begin_checkout — called by buy-now.js and cart.js
 *                                    right before the redirect to Shopify
 *
 * Price and SKU come from js/shopify-variants.js for the customer's zone, so
 * value matches what Shopify will charge. Every call is a no-op if fbq/gtag
 * aren't on the page.
 */
(function () {
  "use strict";

  var SHIP_STATE_KEY = "ricci_ship_state";
  var STATE_ZONE = {
    PA:"A", OH:"A", WV:"A", NY:"A", NJ:"A", MD:"A", DE:"A", VA:"A", DC:"A",
    MA:"B", CT:"B", RI:"B", VT:"B", NH:"B", ME:"B", NC:"B", KY:"B",
    TN:"B", IN:"B", MI:"B", IL:"B", WI:"B",
    SC:"C", GA:"C", FL:"C", AL:"C", MS:"C", MO:"C", AR:"C", LA:"C", MN:"C", IA:"C",
    TX:"D", OK:"D", KS:"D", NE:"D", SD:"D", ND:"D", CO:"D", WY:"D", MT:"D", NM:"D",
    CA:"E", OR:"E", WA:"E", ID:"E", UT:"E", NV:"E", AZ:"E",
    AK:"X", HI:"X"
  };

  function basePrefix() {
    var link = document.querySelector('link[rel="stylesheet"][href$="css/styles.css"]');
    if (link) return link.getAttribute("href").replace(/css\/styles\.css$/, "");
    return "";
  }

  function currentZone() {
    var state;
    if (window.RicciShipping) {
      state = window.RicciShipping.getState();
      return window.RicciShipping.getGroup(state);
    }
    try { state = localStorage.getItem(SHIP_STATE_KEY); } catch (e) {}
    return STATE_ZONE[state || "PA"] || "A";
  }

  var variantsLoading = false;
  var variantsQueue = [];
  function whenVariantsReady(fn) {
    if (window.RicciShopifyVariants) { fn(); return; }
    variantsQueue.push(fn);
    if (variantsLoading) return;
    variantsLoading = true;
    var drain = function () { variantsQueue.splice(0).forEach(function (f) { f(); }); };
    var existing = document.querySelector('script[src$="js/shopify-variants.js"]');
    if (existing) {
      existing.addEventListener("load", drain);
      existing.addEventListener("error", drain);
      return;
    }
    var s = document.createElement("script");
    s.src = basePrefix() + "js/shopify-variants.js";
    s.onload = drain;
    s.onerror = drain;
    document.head.appendChild(s);
  }

  /* One line of the eventual Shopify cart: { id, qty } → pixel-ready item. */
  function describe(id, qty) {
    var map = window.RicciShopifyVariants || {};
    var entry = map[id];
    var zone = currentZone();
    var v = entry && entry.zones && (entry.zones[zone] || entry.zones.A);
    return {
      id: id,
      sku: v ? v.sku : id,
      name: entry ? entry.title : id,
      price: v ? parseFloat(v.price) : 0,
      qty: qty || 1
    };
  }

  function total(items) {
    return items.reduce(function (s, it) { return s + it.price * it.qty; }, 0);
  }

  function fb(name, params) {
    if (typeof window.fbq === "function") window.fbq("track", name, params);
  }
  function ga(name, params) {
    if (typeof window.gtag === "function") window.gtag("event", name, params);
  }

  function send(fbName, gaName, items) {
    var value = Math.round(total(items) * 100) / 100;
    fb(fbName, {
      content_type: "product",
      content_ids: items.map(function (it) { return it.sku; }),
      contents: items.map(function (it) { return { id: it.sku, quantity: it.qty, item_price: it.price }; }),
      num_items: items.reduce(function (s, it) { return s + it.qty; }, 0),
      value: value,
      currency: "USD"
    });
    ga(gaName, {
      currency: "USD",
      value: value,
      items: items.map(function (it) {
        return { item_id: it.sku, item_name: it.name, price: it.price, quantity: it.qty };
      })
    });
  }

  var viewed = false;
  function viewContent(id) {
    if (viewed || !id) return;
    viewed = true;
    whenVariantsReady(function () { send("ViewContent", "view_item", [describe(id, 1)]); });
  }

  /* lines: [{ id, qty }] — fires synchronously if variants are loaded, which
     they are by the time buy-now.js / cart.js have a checkout URL. */
  function initiateCheckout(lines) {
    if (!lines || !lines.length) return;
    var items = lines.map(function (l) { return describe(l.id, l.qty); });
    send("InitiateCheckout", "begin_checkout", items);
  }

  window.RicciPixel = { viewContent: viewContent, initiateCheckout: initiateCheckout };

  function auto() {
    var cta = document.querySelector("[data-buy-now][data-id], [data-add-to-cart][data-id]");
    if (cta) viewContent(cta.getAttribute("data-id"));
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", auto);
  } else {
    auto();
  }
})();
