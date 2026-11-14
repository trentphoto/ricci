// Shipping math + PDP rendering in site/js/shipping.js.
// Run: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeWindow, load, priceBlock } from "./helpers/fake-dom.mjs";

const ship = (opts) => load(makeWindow(opts), "js/shipping.js").RicciShipping;

test("zone rate per order (Pack and Legacy the same)", () => {
  const cases = [
    ["PA", 0, 0], ["OH", 0, 0], ["DC", 0, 0],
    ["VT", 20, 20], ["IN", 20, 20],
    ["FL", 50, 50], ["GA", 50, 50],
    ["TX", 60, 60], ["CO", 60, 60],
    ["CA", 80, 80], ["WA", 80, 80],
  ];
  for (const [st, med, large] of cases) {
    const s = ship({ state: st });
    assert.equal(s.addOn("med", st), med, `${st} med`);
    assert.equal(s.addOn("large", st), large, `${st} large`);
    assert.equal(s.addOn("small", st), 0, `${st} sauce ships free`);
  }
});

test("box price never changes with state", () => {
  const s = ship({ state: "CA" });
  assert.equal(s.priceFor(189, "med", "CA"), 189);
});

test("HI / PR blocked", () => {
  for (const st of ["HI", "PR"]) {
    const s = ship({ state: st });
    assert.equal(s.canShip(st), false);
    assert.equal(s.shippingFor([{ tier: "med", qty: 1 }], st), null);
  }
});

test("Alaska: metro ZIPs only", () => {
  const s = ship({ state: "AK" });
  for (const z of ["99501", "99577", "99654", "99611", "99701", "99801"]) assert.ok(s.akZipOk(z), z);
  for (const z of ["99950", "99723", "99762", "9950", "abcde", ""]) assert.ok(!s.akZipOk(z), z);
});

test("Alaska needs a valid ZIP before it can ship", () => {
  assert.equal(ship({ state: "AK" }).canShip("AK"), false);
  assert.equal(ship({ state: "AK", zip: "99950" }).canShip("AK"), false);
  const s = ship({ state: "AK", zip: "99501" });
  assert.equal(s.canShip("AK"), true);
  assert.equal(s.shippingFor([{ tier: "med", qty: 1 }], "AK"), 139);
  assert.equal(s.shippingFor([{ tier: "large", qty: 1 }], "AK"), 139);
  assert.equal(s.shippingFor([{ tier: "small", qty: 1 }], "AK"), null, "sauce alone can't go to AK");
});

test("one shipping charge per order, however many boxes", () => {
  const s = ship({ state: "TX" });
  assert.equal(s.shippingFor([{ tier: "med", qty: 2 }, { tier: "large", qty: 1 }], "TX"), 60);
  assert.equal(s.shippingFor([{ tier: "small", qty: 1 }], "TX"), 0, "sauce alone ships free");
  assert.equal(s.shippingFor([{ tier: "none", qty: 3 }], "TX"), 0, "untiered items add nothing");
});

test("Alaska: sauce rides with a box but can't go alone", () => {
  const s = ship({ state: "AK", zip: "99501" });
  assert.equal(s.shippingFor([{ tier: "med", qty: 1 }, { tier: "small", qty: 1 }], "AK"), 139);
  assert.equal(s.shippingFor([{ tier: "small", qty: 2 }], "AK"), null);
});

test("ship-note copy", () => {
  const s = ship({ state: "PA" });
  assert.equal(s.note("OH", "med"), "Free shipping to Ohio");
  assert.equal(s.note("TX", "med"), "+ $60 shipping to Texas");
  assert.match(s.note("HI", "med"), /can't ship frozen to Hawaii/);
  assert.match(ship({ state: "AK" }).note("AK", "med"), /Enter your ZIP/);
  assert.match(ship({ state: "AK", zip: "99501" }).note("AK", "med"), /^\+ \$139 UPS 2nd Day Air to Alaska$/);
});

test("PDP: price stays base, note + itemized total render", () => {
  const el = priceBlock(189, "med");
  const ctx = makeWindow({ state: "TX", prices: [el] });
  load(ctx, "js/shipping.js");
  assert.equal(el.querySelector(".price-amount").textContent, "$189");
  assert.equal(el.querySelector(".ship-note").textContent, "+ $60 shipping to Texas");
  const bd = el.nextElementSibling;
  assert.ok(bd && bd.classList.contains("price-breakdown"), "breakdown inserted after price");
  assert.match(bd.innerHTML, /<dt>Box<\/dt><dd>\$189<\/dd>/);
  assert.match(bd.innerHTML, /Shipping to Texas<\/dt><dd>\$60<\/dd>/);
  assert.match(bd.innerHTML, /pb-total"><dt>Total<\/dt><dd>\$249<\/dd>/);
});

test("PDP: free nearby shows Free and total = box", () => {
  const el = priceBlock(289, "large");
  load(makeWindow({ state: "PA", prices: [el] }), "js/shipping.js");
  const html = el.nextElementSibling.innerHTML;
  assert.match(html, /Shipping to Pennsylvania<\/dt><dd>Free/);
  assert.match(html, /Total<\/dt><dd>\$289/);
});

test("PDP: blocked state shows no total", () => {
  const el = priceBlock(189, "med");
  load(makeWindow({ state: "HI", prices: [el] }), "js/shipping.js");
  assert.ok(el.classList.contains("is-noship"));
  assert.doesNotMatch(el.nextElementSibling.innerHTML, /pb-total/);
});

test("PDP: add-ons from buy-options are itemized", () => {
  const el = priceBlock(189, "med");
  const ctx = makeWindow({
    state: "FL", prices: [el],
    extra: { RicciBuyOptions: { summary: () => ({ lines: [
      { label: "Box", amount: 189 },
      { label: "+10 lb Hot sausage", amount: 89.9 },
      { label: "Lil's sauce (1 qt)", amount: 19.99 },
    ] }) } },
  });
  load(ctx, "js/shipping.js");
  const html = el.nextElementSibling.innerHTML;
  assert.match(html, /\+10 lb Hot sausage<\/dt><dd>\$89.90/);
  assert.match(html, /Lil's sauce \(1 qt\)<\/dt><dd>\$19.99/);
  assert.match(html, /Shipping to Florida<\/dt><dd>\$50/);
  assert.match(html, /Total<\/dt><dd>\$348.89/);
});

test("no breakdown on product cards or sticky buy bars", () => {
  const card = priceBlock(189, "med", ["product-card"]);
  const bar = priceBlock(189, "med", ["px-buybar"]);
  load(makeWindow({ state: "TX", prices: [card, bar] }), "js/shipping.js");
  assert.equal(card.nextElementSibling, null);
  assert.equal(bar.nextElementSibling, null);
  assert.equal(card.querySelector(".ship-note").textContent, "+ $60 shipping to Texas");
});
