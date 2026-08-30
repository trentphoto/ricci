/*
 * Labor Day SHIPPED box (labor-day-box.html) — paid cold traffic, PA/MD/NY/DE.
 *
 * Separate from js/labor-day.js, which drives the in-store $29.99 Cookout Box
 * at /labor-day. Two offers, two pages, two deadlines — don't merge them.
 *
 *  1. Countdown line. Derived from DEADLINE so nobody hand-edits the page
 *     daily; the strip removes itself once the holiday is over.
 *  2. The hot-and-sweet / all-hot switch, which drives the blurb under it and
 *     which checkout every CTA on the page points at.
 *  3. Checkout wiring. URLs live in CHECKOUT below; empty means every button
 *     falls back to the phone rather than sitting there looking clickable.
 */
(function () {
  var DEADLINE = "2026-09-02"; // last day to order and still make the weekend
  var REOPEN   = "2026-09-08"; // shop back open Tuesday

  function midnight(iso) {
    var p = iso.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
  }
  function today() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  }

  function countdown() {
    var el = document.getElementById("ship-countdown");
    if (!el) return;
    var strip = el.closest(".labor-countdown");
    var days = Math.round((midnight(DEADLINE) - today()) / 86400000);

    if (days > 1) {
      el.innerHTML = "<strong>" + days + " days left to order.</strong> " +
        "Wednesday, September 2 is the last box that makes it before the weekend.";
    } else if (days === 1) {
      el.innerHTML = "<strong>Tomorrow is the last day to order.</strong> " +
        "After Wednesday, nothing ships in time for the holiday.";
    } else if (days === 0) {
      el.innerHTML = "<strong>Today's the last day to order.</strong> " +
        "This is the last box that makes it before the weekend.";
    } else if (today() < midnight(REOPEN)) {
      el.innerHTML = "<strong>Labor Day ordering is closed.</strong> " +
        "We're back at the counter Tuesday, September 8 at 8:30 AM.";
    } else if (strip) {
      strip.remove();
    }
  }

  /*
   * Checkout links — one per mix, so each gets its own inventory count and the
   * choice is made here rather than on the checkout page.
   *
   * The page has exactly ONE call to action and no phone-order path, so a
   * missing URL cannot degrade to tel: — it disables the button and raises a
   * loud warning instead. Do not launch with any of these empty.
   */
  var CHECKOUT = {
    "mixed": "https://shop.riccisausage.com/cart/58785280393376:1",
    "hot":   "https://shop.riccisausage.com/cart/58785280524448:1",
    "sweet": "https://shop.riccisausage.com/cart/58785280589984:1"
  };

  /*
   * The three ways to buy ten pounds. Same price whichever you pick.
   * Seasoning copy anywhere on this page comes from WIKI.md "Product facts" —
   * hot and sweet are DIFFERENT BLENDS, not one recipe with the pepper left
   * out, and sweet has dextrose in it, so never phrase it as "no sugar."
   */
  var MIX = {
    mixed: {
      note: "Five pounds of each. If you're feeding people who don't agree " +
            "about pepper, this is the one.",
      slab: "hot"
    },
    hot: {
      note: "Ten pounds of the hot \u2014 crushed red pepper, real paprika, " +
            "whole fennel seed. Same price.",
      slab: "hot"
    },
    sweet: {
      note: "Ten pounds of the sweet \u2014 cracked black pepper, no chili " +
            "heat. Same price.",
      slab: "sweet"
    }
  };

  function apply(mix) {
    var m = MIX[mix];
    if (!m) return;

    var sw = document.getElementById("box-switch");
    if (sw) {
      sw.classList.toggle("is-mid", mix === "hot");
      sw.classList.toggle("is-right", mix === "sweet");
      sw.classList.toggle("slab-sweet", m.slab === "sweet");
    }

    var note = document.getElementById("box-note");
    if (note) note.textContent = m.note;

    /*
     * One CTA, one label — the button text is authored in the HTML and never
     * rewritten here. All this does is point it at the right checkout.
     */
    var url = CHECKOUT[mix];
    var btns = document.querySelectorAll("[data-box-cta]");
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      if (url) {
        btn.href = url;
        btn.target = "_blank";
        btn.rel = "noopener";
        btn.removeAttribute("aria-disabled");
        btn.classList.remove("btn--no-checkout");
      } else {
        btn.href = "#box";
        btn.removeAttribute("target");
        btn.setAttribute("aria-disabled", "true");
        btn.classList.add("btn--no-checkout");
      }
    }
  }

  function mixSwitch() {
    var radios = document.querySelectorAll('input[name="box-mix"]');
    if (!radios.length) return;

    for (var i = 0; i < radios.length; i++) {
      radios[i].addEventListener("change", function () {
        if (this.checked) apply(this.value);
      });
    }

    var checked = document.querySelector('input[name="box-mix"]:checked');
    apply(checked ? checked.value : "mixed");

    /*
     * Loud on purpose. There is no phone-order fallback on this page, so an
     * empty CHECKOUT means the page has no way to sell anything — it must not
     * reach paid traffic in that state.
     */
    var missing = [];
    for (var k in CHECKOUT) {
      if (Object.prototype.hasOwnProperty.call(CHECKOUT, k) && !CHECKOUT[k]) {
        missing.push(k);
      }
    }
    if (missing.length) {
      var warn = document.getElementById("checkout-warning");
      if (warn) {
        warn.hidden = false;
        warn.textContent = "Checkout URL missing for: " + missing.join(", ") +
          " — set CHECKOUT in js/labor-day-box.js before running ads.";
      }
      if (window.console) {
        console.error("[labor-day-box] No checkout URL for: " +
                      missing.join(", ") + ". CTAs are disabled.");
      }
    }
  }

  function guardClicks() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-box-cta]");
      if (btn && btn.getAttribute("aria-disabled") === "true") e.preventDefault();
    });
  }

  function init() { countdown(); mixSwitch(); guardClicks(); }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
