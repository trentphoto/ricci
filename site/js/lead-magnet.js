/* Lead-magnet landing pages: retain campaign attribution and track a
   successful request in the analytics tools already loaded by the page. */
(function () {
  var form = document.querySelector('form[data-lead-magnet]');
  if (!form) return;

  var params = new URLSearchParams(window.location.search);
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (name) {
    var input = form.elements[name];
    var value = params.get(name);
    if (input && value) input.value = value.slice(0, 250);
  });

  form.addEventListener("ricci:crm-success", function (event) {
    var detail = event.detail || {};
    var data = detail.data || {};
    var asset = data.asset || form.getAttribute("data-lead-magnet");
    var variant = data.variant || form.getAttribute("data-variant");

    if (typeof window.gtag === "function") {
      window.gtag("event", "generate_lead", {
        lead_source: "leadmagnet",
        lead_asset: asset,
        experiment_variant: variant,
        campaign: data.utm_campaign || "",
      });
    }

    if (typeof window.fbq === "function") {
      window.fbq("track", "Lead", {
        content_category: "lead_magnet",
        content_name: asset,
        experiment_variant: variant,
      });
    }
  });
})();
