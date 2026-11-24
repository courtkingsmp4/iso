import { test, assert } from './harness.js';
import { createSaveManager, createMemoryBackend } from '../js/save/storage.js';
import { SCHEMAS, NAMESPACE } from '../js/save/schema.js';

const mgr = (opts = {}) => {
  const backend = opts.backend ?? createMemoryBackend();
  return { backend, saves: createSaveManager({ backend, now: () => 1000, ...opts }) };
};

test('storage: load of an empty key returns defaults with status "default"', () => {
  const { saves } = mgr();
  const r = saves.load('diagnostics');
  assert.equal(r.status, 'default');
  assert.deepEqual(r.data, SCHEMAS.diagnostics.defaults());
});

test('storage: save then load round-trips and writes a versioned envelope under the namespace', () => {
  const { saves, backend } = mgr();
  assert.equal(saves.save('diagnostics', { counter: 7, note: 'hi' }), true);
  const r = saves.load('diagnostics');
  assert.equal(r.status, 'ok'); assert.deepEqual(r.data, { counter: 7, note: 'hi' });
  const env = JSON.parse(backend.getItem(NAMESPACE + 'diagnostics'));
  assert.equal(env.v, 1); assert.equal(env.updatedAt, 1000); assert.deepEqual(env.data, { counter: 7, note: 'hi' });
});

test('storage: values are cloned (mutating a loaded object does not change the save)', () => {
  const { saves } = mgr();
  saves.save('diagnostics', { counter: 1, note: '' });
  const a = saves.load('diagnostics').data; a.counter = 99;
  assert.equal(saves.load('diagnostics').data.counter, 1);
});

test('storage: corrupt JSON returns defaults, backs up the raw text, and can be overwritten', () => {
  const { saves, backend } = mgr();
  backend.setItem(NAMESPACE + 'diagnostics', '{not json');
  const r = saves.load('diagnostics');
  assert.equal(r.status, 'corrupt'); assert.deepEqual(r.data, SCHEMAS.diagnostics.defaults());
  assert.equal(backend.getItem(NAMESPACE + 'corrupt:diagnostics'), '{not json');
  assert.equal(saves.save('diagnostics', { counter: 2, note: '' }), true);
  assert.equal(saves.load('diagnostics').status, 'ok');
});

test('storage: wrong shape or failed validation counts as corrupt', () => {
  const { saves, backend } = mgr();
  backend.setItem(NAMESPACE + 'diagnostics', JSON.stringify({ v: 1, updatedAt: 1, data: { counter: 'x', note: 3 } }));
  assert.equal(saves.load('diagnostics').status, 'corrupt');
  backend.setItem(NAMESPACE + 'profile', JSON.stringify({ hello: 'world' }));
  assert.equal(saves.load('profile').status, 'corrupt');
});

test('storage: invalid data is refused on save', () => {
  const { saves, backend } = mgr();
  assert.equal(saves.save('diagnostics', { counter: 'nope', note: '' }), false);
  assert.equal(backend.getItem(NAMESPACE + 'diagnostics'), null);
  assert.ok(saves.lastError.includes('invalid'));
});

test('storage: a save from a NEWER build is never overwritten by this one', () => {
  const { saves, backend } = mgr();
  const future = JSON.stringify({ v: 5, updatedAt: 1, data: { counter: 42, note: 'future' } });
  backend.setItem(NAMESPACE + 'diagnostics', future);
  const r = saves.load('diagnostics');
  assert.equal(r.status, 'newer'); assert.equal(r.savedVersion, 5);
  assert.equal(saves.isLocked('diagnostics'), true);
  assert.equal(saves.save('diagnostics', { counter: 1, note: '' }), false);
  assert.equal(backend.getItem(NAMESPACE + 'diagnostics'), future);
  assert.equal(saves.reset('diagnostics'), true);          // explicit reset still allowed
  assert.equal(saves.save('diagnostics', { counter: 1, note: '' }), true);
});

test('storage: update() reads, transforms and saves; reset() returns to defaults', () => {
  const { saves } = mgr();
  saves.update('diagnostics', (d) => { d.counter += 1; });
  saves.update('diagnostics', (d) => ({ ...d, counter: d.counter + 1 }));
  assert.equal(saves.load('diagnostics').data.counter, 2);
  saves.reset('diagnostics');
  assert.equal(saves.load('diagnostics').status, 'default');
});

test('storage: missing top-level fields are filled from defaults', () => {
  const { saves, backend } = mgr();
  backend.setItem(NAMESPACE + 'diagnostics', JSON.stringify({ v: 1, updatedAt: 1, data: { counter: 3 } }));
  assert.deepEqual(saves.load('diagnostics').data, { counter: 3, note: '' });
});

test('storage: unknown keys throw; a throwing backend never throws out of load/save', () => {
  const { saves } = mgr();
  assert.throws(() => saves.load('nope'));
  const bad = { kind: 'localStorage', getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }, removeItem() {}, keys: () => [] };
  const s2 = createSaveManager({ backend: bad });
  assert.equal(s2.load('diagnostics').status, 'default');
  assert.equal(s2.save('diagnostics', { counter: 1, note: '' }), false);
  assert.ok(s2.lastError.includes('write failed'));
});
