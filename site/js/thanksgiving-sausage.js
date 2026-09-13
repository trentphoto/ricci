/*
 * Thanksgiving Sausage order page (shop/thanksgiving-sausage.html).
 * Live upon deployment through Nov 18, 2026. After the cutoff this redirects
 * to the standing product page rather than showing a stale countdown.
 *
 *  1. Redirect to /shop/pittsburgh-italian-pack once the cutoff passes.
 *     Checked first and independently of the countdown markup — a missing
 *     element must never leave the page live with an expired promise.
 *  2. Countdown to the Nov 18 cutoff, written into the deadline strip
 *     under the header and the closing CTA's lead line.
 *
 * Both targets are optional: the static HTML in each already states the
 * deadline, so with JS off the page is correct, just not counting down.
 *
 * Same pattern as the retired js/labor-day-box.js — see _archive/labor-day-2026/.
 */
(function () {
  var DEADLINE = "2026-11-18"; // last day to order for Thanksgiving delivery
  var STANDING_PDP = "/shop/pittsburgh-italian-pack";

  function midnight(iso) {
    var p = iso.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
  }
  function today() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  }
  function daysLeft() {
    return Math.round((midnight(DEADLINE) - today()) / 86400000);
  }

  function set(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function render(days) {
    var strip, closing;

    if (days > 1) {
      strip = "<strong>" + days + " days left to order.</strong> " +
        "Order by November 18 for Thanksgiving delivery.";
      closing = "<strong>" + days + " days left.</strong> After the 18th we " +
        "can't promise Thanksgiving delivery.";
    } else if (days === 1) {
      strip = "<strong>Tomorrow is the last day to order.</strong> " +
        "Order by November 18 for Thanksgiving delivery.";
      closing = "<strong>Tomorrow is the last day.</strong> After the 18th we " +
        "can't promise Thanksgiving delivery.";
    } else {
      strip = "<strong>Today's the last day to order.</strong> " +
        "Orders after today can't be promised for Thanksgiving.";
      closing = "<strong>Today's the last day.</strong> After today we can't " +
        "promise Thanksgiving delivery.";
    }

    var ship = ' Order cutoffs and transit times are on the ' +
      '<a href="../shipping.html">Shipping page</a>.';

    set("thanksgiving-countdown", strip);
    set("thanksgiving-countdown-final", closing + ship);
  }

  function init() {
    // Past the cutoff — send traffic to the standing product page instead
    // of a page promising a delivery window that's already closed.
    if (daysLeft() < 0) {
      window.location.replace(STANDING_PDP);
      return;
    }
    render(daysLeft());
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
