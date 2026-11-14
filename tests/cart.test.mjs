// Cart dropdown totals in site/js/cart.js (with shipping.js loaded first).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeWindow, load, El } from "./helpers/fake-dom.mjs";

function cartPanel(state, items, zip) {
  const ctx = makeWindow({ state, zip });
  ctx.localStorage.setItem("ricci_cart", JSON.stringify(items));
  // nav cart trigger the script wraps with its panel
  const trigger = new El("a", {}, { classes: ["nav-cart"] });
  new El("nav").appendChild(trigger);
  ctx.document.querySelector = (sel) => (sel === ".nav-cart" ? trigger : null);
  load(ctx, "js/shipping.js");
  load(ctx, "js/cart.js");
  const panel = trigger.parentNode.children.find((c) => c.classes.has("cart-pop"));
  return panel.innerHTML;
}

const pack = (qty = 1) => ({ id: "pittsburgh-italian-pack", name: "Pack", price: 189, qty, tier: "med" });
const legacy = { id: "ricci-legacy-gift-box", name: "Legacy", price: 289, qty: 1, tier: "large" };

test("subtotal, shipping line, total", () => {
  const html = cartPanel("TX", [pack()]);
  assert.match(html, /Subtotal<\/dt><dd>\$189/);
  assert.match(html, /Shipping to Texas<\/dt><dd>\$60/);
  assert.match(html, /Total before tax<\/dt><dd>\$249/);
  assert.match(html, /data-checkout/);
});

test("free shipping nearby", () => {
  const html = cartPanel("PA", [pack(), legacy]);
  assert.match(html, /Shipping to Pennsylvania<\/dt><dd>Free/);
  assert.match(html, /Total before tax<\/dt><dd>\$478/);
});

test("shipping stacks per box and by tier", () => {
  const html = cartPanel("CA", [pack(2), legacy]);
  assert.match(html, /Shipping to California<\/dt><dd>\$250/); // 80*2 + 90
  assert.match(html, /Total before tax<\/dt><dd>\$917/);
});

test("Hawaii: no total, no checkout", () => {
  const html = cartPanel("HI", [pack()]);
  assert.doesNotMatch(html, /Total before tax/);
  assert.doesNotMatch(html, /data-checkout/);
  assert.match(html, /can't ship frozen to Hawaii/);
});

test("Alaska without ZIP asks for one; metro ZIP checks out", () => {
  assert.match(cartPanel("AK", [pack()]), /Enter your Alaska ZIP/);
  const ok = cartPanel("AK", [pack()], "99501");
  assert.match(ok, /UPS 2nd Day Air to Alaska<\/dt><dd>\$139/);
  assert.match(ok, /data-checkout/);
});
