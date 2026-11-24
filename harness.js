// tests/harness.js - dependency-free test harness that runs in Node and in the browser.

const registry = [];

export function test(name, fn) { registry.push({ name, fn }); }

export const assert = {
  ok(v, msg = 'expected truthy') { if (!v) throw new Error(msg); },
  equal(a, b, msg) { if (!Object.is(a, b)) throw new Error(msg ?? `expected ${fmt(b)}, got ${fmt(a)}`); },
  deepEqual(a, b, msg) {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg ?? `expected ${fmt(b)}, got ${fmt(a)}`);
  },
  throws(fn, msg = 'expected function to throw') {
    let threw = false;
    try { fn(); } catch { threw = true; }
    if (!threw) throw new Error(msg);
  },
  closeTo(a, b, eps = 1e-9, msg) {
    if (Math.abs(a - b) > eps) throw new Error(msg ?? `expected ${a} within ${eps} of ${b}`);
  },
};

function fmt(v) { try { return JSON.stringify(v); } catch { return String(v); } }

/** Runs every registered test. Returns { passed, failed, results }. */
export async function runAll(onResult = () => {}) {
  const results = [];
  for (const t of registry) {
    const started = Date.now();
    try {
      await t.fn();
      const r = { name: t.name, ok: true, ms: Date.now() - started };
      results.push(r); onResult(r);
    } catch (err) {
      const r = { name: t.name, ok: false, ms: Date.now() - started, error: err?.message ?? String(err) };
      results.push(r); onResult(r);
    }
  }
  const failed = results.filter((r) => !r.ok).length;
  return { passed: results.length - failed, failed, results };
}
