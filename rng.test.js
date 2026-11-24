import { test, assert } from './harness.js';
import { createRng } from '../js/core/rng.js';

test('rng: same seed gives the same sequence; different seeds differ', () => {
  const a = createRng(123), b = createRng(123), c = createRng(124);
  const sa = Array.from({ length: 8 }, () => a.next());
  const sb = Array.from({ length: 8 }, () => b.next());
  const sc = Array.from({ length: 8 }, () => c.next());
  assert.deepEqual(sa, sb); assert.ok(JSON.stringify(sa) !== JSON.stringify(sc));
});

test('rng: string seeds work and values stay in range', () => {
  const r = createRng('iso');
  for (let i = 0; i < 500; i++) {
    const f = r.next(); assert.ok(f >= 0 && f < 1);
    const n = r.int(3, 6); assert.ok(n >= 3 && n <= 6 && Number.isInteger(n));
  }
  assert.deepEqual(Array.from({ length: 3 }, () => createRng('iso').int(0, 99)), Array.from({ length: 3 }, () => createRng('iso').int(0, 99)));
});

test('rng: getState/setState replays the stream; pick throws on empty', () => {
  const r = createRng(7); r.next(); const st = r.getState();
  const x = [r.next(), r.next()]; r.setState(st);
  assert.deepEqual([r.next(), r.next()], x);
  assert.throws(() => r.pick([]));
});

test('rng: roughly uniform (mean near 0.5)', () => {
  const r = createRng(99); let sum = 0; const n = 20000;
  for (let i = 0; i < n; i++) sum += r.next();
  assert.closeTo(sum / n, 0.5, 0.02);
});
