/*
 * Ricci's buy-now — single-item, straight to Shopify checkout.
 *
 * Mark a link with [data-buy-now] and data-id (bundle slug). On click it
 * resolves the customer's shipping state to a zone (A–E), looks up that
 * zone's variant in js/shopify-variants.js, and sends them to the cart
 * permalink — which 302s straight to checkout. No localStorage cart, no
 * cart popup. For pages that sell exactly one thing.
 *
 * Coexists with cart.js: this handler owns [data-buy-now], cart.js owns
 * [data-add-to-cart] and the nav cart. Don't put both on one button.
 *
 * AK and HI are zone X — no cold-ship, no variant. Those get told to call
 * rather than sent to a checkout priced for somewhere else.
 */
(function () {
  "use strict";

  var SHOP_URL = "https://shop.riccisausage.com";
  var SHIP_STATE_KEY = "ricci_ship_state";
  var PHONE = "412-331-9531";

  /* Mirror of shipping.js GROUP — only used if shipping.js isn't on the page. */
  var STATE_ZONE = {
    PA:"A", OH:"A", WV:"A", NY:"A", NJ:"A", MD:"A", DE:"A", VA:"A", DC:"A",
    MA:"B", CT:"B", RI:"B", VT:"B", NH:"B", ME:"B", NC:"B", KY:"B",
    TN:"B", IN:"B", MI:"B", IL:"B", WI:"B",
    SC:"C", GA:"C", FL:"C", AL:"C", MS:"C", MO:"C", AR:"C", LA:"C", MN:"C", IA:"C",
    TX:"D", OK:"D", KS:"D", NE:"D", SD:"D", ND:"D", CO:"D", WY:"D", MT:"D", NM:"D",
    CA:"E", OR:"E", WA:"E", ID:"E", UT:"E", NV:"E", AZ:"E",
    AK:"X", HI:"X"
  };

  var variantsLoading = false;
  var variantsQueue = [];

  function basePrefix() {
    var link = document.querySelector('link[rel="stylesheet"][href$="css/styles.css"]');
    if (link) return link.getAttribute("href").replace(/css\/styles\.css$/, "");
    return "";
  }

  /* cart.js may already have this in flight — reuse its <script> if so. */
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

  function currentZone() {
    var state;
    if (window.RicciShipping) {
      state = window.RicciShipping.getState();
      if (!window.RicciShipping.canShip(state)) return null;
      return window.RicciShipping.getGroup(state);
    }
    try { state = localStorage.getItem(SHIP_STATE_KEY); } catch (e) {}
    state = state || "PA";
    var zone = STATE_ZONE[state];
    if (zone === "X") return null;
    return zone || "A";
  }

  function variantNumericId(gid) {
    if (!gid) return null;
    var m = String(gid).match(/(\d+)$/);
    return m ? m[1] : null;
  }

  function checkoutUrl(id) {
    var map = window.RicciShopifyVariants;
    if (!map) return null;
    var zone = currentZone();
    if (!zone) return null;
    var entry = map[id];
    if (!entry || !entry.zones || !entry.zones[zone]) return null;
    var vid = variantNumericId(entry.zones[zone].variantId);
    return vid ? SHOP_URL + "/cart/" + vid + ":1" : null;
  }

  function buy(btn) {
    var id = btn.getAttribute("data-id");
    if (!id) return;

    /* Zone X is a hard stop — say so before the wait for variants. */
    if (currentZone() === null) {
      window.alert(
        "We can't cold-ship to that state yet. Call the shop at " + PHONE +
        " and we'll sort it out."
      );
      return;
    }

    var label = btn.textContent;
    btn.textContent = "Taking you to checkout…";
    btn.setAttribute("aria-busy", "true");

    whenVariantsReady(function () {
      var url = checkoutUrl(id);
      if (url) {
        if (window.RicciPixel) window.RicciPixel.initiateCheckout([{ id: id, qty: 1 }]);
        window.location.href = url;
        return;
      }
      btn.textContent = label;
      btn.removeAttribute("aria-busy");
      window.alert(
        "Checkout isn't available right now. Call the shop at " + PHONE +
        " and we'll take the order over the phone."
      );
    });
  }

  function wire() {
    document.querySelectorAll("[data-buy-now]").forEach(function (btn) {
      if (btn.__buyNowBound) return;
      btn.__buyNowBound = true;
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        buy(btn);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }

  window.RicciBuyNow = { url: checkoutUrl };
})();
