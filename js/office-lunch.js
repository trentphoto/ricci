/*
 * Ricci's Office Lunch order sheet.
 *
 * Flat-rate office lunch: $12.99/person — pick a sandwich for each person,
 * chips and a drink included. Lightweight returning-customer flow keyed by
 * email: first order is saved locally (and posted to the CRM); next visit,
 * enter your email (or be auto-recognized) and reorder in one tap.
 *
 * Prototype note: customer profiles + order history live in localStorage so
 * the returning-customer UX is fully demoable on the static site. Production
 * swaps lookupCustomer/saveOrder for CRM API calls (see js/crm.js).
 */
(function () {
  var PRICE_PER_PERSON = 12.99;

  var ITEMS = [
    { id: 'meatball', name: "Lil's Meatball Sandwich",  desc: 'Three hand-rolled meatballs, sauce, Grande cheese, Mancini\'s roll' },
    { id: 'hot',      name: 'Famous Hot Sausage',       desc: 'Hot Italian sausage, peppers & onions, sauce, Grande cheese' },
    { id: 'sweet',    name: 'Sweet Sausage Sandwich',   desc: 'Sweet Italian sausage, peppers & onions, Grande cheese' }
  ];

  var STORE_KEY = 'ricci_office_customers';
  var LAST_KEY = 'ricci_office_last_email';

  /* ---------- prototype CRM (localStorage) ---------- */

  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function writeStore(s) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function lookupCustomer(email) {
    return readStore()[email.toLowerCase()] || null;
  }
  function saveOrder(profile, order) {
    var store = readStore();
    var key = profile.email.toLowerCase();
    var existing = store[key] || { orders: [] };
    existing.name = profile.name;
    existing.email = profile.email;
    existing.company = profile.company || existing.company || '';
    existing.phone = profile.phone || existing.phone || '';
    existing.newsletter = profile.newsletter;
    existing.orders.push(order);
    store[key] = existing;
    writeStore(store);
    try { localStorage.setItem(LAST_KEY, key); } catch (e) {}

    // Best-effort post to the real CRM — page works without it.
    var lines = orderLines(order.items);
    // CRM base is defined once in js/crm.js (published as window.CRM_BASE).
    fetch(window.CRM_BASE + '/api/catering', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: profile.email,
        name: profile.name,
        phone: profile.phone,
        headcount: String(order.people),
        event_date: order.date,
        source: 'office-lunch',
        message: 'OFFICE LUNCH — ' + (profile.company || 'no company') + '\n' +
          lines.join('\n') + '\nTotal: $' + order.total.toFixed(2) +
          '\n' + order.fulfill + ' at ' + order.time +
          (order.address ? '\nDeliver to: ' + order.address : '') +
          (order.notes ? '\nNotes: ' + order.notes : '') +
          (profile.newsletter ? '\nWants holiday specials newsletter.' : '')
      })
    }).catch(function () {});
  }

  /* ---------- helpers ---------- */

  function money(n) { return '$' + n.toFixed(2); }
  function $(id) { return document.getElementById(id); }

  function getQty(id) {
    var el = document.querySelector('[data-qty="' + id + '"]');
    return el ? Math.max(0, parseInt(el.value, 10) || 0) : 0;
  }
  function setQty(id, v) {
    var el = document.querySelector('[data-qty="' + id + '"]');
    if (el) el.value = v;
  }
  function headcount() {
    return ITEMS.reduce(function (n, it) { return n + getQty(it.id); }, 0);
  }
  function orderLines(items) {
    var lines = [];
    ITEMS.forEach(function (it) {
      var q = items[it.id] || 0;
      if (q > 0) lines.push(q + ' x ' + it.name);
    });
    return lines;
  }
  function itemsFromSheet() {
    var items = {};
    ITEMS.forEach(function (it) { items[it.id] = getQty(it.id); });
    return items;
  }

  function formatDateDisplay(dateVal, timeVal) {
    if (!dateVal) return '';
    var p = dateVal.split('-');
    var d = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var str = days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate();
    if (timeVal) {
      var tp = timeVal.split(':');
      var h = parseInt(tp[0], 10);
      var ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      str += ' at ' + h + ':' + tp[1] + ' ' + ampm;
    }
    return str;
  }

  /* ---------- live totals ---------- */

  function recalc() {
    var people = headcount();
    var total = people * PRICE_PER_PERSON;
    ITEMS.forEach(function (it) {
      var row = document.querySelector('.cater-item-row[data-item="' + it.id + '"]');
      if (row) row.classList.toggle('has-qty', getQty(it.id) > 0);
    });
    $('lunch-headcount').textContent = people === 1 ? '1 person' : people + ' people';
    $('lunch-total').textContent = money(total);
  }

  /* ---------- returning customer ---------- */

  var knownCustomer = null;

  function lastOrder(cust) {
    return cust && cust.orders && cust.orders.length
      ? cust.orders[cust.orders.length - 1] : null;
  }

  function showWelcome(cust) {
    knownCustomer = cust;
    var prev = lastOrder(cust);
    var first = (cust.name || '').split(' ')[0] || 'there';
    var html = '<h3>Welcome back, ' + first + '.</h3>';
    if (cust.company) html += '<p class="lunch-welcome-co">' + cust.company + '</p>';
    if (prev) {
      html += '<div class="lunch-last-order">' +
        '<span class="eyebrow">Your Last Order</span>' +
        '<ul>' + orderLines(prev.items).map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>' +
        '<p>' + prev.people + ' people · ' + money(prev.total) + ' · chips &amp; drinks included</p>' +
        '<div class="lunch-welcome-actions">' +
          '<button type="button" class="btn btn-primary" id="lunch-reorder">Reorder This</button>' +
          '<button type="button" class="btn btn-outline-dark" id="lunch-fresh">Start Fresh</button>' +
        '</div>' +
      '</div>';
    }
    $('lunch-welcome').innerHTML = html;
    $('lunch-welcome').hidden = false;
    $('lunch-lookup').hidden = true;
    prefillContact(cust);

    var re = $('lunch-reorder');
    if (re) re.addEventListener('click', function () {
      ITEMS.forEach(function (it) { setQty(it.id, prev.items[it.id] || 0); });
      recalc();
      $('lunch-sheet').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    var fresh = $('lunch-fresh');
    if (fresh) fresh.addEventListener('click', function () {
      ITEMS.forEach(function (it) { setQty(it.id, 0); });
      recalc();
      $('lunch-sheet').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function prefillContact(cust) {
    var form = $('lunch-sheet');
    form.name.value = cust.name || '';
    form.email.value = cust.email || '';
    form.company.value = cust.company || '';
    form.phone.value = cust.phone || '';
    if (typeof cust.newsletter === 'boolean') form.newsletter.checked = cust.newsletter;
    $('lunch-contact-note').textContent =
      'Ordering as ' + cust.email + ' — saved from your last order. Edit anything that\'s changed.';
  }

  function wireLookup() {
    $('lunch-lookup-btn').addEventListener('click', function () {
      var email = $('lunch-lookup-email').value.trim();
      var status = $('lunch-lookup-status');
      if (!email || email.indexOf('@') < 1) {
        status.textContent = 'Please enter the email you ordered with.';
        return;
      }
      var cust = lookupCustomer(email);
      if (cust) {
        status.textContent = '';
        showWelcome(cust);
      } else {
        status.textContent = "We don't have an order under that email yet — build your first one below and we'll save it.";
      }
    });
    $('lunch-lookup-email').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); $('lunch-lookup-btn').click(); }
    });
  }

  /* ---------- submit ---------- */

  function submitOrder() {
    var form = $('lunch-sheet');
    var people = headcount();
    if (people === 0) {
      alert('Add at least one sandwich — every person gets a sandwich, chips, and a drink.');
      return;
    }
    var date = form.date.value;
    var time = form.time.value;
    if (!date || !time) {
      alert('Tell us the day and time you need lunch.');
      return;
    }
    var fulfill = $('lunch-fulfill').getAttribute('data-active') === 'delivery' ? 'Delivery' : 'Pickup';
    var address = form.address.value.trim();
    if (fulfill === 'Delivery' && !address) {
      alert('Where should we deliver? Add your office address.');
      return;
    }
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    if (!name || !email || email.indexOf('@') < 1) {
      alert('Add your name and email so we can save your order for next time.');
      return;
    }

    var order = {
      placedAt: new Date().toISOString(),
      items: itemsFromSheet(),
      people: people,
      total: people * PRICE_PER_PERSON,
      date: date,
      time: time,
      fulfill: fulfill,
      address: address,
      notes: form.notes.value.trim()
    };
    var profile = {
      name: name,
      email: email,
      company: form.company.value.trim(),
      phone: form.phone.value.trim(),
      newsletter: form.newsletter.checked
    };
    var isReturning = !!lookupCustomer(email);
    saveOrder(profile, order);
    showSuccess(profile, order, isReturning);
  }

  function showSuccess(profile, order, isReturning) {
    var lines = orderLines(order.items).map(function (l) { return '<li>' + l + '</li>'; }).join('');
    var savedNote = isReturning
      ? 'Your order history is updated — next time it\'s one tap to reorder.'
      : 'We saved this order under <strong>' + profile.email + '</strong>. Next time, just enter your email and reorder in one tap.';
    $('lunch-sheet').innerHTML =
      '<div class="cater-success" style="padding:40px 0;">' +
        '<h3>Lunch is handled, ' + profile.name.split(' ')[0] + '.</h3>' +
        '<div class="cater-success-pickup">' +
          '<span class="eyebrow">' + order.fulfill + '</span>' +
          '<p class="cater-success-date">' + formatDateDisplay(order.date, order.time) + '</p>' +
          '<p class="cater-success-addr">' + (order.fulfill === 'Delivery'
            ? order.address
            : 'In-store pickup · 500 Pine Hollow Rd · McKees Rocks, PA 15136') + '</p>' +
        '</div>' +
        '<div class="cater-success-summary">' +
          '<span class="eyebrow">Order Summary · ' + order.people + ' people</span>' +
          '<ul>' + lines + '</ul>' +
          '<p class="cater-success-total">Chips &amp; drinks for everyone included.</p>' +
          '<p class="cater-success-total">Total: <strong>' + money(order.total) + '</strong> (' + order.people + ' × ' + money(PRICE_PER_PERSON) + ')</p>' +
          (order.notes ? '<p class="cater-success-notes">Notes: ' + order.notes + '</p>' : '') +
        '</div>' +
        '<p class="cater-success-contact">' + savedNote + '</p>' +
        '<p class="cater-success-contact">We\'ll confirm by email shortly. Questions? Call <a href="tel:4123319531" style="color:var(--red);font-weight:600;">412-331-9531</a>.</p>' +
      '</div>';
    $('lunch-sheet').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- wire up ---------- */

  function wire() {
    var sheet = $('lunch-sheet');
    if (!sheet) return;

    sheet.addEventListener('click', function (e) {
      var step = e.target.getAttribute('data-qty-step');
      if (!step) return;
      var row = e.target.closest('.cater-item-row');
      var input = row && row.querySelector('input[data-qty]');
      if (!input) return;
      input.value = Math.max(0, (parseInt(input.value, 10) || 0) + parseInt(step, 10));
      recalc();
    });
    sheet.addEventListener('input', function (e) {
      if (e.target.matches('input[data-qty]')) {
        if (isNaN(parseInt(e.target.value, 10)) || parseInt(e.target.value, 10) < 0) e.target.value = 0;
        recalc();
      }
    });

    var fulfill = $('lunch-fulfill');
    fulfill.addEventListener('click', function (e) {
      var opt = e.target.closest('[data-prep]');
      if (!opt) return;
      fulfill.setAttribute('data-active', opt.getAttribute('data-prep'));
      $('lunch-address-field').hidden = opt.getAttribute('data-prep') !== 'delivery';
    });

    $('lunch-submit').addEventListener('click', submitOrder);
    wireLookup();

    var dateInput = $('lunch-sheet').date;
    dateInput.min = new Date().toISOString().split('T')[0];

    // Recognize a returning visitor on this device automatically.
    var last = null;
    try { last = localStorage.getItem(LAST_KEY); } catch (e) {}
    if (last) {
      var cust = lookupCustomer(last);
      if (cust) showWelcome(cust);
    }

    recalc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
