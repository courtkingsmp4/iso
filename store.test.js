import { test, assert } from './harness.js';
import { createStore } from '../js/core/store.js';

test('store: set merges, notifies with (state, prev), ignores no-op sets', () => {
  const s = createStore({ a: 1, b: 2 }); const calls = [];
  s.subscribe((st, prev) => calls.push([st.a, prev.a]));
  s.set({ a: 5 }); s.set({ a: 5 });
  assert.deepEqual(calls, [[5, 1]]);
  assert.equal(s.get().b, 2);
});

test('store: update derives patch from state; state is frozen; unsubscribe works', () => {
  const s = createStore({ n: 1 }); let calls = 0;
  const off = s.subscribe(() => calls++);
  s.update((st) => ({ n: st.n + 1 }));
  off(); s.update((st) => ({ n: st.n + 1 }));
  assert.equal(s.get().n, 3); assert.equal(calls, 1);
  assert.ok(Object.isFrozen(s.get()));
});
