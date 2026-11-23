/* Pittsburgh Italian Pack v3: four live versions. Preview with ?preview=1.
 * Deploy CRM italian-pack-v3 tracking before publishing.
 * v2 (six versions, 2026-09-25 → 2026-11-23) is archived; its retired pages
 * (original, grill pan, table) now only route new visitors into this test. */
(function () {
  "use strict";
  var experiment = "italian-pack-v3";
  var variants = ["butcher", "free", "minimal", "butcher-free"];
  // Retired v2 pages still receive ad traffic: assign and redirect, never count.
  var routers = ["control", "grill-pan", "table"];
  var paths = {
    butcher: "/shop/pittsburgh-italian-pack-butcher",
    free: "/shop/pittsburgh-italian-pack-free",
    minimal: "/shop/pittsburgh-italian-pack-minimal",
    "butcher-free": "/shop/pittsburgh-italian-pack-butcher-free"
  };
  var current = document.currentScript.getAttribute("data-variant");
  var query = new URLSearchParams(location.search);
  var preview = query.get("preview") === "1" ||
    !/^(www\.)?riccisausage\.com$/.test(location.hostname);
  var bot = /bot|crawler|spider|facebookexternalhit|HeadlessChrome/i.test(navigator.userAgent);
  var context = { experiment: experiment, variant: current, preview: preview, visitor: null, active: false };
  window.RicciItalianPackExperiment = context;
  if (preview || bot || (variants.indexOf(current) === -1 && routers.indexOf(current) === -1)) return;

  // Ads that promise free meatballs link with ?offer=free: pin to that page, outside the test.
  if (query.get("offer") === "free") {
    if (current !== "free") location.replace(paths.free + location.search + location.hash);
    return;
  }

  var key = "ricci_italian_pack_v3";
  var saved;
  try {
    var cookie = document.cookie.split("; ").find(function (s) { return s.indexOf(key + "=") === 0; });
    if (cookie) saved = JSON.parse(decodeURIComponent(cookie.slice(key.length + 1)));
  } catch (_) {}
  if (!saved || variants.indexOf(saved.variant) === -1 || !/^[a-f0-9]{32}$/.test(saved.visitor)) {
    // No reliable persistent assignment means no experiment; the page still works.
    if (!window.crypto || !window.crypto.getRandomValues) return;
    var bytes = new Uint8Array(17);
    window.crypto.getRandomValues(bytes);
    // Reject the remainder so every version has exactly equal probability.
    var draw = new Uint8Array(1);
    draw[0] = bytes[16];
    var limit = 256 - (256 % variants.length);
    while (draw[0] >= limit) window.crypto.getRandomValues(draw);
    saved = {
      visitor: Array.prototype.map.call(bytes.slice(0, 16), function (n) { return n.toString(16).padStart(2, "0"); }).join(""),
      variant: variants[draw[0] % variants.length]
    };
    try {
      document.cookie = key + "=" + encodeURIComponent(JSON.stringify(saved)) +
        "; Max-Age=7776000; Path=/; Domain=riccisausage.com; SameSite=Lax; Secure";
      if (!document.cookie.split("; ").some(function (s) { return s.indexOf(key + "=") === 0; })) return;
    } catch (_) { return; }
  }
  context.variant = saved.variant;
  context.visitor = saved.visitor;
  if (current !== saved.variant) {
    // Preserve ad parameters. No public ?variant= override that could bias results.
    location.replace(paths[saved.variant] + location.search + location.hash);
    return;
  }
  context.active = true;
})();
