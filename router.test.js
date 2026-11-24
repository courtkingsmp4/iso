import { test, assert } from './harness.js';
import { createRouter, normalizePath } from '../js/core/router.js';

function fakeAdapter(initial = '') {
  let hash = initial; let cb = null; const titles = [];
  return {
    getHash: () => hash,
    setHash(h) { hash = h; if (cb) cb(); },
    onHashChange(fn) { cb = fn; return () => { cb = null; }; },
    setTitle: (t) => titles.push(t),
    titles,
  };
}
function fakeOutlet() { return { cleared: 0, replaceChildren() { this.cleared++; } }; }

function build(initialHash) {
  const log = [];
  const mk = (id) => ({ id, title: id, mount: (el, ctx) => { log.push(`mount:${id}:${ctx.path}`); return () => log.push(`unmount:${id}`); } });
  const adapter = fakeAdapter(initialHash); const outlet = fakeOutlet();
  const router = createRouter({ routes: { '/home': mk('home'), '/diagnostics': mk('diagnostics') }, outlet, adapter, onChange: (e) => log.push(`change:${e.from}->${e.path}`) });
  return { router, adapter, outlet, log };
}

test('router: normalizePath handles hashes, slashes and empties', () => {
  assert.equal(normalizePath('#/home'), '/home');
  assert.equal(normalizePath('home/'), '/home');
  assert.equal(normalizePath(''), '/');
});

test('router: empty hash resolves to the default route', () => {
  const { router, log } = build('');
  router.start();
  assert.equal(router.path, '/home');
  assert.deepEqual(log, ['mount:home:/home', 'change:null->/home']);
});

test('router: navigating unmounts the old page before mounting the new one', () => {
  const { router, log } = build('#/home');
  router.start(); log.length = 0;
  router.navigate('/diagnostics');
  assert.deepEqual(log, ['unmount:home', 'mount:diagnostics:/diagnostics', 'change:/home->/diagnostics']);
  assert.equal(router.path, '/diagnostics');
});

test('router: unknown route falls back to default; same-route navigation does not remount', () => {
  const { router, log } = build('#/nope');
  router.start();
  assert.equal(router.path, '/home');
  log.length = 0; router.navigate('/home');
  assert.deepEqual(log, []);
});

test('router: stop runs cleanup and stops listening; title is set per page', () => {
  const { router, adapter, log } = build('#/diagnostics');
  router.start(); log.length = 0;
  router.stop();
  assert.deepEqual(log, ['unmount:diagnostics']);
  adapter.setHash('#/home'); assert.equal(router.path, null);
  assert.equal(adapter.titles[0], 'diagnostics - ISO');
});
