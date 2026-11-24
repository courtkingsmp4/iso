# Decisions

| # | Decision | Why | Spec |
|---|----------|-----|------|
| 1 | Hash router (`#/home`) | Works on any static host and with a plain dev server, no rewrite rules | 5.4 |
| 2 | Pages are `{id, title, mount(container, ctx) -> cleanup}` | Router guarantees teardown, so pages cannot leak loop/bus listeners | 5.4 |
| 3 | Save envelope `{v, updatedAt, data}` under `iso:v1:<name>`; per-key schema version | Per-key migrations; namespace allows a future full reset | 5.9 |
| 4 | Newer-version saves are locked, never overwritten | A rollback to an older build must not destroy data | 5.9 |
| 5 | Corrupt saves are backed up to `iso:v1:corrupt:<name>` and defaults are used | Never block boot, never silently lose evidence | 5.9 |
| 6 | Only `profile`, `settings`, `diagnostics` are registered | Other keys (loadout, inventory, dunks, progress) belong to their own phases | 7 |
| 7 | Loop has subscriber lists | Menu pages and the future match scene share one loop | 5.4 |
| 8 | Fonts declared with `local()` only | Phase 0 downloads nothing; self-hosted files can be added later | 4.3 |
| 9 | Tests use a zero-dependency harness | "No paid dependencies"; same suite runs in Node and the browser | 5.10 |
