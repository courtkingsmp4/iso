import { test, assert } from './harness.js';
import { createLoop } from '../js/core/loop.js';
import { createFixedClock } from '../js/core/clock.js';

function harness(opts = {}) {
  const clock = createFixedClock(0);
  let cb = null; let id = 0; const cancelled = [];
  const raf = (fn) => { cb = fn; return ++id; };
  const caf = (h) => { cancelled.push(h); cb = null; };
  const loop = createLoop({ clock, raf, caf, ...opts });
  const frame = (ms) => { clock.advance(ms); const f = cb; cb = null; if (f) f(); };
  return { loop, frame, cancelled, pending: () => cb !== null };
}

test('loop: runs exactly hz fixed updates per simulated second regardless of frame size', () => {
  for (const frameMs of [16.6667, 8, 33.3333, 50]) {
    const { loop, frame } = harness(); let n = 0; let dtSeen = null;
    loop.onUpdate((dt) => { n++; dtSeen = dt; });
    loop.start();
    const frames = Math.round(1000 / frameMs);
    for (let i = 0; i < frames; i++) frame(frameMs);
    assert.ok(Math.abs(n - 60) <= 1, `frame ${frameMs}ms produced ${n} updates`);
    assert.closeTo(dtSeen, 1 / 60, 1e-9);
  }
});

test('loop: clamps huge frame gaps (no catch-up spiral)', () => {
  const { loop, frame } = harness(); let n = 0;
  loop.onUpdate(() => n++); loop.start(); frame(5000);
  assert.ok(n <= 7, `got ${n} updates after a 5 s stall`);
});

test('loop: render gets alpha in [0,1); render runs once per frame', () => {
  const { loop, frame } = harness(); const alphas = [];
  loop.onRender((a) => alphas.push(a)); loop.start();
  frame(10); frame(10); frame(10);
  assert.equal(alphas.length, 3);
  assert.ok(alphas.every((a) => a >= 0 && a < 1));
  assert.equal(loop.frames, 3);
});

test('loop: stop cancels the pending frame; unsubscribe detaches; start is idempotent', () => {
  const { loop, frame, cancelled, pending } = harness(); let n = 0;
  const off = loop.onUpdate(() => n++);
  loop.start(); loop.start(); frame(17);
  off(); frame(17); const after = n;
  loop.stop();
  assert.equal(loop.running, false); assert.equal(cancelled.length, 1); assert.equal(pending(), false);
  assert.equal(n, after);
});
