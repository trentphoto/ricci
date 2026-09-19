/* Buy-click experiment only. No purchase event, email, or Shopify attribution. */
(function () {
  "use strict";
  var context = window.RicciGrillExperiment;
  if (!context || !context.active) return;
  var endpoint = window.CRM_BASE + "/api/experiments/grill-box/events";
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
    if (clicked || e.defaultPrevented || (e.type === "auxclick" && e.button !== 1)) return;
    var a = e.target.closest && e.target.closest("a[data-grill-cta]");
    if (!a || a.getAttribute("aria-disabled") === "true" || !a.hasAttribute("href")) return;
    var url;
    try { url = new URL(a.href); } catch (_) { return; }
    if (url.hostname !== "tiyndf-za.myshopify.com" || !/^\/cart\/\d+:1$/.test(url.pathname)) return;
    view();
    clicked = true;
    send("buy_click");
  }
  document.addEventListener("click", buy);
  document.addEventListener("auxclick", buy);
})();
