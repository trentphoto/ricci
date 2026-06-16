(function () {
  function buildModal() {
    if (document.getElementById('order-modal')) return;

    var html =
      '<div class="order-modal" id="order-modal" role="dialog" aria-modal="true" aria-labelledby="order-title">' +
      '  <div class="order-dialog">' +
      '    <div class="order-header">' +
      '      <span class="eyebrow">How would you like to order?</span>' +
      '      <h2 id="order-title">Order Now</h2>' +
      '      <button type="button" class="order-close" id="order-close" aria-label="Close">×</button>' +
      '    </div>' +
      '    <div class="order-options">' +
      '      <button type="button" class="order-option order-option--catering" data-order-choice="catering">' +
      '        <span class="order-option-num">01</span>' +
      '        <span class="order-option-title">Catering Order</span>' +
      '        <span class="order-option-desc">Party trays &amp; bulk orders</span>' +
      '      </button>' +
      '      <button type="button" class="order-option order-option--pickup" data-order-choice="pickup">' +
      '        <span class="order-option-num">02</span>' +
      '        <span class="order-option-title">Pickup in Store</span>' +
      '        <span class="order-option-desc">Hot food &amp; fresh sausage</span>' +
      '      </button>' +
      '      <button type="button" class="order-option order-option--ship" data-order-choice="ship">' +
      '        <span class="order-option-num">03</span>' +
      '        <span class="order-option-title">Ship to Me</span>' +
      '        <span class="order-option-desc">Frozen, nationwide delivery</span>' +
      '      </button>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap.firstChild);
  }

  function openModal() {
    var modal = document.getElementById('order-modal');
    if (!modal) return;
    modal.classList.add('is-open');
    document.body.classList.add('order-open');
    var first = modal.querySelector('.order-option');
    if (first) setTimeout(function () { first.focus(); }, 50);
  }

  function closeModal() {
    var modal = document.getElementById('order-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('order-open');
  }

  function handleChoice(choice) {
    closeModal();
    if (choice === 'catering') {
      if (window.RicciCatering && window.RicciCatering.open) {
        window.RicciCatering.open();
      } else {
        window.location.href = 'menu.html';
      }
    } else if (choice === 'pickup') {
      window.location.href = 'menu.html';
    } else if (choice === 'ship') {
      window.location.href = 'shop.html';
    }
  }

  function wire() {
    buildModal();

    document.querySelectorAll('[data-open-order]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openModal();
      });
    });

    var modal = document.getElementById('order-modal');
    document.getElementById('order-close').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });

    modal.addEventListener('click', function (e) {
      var opt = e.target.closest('[data-order-choice]');
      if (!opt) return;
      handleChoice(opt.getAttribute('data-order-choice'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
