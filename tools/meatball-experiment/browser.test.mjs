import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const assignment = readFileSync('site/js/meatball-experiment.js', 'utf8');
const tracking = readFileSync('site/js/meatball-events.js', 'utf8');
function assign({ current = 'control', cookie = '', random = 0, preview = false, storage = true, host = 'riccisausage.com' } = {}) {
  const document = { currentScript: { getAttribute: () => current } };
  Object.defineProperty(document, 'cookie', { get: () => cookie, set: v => { if (storage) cookie = v.split(';')[0]; } });
  let destination;
  const window = { crypto: { getRandomValues: b => b.fill(random) } };
  vm.runInNewContext(assignment, { window, document, URLSearchParams, Uint8Array,
    navigator: { userAgent: 'test visitor' },
    location: { hostname: host, search: preview ? '?preview=1' : '?utm_source=facebook', hash: '', replace: v => { destination = v; } },
  });
  return { context: window.RicciMeatballExperiment, destination, cookie };
}
test('both allocations, repeat visitors, and ad parameters survive redirects', () => {
  for (const [random, variant] of ['control', 'free'].entries()) {
    const result = assign({ random });
    assert.equal(result.context.variant, variant);
    if (random) assert.match(result.destination, /^\/shop\/pittsburgh-italian-pack-free\?utm_source=facebook$/);
    const second = assign({ current: variant, random: 0, cookie: result.cookie });
    assert.equal(second.context.variant, variant);
    assert.equal(second.context.active, true);
    assert.equal(second.destination, undefined);
  }
});
test('previews, local hosts, invalid cookies and blocked storage are safe', () => {
  for (const opts of [{ preview: true }, { host: 'localhost' }, { storage: false, random: 1 }]) {
    const result = assign(opts);
    assert.equal(result.context.active, false);
    assert.equal(result.destination, undefined);
  }
  assert.equal(assign({ cookie: 'ricci_meatball_v1=garbage' }).context.active, true);
});
test('one view and one Buy click; other buttons do not convert', async () => {
  const sent = [], handlers = {};
  const document = { visibilityState: 'visible', addEventListener: (name, fn) => { handlers[name] = fn; } };
  vm.runInNewContext(tracking, { document, Blob,
    window: { CRM_BASE: 'https://crm.example', RicciMeatballExperiment: { active: true, experiment: 'meatball-framing-v1', visitor: 'a'.repeat(32), variant: 'free' } },
    navigator: { sendBeacon: (url, body) => { sent.push({ url, body }); return true; } },
    fetch: (url, options) => { sent.push({ url, body: options.body }); return Promise.resolve(); },
  });
  const click = (attrs) => handlers.click({ defaultPrevented: true, type: 'click', target: { closest: () => attrs && { getAttribute: k => attrs[k] ?? null } } });
  click(null);                                             // a link that is not a CTA
  click({ 'data-id': 'grill-box' });                       // another product's CTA
  click({ 'data-id': 'pittsburgh-italian-pack', 'aria-disabled': 'true' });
  assert.equal(sent.length, 1);
  click({ 'data-id': 'pittsburgh-italian-pack' });
  click({ 'data-id': 'pittsburgh-italian-pack' });
  handlers.visibilitychange();
  assert.equal(sent.length, 2);
  assert.equal(JSON.parse(sent[0].body).event, 'view');
  // The click goes out as a keepalive beacon, so its body is a Blob.
  assert.equal(JSON.parse(await sent[1].body.text()).event, 'buy_click');
  assert.match(sent[1].url, /\/api\/experiments\/meatball-framing\/events$/);
});
