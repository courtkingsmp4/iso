// save/schema.js - registry of every persisted blob.
//
// Each entry: { version, defaults(), validate?(data) }.
// Rules:
//  - Bump `version` and add a migration step (migrations.js) whenever the
//    shape of `data` changes. Never edit a shipped shape silently.
//  - Phase 0 registers only what Phase 0 needs. Later phases add their own
//    keys (loadout, inventory, dunks, progress ...) in their own phase.

export const NAMESPACE = 'iso:v1:';

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

export const SCHEMAS = {
  // Who/when. Created on first boot.
  profile: {
    version: 1,
    defaults: () => ({ createdAt: null, bootCount: 0 }),
    validate: (d) => isObj(d) && Number.isInteger(d.bootCount),
  },

  // Player-facing options. Empty set in Phase 0; settings arrive in later phases.
  settings: {
    version: 1,
    defaults: () => ({}),
    validate: isObj,
  },

  // Used by the Diagnostics page to prove the save round trip works.
  diagnostics: {
    version: 1,
    defaults: () => ({ counter: 0, note: '' }),
    validate: (d) => isObj(d) && Number.isFinite(d.counter) && typeof d.note === 'string',
  },
};
