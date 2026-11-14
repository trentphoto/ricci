// Minimal fake browser for running site/js/*.js in node:vm. Only what
// shipping.js / cart.js touch — not a general DOM.
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const SITE = path.join(ROOT, "site");

export class El {
  constructor(tag, attrs = {}, { classes = [], ancestors = [] } = {}) {
    this.tagName = tag.toUpperCase();
    this.attrs = { ...attrs };
    this.classes = new Set(classes);
    this.ancestors = ancestors; // class names this element sits inside
    this.children = [];
    this.parentNode = null;
    this.textContent = "";
    this.innerHTML = "";
    this.hidden = false;
    this.listeners = {};
    const self = this;
    this.classList = {
      add: (c) => self.classes.add(c),
      remove: (c) => self.classes.delete(c),
      contains: (c) => self.classes.has(c),
      toggle: (c, on) => (on ?? !self.classes.has(c)) ? self.classes.add(c) : self.classes.delete(c),
    };
  }
  set className(v) { this.classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className() { return [...this.classes].join(" "); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  insertBefore(c, ref) {
    if (c.parentNode) c.parentNode.children.splice(c.parentNode.children.indexOf(c), 1);
    c.parentNode = this;
    const i = ref ? this.children.indexOf(ref) : -1;
    i < 0 ? this.children.push(c) : this.children.splice(i, 0, c);
    return c;
  }
  get nextElementSibling() {
    if (!this.parentNode) return null;
    const sib = this.parentNode.children;
    return sib[sib.indexOf(this) + 1] || null;
  }
  get nextSibling() { return this.nextElementSibling; }
  closest(sel) {
    const want = sel.split(",").map((s) => s.trim().replace(/^\./, ""));
    return want.some((c) => this.classes.has(c) || this.ancestors.includes(c)) ? this : null;
  }
  querySelectorAll() { return []; }
  querySelector(sel) {
    const c = sel.replace(/^\./, "");
    return this.children.find((k) => k.classes.has(c)) || null;
  }
}

/* A product price block: <div class="product-price" data-base data-tier>
   <span class="price-amount"><span class="ship-note"> inside a wrapper. */
export function priceBlock(base, tier, ancestors = []) {
  const wrap = new El("div");
  const el = new El("div", { "data-base": String(base), "data-tier": tier }, { classes: ["product-price"], ancestors });
  el.appendChild(new El("span", {}, { classes: ["price-amount"] }));
  el.appendChild(new El("span", {}, { classes: ["ship-note"] }));
  wrap.appendChild(el);
  return el;
}

export function makeWindow({ state = "PA", zip = null, prices = [], extra = {} } = {}) {
  const store = new Map();
  if (state) store.set("ricci_ship_state", state);
  if (zip) store.set("ricci_ship_zip", zip);
  const events = [];
  const byId = {};
  const head = new El("head");
  const body = new El("body");
  const document = {
    readyState: "complete",
    head, body,
    activeElement: null,
    getElementById: (id) => byId[id] || null,
    createElement: (t) => new El(t),
    addEventListener() {},
    dispatchEvent: (e) => events.push(e),
    querySelector: () => null,
    querySelectorAll(sel) {
      if (sel === ".product-price[data-tier]") return prices;
      if (sel === "main .product-price[data-tier]") return prices.filter((p) => !p.ancestors.includes("outside-main"));
      return [];
    },
  };
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const win = {
    document, localStorage, events, byId,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    fetch: () => new Promise(() => {}), // geolocation never resolves
    setTimeout: () => 0, clearTimeout() {},
    console, alert() {}, addEventListener() {},
    ...extra,
  };
  win.window = win;
  return vm.createContext(win);
}

export function load(ctx, rel) {
  vm.runInContext(readFileSync(path.join(SITE, rel), "utf8"), ctx, { filename: rel });
  return ctx;
}
