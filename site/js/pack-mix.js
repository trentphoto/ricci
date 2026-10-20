/*
 * Italian Pack mix picker — Hot & Sweet / All Hot / All Sweet.
 *
 * Adds a .heat-switch--three (styles.css, shared with the Grill Box) under
 * every sausage manifest in <main> (.pdp-manifest / .px-manifest). All
 * switches share one choice. The manifest rows and every sweet/hot coil photo
 * (gallery figure or thumb, contents card) follow it: the missing blend hides,
 * the other doubles to 10 lb. buy-now.js asks
 * RicciPackMix.get() which Shopify variant table to use
 * (shopify-variants.js → mixes.<key>, built by tools/sync-shopify-bundles.mjs).
 * Same price for every mix.
 */
(function () {
  "use strict";

  var PRODUCT = "pittsburgh-italian-pack";
  var MIXES = [
    { key: "mixed", name: "Hot &amp; Sweet", sub: "5 lb &middot; 5 lb", slab: "" },
    { key: "hot", name: "All Hot", sub: "10 lb", slab: "is-mid" },
    { key: "sweet", name: "All Sweet", sub: "10 lb", slab: "is-right slab-sweet" }
  ];
  var mix = "mixed";
  var switches = [];
  var pieces = []; // { el, kind: "sweet"|"hot", html, attrs }
  var ATTRS = ["data-caption", "aria-label"];
  var swaps = []; // lone hot grill-pan shots that turn sweet for All Sweet: { el, attrs, html }
  var PHOTO_HOLDER = "figure, .includes-card, article, [data-gallery-thumb]";

  function row(list, re) {
    var items = list.querySelectorAll("li");
    for (var i = 0; i < items.length; i++) if (re.test(items[i].textContent)) return items[i];
    return null;
  }

  /* "5 lb" → "10 lb" in qty slots and captions; "a 5 lb box" → "two 5 lb boxes" in copy. */
  function doubled(text) {
    return text
      .replace(/>5 lb</g, ">10 lb<")
      .replace(/>5 lb in your box</g, ">10 lb in your box<")
      .replace(/(·|&middot;)(\s*)5 lb/g, "$1$210 lb")
      .replace(/\b([Aa]) 5 lb box of/g, function (_, a) { return (a === "A" ? "Two" : "two") + " 5 lb boxes of"; });
  }

  function add(el, kind) {
    if (!el || pieces.some(function (p) { return p.el === el; })) return;
    var attrs = {};
    ATTRS.forEach(function (a) { if (el.hasAttribute(a)) attrs[a] = el.getAttribute(a); });
    pieces.push({ el: el, kind: kind, html: el.innerHTML, attrs: attrs });
  }

  function toSweet(text) {
    return text.replace(/hot-grilled-sausages/g, "sweet-grilled-sausages").replace(/\bHot\b/g, "Sweet");
  }

  function render() {
    swaps.forEach(function (w) {
      Object.keys(w.attrs).forEach(function (a) {
        w.el.setAttribute(a, mix === "sweet" ? toSweet(w.attrs[a]) : w.attrs[a]);
      });
      if (w.html != null) w.el.innerHTML = mix === "sweet" ? toSweet(w.html) : w.html;
    });
    pieces.forEach(function (p) {
      var only = mix === p.kind;
      var off = mix !== "mixed" && !only;
      p.el.classList.toggle("pack-mix-off", off);
      p.el.innerHTML = only ? doubled(p.html) : p.html;
      Object.keys(p.attrs).forEach(function (a) {
        p.el.setAttribute(a, only ? doubled(p.attrs[a]) : p.attrs[a]);
      });
      /* A hidden gallery thumb can't stay the selected one. */
      if (off && p.el.getAttribute("aria-pressed") === "true") {
        var next = p.el.parentNode.querySelector("[data-gallery-thumb]:not(.pack-mix-off)");
        if (next) next.click();
      }
    });
    switches.forEach(function (sw) {
      sw.classList.remove("is-mid", "is-right", "slab-sweet");
      var m = MIXES.filter(function (x) { return x.key === mix; })[0];
      if (m.slab) m.slab.split(" ").forEach(function (c) { sw.classList.add(c); });
      var input = sw.querySelector('input[value="' + mix + '"]');
      if (input) input.checked = true;
    });
  }

  function build(n) {
    var wrap = document.createElement("div");
    wrap.className = "heat-pick pack-mix";
    wrap.innerHTML =
      '<span class="heat-pick-caption">Pick your ten pounds</span>' +
      '<div class="heat-switch heat-switch--three" role="radiogroup" aria-label="Sausage mix">' +
        '<span class="heat-switch-slab" aria-hidden="true"></span>' +
        MIXES.map(function (m) {
          return '<label class="heat-switch-opt">' +
            '<input type="radio" name="pack-mix-' + n + '" value="' + m.key + '"' + (m.key === mix ? " checked" : "") + ' />' +
            '<span class="heat-switch-face"><span class="heat-switch-name">' + m.name + '</span>' +
            '<span class="heat-switch-sub">' + m.sub + '</span></span></label>';
        }).join("") +
      '</div>';
    wrap.addEventListener("change", function (e) {
      if (!e.target.value) return;
      mix = e.target.value;
      render();
      document.dispatchEvent(new CustomEvent("ricci:pack-mix", { detail: { mix: mix } }));
    });
    switches.push(wrap.querySelector(".heat-switch"));
    return wrap;
  }

  function init() {
    document.querySelectorAll("main .pdp-manifest, main .px-manifest").forEach(function (list) {
      var sweet = row(list, /Sweet Italian sausage/i);
      var hot = row(list, /Hot Italian sausage/i);
      if (!sweet || !hot) return;
      add(sweet, "sweet");
      add(hot, "hot");
      list.parentNode.insertBefore(build(switches.length), list);
    });
    if (!switches.length) return;
    /* Grill-pan shots: a hot/sweet pair (grill-pan hero) hides like the coils;
       a lone hot one (table gallery + its thumb) swaps to the sweet shot. */
    document.querySelectorAll('main img[src*="hot-grilled-sausages"]').forEach(function (img) {
      if (img.closest(".labor-hero-figure--pair")) return;
      var thumb = img.closest("[data-gallery-thumb]");
      if (thumb) {
        var ta = {};
        ATTRS.forEach(function (a) { if (thumb.hasAttribute(a)) ta[a] = thumb.getAttribute(a); });
        swaps.push({ el: thumb, attrs: ta, html: thumb.innerHTML });
      } else {
        swaps.push({ el: img, attrs: { src: img.getAttribute("src") }, html: null });
      }
    });
    document.querySelectorAll('main img[src*="sweet-sausage-coil-raw"], main img[src*="hot-sausage-coil-raw"], ' +
      'main img[src*="sweet-sausage-closeup"], main img[src*="hot-sausage-closeup"], ' +
      'main .labor-hero-figure--pair img[src*="-grilled-sausages"]').forEach(function (img) {
      add(img.closest(PHOTO_HOLDER), /\/sweet-/.test(img.getAttribute("src")) ? "sweet" : "hot");
    });
    render();
  }

  window.RicciPackMix = {
    get: function (id) { return id === PRODUCT ? mix : null; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
