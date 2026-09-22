/* Buy-click experiment only. No purchase event, email, or Shopify attribution.
 *
 * Unlike the grill box, this page's CTA is [data-buy-now]: buy-now.js calls
 * preventDefault and resolves the shipping zone before navigating, so there is
 * no outbound href to validate and defaultPrevented is expected. We count the
 * click on the pack's own Buy button and let buy-now.js do its work.
 */
(function () {
  "use strict";
  var context = window.RicciMeatballExperiment;
  if (!context || !context.active) return;
  var endpoint = window.CRM_BASE + "/api/experiments/meatball-framing/events";
  var viewed = false;
  var clicked = false;

  function send(event) {
    var body = JSON.stringify({
      experiment: context.experiment,
      variant: context.variant,
      visitor: context.visitor,
      event: event
    });
    // text/plain is CORS-safelisted; checkout navigation never waits for tracking.
    if (event === "buy_click" && navigator.sendBeacon) {
      try { if (navigator.sendBeacon(endpoint, new Blob([body], { type: "text/plain" }))) return; } catch (_) {}
    }
    try {
      fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "text/plain" },
        body: body, keepalive: true, credentials: "omit"
      }).catch(function () {});
    } catch (_) {}
  }

  function view() {
    if (viewed || document.visibilityState !== "visible" || document.prerendering) return;
    viewed = true;
    send("view");
  }
  view();
  document.addEventListener("visibilitychange", view);
  document.addEventListener("prerenderingchange", view);
  function buy(e) {
    if (clicked || (e.type === "auxclick" && e.button !== 1)) return;
    var a = e.target.closest && e.target.closest("[data-buy-now]");
    if (!a || a.getAttribute("data-id") !== "pittsburgh-italian-pack") return;
    if (a.getAttribute("aria-disabled") === "true") return;
    view();
    clicked = true;
    send("buy_click");
  }
  document.addEventListener("click", buy);
  document.addEventListener("auxclick", buy);
})();
