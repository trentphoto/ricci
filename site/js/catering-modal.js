/*
 * Ricci's Catering modal.
 *
 * Collects the tray cart, pickup details, and contact info, then posts a
 * structured order (item ids + quantities only — no prices) to the CRM's
 * /api/catering, which prices it server-side and returns a Square-hosted
 * checkout page. Catering orders are PREPAID — the shop only sees a real
 * order once Square reports the charge, same as the pepperoni pre-order.
 *
 * Prices shown here are for the customer's benefit only; the real charge is
 * computed on the server from src/catering-catalog.ts, so a stale price here
 * can never under- or over-charge anyone.
 */
(function () {
  var ITEMS = [
    { id: 'rolls',     name: "Lil's Sausage Rolls",       unit: 'each',             price: 15.99 },
    { id: 'pep_sm',    name: 'Stuffed Banana Peppers',    unit: 'Small Tray (6 pc)',  price: 20.95 },
    { id: 'pep_lg',    name: 'Stuffed Banana Peppers',    unit: 'Large Tray (12 pc)', price: 41.95 },
    { id: 'hot_sm',    name: 'Hot Italian Sausage',       unit: 'Small Tray (12 pc)', price: 39.95 },
    { id: 'hot_lg',    name: 'Hot Italian Sausage',       unit: 'Large Tray (24 pc)', price: 79.95 },
    { id: 'sweet_sm',  name: 'Sweet Italian Sausage',     unit: 'Small Tray (12 pc)', price: 39.95, askSauce: true },
    { id: 'sweet_lg',  name: 'Sweet Italian Sausage',     unit: 'Large Tray (24 pc)', price: 79.95, askSauce: true },
    { id: 'mb_sm',     name: 'Meatballs (2 oz)',          unit: 'Small Tray (12 pc)', price: 23.50 },
    { id: 'mb_lg',     name: 'Meatballs (2 oz)',          unit: 'Large Tray (24 pc)', price: 46.95 },
    { id: 'mac',       name: "Mac N' Cheese w/ Hot Sausage", unit: 'Small Tray',      price: 36.95 },
    { id: 'lasagna',   name: 'Sausage Lasagna',           unit: 'Small Tray (12 servings)', price: 71.95, chooseLasagna: true },
    { id: 'buns',      name: "Mancini's Sausage Buns",    unit: 'per dozen',          price: 6.00 }
  ];

  var TAX_RATE = 0.07;

  function money(n) {
    return '$' + n.toFixed(2);
  }

  function withTax(subtotal) {
    return subtotal * (1 + TAX_RATE);
  }

  function itemRow(item) {
    var extra = '';
    if (item.askSauce) {
      extra = '<div class="cater-item-extra">' +
        '<label><input type="checkbox" data-sauce="' + item.id + '"> Add Ricci\'s homemade tomato sauce</label>' +
      '</div>';
    }
    if (item.chooseLasagna) {
      extra = '<div class="cater-item-extra">' +
        '<label><input type="radio" name="lasagna_kind" value="Hot" checked> Hot sausage</label>' +
        '<label><input type="radio" name="lasagna_kind" value="Sweet"> Sweet sausage</label>' +
      '</div>';
    }
    return '<div class="cater-item-row" data-item="' + item.id + '">' +
      '<div class="cater-item-name">' + item.name +
        '<small>' + item.unit + '</small>' +
      '</div>' +
      '<div class="cater-qty">' +
        '<button type="button" data-qty-step="-1" aria-label="Decrease">−</button>' +
        '<input type="number" min="0" value="0" data-qty="' + item.id + '" inputmode="numeric">' +
        '<button type="button" data-qty-step="1" aria-label="Increase">+</button>' +
      '</div>' +
      '<div class="cater-item-price">' + money(item.price) + '</div>' +
      extra +
    '</div>';
  }

  function buildModal() {
    var html = '' +
      '<div class="cater-modal" id="cater-modal" role="dialog" aria-modal="true" aria-labelledby="cater-title">' +
      '  <div class="cater-dialog">' +
      '    <div class="cater-header">' +
      '      <span class="eyebrow">Catering Order</span>' +
      '      <h2 id="cater-title">Order Catering Now</h2>' +
      '      <p>24-hour notice on all trays and bread. In-store pickup only. Paid online at checkout.</p>' +
      '      <button type="button" class="cater-close" id="cater-close" aria-label="Close">×</button>' +
      '    </div>' +
      '    <form class="cater-body" id="cater-form" novalidate>' +
      '      <input type="text" name="_hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
      '      <div class="cater-section">' +
      '        <div class="cater-section-head"><span class="eyebrow">Step 01</span><h3>Your Information</h3></div>' +
      '        <div class="cater-grid-2">' +
      '          <div class="cater-field" style="grid-column:1/-1;"><label for="c-name">Name</label><input id="c-name" name="name" type="text" autocomplete="name" required></div>' +
      '          <div class="cater-field"><label for="c-email">Email</label><input id="c-email" name="email" type="email" autocomplete="email" required></div>' +
      '          <div class="cater-field"><label for="c-phone">Phone</label><input id="c-phone" name="phone" type="tel" autocomplete="tel" required></div>' +
      '        </div>' +
      '      </div>' +
      '      <div class="cater-section">' +
      '        <div class="cater-section-head"><span class="eyebrow">Step 02</span><h3>Pickup Details</h3></div>' +
      '        <div class="cater-grid-2">' +
      '          <div class="cater-field"><label for="c-date">Day / Date</label><input id="c-date" name="date" type="date" required></div>' +
      '          <div class="cater-field"><label for="c-time">Time of Pickup</label><input id="c-time" name="time" type="time" required></div>' +
      '        </div>' +
      '        <div class="cater-field" style="margin-top:14px;">' +
      '          <label>Tray Preparation</label>' +
      '          <div class="cater-switch">' +
      '            <div class="cater-switch-label">How would you like the trays?<small>Prepared hot = ready to serve. Cool down = chilled for reheating at home.</small></div>' +
      '            <div class="cater-toggle" id="c-prep-toggle" data-active="hot">' +
      '              <button type="button" class="cater-toggle-opt" data-prep="hot">Hot</button>' +
      '              <button type="button" class="cater-toggle-opt" data-prep="cool">Cool Down</button>' +
      '            </div>' +
      '          </div>' +
      '        </div>' +
      '      </div>' +
      '      <div class="cater-section">' +
      '        <div class="cater-section-head"><span class="eyebrow">Step 03</span><h3>Trays &amp; Items</h3></div>' +
      '        <div class="cater-items">' + ITEMS.map(itemRow).join('') + '</div>' +
      '      </div>' +
      '      <div class="cater-section">' +
      '        <div class="cater-section-head"><span class="eyebrow">Step 04</span><h3>Notes</h3></div>' +
      '        <div class="cater-field"><label for="c-notes">Anything else we should know?</label><textarea id="c-notes" name="notes" placeholder="Headcount, allergies, special requests..."></textarea></div>' +
      '      </div>' +
      '      <span class="crm-status cater-status" role="status"></span>' +
      '    </form>' +
      '    <div class="cater-footer">' +
      '      <div class="cater-total">Estimated Total <small>(incl. 7% tax)</small><span id="cater-total">$0.00</span></div>' +
      '      <div class="cater-actions">' +
      '        <button type="button" class="btn btn-primary" id="cater-submit">Continue to Payment</button>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap.firstChild);
  }

  function getQty(id) {
    var el = document.querySelector('[data-qty="' + id + '"]');
    return el ? Math.max(0, parseInt(el.value, 10) || 0) : 0;
  }

  function recalcTotal() {
    var total = 0;
    ITEMS.forEach(function (it) {
      var q = getQty(it.id);
      total += q * it.price;
      var row = document.querySelector('.cater-item-row[data-item="' + it.id + '"]');
      if (row) row.classList.toggle('has-qty', q > 0);
    });
    var el = document.getElementById('cater-total');
    if (el) el.textContent = money(withTax(total));
  }

  /** Read the cart into {id, qty, sauce?, lasagnaKind?} lines — no prices, no names. */
  function buildCartLines() {
    var lines = [];
    ITEMS.forEach(function (it) {
      var q = getQty(it.id);
      if (q <= 0) return;
      var line = { id: it.id, qty: q };
      if (it.askSauce) {
        var sauce = document.querySelector('[data-sauce="' + it.id + '"]');
        line.sauce = !!(sauce && sauce.checked);
      }
      if (it.chooseLasagna) {
        var kind = document.querySelector('input[name="lasagna_kind"]:checked');
        line.lasagnaKind = kind ? kind.value : 'Hot';
      }
      lines.push(line);
    });
    return lines;
  }

  function markFieldInvalid(el) {
    if (!el || el.classList.contains('field-invalid')) return;
    el.classList.add('field-invalid');
    var clear = function () {
      el.classList.remove('field-invalid');
      el.removeEventListener('input', clear);
    };
    el.addEventListener('input', clear);
  }

  function showStatus(status, text, invalidFields) {
    invalidFields = invalidFields || [];
    invalidFields.forEach(markFieldInvalid);
    status.textContent = text;
    var target = invalidFields[0] || status;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (invalidFields[0]) invalidFields[0].focus();
  }

  function errorMessage(code) {
    if (code === 'payments_unavailable' || code === 'checkout_unavailable') {
      return 'Online catering orders are temporarily unavailable — please call the shop at 412-331-9531.';
    }
    if (code === 'invalid_email') return 'Please enter a valid email address.';
    if (code === 'missing_contact') return 'Please add your name and phone number.';
    if (code === 'invalid_pickup') return 'Please choose a pickup date and time.';
    if (code === 'empty_order') return 'Please add at least one item to your order.';
    if (code === 'rate_limited') return 'Too many attempts — wait a moment and try again.';
    return "Couldn't reach checkout just now — please try again, or call 412-331-9531.";
  }

  function submitOrder() {
    var form = document.getElementById('cater-form');
    var status = form.querySelector('.crm-status');

    // Honeypot: silently "succeed" for bots without creating an order or a charge.
    if (form.elements._hp && form.elements._hp.value) return;

    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var phone = form.phone.value.trim();
    var date = form.date.value;
    var time = form.time.value;
    var toggle = document.getElementById('c-prep-toggle');
    var prep = toggle.getAttribute('data-active') === 'cool' ? 'cool' : 'hot';
    var notes = form.notes.value.trim();

    if (!name || !email || !phone || !date || !time) {
      showStatus(status, 'Please fill in your name, email, phone, pickup date, and pickup time.', [
        !name && form.name, !email && form.email, !phone && form.phone,
        !date && form.date, !time && form.time
      ].filter(Boolean));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showStatus(status, 'Please enter a valid email address so we can send your receipt.', [form.email]);
      return;
    }
    var lines = buildCartLines();
    if (lines.length === 0) {
      showStatus(status, 'Please add at least one item to your order.', []);
      return;
    }

    var btn = document.getElementById('cater-submit');
    var prevLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Opening checkout…';
    status.textContent = '';

    fetch(window.CRM_BASE + '/api/catering', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        name: name,
        phone: phone,
        event_date: date,
        pickup_time: time,
        prep: prep,
        notes: notes,
        source: 'catering-modal',
        lines: lines
      })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) {
        return { ok: res.ok && j.ok, url: j.checkout_url, error: j.error };
      });
    }).catch(function () {
      return { ok: false };
    }).then(function (r) {
      if (r.ok && r.url) {
        // Leave the page — the order isn't real until Square takes payment.
        window.location.href = r.url;
        return;
      }
      btn.disabled = false;
      btn.textContent = prevLabel;
      status.textContent = errorMessage(r.error);
    });
  }

  function tomorrowISO() {
    var d = new Date();
    d.setDate(d.getDate() + 1);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function openModal() {
    var modal = document.getElementById('cater-modal');
    if (!modal) return;
    modal.classList.add('is-open');
    document.body.classList.add('cater-open');
    var dateInput = document.getElementById('c-date');
    if (dateInput && !dateInput.value) dateInput.value = tomorrowISO();
    var timeInput = document.getElementById('c-time');
    if (timeInput && !timeInput.value) timeInput.value = '13:00';
    var first = modal.querySelector('input, textarea, button');
    if (first) setTimeout(function () { first.focus(); }, 50);
  }

  function closeModal() {
    var modal = document.getElementById('cater-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('cater-open');
  }

  function wire() {
    buildModal();

    document.querySelectorAll('[data-open-catering]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openModal();
      });
    });

    var modal = document.getElementById('cater-modal');
    document.getElementById('cater-close').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });

    modal.addEventListener('click', function (e) {
      var step = e.target.getAttribute('data-qty-step');
      if (!step) return;
      var row = e.target.closest('.cater-item-row');
      var input = row && row.querySelector('input[data-qty]');
      if (!input) return;
      var v = Math.max(0, (parseInt(input.value, 10) || 0) + parseInt(step, 10));
      input.value = v;
      recalcTotal();
    });

    modal.addEventListener('input', function (e) {
      if (e.target.matches('input[data-qty]')) {
        if (parseInt(e.target.value, 10) < 0 || isNaN(parseInt(e.target.value, 10))) e.target.value = 0;
        recalcTotal();
      }
    });

    var toggle = document.getElementById('c-prep-toggle');
    toggle.addEventListener('click', function (e) {
      var opt = e.target.closest('[data-prep]');
      if (!opt) return;
      toggle.setAttribute('data-active', opt.getAttribute('data-prep'));
    });

    document.getElementById('cater-submit').addEventListener('click', submitOrder);

    var dateInput = document.getElementById('c-date');
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];
  }

  window.RicciCatering = { open: openModal };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
