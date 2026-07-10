/*
 * Ricci's Pepperoni Roll pre-order modal.
 *
 * Opens from any [data-open-preorder] button. Collects name, phone, quantity,
 * and pickup time, then posts to the CRM as a "general" contact (which emails
 * James automatically). The pickup date is always the UPCOMING MONDAY, computed
 * fresh on load — so it rolls forward on its own each week with no edits.
 *
 * Reuses the .cater-* modal styles from css/styles.css.
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

  // Pickup slots: 9:00 AM through 5:30 PM in 30-minute steps.
  function timeOptions() {
    var out = '';
    for (var m = 9 * 60; m <= 17 * 60 + 30; m += 30) {
      var h = Math.floor(m / 60), mm = m % 60;
      var ampm = h >= 12 ? 'PM' : 'AM';
      var h12 = h % 12 || 12;
      var label = h12 + ':' + pad(mm) + ' ' + ampm;
      out += '<option value="' + label + '">' + label + '</option>';
    }
    return out;
  }

  var pickup = nextMonday();
  var pickupLabel = headerDate(pickup);

  function buildModal() {
    if (document.getElementById('preorder-modal')) return;
    var html =
      '<div class="cater-modal" id="preorder-modal" role="dialog" aria-modal="true" aria-labelledby="preorder-title">' +
      '  <div class="cater-dialog" style="max-width:620px;">' +
      '    <div class="cater-header">' +
      '      <span class="eyebrow">Pepperoni Roll · Pre-Order</span>' +
      '      <h2 id="preorder-title">Reserve Your Pepperoni Rolls</h2>' +
      '      <p>$16.99 each. Pickup <strong>' + pickupLabel + '</strong> at 500 Pine Hollow Rd. Mondays only &mdash; reserve while they last.</p>' +
      '      <button type="button" class="cater-close" id="preorder-close" aria-label="Close">&times;</button>' +
      '    </div>' +
      '    <form class="cater-body" id="preorder-form" novalidate>' +
      '      <input type="text" name="_hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
      '      <div class="cater-grid-2">' +
      '        <div class="cater-field" style="grid-column:1/-1;"><label for="pre-name">Name</label><input id="pre-name" name="name" type="text" autocomplete="name" required></div>' +
      '        <div class="cater-field" style="grid-column:1/-1;"><label for="pre-email">Email</label><input id="pre-email" name="email" type="email" autocomplete="email" required></div>' +
      '        <div class="cater-field"><label for="pre-phone">Phone</label><input id="pre-phone" name="phone" type="tel" autocomplete="tel" required></div>' +
      '        <div class="cater-field"><label for="pre-qty">How Many?</label><input id="pre-qty" name="qty" type="number" min="1" value="1" inputmode="numeric" required></div>' +
      '        <div class="cater-field" style="grid-column:1/-1;"><label for="pre-time">Pickup Time &middot; ' + pickupLabel + '</label><select id="pre-time" name="time" required>' + timeOptions() + '</select></div>' +
      '      </div>' +
      '      <span class="crm-status" role="status" style="display:block;margin-top:18px;font-size:0.92rem;color:var(--red);"></span>' +
      '    </form>' +
      '    <div class="cater-footer">' +
      '      <div class="cater-total" style="font-size:0.85rem;letter-spacing:0.02em;color:#6b5544;">$16.99 each · Mondays Only</div>' +
      '      <div class="cater-actions"><button type="button" class="btn btn-primary" id="preorder-submit">Reserve Now</button></div>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap.firstChild);
  }

  function openModal() {
    var modal = document.getElementById('preorder-modal');
    if (!modal) return;
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

  function renderSuccess(name, qty, time) {
    var body = document.getElementById('preorder-form');
    var footer = document.querySelector('#preorder-modal .cater-footer');
    if (body) {
      body.innerHTML =
        '<div class="cater-success">' +
          '<h3>You\'re in, ' + (name ? name.split(' ')[0] : 'friend') + '.</h3>' +
          '<div class="cater-success-pickup">' +
            '<span class="eyebrow">Pickup</span>' +
            '<p class="cater-success-date">' + pickupLabel + ' at ' + time + '</p>' +
            '<p class="cater-success-addr">In-store pickup · 500 Pine Hollow Rd · McKees Rocks, PA 15136</p>' +
          '</div>' +
          '<div class="cater-success-summary">' +
            '<span class="eyebrow">Your Reservation</span>' +
            '<ul><li>' + qty + ' × Pepperoni Roll</li></ul>' +
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
    btn.textContent = 'Reserving…';
    status.textContent = '';

    var message = 'PEPPERONI ROLL PRE-ORDER\n' +
      'Quantity: ' + qty + '\n' +
      'Pickup: ' + pickupLabel + ' at ' + time + '\n' +
      'Phone: ' + phone;

    var base = window.CRM_BASE || 'https://riccis-crm.fly.dev';
    fetch(base + '/api/general', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        email: email,
        phone: phone,
        source: 'pepperoni-preorder',
        event_date: isoDate(pickup),
        headcount: String(qty),
        message: message
      })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) {
        return res.ok && j.ok;
      });
    }).catch(function () {
      return false;
    }).then(function (ok) {
      if (!ok) {
        btn.disabled = false;
        btn.textContent = prev;
        status.textContent = "Couldn't send just now — please try again, or call 412-331-9531.";
        return;
      }
      renderSuccess(name, qty, time);
    });
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
    document.getElementById('preorder-close').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });
    document.getElementById('preorder-submit').addEventListener('click', submit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
