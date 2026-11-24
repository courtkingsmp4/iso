import { test, assert } from './harness.js';
import { createBus } from '../js/core/events.js';

test('bus: on/emit delivers payload; unsubscribe stops delivery', () => {
  const bus = createBus(); const seen = [];
  const off = bus.on('x', (p) => seen.push(p));
  bus.emit('x', 1); off(); bus.emit('x', 2);
  assert.deepEqual(seen, [1]);
  assert.equal(bus.listenerCount('x'), 0);
});

test('bus: once fires a single time', () => {
  const bus = createBus(); let n = 0;
  bus.once('x', () => n++); bus.emit('x'); bus.emit('x');
  assert.equal(n, 1);
});

test('bus: handler may unsubscribe during emit; a throwing handler does not block others', () => {
  const bus = createBus(); const seen = [];
  const origError = console.error; console.error = () => {};
  try {
    const off = bus.on('x', () => { off(); seen.push('a'); });
    bus.on('x', () => { throw new Error('boom'); });
    bus.on('x', () => seen.push('c'));
    bus.emit('x');
  } finally { console.error = origError; }
  assert.deepEqual(seen, ['a', 'c']);
});
