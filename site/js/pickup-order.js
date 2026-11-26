/*
 * Online pickup ordering (DRAFT) — order.html.
 *
 * Menu + prices load live from the CRM (/api/pickup-menu → Square catalog).
 * Checkout posts {id, qty}[] to /api/pickup-order; the CRM creates a Square
 * checkout and returns its URL. The browser never sends a price.
 *
 * Built for a hungry lunch crowd on a phone: best-seller first, meals folded
 * into sandwich cards, ASAP by default, name + phone only, remembered details
 * and a one-tap "your usual". All times are store time (America/New_York).
 */
(function () {
  var BASE = window.CRM_BASE || 'https://riccis-crm.fly.dev';
  var TZ = 'America/New_York';
  // Store hours (wiki): Mon–Fri 8:30–5, Sat 9–4, Sun closed. [open, close] in minutes.
  var HOURS = { 0: null, 1: [510, 1020], 2: [510, 1020], 3: [510, 1020], 4: [510, 1020], 5: [510, 1020], 6: [540, 960] };
  var LEAD_MIN = 20, STEP = 15, LAST_CALL = 15, LUNCH = 690; // 11:30 default for future days
  var DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  var HERO_ID = 'YUIBR7DBNLTR2MBFCDZGBP72'; // Hot Sausage Sandwich — the best-seller
  var UPSELL = [
    { id: 'IVLCBOAUD53ESI7S6KJ6I37Y', label: 'Add a cookie' },
    { id: 'NJKJUP6YJ2NNVCBKHKRKOVIB', label: "Add a Lil's Sausage Roll for the office" }
  ];
  var IMG = 'assets/img/order/';
  var PHOTOS = {
    YUIBR7DBNLTR2MBFCDZGBP72: 'hot-sausage-sandwich', SWJ7QTUMJ2NLZOXYNWOBDDHQ: 'sweet-sausage-sandwich',
    MPWHYB4ENPCHQV2J2WGWHIFE: 'meatball-sandwich', NOUICFHQ3CLCT34KSALGIYVM: 'banana-pepper-sandwich',
    NJKJUP6YJ2NNVCBKHKRKOVIB: 'sausage-roll', XH4MPOM5HMUY65PPN7KCAWRD: 'pepperoni-roll', ZPWFOPFPXUMIMG2OX6XY5LRV: 'pepperoni-roll',
    KLXQNOFXSSXLM3UUKNILTUOZ: 'sausage-lasagna', R2PLSXAMWSDLMEYCQVTXQ5T3: 'mac-and-cheese', LMKFY4RRZOEIMKBPULPUVUYV: 'meatball',
    KWBBCJH35J6EV7JVU5RZA7HG: 'chips', '25CCTL6MRFQZXKU4SXDMR5YL': 'soft-drink',
    IVLCBOAUD53ESI7S6KJ6I37Y: 'cookie', '4XIUCNBB4P56U4CNSA3TXQI6': 'cookie', D5VEF22EQ4BZ2NROWAX6IUHR: 'cookie',
    III65J3LLLY35WPH4T7GVTZG: 'side-of-sauce', '2YIG7L472CD52EDUWG7WRHU6': 'cheese'
  };
  var SMALL = { 'Sides & Drinks': true };
  var STORE_KEY = 'ricci-pickup-v1';

  var cart = {};       // id -> qty
  var items = {};      // id -> item
  var mealOf = {};     // sandwich id -> meal item
  var menuData = null;
  var slots = [];
  var $ = function (id) { return document.getElementById(id); };
  var money = function (c) { return '$' + (c / 100).toFixed(2); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); };

  // ── analytics: GA4 + Meta, both optional ───────────────────────────
  function track(event, params) {
    try { if (window.gtag) window.gtag('event', event, params || {}); } catch (e) {}
    var fb = { add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', view_item_list: 'ViewContent' }[event];
    try { if (fb && window.fbq) window.fbq('track', fb, params && params.value ? { value: params.value, currency: 'USD' } : {}); } catch (e) {}
  }

  // ── storage (per-device convenience only) ───────────────────────────
  function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; } }
  function save(patch) { try { var s = load(); for (var k in patch) s[k] = patch[k]; localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} }

  // ── store time ──────────────────────────────────────────────────────
  function storeNow() {
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    var y = +p.year, m = +p.month, d = +p.day;
    return { y: y, m: m, d: d, min: (+p.hour % 24) * 60 + +p.minute, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
  }
  function dayAfter(now, n) {
    var dt = new Date(Date.UTC(now.y, now.m - 1, now.d + n));
    return { iso: dt.toISOString().slice(0, 10), dow: dt.getUTCDay(), n: n };
  }
  function clock(m) { var h = Math.floor(m / 60), mm = m % 60; return ((h + 11) % 12 + 1) + ':' + String(mm).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM'); }
  function dayName(day) { return day.n === 0 ? 'Today' : day.n === 1 ? 'Tomorrow' : DAY[day.dow]; }

  // ── holidays ────────────────────────────────────────────────────────
  // Closed all day, or open for catering only. Federal holidays not listed here
  // (MLK, Presidents, Juneteenth, Columbus, Veterans) are normal business days.
  function nthDow(y, m, dow, n) { // n-th weekday of month (n = -1 → last)
    if (n < 0) { var e = new Date(Date.UTC(y, m, 0)); return e.getUTCDate() - ((e.getUTCDay() - dow + 7) % 7); }
    var f = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); return 1 + ((dow - f + 7) % 7) + (n - 1) * 7;
  }
  function holiday(y, m, d) {
    var md = m + '-' + d;
    if (md === '12-24') return { cateringOnly: true, name: 'Christmas Eve' };
    if (md === '12-25') return { name: 'Christmas' };
    if (md === '1-1') return { name: "New Year's Day" };
    if (md === '7-4') return { name: 'the Fourth of July' };
    if (m === 5 && d === nthDow(y, 5, 1, -1)) return { name: 'Memorial Day' };
    if (m === 9 && d === nthDow(y, 9, 1, 1)) return { name: 'Labor Day' };
    if (m === 11 && d === nthDow(y, 11, 4, 4)) return { name: 'Thanksgiving' };
    return null;
  }

  // Slots for the next open day: today while open, otherwise order ahead.
  // Holidays (closed or catering-only) are skipped like closed days.
  function buildSlots() {
    var now = storeNow(), status = null, note = '';
    var hol0 = holiday(now.y, now.m, now.d);
    if (hol0) note = hol0.cateringOnly
      ? '<strong>' + hol0.name + ': catering only.</strong> <a href="catering.html">Order catering trays &rarr;</a> Pickup orders: '
      : '<strong>Closed for ' + hol0.name + '.</strong> ';
    slots = [];
    for (var i = 0; i < 10 && !slots.length; i++) {
      var day = dayAfter(now, i), h = HOURS[day.dow];
      var dt = new Date(Date.UTC(now.y, now.m - 1, now.d + i));
      if (!h || holiday(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())) continue;
      var last = h[1] - LAST_CALL, start = h[0];
      if (i === 0) start = Math.max(start, now.min + LEAD_MIN);
      start = Math.ceil(start / STEP) * STEP;
      if (start > last) continue;
      var openNow = i === 0 && now.min >= h[0] && now.min < last;
      if (openNow) slots.push({ date: day.iso, dow: day.dow, time: 'ASAP', label: 'ASAP · ready in about ' + LEAD_MIN + ' min' });
      for (var m = start; m <= last; m += STEP) slots.push({ date: day.iso, dow: day.dow, time: clock(m), mins: m, label: dayName(day) + ' at ' + clock(m) });

      var dn = dayName(day).replace(/^\w/, function (c) { return c.toUpperCase(); });
      if (openNow) status = { open: true, text: '<strong>Open now</strong> · Ready in about ' + LEAD_MIN + ' min · Closes ' + clock(h[1]) };
      else if (i === 0) status = { open: false, text: '<strong>Opens ' + clock(h[0]) + '</strong> · Order now for pickup today' };
      else status = { open: false, text: (note || '<strong>Closed now</strong> · ') + 'Order ahead for ' + dn + ' from ' + clock(h[0]) };
    }
    if (!status) status = { open: false, text: '<strong>Online ordering is closed.</strong> Call 412-331-9531.' };

    // Default: ASAP when open; otherwise lunchtime on the next open day.
    var def = 0;
    if (slots.length && slots[0].time !== 'ASAP') {
      for (var j = 0; j < slots.length; j++) if (slots[j].mins >= LUNCH) { def = j; break; }
    }
    $('po-time').innerHTML = slots.map(function (o, k) {
      return '<option value="' + k + '"' + (k === def ? ' selected' : '') + '>' + esc(o.label) + '</option>';
    }).join('');
    $('po-status').innerHTML = '<span class="po-dot' + (status.open ? ' is-open' : '') + '"></span>' + status.text;
    syncTimeLabel();
  }
  function slot() { return slots[+$('po-time').value] || null; }
  function syncTimeLabel() { var s = slot(); $('po-time-label').textContent = s ? s.label : 'No pickup times available'; }

  // ── availability (day-limited hot-case items) ───────────────────────
  function availableOn(it, dow) { return !it.days || it.days.indexOf(dow) !== -1; }
  function nextDayName(it, dow) {
    for (var i = 1; i <= 7; i++) { var d = (dow + i) % 7; if (it.days.indexOf(d) !== -1 && HOURS[d]) return DAY[d]; }
    return '';
  }
  function pickupDow() { var s = slot(); return s ? s.dow : storeNow().dow; }

  // ── rendering ───────────────────────────────────────────────────────
  function stepper(id, q) {
    return '<span class="po-step">' +
      '<button type="button" data-dec="' + id + '" aria-label="Remove one">−</button>' +
      '<span class="po-step-q" aria-live="polite">' + q + '</span>' +
      '<button type="button" data-add="' + id + '" aria-label="Add one">+</button></span>';
  }

  function mediaFor(it, eager) {
    var photo = PHOTOS[it.id], title = it.name.split(' — ')[0];
    var attrs = eager ? ' fetchpriority="high"' : ' loading="lazy"';
    return photo
      ? '<img src="' + IMG + photo + '.webp" alt="' + esc(title) + '" width="900" height="675"' + attrs + ' />'
      : '<span class="po-plate">' + esc(title) + '</span>';
  }

  function card(it, opts) {
    opts = opts || {};
    var parts = it.name.split(' — '), title = parts[0], variant = parts[1] || '';
    var dow = pickupDow(), ok = availableOn(it, dow);
    var meal = mealOf[it.id], limited = !!it.days;
    var q = cart[it.id] || 0, mq = meal ? cart[meal.id] || 0 : 0;
    var cls = 'po-card' + (opts.small ? ' po-card--sm' : '') + (opts.hero ? ' po-card--hero' : '') + (!ok ? ' is-off' : '') + (q || mq ? ' is-added' : '');

    var badge = opts.hero ? '<span class="po-tag po-tag--hot">Most ordered</span>'
      : limited && ok ? '<span class="po-tag po-tag--today">Today only</span>'
      : limited ? '<span class="po-tag">Back ' + esc(nextDayName(it, dow)) + '</span>' : '';

    var actions;
    if (!ok) {
      actions = '<span class="po-off">Available ' + esc(it.days.map(function (d) { return DAY[d]; }).join(' & ')) + '</span>';
    } else {
      actions = '<span class="po-actions">' +
        (q ? stepper(it.id, q) : '<button type="button" class="po-btn" data-add="' + it.id + '">Add · ' + money(it.priceCents) + '</button>') +
        (meal ? (mq
          ? '<span class="po-meal-on">Meal ' + stepper(meal.id, mq) + '</span>'
          : '<button type="button" class="po-btn po-btn--meal" data-add="' + meal.id + '">Make it a meal +' + money(meal.priceCents - it.priceCents) + '</button>') : '') +
      '</span>';
    }

    return '<li class="' + cls + '">' +
      '<button type="button" class="po-media"' + (ok ? ' data-add="' + it.id + '"' : ' disabled') + ' aria-label="Add ' + esc(it.name) + '">' +
        mediaFor(it, opts.eager) + badge +
      '</button>' +
      '<div class="po-body">' +
        '<h3 class="po-title">' + esc(title) + (variant && variant !== 'Each' ? ' <em>' + esc(variant) + '</em>' : '') + '</h3>' +
        (it.description && !opts.small ? '<p class="po-desc">' + esc(it.description) + '</p>' : '') +
        (meal && ok ? '<p class="po-meal-note">Meal: + chips or a cookie + a drink</p>' : '') +
        (opts.small ? '<span class="po-price">' + money(it.priceCents) + '</span>' : '') +
        actions +
      '</div></li>';
  }

  function renderMenu() {
    if (!menuData) return;
    var html = '', eagerLeft = 3;
    var hero = items[HERO_ID];
    if (hero) { html += '<ul class="po-grid po-grid--hero">' + card(hero, { hero: true, eager: true }) + '</ul>'; eagerLeft--; }

    var sections = menuData.filter(function (s) { return s.section !== 'Meals'; });
    html = '<nav class="po-tabs" aria-label="Menu sections">' + sections.map(function (s, i) {
      return '<a href="#po-s' + i + '">' + esc(s.section) + '</a>';
    }).join('') + '</nav>' + html;

    html += sections.map(function (s, i) {
      var list = s.items.filter(function (it) { return it.id !== HERO_ID; });
      return '<section class="po-section" id="po-s' + i + '"><h2>' + esc(s.section) + '</h2>' +
        '<ul class="po-grid' + (SMALL[s.section] ? ' po-grid--sm' : '') + '">' +
        list.map(function (it) { var e = eagerLeft-- > 0; return card(it, { small: SMALL[s.section], eager: e }); }).join('') +
        '</ul></section>';
    }).join('');
    $('po-menu').innerHTML = html;
  }

  function renderUsual() {
    var u = load().usual, box = $('po-usual');
    if (!u || !u.length || !menuData) { box.hidden = true; return; }
    var valid = u.filter(function (l) { return items[l.id] && availableOn(items[l.id], pickupDow()); });
    if (!valid.length) { box.hidden = true; return; }
    var total = valid.reduce(function (s, l) { return s + items[l.id].priceCents * l.qty; }, 0);
    $('po-usual-text').textContent = valid.map(function (l) { return (l.qty > 1 ? l.qty + ' × ' : '') + items[l.id].name.split(' — ')[0]; }).join(', ');
    $('po-usual-btn').textContent = 'Add · ' + money(total);
    box.hidden = false;
    box._lines = valid;
  }

  function renderCart() {
    var ids = Object.keys(cart), sub = 0, count = 0;
    $('po-lines').innerHTML = ids.length ? ids.map(function (id) {
      var it = items[id], q = cart[id];
      sub += it.priceCents * q; count += q;
      return '<li class="po-line"><span>' + esc(it.name.split(' — ')[0]) + '</span>' + stepper(id, q) +
        '<span class="po-line-amt">' + money(it.priceCents * q) + '</span></li>';
    }).join('') : '<li class="po-empty">Tap anything to add it.</li>';

    var ups = UPSELL.filter(function (u) { return items[u.id] && !cart[u.id]; });
    $('po-upsell').innerHTML = count && ups.length ? ups.map(function (u) {
      return '<button type="button" class="po-upsell-btn" data-add="' + u.id + '" data-upsell="1">' +
        (PHOTOS[u.id] ? '<i class="po-upsell-ic po-upsell-ic--' + PHOTOS[u.id] + '" style="background-image:url(' + IMG + PHOTOS[u.id] + '.webp)" aria-hidden="true"></i>' : '') +
        '<b>+ ' + esc(u.label) + '</b><span>' + money(items[u.id].priceCents) + '</span></button>';
    }).join('') : '';

    $('po-subtotal').textContent = money(sub);
    $('po-submit').disabled = !count || !slots.length;
    $('po-submit').textContent = !slots.length ? 'Online ordering is closed' : count ? 'Checkout · ' + money(sub) : 'Add something to order';
    $('po-mobile-bar').hidden = !count;
    $('po-mobile-count').textContent = count + (count === 1 ? ' item' : ' items');
    $('po-mobile-total').textContent = money(sub);
  }

  function render() { renderMenu(); renderCart(); renderUsual(); }

  // ── events ──────────────────────────────────────────────────────────
  function add(id, source) {
    var it = items[id];
    if (!it || !availableOn(it, pickupDow())) return;
    cart[id] = (cart[id] || 0) + 1;
    track('add_to_cart', { currency: 'USD', value: it.priceCents / 100, items: [{ item_id: id, item_name: it.name, price: it.priceCents / 100, quantity: 1 }], source: source || 'card' });
    renderMenu(); renderCart();
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-add]'), d = e.target.closest('[data-dec]');
    if (a && !a.disabled) { e.preventDefault(); add(a.getAttribute('data-add'), a.hasAttribute('data-upsell') ? 'upsell' : 'card'); return; }
    if (d) { var id = d.getAttribute('data-dec'); if (--cart[id] <= 0) delete cart[id]; renderMenu(); renderCart(); return; }
    if (e.target.closest('#po-mobile-bar')) $('po-cart').scrollIntoView({ behavior: 'smooth' });
    if (e.target.closest('#po-time-change')) { $('po-time-wrap').hidden = false; $('po-time-change').hidden = true; $('po-time').focus(); }
    if (e.target.closest('#po-usual-btn')) {
      ($('po-usual')._lines || []).forEach(function (l) { cart[l.id] = (cart[l.id] || 0) + l.qty; });
      track('add_to_cart', { source: 'usual' });
      renderMenu(); renderCart();
    }
  });

  function onTimeChange() {
    syncTimeLabel();
    var dow = pickupDow(), dropped = [];
    Object.keys(cart).forEach(function (id) { if (!availableOn(items[id], dow)) { dropped.push(items[id].name.split(' — ')[0]); delete cart[id]; } });
    showError(dropped.length ? dropped.join(', ') + ' isn\'t available that day, so we took it out.' : '');
    render();
  }

  function showError(msg) { var e = $('po-error'); e.textContent = msg; e.hidden = !msg; }

  function submit(e) {
    e.preventDefault();
    showError('');
    var f = e.target, s = slot();
    var body = {
      items: Object.keys(cart).map(function (id) { return { id: id, qty: cart[id] }; }),
      pickup_date: s && s.date, pickup_time: s && s.time,
      name: f.name.value.trim(), phone: f.phone.value.trim(),
      note: f.note.value.trim(), _hp: f._hp.value
    };
    if (!body.name || body.phone.replace(/\D/g, '').length < 10) return showError('Add your name and a phone number so we can reach you about your order.');
    if (!s) return showError('Online ordering is closed right now. Call 412-331-9531.');

    save({ name: body.name, phone: body.phone, usual: body.items });
    var value = body.items.reduce(function (t, l) { return t + items[l.id].priceCents * l.qty; }, 0) / 100;
    track('begin_checkout', { currency: 'USD', value: value, items: body.items.map(function (l) { return { item_id: l.id, item_name: items[l.id].name, quantity: l.qty }; }) });

    var btn = $('po-submit'); btn.disabled = true; btn.textContent = 'Opening secure checkout…';
    fetch(BASE + '/api/pickup-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.ok && j.checkout_url) { window.location.href = j.checkout_url; return; }
        throw new Error(j.error || 'failed');
      })
      .catch(function () {
        showError("Checkout didn't open. Try again, or call 412-331-9531 and we'll take it by phone.");
        renderCart();
      });
  }

  function init() {
    buildSlots();
    var saved = load();
    var f = $('po-form');
    if (saved.name) f.name.value = saved.name;
    if (saved.phone) f.phone.value = saved.phone;
    f.addEventListener('submit', submit);
    $('po-time').addEventListener('change', onTimeChange);

    fetch(BASE + '/api/pickup-menu')
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok) throw 0;
        menuData = j.menu;
        menuData.forEach(function (s) { s.items.forEach(function (it) { items[it.id] = it; }); });
        // Fold "X Meal" into the card for "X".
        Object.keys(items).forEach(function (id) {
          var it = items[id];
          if (/ Meal$/.test(it.name)) {
            var base = it.name.replace(/ Meal$/, '');
            Object.keys(items).forEach(function (sid) { if (items[sid].name === base) mealOf[sid] = it; });
          }
        });
        render();
        track('view_item_list', { item_list_name: 'pickup_menu' });
      })
      .catch(function () {
        $('po-menu').innerHTML = '<p class="po-loading">Online ordering is unavailable right now. Call <a href="tel:4123319531">412-331-9531</a> and we\'ll have it ready.</p>';
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
