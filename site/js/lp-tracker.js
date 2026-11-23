/* Landing-page behavior tracker for the 40-visitor test loop.
 * Runs only for visitors the experiment script assigned (context.active):
 * reports engagement, scroll depth, sections reached and tap positions to the
 * CRM, and tags Microsoft Clarity sessions with the variant.
 *
 * Usage: <script src="/js/lp-tracker.js" data-experiment-global="RicciItalianPackExperiment"
 *          data-slug="italian-pack-v4" data-buy="[data-buy-now][data-id='pittsburgh-italian-pack']" defer>
 * Sections are top-level <section>s, named data-lp || id || "s", prefixed with
 * their page order ("03-inside") so reports read top to bottom. The buy button
 * coming into view is its own section, "buy-visible".
 */
(function () {
  "use strict";
  var me = document.currentScript;
  var context = window[me.getAttribute("data-experiment-global")];
  var clarityId = me.getAttribute("data-clarity") || "zi9zh8m335";
  // Recordings and heatmaps for every real visitor; tagged when in the test.
  var preview = context && context.preview;
  if (clarityId && !preview) {
    (function (c, l, a, r, i) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      var t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      var y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", clarityId);
    if (context && context.variant) {
      window.clarity("set", "experiment", context.experiment);
      window.clarity("set", "variant", context.variant);
    }
  }
  if (!context || !context.active) return;

  var endpoint = window.CRM_BASE + "/api/experiments/" + me.getAttribute("data-slug") + "/events";
  var buySel = me.getAttribute("data-buy");
  var device = window.matchMedia("(max-width: 767px)").matches ? "m" : "d";
  var queue = [], seen = {};

  function push(event, detail) {
    var key = event + "|" + (detail || "");
    if (seen[key]) return;
    seen[key] = 1;
    queue.push({ event: event, detail: detail || "" });
    if (queue.length >= 40) flush();
  }
  function flush(beacon) {
    if (!queue.length) return;
    var body = JSON.stringify({
      experiment: context.experiment, variant: context.variant, visitor: context.visitor,
      device: device, events: queue.splice(0, 40)
    });
    if (beacon && navigator.sendBeacon) {
      try { if (navigator.sendBeacon(endpoint, new Blob([body], { type: "text/plain" }))) return; } catch (_) {}
    }
    try {
      fetch(endpoint, { method: "POST", headers: { "Content-Type": "text/plain" },
        body: body, keepalive: true, credentials: "omit" }).catch(function () {});
    } catch (_) {}
  }
  setInterval(flush, 5000);
  addEventListener("pagehide", function () { flush(true); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flush(true);
  });

  // Engaged: 10s of visible time, or any scroll or tap.
  var engaged = false, visibleMs = 0, last = Date.now();
  function engage() { if (!engaged) { engaged = true; push("engaged"); } }
  setInterval(function () {
    var now = Date.now();
    if (document.visibilityState === "visible") visibleMs += now - last;
    last = now;
    if (visibleMs >= 10000) engage();
  }, 1000);

  // Sections: name and order.
  var sections = Array.prototype.filter.call(document.querySelectorAll("main section, body > section"),
    function (s) { return !s.parentElement.closest("section"); });
  function slug(s) {
    return (s.getAttribute("data-lp") || s.id || "s").toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 34) || "s";
  }
  sections.forEach(function (s, i) { s.__lp = (i < 9 ? "0" : "") + (i + 1) + "-" + slug(s); });
  function sectionOf(el) {
    var s = el && el.closest && el.closest("section");
    while (s && !s.__lp) s = s.parentElement && s.parentElement.closest("section");
    return s;
  }

  if ("IntersectionObserver" in window) {
    // Reached = a third of the section (or of the viewport, for tall ones) shown.
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var r = en.intersectionRect.height, h = Math.min(en.boundingClientRect.height, innerHeight);
        if (en.isIntersecting && h && r / h >= 0.33) {
          push("section", en.target.__lp === "buy" ? "buy-visible" : en.target.__lp);
          io.unobserve(en.target);
        }
      });
    }, { threshold: [0, 0.33, 0.5, 1] });
    sections.forEach(function (s) { io.observe(s); });
    var buy = buySel && document.querySelector(buySel);
    if (buy) { buy.__lp = "buy"; io.observe(buy); }
  }

  // Scroll depth of the whole page, in quarters.
  var maxDepth = 0;
  function depth() {
    var doc = document.documentElement;
    var pct = (scrollY + innerHeight) / Math.max(doc.scrollHeight, 1) * 100;
    [25, 50, 75, 100].forEach(function (d) {
      if (pct >= d - (d === 100 ? 2 : 0) && d > maxDepth) { maxDepth = d; push("depth", String(d)); }
    });
    if (scrollY > 40) engage();
  }
  addEventListener("scroll", depth, { passive: true });
  depth();

  // Taps: 5% grid within the tapped section, for heatmaps.
  function q5(n) { return Math.max(0, Math.min(100, Math.round(n / 5) * 5)); }
  document.addEventListener("pointerdown", function (e) {
    engage();
    var s = sectionOf(e.target);
    if (!s) return;
    var b = s.getBoundingClientRect();
    if (!b.width || !b.height) return;
    push("tap", s.__lp + ":" + q5((e.clientX - b.left) / b.width * 100) + ":" + q5((e.clientY - b.top) / b.height * 100));
  }, { passive: true, capture: true });
})();
