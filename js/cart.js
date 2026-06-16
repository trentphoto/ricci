/*
 * Ricci's cart button — turns the nav "Cart (0)" into a toggle that opens a
 * small dropdown. Cart is empty for now (no checkout yet), so it shows an
 * empty state with a "Shop Now" link. Drop-in: no markup changes needed.
 */
(function () {
  function basePrefix() {
    // derive "../" depth from the stylesheet path so links work in subfolders
    var link = document.querySelector('link[rel="stylesheet"][href$="css/styles.css"]');
    if (link) {
      var href = link.getAttribute("href");
      return href.replace(/css\/styles\.css$/, "");
    }
    return "";
  }

  function init() {
    var cart = document.querySelector(".nav-cart");
    if (!cart || cart.__cartBound) return;
    cart.__cartBound = true;

    var base = basePrefix();

    // make the trigger keyboard-accessible
    cart.setAttribute("role", "button");
    cart.setAttribute("tabindex", "0");
    cart.setAttribute("aria-haspopup", "true");
    cart.setAttribute("aria-expanded", "false");

    var panel = document.createElement("div");
    panel.className = "cart-pop";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Shopping cart");
    panel.innerHTML =
      '<p class="cart-pop-empty">Your cart is empty.</p>' +
      '<p class="cart-pop-sub">Online ordering is coming soon — browse what we make.</p>' +
      '<a href="' + base + 'shop.html" class="btn btn-primary cart-pop-btn">Shop Now</a>';

    // wrap trigger + panel so the panel anchors under the button
    var wrap = document.createElement("div");
    wrap.className = "cart-wrap";
    cart.parentNode.insertBefore(wrap, cart);
    wrap.appendChild(cart);
    wrap.appendChild(panel);

    function open() {
      wrap.classList.add("is-open");
      cart.setAttribute("aria-expanded", "true");
      document.addEventListener("click", onDocClick, true);
      document.addEventListener("keydown", onKey);
    }
    function close() {
      wrap.classList.remove("is-open");
      cart.setAttribute("aria-expanded", "false");
      document.removeEventListener("click", onDocClick, true);
      document.removeEventListener("keydown", onKey);
    }
    function toggle() { wrap.classList.contains("is-open") ? close() : open(); }
    function onDocClick(e) { if (!wrap.contains(e.target)) close(); }
    function onKey(e) { if (e.key === "Escape") { close(); cart.focus(); } }

    cart.addEventListener("click", function (e) { e.preventDefault(); toggle(); });
    cart.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
