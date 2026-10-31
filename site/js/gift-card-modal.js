// Gift card chooser. Two systems with separate balances: Square (in-store)
// and Shopify (online). Reuses the Order Now modal styles.
(function () {
  var URLS = {
    store: 'https://squareup.com/gift/MLC3SA2HWEY06/order',
    online: 'https://shop.riccisausage.com/products/gift-card-online'
  };

  function buildModal() {
    if (document.getElementById('gift-modal')) return;
    var html =
      '<div class="order-modal" id="gift-modal" role="dialog" aria-modal="true" aria-labelledby="gift-title">' +
      '  <div class="order-dialog">' +
      '    <div class="order-header">' +
      '      <span class="eyebrow">Where will they use it?</span>' +
      '      <h2 id="gift-title">Buy a Gift Card</h2>' +
      '      <button type="button" class="order-close" data-gift-close aria-label="Close">×</button>' +
      '    </div>' +
      '    <div class="order-options order-options--two">' +
      '      <a class="order-option order-option--pickup" href="' + URLS.store + '" rel="noopener">' +
      '        <span class="order-option-num">01</span>' +
      '        <span class="order-option-title">In the Shop</span>' +
      '        <span class="order-option-desc">Redeem at our McKees Rocks counter</span>' +
      '        <span class="order-option-note">Not valid online</span>' +
      '      </a>' +
      '      <a class="order-option order-option--ship" href="' + URLS.online + '" rel="noopener">' +
      '        <span class="order-option-num">02</span>' +
      '        <span class="order-option-title">Online</span>' +
      '        <span class="order-option-desc">Redeem at checkout for shipped boxes</span>' +
      '        <span class="order-option-note">Not valid in the shop</span>' +
      '      </a>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap.firstChild);
  }

  function wire() {
    buildModal();
    var modal = document.getElementById('gift-modal');
    function open() {
      modal.classList.add('is-open');
      document.body.classList.add('order-open');
      var first = modal.querySelector('.order-option');
      if (first) setTimeout(function () { first.focus(); }, 50);
    }
    function close() {
      modal.classList.remove('is-open');
      document.body.classList.remove('order-open');
    }
    document.querySelectorAll('[data-open-giftcard]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.preventDefault(); open(); });
    });
    modal.querySelector('[data-gift-close]').addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
