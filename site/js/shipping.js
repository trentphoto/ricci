/*
 * Ricci's — state-based shipping, shown as its own line.
 *
 * Every box is one price everywhere (data-base). Shipping is a separate,
 * flat add-on by the customer's state, shown right under the price before
 * checkout: "Free shipping to Ohio" / "+ $30 shipping to Texas".
 *
 *  - .product-price[data-base][data-tier] blocks: price stays data-base;
 *    the .ship-note line is rewritten for the chosen state.
 *  - tier = box shipping-weight bucket (small | med | large).
 *  - AK ships UPS 2nd Day Air to metro ZIPs only (inline ZIP check).
 *    HI / PR stay closed.
 *
 * Numbers mirror the PRD (ricci repo: business/operations/sales/ecom/
 * shipping-pricing-prd.md §4a). Shopify shipping rates must match these.
 */
(function () {
  "use strict";

  /* State -> shipping zone. */
  var GROUP = {
    // A — Nearby (free)
    PA:"A", OH:"A", WV:"A", NY:"A", NJ:"A", MD:"A", DE:"A", VA:"A", DC:"A",
    // B — Mid
    MA:"B", CT:"B", RI:"B", VT:"B", NH:"B", ME:"B", NC:"B", KY:"B",
    TN:"B", IN:"B", MI:"B", IL:"B", WI:"B",
    // C — Southeast / Plains
    SC:"C", GA:"C", FL:"C", AL:"C", MS:"C", MO:"C", AR:"C", LA:"C", MN:"C", IA:"C",
    // D — South Central / Mountain
    TX:"D", OK:"D", KS:"D", NE:"D", ND:"D", SD:"D", CO:"D", WY:"D", MT:"D", NM:"D",
    // E — West Coast
    CA:"E", OR:"E", WA:"E", ID:"E", UT:"E", NV:"E", AZ:"E",
    // Alaska metro — UPS 2nd Day Air
    AK:"AK",
    // No ship — cold chain not viable
    HI:"X", PR:"X"
  };

  /* Shipping add-on ($) per box, by zone and tier. null = can't ship that tier
     there (sauce-only orders don't go to AK). AK is PROPOSED pending a real
     Pirate Ship quote to 99501 / 99701. */
  var SHIP = {
    A:  { small: 0,    med: 0,   large: 0   },
    B:  { small: 0,    med: 20,  large: 30  },
    C:  { small: 0,    med: 50,  large: 60  },
    D:  { small: 0,    med: 60,  large: 70  },
    E:  { small: 0,    med: 80,  large: 90  },
    AK: { small: null, med: 139, large: 179 }
  };

  /* AK ZIPs UPS 2nd Day Air treats as metro (zone 224): Anchorage / Eagle
     River / JBER (995xx), Mat-Su + Kenai road system, Fairbanks, Juneau.
     Bush / rural AK is closed. VERIFY against the UPS zone chart before
     opening AK. */
  var AK_METRO_ZIPS = ["99611", "99615", "99623", "99645", "99652", "99654",
    "99664", "99669", "99672", "99674", "99687", "99688"];

  function akZipOk(zip) {
    zip = String(zip || "").trim().slice(0, 5);
    if (!/^\d{5}$/.test(zip)) return false;
    var n = +zip;
    if (n >= 99501 && n <= 99599) return true;   // Anchorage area
    if (n >= 99701 && n <= 99716) return true;   // Fairbanks / North Pole
    if (n >= 99801 && n <= 99812) return true;   // Juneau
    return AK_METRO_ZIPS.indexOf(zip) !== -1;    // Mat-Su, Kenai, Kodiak
  }

  var STATE_NAMES = {
    AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
    CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"Washington DC",FL:"Florida",
    GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",
    KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",
    MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",
    MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
    NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",
    OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
    SD:"South Dakota",PR:"Puerto Rico",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",
    WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"
  };

  var STORE_KEY = "ricci_ship_state";
  var ZIP_KEY = "ricci_ship_zip";
  var DEFAULT_STATE = "PA";

  function fmt(n) {
    // whole-dollar bases stay clean; otherwise keep the .95 style
    return "$" + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "");
  }

  /* Add-on for one box: a number, or null when that box can't ship there. */
  function addOn(tier, group) {
    if (!group || group === "X" || !SHIP[group]) return null;
    var v = SHIP[group][tier || "med"];
    return v === undefined ? 0 : v;
  }

  function getZip() {
    try { return localStorage.getItem(ZIP_KEY) || ""; } catch (e) { return ""; }
  }

  /* AK needs a metro ZIP before anything can be bought. */
  function canShip(state) {
    var g = GROUP[state];
    if (!g || g === "X") return false;
    if (g === "AK") return akZipOk(getZip());
    return true;
  }

  function noteFor(state, tier) {
    var group = GROUP[state];
    var name = STATE_NAMES[state] || state;
    if (group === "X") return "We can't ship frozen to " + name + " yet";
    var add = addOn(tier, group);
    if (add === null) return "Ships to Alaska only with a box";
    if (group === "AK") {
      var zip = getZip();
      if (!zip) return "+ " + fmt(add) + " UPS 2nd Day Air to Alaska · Enter your ZIP";
      if (!akZipOk(zip)) return "We can't reach ZIP " + zip + " yet (Alaska metro only)";
      return "+ " + fmt(add) + " UPS 2nd Day Air to Alaska";
    }
    if (add === 0) return "Free shipping to " + name;
    return "+ " + fmt(add) + " shipping to " + name;
  }

  function render(state) {
    var group = GROUP[state];
    var name = STATE_NAMES[state] || state;

    document.querySelectorAll(".product-price[data-tier]").forEach(function (el) {
      var base = parseFloat(el.getAttribute("data-base"));
      var tier = el.getAttribute("data-tier");
      var amountEl = el.querySelector(".price-amount");
      var noteEl = el.querySelector(".ship-note");
      if (isNaN(base) || !amountEl) return;
      amountEl.textContent = fmt(base);
      el.classList.toggle("is-noship", !canShip(state) || addOn(tier, group) === null);
      if (noteEl) noteEl.textContent = noteFor(state, tier);
    });

    renderBreakdowns(state);

    var sel = document.getElementById("ship-state");
    if (sel && sel.value !== state) sel.value = state;
    var lbl = document.getElementById("ship-state-name");
    if (lbl) lbl.textContent = name;
    renderZip(state);

    document.dispatchEvent(new CustomEvent("ricci:ship-state", {
      detail: { state: state, group: group, canShip: canShip(state), name: name }
    }));
  }

  /* Line-by-line total under each main product price (not cards / sticky bars):
     box, any add-ons (buy-options.js), shipping, total. */
  function renderBreakdowns(state) {
    state = state || getState();
    var group = GROUP[state];
    var name = STATE_NAMES[state] || state;
    document.querySelectorAll("main .product-price[data-tier]").forEach(function (el) {
      if (el.closest(".product-card, .pdp-buybar, .px-buybar")) return;
      var base = parseFloat(el.getAttribute("data-base"));
      if (isNaN(base)) return;
      var bd = el.__breakdown;
      if (!bd) {
        bd = document.createElement("dl");
        bd.className = "price-breakdown";
        bd.setAttribute("aria-live", "polite");
        el.__breakdown = bd;
      }
      var after = el.nextElementSibling && el.nextElementSibling.classList.contains("buy-options") ? el.nextElementSibling : el;
      if (after.nextElementSibling !== bd) after.parentNode.insertBefore(bd, after.nextSibling);

      var bo = window.RicciBuyOptions && window.RicciBuyOptions.summary && window.RicciBuyOptions.summary();
      var lines = bo ? bo.lines : [{ label: "Box", amount: base }];
      var sub = lines.reduce(function (t, l) { return t + l.amount; }, 0);
      var add = canShip(state) ? addOn(el.getAttribute("data-tier"), group) : null;
      var shipLabel = group === "AK" ? "UPS 2nd Day Air to Alaska" : "Shipping to " + name;
      var html = lines.map(function (l) {
        return "<div><dt>" + l.label + "</dt><dd>" + fmt(l.amount) + "</dd></div>";
      }).join("");
      if (add === null) {
        html += '<div class="pb-ship"><dt>' + shipLabel + '</dt><dd>' +
          (group === "AK" ? (getZip() ? "Not available" : "Enter ZIP") : "Not available") + "</dd></div>";
      } else {
        html += '<div class="pb-ship"><dt>' + shipLabel + "</dt><dd>" + (add === 0 ? "Free" : fmt(add)) + "</dd></div>" +
          '<div class="pb-total"><dt>Total</dt><dd>' + fmt(sub + add) + "</dd></div>";
      }
      bd.innerHTML = html;
    });
  }

  /* Inline ZIP field under the state picker, only when AK is chosen. */
  function renderZip(state) {
    var inner = document.querySelector(".ship-selector-inner");
    if (!inner) return;
    var box = document.getElementById("ship-zip-box");
    if (GROUP[state] !== "AK") { if (box) box.hidden = true; return; }
    if (!box) {
      box = document.createElement("div");
      box.id = "ship-zip-box";
      box.className = "ship-zip";
      box.innerHTML =
        '<label for="ship-zip">Alaska ZIP</label>' +
        '<input id="ship-zip" inputmode="numeric" maxlength="5" autocomplete="postal-code" placeholder="99501">' +
        '<p class="ship-zip-msg" aria-live="polite"></p>';
      inner.appendChild(box);
      var input = box.querySelector("input");
      input.addEventListener("input", function () {
        var v = input.value.replace(/\D/g, "").slice(0, 5);
        input.value = v;
        if (v.length === 5 || v.length === 0) {
          try { localStorage.setItem(ZIP_KEY, v); } catch (e) {}
          render(getState());
        }
      });
    }
    box.hidden = false;
    var zip = getZip();
    var input2 = box.querySelector("input");
    if (document.activeElement !== input2) input2.value = zip;
    var msg = box.querySelector(".ship-zip-msg");
    msg.textContent = !zip
      ? "We ship UPS 2nd Day Air to Anchorage, Fairbanks, Juneau, Mat-Su and Kenai ZIPs."
      : akZipOk(zip)
        ? "We can ship there. Alaska boxes go out Mondays by UPS 2nd Day Air."
        : "Sorry, we can't reach that ZIP yet. Call 412-331-9531 and we'll talk options.";
    box.classList.toggle("is-bad", !!zip && !akZipOk(zip));
  }

  function getState() {
    var start = saved();
    return start && GROUP[start] ? start : DEFAULT_STATE;
  }

  /* Shipping for a list of {tier, qty}: number, or null if any box can't go. */
  function shippingFor(items, state) {
    state = state || getState();
    if (!canShip(state)) return null;
    var group = GROUP[state], total = 0;
    for (var i = 0; i < items.length; i++) {
      var add = addOn(items[i].tier, group);
      if (add === null) return null;
      total += add * (items[i].qty || 1);
    }
    return total;
  }

  var ZONE_NAMES = { A: "Nearby", B: "Mid", C: "Southeast / Plains", D: "South Central / Mountain", E: "West Coast", AK: "Alaska metro · UPS 2nd Day Air" };

  /* "What shipping costs" link + modal under any #ship-state picker. */
  function zonesModal() {
    var inner = document.querySelector(".ship-selector-inner");
    if (!inner || document.getElementById("zones-dialog")) return;

    var tiers = {};
    document.querySelectorAll(".product-price[data-tier]").forEach(function (el) {
      tiers[el.getAttribute("data-tier")] = true;
    });
    var oneTier = Object.keys(tiers).length === 1 ? Object.keys(tiers)[0] : null;

    function cost(g) {
      if (oneTier) {
        var a = addOn(oneTier, g);
        return a === 0 ? "Free" : "+ " + fmt(a);
      }
      var m = addOn("med", g), l = addOn("large", g);
      if (!m && !l) return "Free";
      return "+ " + fmt(m) + (l !== m ? " (Legacy + " + fmt(l) + ")" : "");
    }

    var rows = Object.keys(ZONE_NAMES).map(function (g) {
      var states = g === "AK"
        ? "Anchorage, Fairbanks, Juneau, Mat-Su and Kenai ZIPs. Ships Mondays."
        : Object.keys(GROUP).filter(function (c) { return GROUP[c] === g; })
          .sort(function (a, b) { return STATE_NAMES[a].localeCompare(STATE_NAMES[b]); })
          .map(function (c) { return STATE_NAMES[c]; }).join(", ");
      return '<li data-zone="' + g + '"><div class="zones-head"><strong>' +
        (g === "AK" ? "" : "Zone " + g + " · ") + ZONE_NAMES[g] +
        '</strong><span class="zones-price">' + cost(g) + "</span></div><p>" + states + "</p></li>";
    }).join("");

    var dlg = document.createElement("dialog");
    dlg.id = "zones-dialog";
    dlg.className = "zones-dialog";
    dlg.setAttribute("aria-labelledby", "zones-title");
    dlg.innerHTML =
      '<button type="button" class="zones-close" aria-label="Close">&times;</button>' +
      '<h2 id="zones-title">What shipping costs</h2>' +
      '<p class="zones-intro">One price for the box everywhere. Shipping is a flat amount per box by state, shown before checkout.</p>' +
      '<ul class="zones-list">' + rows + "</ul>" +
      '<p class="zones-foot">We can’t ship frozen to Hawaii, Puerto Rico or rural Alaska yet.</p>';
    document.body.appendChild(dlg);

    var link = document.createElement("button");
    link.type = "button";
    link.className = "zones-link";
    link.textContent = "What shipping costs";
    inner.appendChild(link);

    link.addEventListener("click", function () {
      var mine = GROUP[getState()];
      dlg.querySelectorAll("li").forEach(function (li) {
        li.classList.toggle("is-current", li.getAttribute("data-zone") === mine);
      });
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    });
    dlg.querySelector(".zones-close").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  }

  window.RicciShipping = {
    getState: getState,
    getGroup: function (state) { return GROUP[state || getState()] || null; },
    canShip: canShip,
    /* Box price no longer varies by state; kept for older callers. */
    priceFor: function (base) { return base; },
    addOn: function (tier, state) { return addOn(tier, GROUP[state || getState()]); },
    shippingFor: shippingFor,
    refresh: function () { renderBreakdowns(getState()); },
    note: noteFor,
    zip: getZip,
    akZipOk: akZipOk,
    stateName: function (code) { return STATE_NAMES[code] || code; }
  };

  function save(state) {
    try { localStorage.setItem(STORE_KEY, state); } catch (e) {}
  }

  function saved() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }

  /* Best-effort IP geolocation — non-blocking, never gates the page. */
  function autoDetect(cb) {
    var done = false;
    var timer = setTimeout(function () { if (!done) { done = true; cb(null); } }, 2500);
    try {
      fetch("https://ipapi.co/json/")
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (done) return;
          done = true; clearTimeout(timer);
          var code = d && d.region_code;
          cb(code && GROUP[code] ? code : null);
        })
        .catch(function () { if (!done) { done = true; clearTimeout(timer); cb(null); } });
    } catch (e) { if (!done) { done = true; clearTimeout(timer); cb(null); } }
  }

  function buildOptions(sel) {
    var codes = Object.keys(STATE_NAMES).sort(function (a, b) {
      return STATE_NAMES[a].localeCompare(STATE_NAMES[b]);
    });
    codes.forEach(function (code) {
      var o = document.createElement("option");
      o.value = code;
      o.textContent = STATE_NAMES[code] + (GROUP[code] === "X" ? " (no shipping)" : "");
      sel.appendChild(o);
    });
  }

  function init() {
    var sel = document.getElementById("ship-state");
    if (sel && !sel.options.length) buildOptions(sel);
    zonesModal();
    if (sel) {
      sel.addEventListener("change", function () {
        save(sel.value);
        render(sel.value);
      });
    }

    var start = saved();
    if (start && GROUP[start]) {
      render(start);
    } else {
      render(DEFAULT_STATE); // show real prices immediately
      autoDetect(function (code) {
        if (code) { save(code); render(code); }
      });
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
