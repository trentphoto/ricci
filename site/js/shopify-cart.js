/*
 * Ricci's Shopify cart — Storefront Cart API handoff to checkout.
 *
 * cart.js and buy-now.js load this on every page. On load it remembers the
 * visit's UTM params, landing page, and (after any CRM form) the email. At
 * checkout, RicciShopifyCart.checkout(lines, fallbackUrl) creates a Shopify
 * cart carrying those as cart attributes (→ order note_attributes in the
 * orders/paid webhook) and prefills the email, then sends the browser to the
 * cart's checkoutUrl. Any API failure falls back to the old /cart permalink so
 * checkout never breaks.
 *
 * The Storefront token is a PUBLIC token — safe in browser JS by design.
 */
(function () {
  "use strict";
  if (window.RicciShopifyCart) return;

  var ENDPOINT = "https://shop.riccisausage.com/api/2025-10/graphql.json";
  var TOKEN = "8ae60a95d158a8c1a05d1a79ba9b6ead";
  var ATTR_KEY = "ricci_cart_attrs";
  var EMAIL_KEY = "ricci_email";
  var UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; }
  }

  function write(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {}
  }

  /* Last-touch: a new visit with UTMs replaces the stored set. */
  function captureVisit() {
    var q = new URLSearchParams(location.search);
    var attrs = read(ATTR_KEY) || {};
    var found = UTM.filter(function (k) { return q.get(k); });
    if (found.length) {
      UTM.forEach(function (k) { delete attrs[k]; });
      found.forEach(function (k) { attrs[k] = q.get(k).slice(0, 200); });
      attrs.landing_page = location.pathname;
    } else if (!attrs.landing_page) {
      attrs.landing_page = location.pathname;
    }
    if (!attrs.referrer && document.referrer && document.referrer.indexOf(location.host) === -1) {
      attrs.referrer = document.referrer.slice(0, 200);
    }
    write(ATTR_KEY, attrs);
  }

  function attributes() {
    var attrs = read(ATTR_KEY) || {};
    var exp = window.RicciItalianPackExperiment;
    if (exp && exp.active) {
      attrs.experiment = exp.experiment;
      attrs.experiment_variant = exp.variant;
    }
    return Object.keys(attrs).map(function (k) { return { key: k, value: String(attrs[k]) }; });
  }

  var CART_CREATE =
    "mutation($input: CartInput!) { cartCreate(input: $input) {" +
    " cart { checkoutUrl } userErrors { field message } } }";

  function createCart(lines) {
    var input = {
      lines: lines.map(function (l) { return { merchandiseId: l.variantId, quantity: l.qty || 1 }; }),
      attributes: attributes()
    };
    var email = read(EMAIL_KEY);
    if (email) input.buyerIdentity = { email: email };

    return fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": TOKEN
      },
      body: JSON.stringify({ query: CART_CREATE, variables: { input: input } })
    })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        var res = json && json.data && json.data.cartCreate;
        if (!res || !res.cart || (res.userErrors && res.userErrors.length)) {
          throw new Error(JSON.stringify((res && res.userErrors) || json.errors || json));
        }
        return res.cart.checkoutUrl;
      });
  }

  /* lines: [{ variantId: "gid://shopify/ProductVariant/…", qty }] */
  function checkout(lines, fallbackUrl) {
    var timer = new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error("timeout")); }, 6000);
    });
    return Promise.race([createCart(lines), timer])
      .catch(function (err) {
        if (window.console) console.warn("[shopify-cart] falling back to permalink:", err);
        return fallbackUrl;
      })
      .then(function (url) {
        if (url) window.location.href = url;
        return url;
      });
  }

  captureVisit();

  document.addEventListener("ricci:crm-success", function (e) {
    var email = e.detail && e.detail.data && e.detail.data.email;
    if (email) write(EMAIL_KEY, email);
  });

  window.RicciShopifyCart = { checkout: checkout };
})();
