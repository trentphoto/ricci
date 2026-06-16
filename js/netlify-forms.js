/*
 * Ricci's — Netlify Forms client.
 * Auto-binds any <form data-netlify="true"> and submits via AJAX so we can
 * show an elegant inline success state instead of Netlify's default page.
 *
 * Conventions:
 *   - form must have a name="" and a hidden <input name="form-name" value="...">
 *   - honeypot: netlify-honeypot="bot-field" + a hidden <input name="bot-field">
 *   - feedback: an element with class "form-status" inside the form (optional)
 *   - rich success: set data-success-panel="#selector" on the form to swap the
 *     form out for a success panel; otherwise data-success text fills .form-status
 *
 * Detection still relies on the static HTML being present at deploy time —
 * Netlify's build bot parses these forms automatically.
 */
(function () {
  function encode(data) {
    return Object.keys(data)
      .map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(data[k]);
      })
      .join("&");
  }

  function collect(form) {
    var data = {};
    var fd = new FormData(form);
    fd.forEach(function (value, key) {
      // FormData can repeat keys; last one wins is fine for our forms.
      data[key] = value;
    });
    return data;
  }

  function bind(form) {
    if (form.__netlifyBound) return;
    form.__netlifyBound = true;

    var statusEl = form.querySelector(".form-status");
    var panelSel = form.getAttribute("data-success-panel");
    var panel = panelSel ? document.querySelector(panelSel) : null;
    var btn = form.querySelector('[type="submit"], button:not([type])');

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Honeypot: a filled bot-field means a bot — fake success, send nothing.
      if (form.elements["bot-field"] && form.elements["bot-field"].value) {
        succeed();
        return;
      }

      var data = collect(form);
      if (!data["form-name"]) data["form-name"] = form.getAttribute("name") || "";

      if (btn) btn.disabled = true;
      if (statusEl) {
        statusEl.textContent = "Sending…";
        statusEl.className = "form-status is-pending";
      }

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encode(data),
      })
        .then(function (res) {
          if (res.ok) succeed();
          else fail();
        })
        .catch(fail)
        .finally(function () {
          if (btn) btn.disabled = false;
        });
    });

    function succeed() {
      if (panel) {
        form.hidden = true;
        panel.hidden = false;
        panel.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        if (statusEl) {
          statusEl.textContent =
            form.getAttribute("data-success") || "Thanks — we got it!";
          statusEl.className = "form-status is-success";
        }
        form.reset();
        if (typeof form.__afterReset === "function") form.__afterReset();
      }
    }

    function fail() {
      if (statusEl) {
        statusEl.textContent =
          "Something went wrong — please call us at 412-331-9531.";
        statusEl.className = "form-status is-error";
      }
    }
  }

  function init() {
    var forms = document.querySelectorAll("form[data-netlify]");
    for (var i = 0; i < forms.length; i++) bind(forms[i]);
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
