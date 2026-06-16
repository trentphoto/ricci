(function () {
  var ITEMS = [
    { id: 'rolls',     name: "Lil's Sausage Rolls",       unit: 'each',             price: 9.99 },
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

  function money(n) {
    return '$' + n.toFixed(2);
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
      '      <h2 id="cater-title">Place a Catering Request</h2>' +
      '      <p>24-hour notice on all trays and bread. In-store pickup only.</p>' +
      '      <button type="button" class="cater-close" id="cater-close" aria-label="Close">×</button>' +
      '    </div>' +
      '    <form class="cater-body" id="cater-form" novalidate>' +
      '      <div class="cater-section">' +
      '        <div class="cater-section-head"><span class="eyebrow">Step 01</span><h3>Your Information</h3></div>' +
      '        <div class="cater-grid-2">' +
      '          <div class="cater-field" style="grid-column:1/-1;"><label for="c-name">Name</label><input id="c-name" name="name" type="text" autocomplete="name" required></div>' +
      '          <div class="cater-field"><label for="c-email">Email</label><input id="c-email" name="email" type="email" autocomplete="email" required></div>' +
      '          <div class="cater-field"><label for="c-phone">Phone</label><input id="c-phone" name="phone" type="tel" autocomplete="tel"></div>' +
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
      '    </form>' +
      '    <div class="cater-footer">' +
      '      <div class="cater-total">Estimated Total<span id="cater-total">$0.00</span></div>' +
      '      <div class="cater-actions">' +
      '        <button type="button" class="btn btn-primary" id="cater-submit">Submit Order</button>' +
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
    if (el) el.textContent = money(total);
  }

  function buildOrderSummary() {
    var lines = [];
    var total = 0;
    ITEMS.forEach(function (it) {
      var q = getQty(it.id);
      if (q <= 0) return;
      var line = q + ' x ' + it.name + ' (' + it.unit + ') — ' + money(q * it.price);
      if (it.askSauce) {
        var sauce = document.querySelector('[data-sauce="' + it.id + '"]');
        line += sauce && sauce.checked ? ' · with sauce' : '';
      }
      if (it.chooseLasagna) {
        var kind = document.querySelector('input[name="lasagna_kind"]:checked');
        line += kind ? ' · ' + kind.value : '';
      }
      lines.push(line);
      total += q * it.price;
    });
    return { lines: lines, total: total };
  }

  function formatDateDisplay(dateVal, timeVal) {
    if (!dateVal) return '';
    var parts = dateVal.split('-');
    var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var str = days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    if (timeVal) {
      var tp = timeVal.split(':');
      var h = parseInt(tp[0]);
      var m = tp[1];
      var ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      str += ' at ' + h + ':' + m + ' ' + ampm;
    }
    return str;
  }

  function buildCalendarLink(dateVal, timeVal, name, orderLines) {
    if (!dateVal || !timeVal) return null;
    var parts = dateVal.split('-');
    var tp = timeVal.split(':');
    var year = parts[0];
    var month = parts[1];
    var day = parts[2];
    var hour = tp[0];
    var min = tp[1] || '00';

    // End time: 30 minutes after start
    var startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(min));
    var endDate = new Date(startDate.getTime() + 30 * 60000);

    function pad(n) { return String(n).padStart(2, '0'); }
    function gcalDate(d) {
      return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
        'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
    }

    var details = "Catering pickup for " + name + ".\n" + orderLines.join('\n') + '\n\n500 Pine Hollow Rd, McKees Rocks, PA 15136';
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent("Ricci's Catering Pickup") +
      '&dates=' + gcalDate(startDate) + '/' + gcalDate(endDate) +
      '&details=' + encodeURIComponent(details) +
      '&location=' + encodeURIComponent('500 Pine Hollow Rd, McKees Rocks, PA 15136');
  }

  function submitOrder() {
    var form = document.getElementById('cater-form');
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var phone = form.phone.value.trim();
    var date = form.date.value;
    var time = form.time.value;
    var toggle = document.getElementById('c-prep-toggle');
    var prep = toggle.getAttribute('data-active') === 'cool' ? 'Cool Down' : 'Prepared Hot';
    var notes = form.notes.value.trim();

    if (!name || !email || !date || !time) {
      alert('Please fill in your name, email, pickup date, and pickup time.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Please enter a valid email address so we can confirm your order.');
      return;
    }
    var order = buildOrderSummary();
    if (order.lines.length === 0) {
      alert('Please add at least one item to your order.');
      return;
    }

    var dateDisplay = formatDateDisplay(date, time);

    // Send the request to the CRM; only confirm once it's actually received.
    var btn = document.getElementById('cater-submit');
    var prevLabel = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    var message = 'CATERING REQUEST\n' +
      order.lines.join('\n') +
      '\nEstimated Total: ' + money(order.total) +
      '\nPickup: ' + dateDisplay +
      '\nTrays: ' + prep +
      (notes ? '\nNotes: ' + notes : '');

    // CRM base is defined once in js/crm.js (published as window.CRM_BASE).
    fetch(window.CRM_BASE + '/api/catering', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        name: name,
        phone: phone,
        event_date: date,
        source: 'catering-modal',
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
        if (btn) { btn.disabled = false; btn.textContent = prevLabel; }
        alert("Sorry — we couldn't send your request just now. Please try again, or call us at 412-331-9531.");
        return;
      }
      renderSuccess(name, dateDisplay, date, time, prep, notes, order);
    });
  }

  function renderSuccess(name, dateDisplay, date, time, prep, notes, order) {
    var calLink = buildCalendarLink(date, time, name, order.lines);
    var calHtml = calLink
      ? '<a href="' + calLink + '" target="_blank" rel="noopener noreferrer" class="btn btn-outline-dark" style="margin-top:18px;display:inline-block;">+ Add to Calendar</a>'
      : '';

    var summaryRows = order.lines.map(function (l) {
      return '<li>' + l + '</li>';
    }).join('');

    var body2 = document.querySelector('.cater-body');
    var footer = document.querySelector('.cater-footer');
    if (body2) {
      body2.innerHTML =
        '<div class="cater-success">' +
          '<h3>You\'re on the list, ' + name.split(' ')[0] + '.</h3>' +
          '<div class="cater-success-pickup">' +
            '<span class="eyebrow">Pickup</span>' +
            '<p class="cater-success-date">' + dateDisplay + '</p>' +
            '<p class="cater-success-addr">In-store pickup · 500 Pine Hollow Rd · McKees Rocks, PA 15136</p>' +
            calHtml +
          '</div>' +
          '<div class="cater-success-summary">' +
            '<span class="eyebrow">Order Summary</span>' +
            '<ul>' + summaryRows + '</ul>' +
            '<p class="cater-success-total">Estimated Total: <strong>' + money(order.total) + '</strong></p>' +
            (notes ? '<p class="cater-success-notes">Notes: ' + notes + '</p>' : '') +
            '<p style="margin-top:4px;font-size:0.8rem;color:#6b5544;">Trays: ' + prep + '</p>' +
          '</div>' +
          '<p class="cater-success-contact">Questions? Call us at <a href="tel:4123319531" style="color:var(--red);font-weight:600;">412-331-9531</a>.</p>' +
        '</div>';
    }
    if (footer) footer.style.display = 'none';
  }

  function openModal() {
    var modal = document.getElementById('cater-modal');
    if (!modal) return;
    modal.classList.add('is-open');
    document.body.classList.add('cater-open');
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
