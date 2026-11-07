/*
 * Ricci's Pepperoni Roll pre-order modal.
 *
 * Opens from any [data-open-preorder] button. Collects name, phone, quantity,
 * and pickup time, posts to the CRM's /api/preorder, then sends the customer
 * to the Square-hosted checkout page it returns. Pre-orders are PREPAID — the
 * shop only sees a confirmed reservation after Square reports the charge.
 *
 * The pickup date is always the UPCOMING MONDAY, computed fresh on load — so it
 * rolls forward on its own each week with no edits.
 *
 * The running total uses PRICES below. These must match the CRM's
 * PEPPERONI_ROLL_PRICE_CENTS / SAUSAGE_ROLL_PRICE_CENTS — the CRM is what
 * actually charges, so change both together.
 *
 * Reuses the .cater-* modal styles from css/styles.css.
 *
 * Inline mode: if the page has a #preorder-inline element (the /pepperoni-roll
 * landing page), the form renders there instead of in a modal, and
 * [data-open-preorder] buttons scroll to it.
 */
(function () {
  var MONTHS = ['January','February','March','April','May','June','July',
                'August','September','October','November','December'];
  var DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function pad(n) { return String(n).padStart(2, '0'); }

  // The upcoming Monday (today if today IS Monday), reset to midnight.
  function nextMonday() {
    var d = new Date();
    var diff = (1 - d.getDay() + 7) % 7; // 0 when today is Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function isoDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function headerDate(d) {
    return DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + ordinal(d.getDate());
  }

  // Pickup slots: 11:00 AM through 5:30 PM in 30-minute steps.
  function timeOptions() {
    var out = '';
    for (var m = 11 * 60; m <= 17 * 60 + 30; m += 30) {
      var h = Math.floor(m / 60), mm = m % 60;
      var ampm = h >= 12 ? 'PM' : 'AM';
      var h12 = h % 12 || 12;
      var label = h12 + ':' + pad(mm) + ' ' + ampm;
      out += '<option value="' + label + '">' + label + '</option>';
    }
    return out;
  }

  // −/+ counter using the catering modal's .cater-qty styles.
  function stepper(id, name, value, min) {
    var btn = 'style="flex:0 0 44px;width:44px;padding:0;"';
    return '<div class="cater-qty" data-min="' + min + '" style="display:inline-flex;width:auto;align-self:flex-start;">' +
      '<button type="button" data-step="-1" aria-label="Fewer" ' + btn + '>&minus;</button>' +
      '<input id="' + id + '" name="' + name + '" type="number" min="' + min + '" value="' + value + '" inputmode="numeric" style="flex:0 0 56px;width:56px;padding:0;">' +
      '<button type="button" data-step="1" aria-label="More" ' + btn + '>+</button>' +
      '</div>';
  }

  var PRICES = { qty: 1699, sausage_roll_qty: 1399 }; // cents

  function updateTotal() {
    var form = document.getElementById('preorder-form');
    var el = document.getElementById('preorder-total');
    if (!form || !el) return;
    var cents = 0;
    Object.keys(PRICES).forEach(function (k) {
      cents += PRICES[k] * Math.max(0, parseInt(form.elements[k].value, 10) || 0);
    });
    el.textContent = 'Total $' + (cents / 100).toFixed(2) + ' · Paid at checkout';
  }

  var pickup = nextMonday();
  var pickupLabel = headerDate(pickup);

  var inlineHost = null;

  function buildModal() {
    if (document.getElementById('preorder-modal')) return;
    inlineHost = document.getElementById('preorder-inline');
    var html =
      (inlineHost
        ? '<div class="preorder-inline" id="preorder-modal" aria-labelledby="preorder-title">'
        : '<div class="cater-modal" id="preorder-modal" role="dialog" aria-modal="true" aria-labelledby="preorder-title">') +
      '  <div class="cater-dialog" style="max-width:620px;">' +
      '    <div class="cater-header">' +
      '      <span class="eyebrow">Pepperoni Roll · Pre-Order</span>' +
      '      <h2 id="preorder-title">Reserve Your Pepperoni Rolls</h2>' +
      '      <p>$16.99 each. Pickup <strong>' + pickupLabel + '</strong> at 590 Pine Hollow Rd. Mondays only &mdash; reserve while they last.</p>' +
      '      <p style="font-weight:600;">Earliest pickup is 11:00 AM.</p>' +
      (inlineHost ? '' : '      <button type="button" class="cater-close" id="preorder-close" aria-label="Close">&times;</button>') +
      '    </div>' +
      '    <form class="cater-body" id="preorder-form" novalidate>' +
      '      <input type="text" name="_hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
      '      <div class="cater-grid-2">' +
      '        <div class="cater-field" style="grid-column:1/-1;"><label for="pre-name">Name</label><input id="pre-name" name="name" type="text" autocomplete="name" required></div>' +
      '        <div class="cater-field" style="grid-column:1/-1;"><label for="pre-email">Email</label><input id="pre-email" name="email" type="email" autocomplete="email" required></div>' +
      '        <div class="cater-field"><label for="pre-phone">Phone</label><input id="pre-phone" name="phone" type="tel" autocomplete="tel" required></div>' +
      '        <div class="cater-field"><label for="pre-qty">How Many?</label>' + stepper('pre-qty', 'qty', 1, 1) + '</div>' +
      '        <div class="cater-field" style="grid-column:1/-1;"><label for="pre-time">Pickup Time &middot; ' + pickupLabel + '</label><select id="pre-time" name="time" required>' + timeOptions() + '</select></div>' +
      '      </div>' +
      '      <p style="margin:18px 0 0;font-size:0.85rem;color:#6b5544;">Pre-orders are paid in advance. The next step is Square\'s secure checkout &mdash; we never see your card details.</p>' +
      '      <div style="margin-top:18px;display:flex;align-items:center;gap:14px;padding:12px;border:1px solid rgba(122,26,26,0.18);background:#fbf6ee;">' +
      '        <img src="/assets/img/sausage-roll.webp" alt="Lil\'s Sausage Roll" width="76" height="76" style="width:76px;height:76px;object-fit:cover;flex:0 0 76px;">' +
      '        <div style="flex:1;min-width:0;">' +
      '          <label for="pre-addon" style="display:block;margin:0;font-family:var(--font-serif);font-size:1.15rem;font-weight:700;color:var(--ink);text-transform:none;letter-spacing:0;">Add a Lil\'s Sausage Roll?</label>' +
      '          <span style="font-size:0.95rem;color:#6b5544;">$13.99 each &middot; made fresh daily</span>' +
      '        </div>' +
      '        ' + stepper('pre-addon', 'sausage_roll_qty', 0, 0) +
      '      </div>' +
      '      <span class="crm-status" role="status" style="display:block;margin-top:10px;font-size:0.92rem;color:var(--red);"></span>' +
      '    </form>' +
      '    <div class="cater-footer">' +
      '      <div class="cater-total" id="preorder-total" style="font-size:1rem;font-weight:600;letter-spacing:0.02em;color:var(--ink);">Total $16.99 · Paid at checkout</div>' +
      '      <div class="cater-actions"><button type="button" class="btn btn-primary" id="preorder-submit">Continue to Payment</button></div>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    (inlineHost || document.body).appendChild(wrap.firstChild);
  }

  function openModal() {
    var modal = document.getElementById('preorder-modal');
    if (!modal) return;
    if (inlineHost) {
      modal.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var f = document.getElementById('pre-name');
      if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 400);
      return;
    }
    modal.classList.add('is-open');
    document.body.classList.add('cater-open');
    var first = document.getElementById('pre-name');
    if (first) setTimeout(function () { first.focus(); }, 50);
  }

  function closeModal() {
    var modal = document.getElementById('preorder-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('cater-open');
  }

  function renderSuccess(name, qty, time, addon) {
    var body = document.getElementById('preorder-form');
    var footer = document.querySelector('#preorder-modal .cater-footer');
    if (body) {
      body.innerHTML =
        '<div class="cater-success">' +
          '<h3>You\'re in, ' + (name ? name.split(' ')[0] : 'friend') + '.</h3>' +
          '<div class="cater-success-pickup">' +
            '<span class="eyebrow">Pickup</span>' +
            '<p class="cater-success-date">' + pickupLabel + ' at ' + time + '</p>' +
            '<p class="cater-success-addr">In-store pickup · 590 Pine Hollow Rd · McKees Rocks, PA 15136</p>' +
          '</div>' +
          '<div class="cater-success-summary">' +
            '<span class="eyebrow">Your Reservation</span>' +
            '<ul><li>' + qty + ' × Pepperoni Roll</li>' + (addon ? '<li>' + addon + ' × Lil\'s Sausage Roll</li>' : '') + '</ul>' +
          '</div>' +
          '<p class="cater-success-contact">Questions? Call us at <a href="tel:4123319531" style="color:var(--red);font-weight:600;">412-331-9531</a>.</p>' +
        '</div>';
    }
    if (footer) footer.style.display = 'none';
  }

  function submit() {
    var form = document.getElementById('preorder-form');
    var status = form.querySelector('.crm-status');

    // Honeypot: silently "succeed" for bots without sending anything.
    if (form.elements._hp && form.elements._hp.value) { renderSuccess('', 0, ''); return; }

    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var phone = form.phone.value.trim();
    var qty = Math.max(1, parseInt(form.qty.value, 10) || 1);
    var addon = Math.max(0, parseInt(form.sausage_roll_qty.value, 10) || 0);
    var time = form.time.value;

    if (!name || !phone || !email) {
      status.textContent = 'Please add your name, email, and phone number.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = 'Please enter a valid email address.';
      return;
    }

    var btn = document.getElementById('preorder-submit');
    var prev = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Opening checkout…';
    if (window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        value: (qty * PRICES.qty + addon * PRICES.sausage_roll_qty) / 100,
        currency: 'USD',
        content_name: 'Pepperoni Roll Pre-Order'
      });
    }
    status.textContent = '';

    var base = window.CRM_BASE || 'https://riccis-crm.fly.dev';
    fetch(base + '/api/preorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        email: email,
        phone: phone,
        qty: qty,
        sausage_roll_qty: addon,
        source: inlineHost ? 'pepperoni-landing' : 'pepperoni-preorder',
        pickup_date: isoDate(pickup),
        pickup_label: pickupLabel,
        pickup_time: time
      })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) {
        return { ok: res.ok && j.ok, url: j.checkout_url, error: j.error, max: j.max };
      });
    }).catch(function () {
      return { ok: false };
    }).then(function (r) {
      if (r.ok && r.url) {
        // Leave the page — the reservation isn't real until Square takes payment.
        window.location.href = r.url;
        return;
      }
      btn.disabled = false;
      btn.textContent = prev;
      status.textContent = errorMessage(r.error, r.max);
    });
  }

  function errorMessage(code, max) {
    if (code === 'payments_unavailable' || code === 'checkout_unavailable') {
      return 'Online pre-orders are temporarily unavailable — please call the shop at 412-331-9531 to reserve.';
    }
    if (code === 'invalid_quantity') {
      return max
        ? 'Please choose between 1 and ' + max + '. For larger orders, call 412-331-9531.'
        : 'Please enter a valid quantity.';
    }
    if (code === 'invalid_email') return 'Please enter a valid email address.';
    if (code === 'rate_limited') return 'Too many attempts — wait a moment and try again.';
    return "Couldn't reach checkout just now — please try again, or call 412-331-9531.";
  }

  function wire() {
    buildModal();

    document.querySelectorAll('[data-open-preorder]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openModal();
      });
    });

    var modal = document.getElementById('preorder-modal');
    if (!inlineHost) {
      document.getElementById('preorder-close').addEventListener('click', closeModal);
      modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
      });
    }
    document.getElementById('preorder-submit').addEventListener('click', submit);

    modal.querySelectorAll('.cater-qty button').forEach(function (b) {
      b.addEventListener('click', function () {
        var box = b.parentNode, input = box.querySelector('input');
        var min = parseInt(box.getAttribute('data-min'), 10) || 0;
        var n = (parseInt(input.value, 10) || 0) + parseInt(b.getAttribute('data-step'), 10);
        input.value = Math.max(min, n);
        updateTotal();
      });
    });
    modal.querySelectorAll('.cater-qty input').forEach(function (i) { i.addEventListener('input', updateTotal); });
    updateTotal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
