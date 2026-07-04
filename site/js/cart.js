/*
 * Ricci's cart — localStorage cart + nav dropdown.
 *
 * Mark any button or link with [data-add-to-cart] and data-id (product slug).
 * Price is read from the nearest .price-amount / .product-price-lg on click so
 * state-based shipping prices on products.html stay in sync.
 *
 * window.RicciCart.add(id, opts) / .remove(id) / .open() / .get()
 */
(function () {
  "use strict";

  var STORE_KEY = "ricci_cart";
  var SHOP_URL = "https://shop.riccisausage.com";

  /* Mirror of shipping.js GROUP — used for checkout when shipping.js isn't on the page */
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

  var CATALOG = {
    "pittsburgh-italian-pack": {
      name: "The Pittsburgh Italian Pack",
      base: 189,
      tier: "med",
      path: "shop/pittsburgh-italian-pack.html"
    },
    "ricci-legacy-gift-box": {
      name: "The Ricci Legacy Gift Box",
      base: 289,
      tier: "large",
      path: "shop/ricci-legacy-gift-box.html"
    }
  };

  var SHIP_STATE_KEY = "ricci_ship_state";

  var wrap, panel, cartTrigger;

  function basePrefix() {
    var link = document.querySelector('link[rel="stylesheet"][href$="css/styles.css"]');
    if (link) {
      return link.getAttribute("href").replace(/css\/styles\.css$/, "");
    }
    return "";
  }

  function parsePrice(text) {
    if (!text) return 0;
    var n = parseFloat(String(text).replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : n;
  }

  function fmt(n) {
    return "$" + n.toFixed(2).replace(/\.00$/, "");
  }

  function getCart() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(items) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(items)); } catch (e) {}
    renderPanel();
    updateNavCount();
  }

  function cartCount(items) {
    items = items || getCart();
    return items.reduce(function (sum, item) { return sum + (item.qty || 1); }, 0);
  }

  function cartTotal(items) {
    items = items || getCart();
    return items.reduce(function (sum, item) { return sum + item.price * (item.qty || 1); }, 0);
  }

  function pricedForState(id, state) {
    var product = CATALOG[id];
    if (!product) return null;
    if (window.RicciShipping) {
      return window.RicciShipping.priceFor(product.base, product.tier, state);
    }
    return product.base;
  }

  function shipContext() {
    if (window.RicciShipping) {
      var state = window.RicciShipping.getState();
      return {
        state: state,
        name: window.RicciShipping.stateName(state),
        canShip: window.RicciShipping.canShip(state)
      };
    }
    var state = null;
    try { state = localStorage.getItem(SHIP_STATE_KEY); } catch (e) {}
    state = state || "PA";
    var zone = STATE_ZONE[state];
    return {
      state: state,
      name: state,
      canShip: zone !== "X"
    };
  }

  function checkoutZone() {
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

  function buildCheckoutUrl() {
    var map = window.RicciShopifyVariants;
    if (!map) return null;
    var zone = checkoutZone();
    if (!zone) return null;
    var items = getCart();
    if (!items.length) return null;
    var lines = [];
    for (var i = 0; i < items.length; i++) {
      var entry = map[items[i].id];
      if (!entry || !entry.zones || !entry.zones[zone]) return null;
      var vid = variantNumericId(entry.zones[zone].variantId);
      if (!vid) return null;
      lines.push(vid + ":" + (items[i].qty || 1));
    }
    return lines.length ? SHOP_URL + "/cart/" + lines.join(",") : null;
  }

  function goCheckout() {
    whenVariantsReady(function () {
      var url = buildCheckoutUrl();
      if (url) {
        window.location.href = url;
        return;
      }
      window.alert(
        "Checkout isn't available right now. Pick your state on the Shop page, or call 412-331-9531 to order."
      );
    });
  }

  function whenVariantsReady(fn) {
    if (window.RicciShopifyVariants) {
      fn();
      return;
    }
    variantsQueue.push(fn);
    if (variantsLoading) return;
    variantsLoading = true;
    var s = document.createElement("script");
    s.src = basePrefix() + "js/shopify-variants.js";
    s.onload = function () {
      variantsQueue.splice(0).forEach(function (f) { f(); });
    };
    s.onerror = function () {
      variantsQueue.splice(0).forEach(function (f) { f(); });
    };
    document.head.appendChild(s);
  }

  function recalculateCartPrices(state) {
    if (!window.RicciShipping) return;
    state = state || window.RicciShipping.getState();
    var items = getCart();
    if (!items.length) {
      renderPanel();
      return;
    }
    items.forEach(function (item) {
      var p = pricedForState(item.id, state);
      if (p != null) item.price = p;
    });
    try { localStorage.setItem(STORE_KEY, JSON.stringify(items)); } catch (e) {}
    renderPanel();
    updateNavCount();
  }

  function priceFromContext(btn) {
    var scope = btn.closest(".product-card, .product-hero-body, .product-card-footer");
    if (scope) {
      var amount = scope.querySelector(".price-amount, .product-price-lg");
      if (amount) {
        var p = parsePrice(amount.textContent);
        if (p > 0) return p;
      }
      var priceBlock = scope.querySelector(".product-price");
      if (priceBlock) {
        var clone = priceBlock.cloneNode(true);
        var note = clone.querySelector(".ship-note");
        if (note) note.remove();
        var p2 = parsePrice(clone.textContent);
        if (p2 > 0) return p2;
      }
    }
    var id = btn.getAttribute("data-id");
    if (id && CATALOG[id]) {
      if (window.RicciShipping) {
        return pricedForState(id, window.RicciShipping.getState());
      }
      return CATALOG[id].base;
    }
    return parsePrice(btn.getAttribute("data-price"));
  }

  function productName(id, btn) {
    if (btn && btn.getAttribute("data-name")) return btn.getAttribute("data-name");
    if (CATALOG[id]) return CATALOG[id].name;
    var scope = btn && btn.closest(".product-card, .product-hero-body");
    if (scope) {
      var heading = scope.querySelector("h3, h1");
      if (heading) return heading.textContent.trim();
    }
    return id;
  }

  function productUrl(id) {
    var base = basePrefix();
    if (CATALOG[id]) return base + CATALOG[id].path;
    return base + "products.html";
  }

  function addItem(id, opts) {
    opts = opts || {};
    if (!id) return;
    var items = getCart();
    var existing = items.find(function (item) { return item.id === id; });
    var price = typeof opts.price === "number" ? opts.price : pricedForState(id, window.RicciShipping && window.RicciShipping.getState()) || (CATALOG[id] && CATALOG[id].base) || 0;
    if (existing) {
      existing.qty = (existing.qty || 1) + (opts.qty || 1);
      existing.price = price;
    } else {
      items.push({
        id: id,
        name: opts.name || (CATALOG[id] && CATALOG[id].name) || id,
        price: price,
        url: opts.url || productUrl(id),
        qty: opts.qty || 1
      });
    }
    saveCart(items);
  }

  function removeItem(id) {
    saveCart(getCart().filter(function (item) { return item.id !== id; }));
  }

  function updateNavCount() {
    if (!cartTrigger) return;
    var n = cartCount();
    cartTrigger.textContent = "Cart (" + n + ")";
  }

  function renderPanel() {
    if (!panel) return;
    var base = basePrefix();
    var items = getCart();

    if (!items.length) {
      panel.innerHTML =
        '<p class="cart-pop-empty">Your cart is empty.</p>' +
        '<p class="cart-pop-sub">Browse our boxes and bundles — shipped frozen nationwide.</p>' +
        '<a href="' + base + 'products.html" class="btn btn-primary cart-pop-btn">Shop Bundles</a>';
      return;
    }

    var html = '<ul class="cart-pop-items">';
    items.forEach(function (item) {
      html +=
        '<li class="cart-pop-item">' +
          '<div class="cart-pop-item-info">' +
            '<span class="cart-pop-item-name">' + escapeHtml(item.name) + '</span>' +
            (item.qty > 1 ? '<span class="cart-pop-item-qty">Qty ' + item.qty + '</span>' : '') +
          '</div>' +
          '<div class="cart-pop-item-actions">' +
            '<span class="cart-pop-item-price">' + fmt(item.price * (item.qty || 1)) + '</span>' +
            '<button type="button" class="cart-pop-remove" data-remove-id="' + escapeAttr(item.id) + '" aria-label="Remove ' + escapeAttr(item.name) + '">Remove</button>' +
          '</div>' +
        '</li>';
    });
    html += '</ul>';
    html += '<p class="cart-pop-total">Subtotal · ' + fmt(cartTotal(items)) + '</p>';

    var ship = shipContext();
    if (ship.state && ship.canShip) {
      html += '<p class="cart-pop-sub">Prices include free shipping to ' + escapeHtml(ship.name) + '.</p>';
      html += '<button type="button" class="btn btn-primary cart-pop-btn" data-checkout>Checkout</button>';
    } else if (ship.state && !ship.canShip) {
      html += '<p class="cart-pop-sub cart-pop-sub--warn">We can\'t cold-ship to ' + escapeHtml(ship.name) + ' yet. Change your state on the shop page or call 412-331-9531.</p>';
    } else {
      html += '<p class="cart-pop-sub">Shipping is included in bundle prices.</p>';
      html += '<button type="button" class="btn btn-primary cart-pop-btn" data-checkout>Checkout</button>';
    }

    html += '<a href="' + base + 'products.html" class="cart-pop-continue">Continue shopping</a>';
    panel.innerHTML = html;

    panel.querySelectorAll("[data-remove-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        removeItem(btn.getAttribute("data-remove-id"));
      });
    });

    var checkoutBtn = panel.querySelector("[data-checkout]");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", function () { goCheckout(); });
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function openCart() {
    if (!wrap) return;
    wrap.classList.add("is-open");
    cartTrigger.setAttribute("aria-expanded", "true");
    document.addEventListener("click", onDocClick, true);
    document.addEventListener("keydown", onKey);
  }

  function closeCart() {
    if (!wrap) return;
    wrap.classList.remove("is-open");
    cartTrigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", onDocClick, true);
    document.removeEventListener("keydown", onKey);
  }

  function toggleCart() {
    wrap.classList.contains("is-open") ? closeCart() : openCart();
  }

  function onDocClick(e) {
    if (!wrap.contains(e.target)) closeCart();
  }

  function onKey(e) {
    if (e.key === "Escape") {
      closeCart();
      cartTrigger.focus();
    }
  }

  function wireAddButtons() {
    document.querySelectorAll("[data-add-to-cart]").forEach(function (btn) {
      if (btn.__cartAddBound) return;
      btn.__cartAddBound = true;
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var id = btn.getAttribute("data-id");
        if (!id) return;
        addItem(id, {
          name: productName(id, btn),
          price: priceFromContext(btn),
          url: productUrl(id)
        });
        openCart();
        var prev = btn.textContent;
        btn.textContent = "Added!";
        btn.disabled = true;
        setTimeout(function () {
          btn.textContent = prev;
          btn.disabled = false;
        }, 1400);
      });
    });
  }

  function init() {
    cartTrigger = document.querySelector(".nav-cart");
    if (!cartTrigger || cartTrigger.__cartBound) return;
    cartTrigger.__cartBound = true;

    cartTrigger.setAttribute("role", "button");
    cartTrigger.setAttribute("tabindex", "0");
    cartTrigger.setAttribute("aria-haspopup", "true");
    cartTrigger.setAttribute("aria-expanded", "false");

    panel = document.createElement("div");
    panel.className = "cart-pop";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Shopping cart");

    wrap = document.createElement("div");
    wrap.className = "cart-wrap";
    cartTrigger.parentNode.insertBefore(wrap, cartTrigger);
    wrap.appendChild(cartTrigger);
    wrap.appendChild(panel);

    renderPanel();
    updateNavCount();
    whenVariantsReady(function () { /* variants ready for checkout */ });

    cartTrigger.addEventListener("click", function (e) {
      e.preventDefault();
      toggleCart();
    });
    cartTrigger.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleCart();
      }
    });

    wireAddButtons();

    document.addEventListener("ricci:ship-state", function (e) {
      if (e.detail && e.detail.state) recalculateCartPrices(e.detail.state);
    });

    window.addEventListener("storage", function (e) {
      if (e.key === STORE_KEY) {
        renderPanel();
        updateNavCount();
      }
      if (e.key === SHIP_STATE_KEY && window.RicciShipping) {
        recalculateCartPrices(e.newValue);
      }
    });

    if (window.RicciShipping) recalculateCartPrices();
  }

  window.RicciCart = {
    add: function (id, opts) { addItem(id, opts); },
    remove: removeItem,
    get: getCart,
    open: openCart,
    count: function () { return cartCount(); },
    recalculate: recalculateCartPrices
  };

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
