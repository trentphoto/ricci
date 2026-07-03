/*
 * Ricci's — state-based all-in pricing.
 *
 * Customer picks their state (auto-detected on first visit); every perishable
 * product shows ONE price with shipping already baked in — "Free shipping to XX".
 * No "calculated at checkout." The price shown is the price charged.
 *
 * HOW IT WORKS
 *  - Each product-price div carries: data-base (the nearby / Group-A all-in
 *    price) and data-tier (small | med | large = box shipping weight bucket).
 *  - We look up the customer's state -> shipping group (A-E) -> a shipping
 *    add-on for that tier, and show data-base + add-on.
 *  - Group A (nearby) add-on is 0 because the listed base price already bakes
 *    in nearby shipping. Farther groups pay the delta.
 *  - Items with no data-tier (Sausage Club subscription, Cookbook media mail)
 *    are left untouched.
 *
 * TUNING THE NUMBERS  <-- James: this is the only block you edit
 *  Run a ~box on PirateShip (FedEx 2-Day from 15136) for the 3 size buckets to
 *  each test zip, then replace the SHIP add-ons below. Test zips:
 *    A 44114 Cleveland · B 28202 Charlotte · C 29201 Columbia
 *    D 73102 Oklahoma City · E 90001 Los Angeles
 *  add-on = (actual FedEx rate to that group)  -  (actual rate to Group A)
 *  i.e. how much MORE than a nearby box that zone costs. Keep A at 0.
 */
(function () {
  "use strict";

  /* State -> shipping group. Source: operations/sales/ecom/shipping-zones.md */
  var GROUP = {
    // A — Nearby
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
    // No ship — cold chain not viable
    AK:"X", HI:"X"
  };

  /* PLACEHOLDER shipping add-ons ($) by group and box tier. Replace with real
     PirateShip deltas. Group A = 0 (baked into base price). */
  var SHIP = {
    A: { small: 0,  med: 0,  large: 0  },
    B: { small: 6,  med: 8,  large: 12 },
    C: { small: 12, med: 16, large: 22 },
    D: { small: 18, med: 24, large: 32 },
    E: { small: 24, med: 32, large: 42 }
  };

  var STATE_NAMES = {
    AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
    CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"Washington DC",FL:"Florida",
    GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",
    KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",
    MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",
    MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
    NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",
    OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
    SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",
    WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"
  };

  var STORE_KEY = "ricci_ship_state";
  var DEFAULT_STATE = "PA";

  function fmt(n) {
    // whole-dollar bases stay clean; otherwise keep the .95 style
    return "$" + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "");
  }

  function priceFor(base, tier, group) {
    var add = (SHIP[group] && SHIP[group][tier]) || 0;
    return base + add;
  }

  function render(state) {
    var group = GROUP[state];
    var noShip = group === "X";
    var name = STATE_NAMES[state] || state;

    document.querySelectorAll(".product-price[data-tier]").forEach(function (el) {
      var base = parseFloat(el.getAttribute("data-base"));
      var tier = el.getAttribute("data-tier");
      var amountEl = el.querySelector(".price-amount");
      var noteEl = el.querySelector(".ship-note");
      if (isNaN(base) || !amountEl) return;

      if (noShip) {
        amountEl.textContent = fmt(base);
        if (noteEl) noteEl.textContent = "We can't cold-ship to " + name + " yet";
        el.classList.add("is-noship");
        return;
      }
      el.classList.remove("is-noship");
      amountEl.textContent = fmt(priceFor(base, tier, group));
      if (noteEl) noteEl.textContent = "Free shipping to " + state + " · Arrives frozen";
    });

    // reflect selection in the picker + label
    var sel = document.getElementById("ship-state");
    if (sel && sel.value !== state) sel.value = state;
    var lbl = document.getElementById("ship-state-name");
    if (lbl) lbl.textContent = name;

    document.dispatchEvent(new CustomEvent("ricci:ship-state", {
      detail: { state: state, group: group, canShip: !noShip, name: name }
    }));
  }

  function getState() {
    var start = saved();
    return start && GROUP[start] ? start : DEFAULT_STATE;
  }

  function canShip(state) {
    return GROUP[state] !== "X";
  }

  function priceForState(base, tier, state) {
    var group = GROUP[state];
    if (!group || group === "X") return base;
    return priceFor(base, tier, group);
  }

  window.RicciShipping = {
    getState: getState,
    getGroup: function (state) { return GROUP[state || getState()] || null; },
    canShip: canShip,
    priceFor: priceForState,
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
