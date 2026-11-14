/*
 * products-black-friday.html — blend/mix pickers.
 * A [data-variant-select] repoints the card's [data-add-to-cart] button at
 * the chosen option's id and name, so cart.js adds the right item.
 */
(function () {
  "use strict";
  document.querySelectorAll("[data-variant-select]").forEach(function (sel) {
    var card = sel.closest(".product-card, .includes-card");
    var btn = card && card.querySelector("[data-add-to-cart]");
    if (!btn) return;
    sel.addEventListener("change", function () {
      var opt = sel.options[sel.selectedIndex];
      btn.setAttribute("data-id", opt.value);
      btn.setAttribute("data-name", opt.getAttribute("data-name"));
    });
  });
})();
