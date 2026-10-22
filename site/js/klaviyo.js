/*
 * Klaviyo onsite tracking — loaded by crm.js on every page that has it.
 *
 *  - Product pages (any page with a [data-buy-now] button): sends a
 *    "Viewed Product" event, which triggers the browse-abandonment flow.
 *  - Any CRM form success (ricci:crm-success): identifies the browser by email
 *    so later product views attach to that Klaviyo profile. Our forms post to
 *    the CRM, not Klaviyo, so without this the visitor stays anonymous.
 *
 * Klaviyo only records views for browsers it can identify (this, or a click
 * from a Klaviyo email). Anonymous views are dropped.
 */
(function () {
  "use strict";
  var COMPANY_ID = "SebwDJ"; // public site key, not a secret

  // Klaviyo's queue stub: calls made before klaviyo.js loads are replayed.
  if (!window.klaviyo) {
    window._klOnsite = window._klOnsite || [];
    window.klaviyo = { push: function () { window._klOnsite.push.apply(window._klOnsite, arguments); } };
  }
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=" + COMPANY_ID;
  document.head.appendChild(s);

  function meta(prop) {
    var el = document.querySelector('meta[property="' + prop + '"]');
    return el ? el.getAttribute("content") : "";
  }

  function trackView() {
    var btn = document.querySelector("[data-buy-now][data-id]");
    if (!btn) return;
    var priceEl = document.querySelector(".product-price[data-base]");
    var title = meta("og:title") || document.title;
    window.klaviyo.push(["track", "Viewed Product", {
      ProductName: title.split(/ [—|] /)[0].trim(),
      ProductID: btn.getAttribute("data-id"),
      URL: location.origin + location.pathname,
      ImageURL: meta("og:image"),
      Price: priceEl ? parseFloat(priceEl.getAttribute("data-base")) : null
    }]);
  }

  document.addEventListener("ricci:crm-success", function (e) {
    var d = e.detail && e.detail.data;
    if (!d || !d.email) return;
    var profile = { email: d.email };
    if (d.name) profile.first_name = String(d.name).split(" ")[0];
    window.klaviyo.push(["identify", profile]);
  });

  if (document.readyState !== "loading") trackView();
  else document.addEventListener("DOMContentLoaded", trackView);
})();
