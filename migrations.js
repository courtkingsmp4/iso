// save/migrations.js - upgrades older saved blobs to the current version.
//
// MIGRATIONS[name][fromVersion] = (data) => newData   (upgrades from -> from+1)
// Phase 0 has nothing to migrate yet (every blob is at version 1). The
// machinery below is exercised by tests with a synthetic registry, so it is
// proven before the first real migration is ever needed.

export const MIGRATIONS = {
  // example (do not enable): diagnostics: { 1: (d) => ({ ...d, extra: 0 }) },
};

/**
 * Run every migration step from `fromVersion` up to `toVersion`.
 * Returns { ok:true, data } or { ok:false, error }.
 */
export function migrateData(name, data, fromVersion, toVersion, registry = MIGRATIONS) {
  let v = fromVersion;
  let current = data;
  while (v < toVersion) {
    const step = registry[name]?.[v];
    if (typeof step !== 'function') {
      return { ok: false, error: `missing migration for "${name}" v${v} -> v${v + 1}` };
    }
    try {
      current = step(structuredCloneSafe(current));
    } catch (err) {
      return { ok: false, error: `migration "${name}" v${v} -> v${v + 1} threw: ${err.message}` };
    }
    v++;
  }
  return { ok: true, data: current };
}

function structuredCloneSafe(x) {
  return JSON.parse(JSON.stringify(x));
}
