/*
 * Ricci's buy box — one-time vs. subscribe & save, plus the sauce add-on.
 *
 * Injected after each .product-price[data-base] (hero + closing CTA) on a page whose
 * [data-buy-now] buttons sell one bundle (the Italian Pack A/B versions and the
 * Legacy Gift Box load this). The product, base price and tier come from the page's
 * first [data-buy-now] button and .product-price[data-base]. All boxes share one choice, and buy-now.js asks RicciBuyOptions.lines()
 * for the cart lines, so every Buy button on the page follows it.
 *
 * Subscribe only appears once the product has a selling plan in Shopify (the
 * Subscriptions app). Plans and their discounts are read live from the
 * Storefront API, so adding or changing a plan in Shopify needs no deploy.
 * On a subscription the sauce renews too when it has its own plan in Shopify at
 * the same frequency (no $20 off — that would make it free); otherwise it's a
 * one-time line on the first box.
 */
(function () {
  "use strict";

  var PRODUCT = null;
  var BASE = 0;
  var TIER = "med";
  var DEFAULT_WEEKS = 6;
  var CHECK = '<svg class="bo-check" viewBox="0 0 16 16" width="14" height="14" aria-label="Added" role="img">' +
    '<path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ADDON = {
    id: "lils-tomato-sauce-quart", name: "Lil's Homemade Tomato Sauce (1 qt)", price: 19.99,
    img: "/assets/img/lils-tomato-sauce-quart.webp"
  };
  /* Quick-view card for the add-on: hover or focus on desktop, tap on touch. */
  var POP =
    '<span class="bo-pop" role="tooltip">' +
      '<img src="' + ADDON.img + '" width="240" height="160" alt="A quart tub of Lil\'s homemade tomato sauce" loading="lazy">' +
      '<span class="bo-pop-title">Lil\'s Homemade Tomato Sauce &middot; 1 qt (32 oz)</span>' +
      '<span class="bo-pop-text">The San Marzano sauce we ladle on every meatball and sausage sandwich at the shop. Made in-house, frozen in a quart tub.</span>' +
      '<span class="bo-pop-label">How it tastes best</span>' +
      '<span class="bo-pop-list">Simmer the meatballs from your box right in it, low and slow, until they\'re cooked through. Spoon it over sausage, peppers and onions, or toss it with a pound of pasta.</span>' +
    '</span>';

  var PLANS_QUERY =
    "query($handle: String!) { product(handle: $handle) { sellingPlanGroups(first: 5) { nodes {" +
    " sellingPlans(first: 10) { nodes { id name recurringDeliveries" +
    " priceAdjustments { adjustmentValue {" +
    " __typename" +
    " ... on SellingPlanPercentagePriceAdjustment { adjustmentPercentage }" +
    " ... on SellingPlanFixedAmountPriceAdjustment { adjustmentAmount { amount } }" +
    " ... on SellingPlanFixedPriceAdjustment { price { amount } } } } } } } } } }";

  var state = { mode: "once", planId: null, sauce: false };
  var plans = [];
  var saucePlans = []; // the sauce's own plans (no $20 off); matched to the box's frequency
  var boxes = [];

  function fmt(n) {
    return "$" + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "");
  }

  function zonePrice() {
    if (!window.RicciShipping) return BASE;
    return window.RicciShipping.priceFor(BASE, TIER, window.RicciShipping.getState());
  }

  function subPrice(plan, price) {
    var adj = plan && plan.priceAdjustments[0] && plan.priceAdjustments[0].adjustmentValue;
    if (!adj) return price;
    if (adj.adjustmentPercentage != null) return price * (1 - adj.adjustmentPercentage / 100);
    if (adj.adjustmentAmount) return price - parseFloat(adj.adjustmentAmount.amount);
    if (adj.price) return parseFloat(adj.price.amount);
    return price;
  }

  function selectedPlan() {
    for (var i = 0; i < plans.length; i++) if (plans[i].id === state.planId) return plans[i];
    return plans[0] || null;
  }

  function render() {
    boxes.forEach(renderBox);
    renderBars();
  }

  /* Sticky buy bars follow the choice: total for what's selected, plus a short
     note. One-time with no sauce restores shipping.js's own note. */
  function renderBars() {
    var price = zonePrice();
    var plan = state.mode === "sub" ? selectedPlan() : null;
    var box = plan ? subPrice(plan, price) : price;
    var total = box + (state.sauce ? ADDON.price : 0);
    var parts = [];
    if (plan) parts.push(plan.label + (price - box > 0 ? " · Save " + fmt(price - box) : ""));
    if (state.sauce) parts.push("Incl. sauce");
    document.querySelectorAll(".pdp-buybar.product-price, .px-buybar .product-price").forEach(function (bar) {
      var amount = bar.querySelector(".price-amount");
      var note = bar.querySelector(".ship-note");
      if (amount) amount.textContent = fmt(total);
      if (!note) return;
      // Anything we didn't write is shipping.js's current note — keep it to restore.
      if (note.textContent !== bar.getAttribute("data-bo-note")) bar.setAttribute("data-bo-orig", note.textContent);
      var text = parts.length ? parts.join(" · ") : bar.getAttribute("data-bo-orig") || note.textContent;
      note.textContent = text;
      bar.setAttribute("data-bo-note", text);
    });
  }

  function renderBox(box, n) {
    var price = zonePrice();
    var plan = selectedPlan();
    var sub = plan ? subPrice(plan, price) : price;
    var save = price - sub;

    var html =
      '<label class="bo-opt' + (state.mode === "once" ? " is-on" : "") + '">' +
        '<input type="radio" name="bo-mode-' + n + '" value="once"' + (state.mode === "once" ? " checked" : "") + '>' +
        '<span class="bo-opt-title">One-time order</span>' +
        '<span class="bo-opt-price">' + fmt(price) + '</span>' +
      '</label>';

    if (plans.length) {
      html +=
        '<label class="bo-opt' + (state.mode === "sub" ? " is-on" : "") + '">' +
          '<input type="radio" name="bo-mode-' + n + '" value="sub"' + (state.mode === "sub" ? " checked" : "") + '>' +
          '<span class="bo-opt-title">Subscribe &amp; save</span>' +
          '<span class="bo-opt-price">' +
            (save > 0 ? '<span class="bo-save">Save ' + fmt(save) + '</span> ' : '') +
            fmt(sub) + (save > 0 ? ' <s>' + fmt(price) + '</s>' : '') +
          '</span>' +
          '<span class="bo-opt-body">' +
            '<span class="bo-opt-sub">' + (save > 0 ? 'Save ' + fmt(save) + ' on every box. ' : '') + 'Skip or cancel anytime.</span>' +
            '<select class="bo-freq" aria-label="Delivery frequency">' +
              plans.map(function (p) {
                return '<option value="' + p.id + '"' + (plan && p.id === plan.id ? " selected" : "") + '>' + p.label + '</option>';
              }).join("") +
            '</select>' +
          '</span>' +
        '</label>';
    }

    html +=
      '<label class="bo-addon' + (state.sauce ? " is-on" : "") + '">' +
        '<input type="checkbox" class="bo-sauce"' + (state.sauce ? " checked" : "") + '>' +
        '<button type="button" class="bo-peek bo-peek-img" aria-expanded="false" aria-label="About Lil\'s homemade tomato sauce">' +
          '<img class="bo-addon-img" src="' + ADDON.img + '" width="56" height="56" alt="" loading="lazy">' +
        '</button>' +
        '<span>Add a quart of <button type="button" class="bo-peek bo-peek-name" aria-expanded="false">Lil\'s homemade tomato sauce</button> &middot; +' + fmt(ADDON.price) +
        POP +
        '<span class="bo-addon-sub">' + (state.sauce ? CHECK : "") + 'Ships frozen in the same box' + (state.mode === "sub" ? (sauceAutoRenews() ? " &middot; every delivery" : " &middot; this order only") : "") + '</span></span>' +
      '</label>';

    box.innerHTML = html;
  }

  function onChange(e) {
    var t = e.target;
    var box = e.currentTarget;
    if (/^bo-mode/.test(t.name)) state.mode = t.value;
    else if (t.classList.contains("bo-freq")) { state.planId = t.value; state.mode = "sub"; }
    else if (t.classList.contains("bo-sauce")) state.sauce = t.checked;
    render();
    var focus = box.querySelector(t.classList.contains("bo-freq") ? ".bo-freq" : t.name ? 'input[value="' + t.value + '"]' : ".bo-sauce");
    if (focus) focus.focus();
  }

  function setPeek(box, open) {
    var addon = box.querySelector(".bo-addon");
    if (!addon) return;
    addon.classList.toggle("is-peek", open);
    addon.querySelectorAll(".bo-peek").forEach(function (b) { b.setAttribute("aria-expanded", String(open)); });
  }

  /* Delegated, since render() rebuilds the box. Buttons inside the <label>
     don't toggle the checkbox, so peeking never adds the sauce by accident. */
  function wirePeek(box) {
    box.addEventListener("mouseover", function (e) { if (e.target.closest(".bo-peek, .bo-pop")) setPeek(box, true); });
    box.addEventListener("mouseout", function (e) {
      if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(".bo-peek, .bo-pop")) setPeek(box, false);
    });
    box.addEventListener("focusin", function (e) { if (e.target.closest(".bo-peek")) setPeek(box, true); });
    box.addEventListener("focusout", function (e) { if (e.target.closest(".bo-peek")) setPeek(box, false); });
    box.addEventListener("click", function (e) {
      if (!e.target.closest(".bo-peek")) return;
      e.preventDefault();
      var addon = box.querySelector(".bo-addon");
      setPeek(box, !(addon && addon.classList.contains("is-peek")));
    });
    box.addEventListener("keydown", function (e) { if (e.key === "Escape") setPeek(box, false); });
  }

  function loadPlans() {
    if (!window.RicciShopifyCart || !window.RicciShopifyCart.query) {
      // shopify-cart.js is injected by buy-now.js; try again once it's in.
      setTimeout(loadPlans, 300);
      return;
    }
    var q = window.RicciShopifyCart.query;
    Promise.all([
      q(PLANS_QUERY, { handle: PRODUCT }).then(parsePlans),
      q(PLANS_QUERY, { handle: ADDON.id }).then(parsePlans).catch(function () { return []; })
    ]).then(function (res) {
      plans = res[0];
      saucePlans = res[1];
      var preferred = plans.filter(function (p) { return p.weeks === DEFAULT_WEEKS; })[0];
      if (!state.planId && preferred) state.planId = preferred.id;
      if (plans.length) render();
    }).catch(function () { /* one-time only */ });
  }

  /* Shopify names read "Deliver every 6 weeks, $20.00 off" — show "Every 6 weeks", shortest first. */
  function parsePlans(json) {
    var groups = (json && json.data && json.data.product && json.data.product.sellingPlanGroups.nodes) || [];
    var out = [];
    groups.forEach(function (g) {
      g.sellingPlans.nodes.forEach(function (p) { if (p.recurringDeliveries) out.push(p); });
    });
    out.forEach(function (p) {
      var m = p.name.match(/every\s+(\d+)\s+(\w+)/i);
      p.weeks = m ? parseInt(m[1], 10) * (/month/i.test(m[2]) ? 4 : 1) : 99;
      p.label = m ? "Every " + m[1] + " " + m[2] : p.name;
    });
    return out.sort(function (a, b) { return a.weeks - b.weeks; });
  }

  /* The sauce plan on the same schedule as the selected box plan, if one exists. */
  function sauceAutoRenews() {
    if (state.mode !== "sub") return null;
    var plan = selectedPlan();
    if (!plan) return null;
    return saucePlans.filter(function (p) { return p.weeks === plan.weeks; })[0] || null;
  }

  /* For buy-now.js: the cart lines for this product, given the choices above. */
  function lines(id, variantId, zone) {
    if (id !== PRODUCT || !boxes.length) return null;
    var out = [{ variantId: variantId, qty: 1 }];
    if (state.mode === "sub" && selectedPlan()) out[0].sellingPlanId = selectedPlan().id;
    if (state.sauce) {
      var map = window.RicciShopifyVariants;
      var entry = map && map[ADDON.id];
      var v = entry && entry.zones && entry.zones[zone];
      if (v) {
        var sp = sauceAutoRenews();
        out.push(sp ? { variantId: v.variantId, qty: 1, sellingPlanId: sp.id } : { variantId: v.variantId, qty: 1 });
      }
    }
    return out;
  }

  function init() {
    var btn = document.querySelector("main [data-buy-now][data-id]");
    var priceEl0 = document.querySelector("main .product-price[data-base]");
    if (!btn || !priceEl0) return;
    PRODUCT = btn.getAttribute("data-id");
    BASE = parseFloat(priceEl0.getAttribute("data-base"));
    TIER = priceEl0.getAttribute("data-tier") || TIER;
    // Every zone-priced block in the page content (hero + closing CTAs). The sticky
    // buy bars (.pdp-buybar, .px-buybar) sit outside <main> and stay a plain button.
    document.querySelectorAll("main .product-price[data-base]").forEach(function (priceEl) {
      if (priceEl.closest(".pdp-buybar, .px-buybar")) return;
      var box = document.createElement("div");
      box.className = "buy-options";
      box.setAttribute("role", "group");
      box.setAttribute("aria-label", "Purchase options");
      priceEl.parentNode.insertBefore(box, priceEl.nextSibling);
      box.addEventListener("change", onChange);
      wirePeek(box);
      boxes.push(box);
    });
    if (!boxes.length) return;
    document.addEventListener("ricci:ship-state", render);
    render();
    loadPlans();
  }

  window.RicciBuyOptions = {
    lines: lines,
    get: function () { return { mode: state.mode, planId: state.mode === "sub" ? (selectedPlan() || {}).id : null, sauce: state.sauce }; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
