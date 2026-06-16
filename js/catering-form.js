/*
 * Ricci's — on-page catering order-builder.
 * Progressive enhancement for the #catering-form: quantity steppers, a live
 * estimated total, prep + fulfillment toggles, and a human-readable order
 * summary. On submit it folds the order + logistics + notes into a single
 * "message" field, which is the only free-text the CRM stores alongside the
 * core contact fields. The actual submit is handled by js/crm.js.
 */
(function () {
  var form = document.getElementById("catering-form");
  if (!form) return;

  var totalEl = document.getElementById("catering-total");
  var countEl = document.getElementById("catering-count");
  var summaryInput = form.querySelector('input[name="order_summary"]');
  var totalInput = form.querySelector('input[name="estimated_total"]');
  var messageInput = form.querySelector('input[name="message"]');

  function fieldVal(name) {
    var el = form.elements[name];
    return el && typeof el.value === "string" ? el.value.trim() : "";
  }

  // Compose the human-readable order the CRM stores with the inquiry.
  function buildMessage() {
    var lines = ["Order:", summaryInput && summaryInput.value ? summaryInput.value : "(no trays selected)"];
    if (totalInput && totalInput.value) lines.push("Estimated total: " + totalInput.value);
    lines.push("");
    var prep = fieldVal("prep");
    var fulfillment = fieldVal("fulfillment");
    var address = fieldVal("delivery_address");
    var time = fieldVal("event_time");
    var org = fieldVal("organization");
    var notes = fieldVal("notes");
    if (prep) lines.push("Tray prep: " + prep);
    if (fulfillment) lines.push("Fulfillment: " + fulfillment);
    if (address) lines.push("Delivery address: " + address);
    if (time) lines.push("Preferred time: " + time);
    if (org) lines.push("Company / occasion: " + org);
    if (notes) lines.push("", "Notes: " + notes);
    return lines.join("\n");
  }

  // Runs before crm.js's submit handler (this script loads first), so the
  // message field is populated by the time the CRM client reads it.
  form.addEventListener("submit", function () {
    if (messageInput) messageInput.value = buildMessage();
  });

  function money(n) {
    return "$" + n.toFixed(2);
  }

  function rows() {
    return Array.prototype.slice.call(form.querySelectorAll(".cater-item-row"));
  }

  function recalc() {
    var total = 0;
    var trays = 0;
    var lines = [];

    rows().forEach(function (row) {
      var input = row.querySelector("input[data-qty]");
      var price = parseFloat(row.getAttribute("data-price")) || 0;
      var name = row.getAttribute("data-name") || "";
      var qty = Math.max(0, parseInt(input.value, 10) || 0);
      row.classList.toggle("has-qty", qty > 0);
      if (qty > 0) {
        total += qty * price;
        trays += qty;
        lines.push(qty + " × " + name + " — " + money(qty * price));
      }
    });

    if (totalEl) totalEl.textContent = money(total);
    if (countEl) {
      countEl.textContent = trays === 0 ? "Nothing selected yet"
        : trays + (trays === 1 ? " item" : " items");
    }
    if (totalInput) totalInput.value = money(total);
    if (summaryInput) summaryInput.value = lines.length ? lines.join("\n") : "(no trays selected)";
  }

  // Quantity steppers
  form.addEventListener("click", function (e) {
    var step = e.target.getAttribute("data-qty-step");
    if (!step) return;
    var row = e.target.closest(".cater-item-row");
    var input = row && row.querySelector("input[data-qty]");
    if (!input) return;
    input.value = Math.max(0, (parseInt(input.value, 10) || 0) + parseInt(step, 10));
    recalc();
  });

  form.addEventListener("input", function (e) {
    if (e.target.matches("input[data-qty]")) {
      if (parseInt(e.target.value, 10) < 0 || isNaN(parseInt(e.target.value, 10))) {
        e.target.value = 0;
      }
      recalc();
    }
  });

  // Generic button toggles (prep, fulfillment) backed by a hidden input
  function selectOption(toggle, opt) {
    var hidden = form.querySelector('input[name="' + toggle.getAttribute("data-toggle") + '"]');
    toggle.setAttribute("data-active", opt.getAttribute("data-value"));
    toggle.querySelectorAll("[data-value]").forEach(function (o) {
      o.classList.toggle("is-active", o === opt);
    });
    if (hidden) hidden.value = opt.textContent.trim();
    // Show/hide the delivery address field when fulfillment changes
    if (toggle.getAttribute("data-toggle") === "fulfillment") {
      var addr = document.getElementById("catering-address-field");
      if (addr) addr.hidden = opt.getAttribute("data-value") !== "delivery";
    }
  }

  form.querySelectorAll("[data-toggle]").forEach(function (toggle) {
    // Sync the initial active state (highlight + hidden value)
    var active = toggle.querySelector('[data-value="' + toggle.getAttribute("data-active") + '"]');
    if (active) selectOption(toggle, active);

    toggle.addEventListener("click", function (e) {
      var opt = e.target.closest("[data-value]");
      if (opt) selectOption(toggle, opt);
    });
  });

  // Earliest pickup = tomorrow (24-hour notice)
  var dateInput = form.querySelector('input[name="event_date"]');
  if (dateInput) {
    var t = new Date();
    t.setDate(t.getDate() + 1);
    dateInput.min = t.toISOString().split("T")[0];
  }

  recalc();
})();
