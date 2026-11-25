/*
 * Order Now — choice modal. Pickup is the featured path (hungry, local, now);
 * catering and shipping sit beside it. Illustrations are inline SVG so the
 * hover animations (steam, awning, lid, box hop) are pure CSS.
 */
(function () {
  // Storefront: striped awning, door, window with a sausage sandwich, rising steam.
  var SVG_STORE =
    '<svg class="oi oi-store" viewBox="0 0 160 140" aria-hidden="true">' +
      '<g class="oi-steam" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">' +
        '<path d="M56 30c-5-6 5-10 0-16"/><path d="M80 26c-5-6 5-10 0-16"/><path d="M104 30c-5-6 5-10 0-16"/>' +
      '</g>' +
      '<rect x="22" y="56" width="116" height="74" rx="3" fill="#FBF7EE" stroke="#2A221B" stroke-width="3"/>' +
      '<g class="oi-awning">' +
        '<path d="M14 40h132l-6 22H20z" fill="#7A261F" stroke="#2A221B" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M36 40l-3 22M58 40l-1 22M80 40v22M102 40l1 22M124 40l3 22" stroke="#FBF7EE" stroke-width="7"/>' +
        '<path d="M20 62q8 9 16 0q8 9 16 0q8 9 16 0q8 9 16 0q8 9 16 0q8 9 16 0q8 9 16 0" fill="#7A261F" stroke="#2A221B" stroke-width="3" stroke-linejoin="round"/>' +
      '</g>' +
      '<rect x="34" y="82" width="56" height="34" rx="2" fill="#F0E6D0" stroke="#2A221B" stroke-width="3"/>' +
      '<g class="oi-sandwich">' +
        '<path d="M42 102c0-8 40-8 40 0" fill="#D9A55B" stroke="#2A221B" stroke-width="2.5"/>' +
        '<rect x="44" y="98" width="36" height="6" rx="3" fill="#A33A2A" stroke="#2A221B" stroke-width="2"/>' +
        '<path d="M42 104h40c0 6-40 6-40 0z" fill="#E2B56C" stroke="#2A221B" stroke-width="2.5"/>' +
      '</g>' +
      '<rect x="100" y="82" width="26" height="48" rx="2" fill="#7A261F" stroke="#2A221B" stroke-width="3"/>' +
      '<circle cx="120" cy="107" r="2.5" fill="#C9A84C"/>' +
      '<g class="oi-sign"><rect x="98" y="90" width="30" height="12" rx="2" fill="#C9A84C" stroke="#2A221B" stroke-width="2"/>' +
      '<text x="113" y="99" text-anchor="middle" font-size="8" font-weight="700" font-family="sans-serif" fill="#2A221B">OPEN</text></g>' +
    '</svg>';

  // Catering: tray of sausage links under a lifting cloche.
  var SVG_TRAY =
    '<svg class="oi oi-tray" viewBox="0 0 160 140" aria-hidden="true">' +
      '<g class="oi-steam" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">' +
        '<path d="M64 74c-4-5 4-8 0-13"/><path d="M80 70c-4-5 4-8 0-13"/><path d="M96 74c-4-5 4-8 0-13"/>' +
      '</g>' +
      '<g class="oi-links">' +
        '<rect x="38" y="88" width="30" height="14" rx="7" fill="#A33A2A" stroke="#2A221B" stroke-width="2.5"/>' +
        '<rect x="65" y="86" width="30" height="14" rx="7" fill="#B4462F" stroke="#2A221B" stroke-width="2.5"/>' +
        '<rect x="92" y="88" width="30" height="14" rx="7" fill="#A33A2A" stroke="#2A221B" stroke-width="2.5"/>' +
        '<path d="M46 92l4 6M75 90l4 6M101 92l4 6" stroke="#2A221B" stroke-width="2" stroke-linecap="round" opacity=".5"/>' +
      '</g>' +
      '<path d="M22 104h116l-10 14H32z" fill="#C9A84C" stroke="#2A221B" stroke-width="3" stroke-linejoin="round"/>' +
      '<g class="oi-lid">' +
        '<path d="M30 100a50 46 0 0 1 100 0z" fill="#E7DCC1" stroke="#2A221B" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M46 86a36 32 0 0 1 22-24" fill="none" stroke="#FBF7EE" stroke-width="5" stroke-linecap="round"/>' +
        '<rect x="72" y="46" width="16" height="10" rx="4" fill="#2A221B"/>' +
      '</g>' +
    '</svg>';

  // Shipping: taped box that hops, with motion lines.
  var SVG_BOX =
    '<svg class="oi oi-box" viewBox="0 0 160 140" aria-hidden="true">' +
      '<g class="oi-speed" stroke="currentColor" stroke-width="3" stroke-linecap="round">' +
        '<path d="M14 70h18M8 86h22M16 102h14"/>' +
      '</g>' +
      '<g class="oi-crate">' +
        '<path d="M44 58l36-16 36 16v50l-36 16-36-16z" fill="#D9B88A" stroke="#2A221B" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M44 58l36 16 36-16M80 74v50" fill="none" stroke="#2A221B" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M62 50l36 16v14" fill="none" stroke="#7A261F" stroke-width="7" stroke-linejoin="round"/>' +
        '<path d="M54 88l16 7M54 96l12 5" stroke="#2A221B" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>' +
      '</g>' +
      '<ellipse class="oi-shadow" cx="80" cy="130" rx="34" ry="4" fill="#2A221B" opacity=".15"/>' +
    '</svg>';

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
      '      <button type="button" class="order-option order-option--pickup" data-order-choice="pickup">' +
      '        <span class="order-option-badge">Hungry now?</span>' +
             SVG_STORE +
      '        <span class="order-option-title">Pickup in Store</span>' +
      '        <span class="order-option-desc">Order ahead, skip the line. Sandwiches, rolls &amp; hot food in McKees Rocks.</span>' +
      '        <span class="order-option-go">Start pickup order <span aria-hidden="true">→</span></span>' +
      '      </button>' +
      '      <button type="button" class="order-option order-option--catering" data-order-choice="catering">' +
             SVG_TRAY +
      '        <span class="order-option-title">Catering</span>' +
      '        <span class="order-option-desc">Party trays &amp; bulk orders</span>' +
      '      </button>' +
      '      <button type="button" class="order-option order-option--ship" data-order-choice="ship">' +
             SVG_BOX +
      '        <span class="order-option-title">Ship to Me</span>' +
      '        <span class="order-option-desc">Ships frozen, nationwide</span>' +
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
        window.location.href = '/catering.html';
      }
    } else if (choice === 'pickup') {
      window.location.href = '/order.html';
    } else if (choice === 'ship') {
      window.location.href = '/shop.html';
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
