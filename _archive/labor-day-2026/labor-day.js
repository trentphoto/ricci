/*
 * Labor Day campaign page (labor-day.html).
 *
 *  1. Countdown line under the hero. Derived from DEADLINE, so it is never
 *     stale and nobody has to hand-edit the page daily. After the shop
 *     reopens, the whole strip removes itself.
 *  2. The hot/sweet switch, which drives the rope card, the blurb under the
 *     switch, and where the checkout button points.
 *  3. Square checkout wiring. The box is PREPAID — the reservation isn't real
 *     until Square takes the money, so the CTA points straight at Square.
 *     URLs live in CHECKOUT below; empty means the button degrades to tel:.
 */
(function () {
  var DEADLINE = "2026-09-05"; // last day open before the holiday
  var REOPEN   = "2026-09-08"; // back open Tuesday

  function midnight(iso) {
    var p = iso.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
  }
  function today() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  }

  function countdown() {
    var el = document.getElementById("labor-countdown");
    if (!el) return;
    var strip = el.closest(".labor-countdown");
    var days = Math.round((midnight(DEADLINE) - today()) / 86400000);

    if (days > 1) {
      el.innerHTML = "<strong>" + days + " days left.</strong> " +
        "Last pickup is Saturday, September 5 — then we're closed until Tuesday.";
    } else if (days === 1) {
      el.innerHTML = "<strong>Tomorrow is the last day.</strong> " +
        "We're open Saturday 9 to 4, then closed Sunday and Labor Day.";
    } else if (days === 0) {
      el.innerHTML = "<strong>Today's the last day.</strong> " +
        "We close at 4, and we're closed Sunday and Labor Day.";
    } else if (today() < midnight(REOPEN)) {
      el.innerHTML = "<strong>Closed for the holiday.</strong> " +
        "Back open Tuesday, September 8 at 8:30 AM.";
    } else if (strip) {
      strip.remove();
    }
  }

  /*
   * Square checkout links. Hot and sweet are two separate Square items
   * ("Labor Day Bundle Pickup — Hot" / "— Sweet", $29.99 each), so the choice
   * is made here by the switch and each button goes to its own item.
   *
   * Paste each item's Square Online link below. Until a URL is filled in the
   * button relabels itself to the phone number and dials the shop, so it can
   * never sit there looking clickable and do nothing.
   */
  var CHECKOUT = {
    "hot":   "https://square.link/u/W2cfeHMW",
    "sweet": "https://square.link/u/XcnSGJOy"
  };

  /*
   * The two ropes. Seasoning copy is verbatim from docs/WIKI.md "Product facts" —
   * they are DIFFERENT BLENDS, not one recipe with the pepper left out. Both
   * came from Sulmona in 1945, so neither note claims that heritage over the
   * other; the hero says it once for both. Sweet has dextrose in it, so never
   * phrase it as "no sugar"; "sweet" means no chili heat and nothing else.
   */
  var ROPE = {
    hot: {
      name: "Hot Rope Sausage",
      img: "assets/img/hot-sausage-coil-raw.webp",
      alt: "Raw Ricci's hot rope sausage",
      desc: "Crushed red pepper, real paprika, whole fennel seed. " +
            "Uncooked, natural casing \u2014 cut it to length yourself.",
      note: "The one Pittsburgh grew up on. Medium heat that builds slowly.",
      cta: "Reserve Now \u00b7 Hot"
    },
    sweet: {
      name: "Sweet Rope Sausage",
      img: "assets/img/sweet-sausage-coil-raw.webp",
      alt: "Raw Ricci's sweet rope sausage",
      desc: "Pork, salt, cracked black pepper. No fennel, no paprika. " +
            "Uncooked, natural casing \u2014 cut it to length yourself.",
      note: "No chili heat at all.",
      cta: "Reserve Now \u00b7 Sweet"
    }
  };

  function apply(heat) {
    var r = ROPE[heat];
    if (!r) return;

    var sw = document.getElementById("heat-switch");
    if (sw) {
      sw.classList.toggle("is-hot", heat === "hot");
      sw.classList.toggle("is-sweet", heat === "sweet");
    }

    var img = document.getElementById("rope-img");
    if (img) { img.src = r.img; img.alt = r.alt; }

    var name = document.getElementById("rope-name");
    if (name) name.textContent = r.name;

    var desc = document.getElementById("rope-desc");
    if (desc) desc.textContent = r.desc;

    var note = document.getElementById("heat-note");
    if (note) note.textContent = r.note;

    /*
     * The button label follows the switch (ROPE[heat].cta), so it always names
     * the rope you're about to pay for. The static text in the HTML is only
     * the pre-JS fallback.
     */
    var url = CHECKOUT[heat];
    var btns = document.querySelectorAll("[data-heat-cta]");
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      if (url) {
        btn.href = url;
        btn.target = "_blank";
        btn.rel = "noopener";
        btn.textContent = r.cta;
        btn.classList.remove("btn--no-checkout");
      } else {
        // No Square link yet — the phone still takes a reservation, so send
        // people there rather than leaving a button that does nothing.
        btn.href = "tel:4123319531";
        btn.removeAttribute("target");
        btn.textContent = "Call to Reserve \u00b7 412-331-9531";
        btn.classList.add("btn--no-checkout");
      }
    }
  }

  function heatSwitch() {
    var radios = document.querySelectorAll('input[name="rope-heat"]');
    if (!radios.length) return;

    for (var i = 0; i < radios.length; i++) {
      radios[i].addEventListener("change", function () {
        if (this.checked) apply(this.value);
      });
    }

    var checked = document.querySelector('input[name="rope-heat"]:checked');
    apply(checked ? checked.value : "hot");

    if (window.console && !CHECKOUT.hot && !CHECKOUT.sweet) {
      console.warn("[labor-day] No Square checkout URLs set — buttons are " +
                   "falling back to tel:. Fill in CHECKOUT in js/labor-day.js.");
    }
  }

  function init() { countdown(); heatSwitch(); }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
