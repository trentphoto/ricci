/*
 * Thanksgiving pre-order form. Live total + pickup days, then posts
 * {id, qty} lines to the CRM's /api/holiday, which prices the order
 * server-side and returns a Square-hosted checkout URL. Same flow as
 * catering-modal.js. Prices shown here are display only — the CRM's
 * holiday-catalog.ts is what's charged; keep data-price in sync with it.
 */
(function () {
  var form = document.getElementById('hol-form');
  if (!form) return;

  var PICKUP = [
    ['2026-11-23', 'Mon, Nov 23'],
    ['2026-11-24', 'Tue, Nov 24'],
    ['2026-11-25', 'Wed, Nov 25']
  ];
  var ERRORS = {
    sold_out: 'Sorry, the pre-order book is full.',
    closed: 'Thanksgiving pre-orders are closed.',
    invalid_email: 'Please check your email address.'
  };
  var lines = [].slice.call(form.querySelectorAll('.hol-line'));
  var pickup = document.getElementById('hol-pickup');
  var totalEl = document.getElementById('hol-total');
  var status = document.getElementById('hol-status');

  function fillPickup() {
    pickup.innerHTML = PICKUP.map(function (d) {
      return '<option value="' + d[0] + '">' + d[1] + '</option>';
    }).join('');
  }

  function total() {
    var cents = 0;
    lines.forEach(function (l) {
      cents += (+l.querySelector('output').value || 0) * (+l.dataset.price);
    });
    totalEl.textContent = '$' + (cents / 100).toFixed(2);
    return cents;
  }

  lines.forEach(function (l) {
    var out = l.querySelector('output');
    out.value = 0;
    l.addEventListener('click', function (e) {
      var d = e.target.getAttribute('data-d');
      if (!d) return;
      out.value = Math.max(0, Math.min(20, (+out.value || 0) + (+d)));
      total();
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!total()) { status.textContent = 'Add at least one item.'; return; }
    if (!form.checkValidity()) { status.textContent = 'Please fill in name, phone, and email.'; return; }

    var btn = form.querySelector('button[type=submit]');
    if (btn.disabled) return;
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Opening checkout…';
    status.textContent = '';

    var orderLines = lines
      .map(function (l) { return { id: l.dataset.sku, qty: +l.querySelector('output').value || 0 }; })
      .filter(function (l) { return l.qty > 0; });

    fetch(window.CRM_BASE + '/api/holiday', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        email: form.elements.email.value.trim(),
        pickup_date: pickup.value,
        source: 'thanksgiving-preorder',
        lines: orderLines
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
      btn.textContent = label;
      status.textContent = ERRORS[r.error] || 'Checkout is unavailable right now. Please call the shop at 412-331-9531.';
    });
  });

  fillPickup();
  total();
})();
