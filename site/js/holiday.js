/*
 * Thanksgiving pre-order form (DRAFT). Live total + pickup days.
 * Checkout is not wired — submit validates and shows a draft notice.
 * Final version should fork preorder-modal.js (CRM /api/preorder → Square),
 * keeping price server-side per docs/WIKI.md.
 */
(function () {
  var form = document.getElementById('hol-form');
  if (!form) return;

  var PICKUP = ['Mon, Nov 23', 'Tue, Nov 24', 'Wed, Nov 25'];
  var lines = [].slice.call(form.querySelectorAll('.hol-line'));
  var pickup = document.getElementById('hol-pickup');
  var totalEl = document.getElementById('hol-total');
  var status = document.getElementById('hol-status');

  function fillPickup() {
    pickup.innerHTML = PICKUP.map(function (d) {
      return '<option>' + d + '</option>';
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
    status.textContent = 'Draft: checkout is not connected yet.';
  });

  fillPickup();
  total();
})();
