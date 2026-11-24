// save/storage.js - versioned LocalStorage persistence (spec 5.9).
//
// Every blob is stored under  iso:v1:<name>  as
//     { v: <schema version>, updatedAt: <ms epoch>, data: {...} }
//
// load(name) never throws and always returns usable data:
//   status 'default'  nothing saved yet (defaults returned)
//   status 'ok'       saved at the current version
//   status 'migrated' older version, upgraded (and re-saved)
//   status 'corrupt'  unreadable/invalid; raw text is backed up, defaults returned
//   status 'newer'    saved by a newer build; defaults returned and the key is
//                     LOCKED so this build can never overwrite it
// Access is wrapped in try/catch (private mode, quota); if localStorage is
// unavailable an in-memory backend is used and `persistent` is false.

import { NAMESPACE, SCHEMAS } from './schema.js';
import { MIGRATIONS, migrateData } from './migrations.js';

export function createMemoryBackend() {
  const map = new Map();
  return {
    kind: 'memory',
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    keys: () => [...map.keys()],
  };
}

export function createLocalStorageBackend(win = (typeof window !== 'undefined' ? window : null)) {
  try {
    const ls = win && win.localStorage;
    if (!ls) return null;
    const probe = '__iso_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      kind: 'localStorage',
      getItem: (k) => ls.getItem(k),
      setItem: (k, v) => ls.setItem(k, v),
      removeItem: (k) => ls.removeItem(k),
      keys: () => { const out = []; for (let i = 0; i < ls.length; i++) out.push(ls.key(i)); return out; },
    };
  } catch {
    return null; // blocked (private mode / disabled)
  }
}

export function pickBackend(win) {
  return createLocalStorageBackend(win) ?? createMemoryBackend();
}

const clone = (x) => JSON.parse(JSON.stringify(x));

export function createSaveManager({
  backend = pickBackend(),
  schemas = SCHEMAS,
  migrations = MIGRATIONS,
  namespace = NAMESPACE,
  now = () => Date.now(),
} = {}) {
  const locked = new Set();      // names saved by a newer build; never overwritten
  const lastStatus = new Map();  // name -> status from the most recent load
  let lastError = null;

  const keyOf = (name) => namespace + name;
  const corruptKeyOf = (name) => `${namespace}corrupt:${name}`;

  function schemaOf(name) {
    const s = schemas[name];
    if (!s) throw new Error(`Unknown save key "${name}"`);
    return s;
  }

  function withDefaults(schema, data) {
    // Fill any missing top-level fields from defaults (forward-compat safety net).
    const d = schema.defaults();
    if (data && typeof data === 'object' && !Array.isArray(data)) return { ...d, ...data };
    return d;
  }

  function write(name, data, version) {
    const env = { v: version, updatedAt: now(), data };
    try {
      backend.setItem(keyOf(name), JSON.stringify(env));
      return true;
    } catch (err) {
      lastError = `write failed for "${name}": ${err.message}`;
      return false;
    }
  }

  function backupCorrupt(name, raw) {
    try { backend.setItem(corruptKeyOf(name), raw ?? ''); } catch { /* best effort */ }
  }

  function load(name) {
    const schema = schemaOf(name);
    let raw;
    try { raw = backend.getItem(keyOf(name)); }
    catch (err) { lastError = `read failed for "${name}": ${err.message}`; raw = null; }

    const finish = (data, status, extra = {}) => {
      lastStatus.set(name, status);
      return { data, status, ...extra };
    };

    if (raw === null || raw === undefined) return finish(schema.defaults(), 'default');

    let env;
    try { env = JSON.parse(raw); } catch { env = null; }
    const shapeOk = env && typeof env === 'object' && Number.isInteger(env.v) && env.v >= 1 && 'data' in env;
    if (!shapeOk) {
      backupCorrupt(name, raw);
      lastError = `corrupt save "${name}" (backed up)`;
      return finish(schema.defaults(), 'corrupt');
    }

    if (env.v > schema.version) {
      locked.add(name);
      return finish(schema.defaults(), 'newer', { savedVersion: env.v });
    }

    let data = env.data;
    let status = 'ok';
    if (env.v < schema.version) {
      const res = migrateData(name, data, env.v, schema.version, migrations);
      if (!res.ok) {
        backupCorrupt(name, raw);
        lastError = res.error;
        return finish(schema.defaults(), 'corrupt');
      }
      data = res.data;
      status = 'migrated';
    }

    data = withDefaults(schema, data);
    if (schema.validate && !schema.validate(data)) {
      backupCorrupt(name, raw);
      lastError = `invalid data in "${name}" (backed up)`;
      return finish(schema.defaults(), 'corrupt');
    }

    if (status === 'migrated') write(name, data, schema.version);
    return finish(clone(data), status);
  }

  function save(name, data) {
    const schema = schemaOf(name);
    if (locked.has(name)) { lastError = `"${name}" was written by a newer build; not overwritten`; return false; }
    const full = withDefaults(schema, clone(data));
    if (schema.validate && !schema.validate(full)) {
      lastError = `refused to save invalid data for "${name}"`;
      return false;
    }
    return write(name, full, schema.version);
  }

  /** Load, apply fn(data) -> newData (or mutate and return nothing), save. Returns new data or null. */
  function update(name, fn) {
    const { data } = load(name);
    const out = fn(data);
    const next = out === undefined ? data : out;
    return save(name, next) ? clone(withDefaults(schemaOf(name), next)) : null;
  }

  function reset(name) {
    schemaOf(name);
    locked.delete(name);
    try { backend.removeItem(keyOf(name)); return true; }
    catch (err) { lastError = `reset failed for "${name}": ${err.message}`; return false; }
  }

  function resetAll() { return Object.keys(schemas).map((n) => reset(n)).every(Boolean); }

  /** Raw envelope as stored (or null) - for diagnostics only. */
  function peek(name) {
    try { const raw = backend.getItem(keyOf(name)); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }

  return {
    load, save, update, reset, resetAll, peek,
    get persistent() { return backend.kind === 'localStorage'; },
    get backendKind() { return backend.kind; },
    get lastError() { return lastError; },
    statusOf: (name) => lastStatus.get(name) ?? null,
    isLocked: (name) => locked.has(name),
    names: () => Object.keys(schemas),
    versionOf: (name) => schemaOf(name).version,
  };
}
