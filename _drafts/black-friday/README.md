# Black Friday page (draft)

Pulled from the live site 2026-11-14: no Black Friday promo this year (supply
constrained). Kept for reference.

To revive: move `products-black-friday.html` back to `site/`, `products-bf.css`
to `site/css/`, `products-bf.js` to `site/js/`, and re-add the redirect
`/products-black-friday.html  /products-black-friday  301!` to `site/_redirects`.

## cart.js change to make when this goes live

The build-your-own (à la carte, ids `alc-*`) items only ship in orders of $99+
(proposed, not confirmed). Add to `site/js/cart.js`:

```js
  /* À la carte items (ids "alc-*") only ship in orders of ORDER_MIN or more. */
  var ORDER_MIN = 99;

  function belowMinimum(items) {
    items = items || getCart();
    var hasAlc = items.some(function (it) { return String(it.id).indexOf("alc-") === 0; });
    return hasAlc && cartTotal(items) < ORDER_MIN;
  }
```

- First line of `goCheckout()`: `if (belowMinimum()) return;`
- In `renderPanel()`, before the checkout button branch:

```js
    if (belowMinimum(items)) {
      html += '<p class="cart-pop-sub cart-pop-sub--warn">Build-your-own orders ship at ' + fmt(ORDER_MIN) +
        ' or more. Add ' + fmt(ORDER_MIN - sub) + ' to check out.</p>';
    } else if (shipping !== null) { … }
```
