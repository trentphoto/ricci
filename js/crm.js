/*
 * Ricci's CRM client — auto-binds any <form data-crm="TYPE"> to the CRM API.
 *   data-crm   = subscribe | catering | wholesale | general
 *   data-source (optional) = value stored as the contact's source
 *   data-success (optional) = success message text
 *
 * Forms should include a hidden honeypot: <input name="_hp">.
 * A <span class="crm-status"> in the form shows feedback.
 *
 * SINGLE SOURCE OF TRUTH for the CRM backend URL. To override (e.g. local
 * dev or a custom domain), set window.CRM_BASE before this script loads.
 * Other scripts (office-lunch.js, etc.) read window.CRM_BASE, which we
 * publish below — don't hardcode the URL anywhere else.
 */
(function () {
  var CRM_BASE = window.CRM_BASE || "https://riccis-crm.fly.dev";
  window.CRM_BASE = CRM_BASE; // publish so other scripts share one config
  var FIELDS = ["email", "name", "phone", "message", "event_date", "headcount", "source"];

  function val(form, name) {
    var el = form.elements[name];
    return el && typeof el.value === "string" ? el.value.trim() : "";
  }

  async function post(path, data) {
    try {
      var res = await fetch(CRM_BASE + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      var json = {};
      try { json = await res.json(); } catch (e) {}
      return { ok: res.ok && json.ok, error: json.error, status: res.status };
    } catch (e) {
      return { ok: false, error: "network", status: 0 };
    }
  }

  function message(r, form) {
    if (r.ok) return form.getAttribute("data-success") || "Thanks — we got it!";
    if (r.error === "invalid_email") return "Please enter a valid email address.";
    if (r.status === 429) return "Too many tries — please wait a minute and retry.";
    return "Something went wrong — please call us at 412-331-9531.";
  }

  function bind(form) {
    if (form.__crmBound) return;
    form.__crmBound = true;
    var type = form.getAttribute("data-crm");
    var path = "/api/" + type;
    var statusEl = form.querySelector(".crm-status, .form-status");
    var btn = form.querySelector('button[type="submit"], button:not([type]), [type="submit"]');
    // Optional rich success: swap the form out for a panel (e.g. catering).
    var panelSel = form.getAttribute("data-success-panel");
    var panel = panelSel ? document.querySelector(panelSel) : null;

    function succeed() {
      if (panel) {
        form.hidden = true;
        panel.hidden = false;
        panel.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (statusEl) {
        statusEl.textContent = message({ ok: true }, form);
      }
      form.reset();
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      // honeypot: if filled, a bot submitted — fake success, send nothing
      if (form.elements._hp && form.elements._hp.value) {
        succeed();
        return;
      }

      var data = {};
      FIELDS.forEach(function (n) { var v = val(form, n); if (v) data[n] = v; });
      if (!data.source) data.source = form.getAttribute("data-source") || type;

      if (btn) btn.disabled = true;
      if (statusEl) statusEl.textContent = "Sending…";
      var r = await post(path, data);
      if (btn) btn.disabled = false;
      if (r.ok) succeed();
      else if (statusEl) statusEl.textContent = message(r, form);
    });
  }

  function init() {
    var forms = document.querySelectorAll("form[data-crm]");
    for (var i = 0; i < forms.length; i++) bind(forms[i]);
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
