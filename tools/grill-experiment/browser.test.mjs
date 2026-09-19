import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const assignment = readFileSync('site/js/grill-experiment.js', 'utf8');
const tracking = readFileSync('site/js/grill-events.js', 'utf8');
function assign({ current = 'original', cookie = '', random = 0, preview = false, storage = true, host = 'riccisausage.com' } = {}) {
  const document = { currentScript: { getAttribute: () => current } };
  Object.defineProperty(document, 'cookie', { get: () => cookie, set: v => { if (storage) cookie = v.split(';')[0]; } });
  let destination;
  const window = { crypto: { getRandomValues: b => b.fill(random) } };
  vm.runInNewContext(assignment, { window, document, URLSearchParams, Uint8Array,
    navigator: { userAgent: 'test visitor' },
    location: { hostname: host, search: preview ? '?preview=1' : '?utm_source=facebook', hash: '', replace: v => { destination = v; } },
  });
  return { context: window.RicciGrillExperiment, destination, cookie };
}
test('all four allocations, repeat visitors, and ad parameters survive redirects', () => {
  for (const [random, variant] of ['original', 'minimal', 'butcher', 'table'].entries()) {
    const result = assign({ random });
    assert.equal(result.context.variant, variant);
    if (random) assert.match(result.destination, /\?utm_source=facebook$/);
    const second = assign({ current: variant, random: 0, cookie: result.cookie });
    assert.equal(second.context.variant, variant);
    assert.equal(second.context.active, true);
    assert.equal(second.destination, undefined);
  }
});
test('previews, local hosts, invalid cookies and blocked storage are safe', () => {
  for (const opts of [{ preview: true }, { host: 'localhost' }, { storage: false, random: 3 }]) {
    const result = assign(opts);
    assert.equal(result.context.active, false);
    assert.equal(result.destination, undefined);
  }
  assert.equal(assign({ cookie: 'ricci_grill_v1=garbage' }).context.active, true);
});
test('one view and one Buy click; anchor buttons and disabled links do not convert', () => {
  const sent = [], handlers = {};
  const document = { visibilityState: 'visible', addEventListener: (name, fn) => { handlers[name] = fn; } };
  vm.runInNewContext(tracking, { document, URL, Blob,
    window: { CRM_BASE: 'https://crm.example', RicciGrillExperiment: { active: true, experiment: 'grill-box-v1', visitor: 'a'.repeat(32), variant: 'table' } },
    navigator: { sendBeacon: (url, body) => { sent.push({ url, body }); return true; } },
    fetch: (url, options) => { sent.push({ url, body: options.body }); return Promise.resolve(); },
  });
  const click = (href, disabled = false) => handlers.click({ defaultPrevented: false, target: { closest: () => ({
    href, getAttribute: () => disabled ? 'true' : null, hasAttribute: () => true,
  }) } });
  click('https://riccisausage.com/shop/grill-box#box');
  click('https://tiyndf-za.myshopify.com/cart/58926159691936:1', true);
  assert.equal(sent.length, 1);
  click('https://tiyndf-za.myshopify.com/cart/58926159691936:1');
  click('https://tiyndf-za.myshopify.com/cart/58926159691936:1');
  handlers.visibilitychange();
  assert.equal(sent.length, 2);
  assert.equal(JSON.parse(sent[0].body).event, 'view');
});
