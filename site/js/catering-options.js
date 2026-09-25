/* Inline presentation layer using the existing catalog and checkout. */
(function () {
  function init() {
    var mount = document.getElementById('catering-order');
    var modal = document.getElementById('cater-modal');
    if (!mount || !modal) return;
    mount.appendChild(modal);
    modal.removeAttribute('role');
    modal.removeAttribute('aria-modal');
    modal.querySelector('.cater-close').remove();
    var form = document.getElementById('cater-form');
    var sections = Array.from(form.querySelectorAll('.cater-section'));
    var menu = sections[2];
    form.insertBefore(menu, sections[0]);
    form.insertBefore(sections[1], sections[0]);
    var ordered = [menu, sections[1], sections[0], sections[3]];
    ordered.forEach(function (section, i) {
      section.querySelector('.eyebrow').textContent = 'Step 0' + (i + 1);
    });
    modal.querySelector('#cater-title').textContent = 'Build your order';
    modal.querySelector('.cater-header p').textContent = 'In-store pickup only. Paid online at checkout.';
    var prepToggle = document.getElementById('c-prep-toggle');
    var prepIcons = {
      hot: '<svg class="flow-prep-icon flow-prep-flame" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13 2c1 5-3 6-3 10-2-1-3-3-3-5-3 4-4 7-3 10a8 8 0 0 0 16-2c0-4-3-8-7-13Z" fill="currentColor"/><path d="M12 12c0 3-3 4-2 6a3 3 0 0 0 6-1c0-2-2-4-4-5Z" fill="var(--gold)"/></svg>',
      cool: '<svg class="flow-prep-icon flow-prep-chilled" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="19" rx="2"/><path d="M8 7v5M8 21v1M16 21v1"/></svg>'
    };
    prepToggle.querySelectorAll('[data-prep]').forEach(function (option) {
      option.insertAdjacentHTML('afterbegin', prepIcons[option.dataset.prep]);
    });
    modal.querySelectorAll('[data-qty]').forEach(function (input) {
      var name = input.closest('.cater-item-row').querySelector('.cater-item-name').textContent;
      input.setAttribute('aria-label', 'Quantity: ' + name);
      input.step = '1';
      input.addEventListener('change', function () {
        input.value = Math.max(0, Math.floor(Number(input.value) || 0));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    var footer = modal.querySelector('.cater-footer');
    var button = document.getElementById('cater-submit');
    var back = document.createElement('button');
    back.type = 'button';
    back.className = 'flow-back btn btn-outline-dark';
    back.textContent = '← Back to trays';
    footer.querySelector('.cater-actions').prepend(back);
    var topBack = back.cloneNode(true);
    var topActions = document.createElement('div');
    topActions.className = 'flow-top-actions';
    topActions.appendChild(topBack);
    form.prepend(topActions);
    var status = form.querySelector('.crm-status');
    var shopTomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + 86400000));
    var dateInput = document.getElementById('c-date');
    var timeInput = document.getElementById('c-time');
    dateInput.min = shopTomorrow;
    if (!dateInput.value) dateInput.value = shopTomorrow;
    if (!timeInput.value) timeInput.value = '13:00';
    var stage = 'menu';
    function showStage(next) {
      stage = next;
      ordered.forEach(function (section, i) { section.hidden = next === 'menu' ? i !== 0 : i === 0; });
      button.textContent = next === 'menu' ? 'Continue to pickup →' : 'Continue to payment →';
      back.hidden = next === 'menu';
      topActions.hidden = next === 'menu';
      status.textContent = '';
    }
    showStage('menu');
    // Capture the first step before the existing payment listener runs.
    button.addEventListener('click', function (event) {
      if (stage !== 'menu') return;
      event.stopImmediatePropagation();
      if (!Array.from(form.querySelectorAll('[data-qty]')).some(function (input) { return Number(input.value) > 0; })) {
        status.textContent = 'Choose at least one tray to continue.';
        status.scrollIntoView({ block: 'center' });
        return;
      }
      showStage('details');
      sections[1].scrollIntoView({ block: 'start' });
      document.getElementById('c-date').focus({ preventScroll: true });
    }, true);
    function backToTrays() {
      if (!document.getElementById('cater-review').hidden) {
        document.getElementById('cater-edit').click();
      }
      showStage('menu');
      menu.scrollIntoView({ block: 'start' });
      menu.querySelector('[data-qty]').focus({ preventScroll: true });
    }
    back.addEventListener('click', backToTrays);
    topBack.addEventListener('click', backToTrays);
    form.addEventListener('submit', function (event) { event.preventDefault(); button.click(); });
    // Enforce the advertised notice in the shop's timezone, including time of day.
    button.addEventListener('click', function (event) {
      if (stage !== 'details') return;
      var date = document.getElementById('c-date');
      var time = document.getElementById('c-time');
      var earliest = new Date(Date.now() + 24 * 60 * 60 * 1000);
      var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(earliest);
      var p = {};
      parts.forEach(function (part) { p[part.type] = part.value; });
      var minimum = p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute;
      if (date.value && time.value && date.value + 'T' + time.value < minimum) {
        event.stopImmediatePropagation();
        status.textContent = 'Please choose a pickup at least 24 hours from now (Pittsburgh time).';
        date.focus();
      }
    }, true);
    var total = document.getElementById('cater-total');
    total.setAttribute('aria-live', 'polite');
    var sticky = document.querySelector('.flow-sticky span');
    new MutationObserver(function () { sticky.textContent = total.textContent + ' estimated'; }).observe(total, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
