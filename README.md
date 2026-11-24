# ISO - Phase 0 (foundation)

Vanilla HTML, CSS and JavaScript (ES modules). No dependencies, no build step, no backend.

## Run
Browsers block ES modules on `file://`, so serve the folder:

    python3 -m http.server 8080      # or: npm start
    # open http://localhost:8080

## Test
    node tests/run.mjs               # or: npm test       (Node 18+)
    # or open http://localhost:8080/tests/index.html

## Layout (Phase 0 subset of spec 5.2)
    index.html                 entry; shows a hint if opened via file://
    css/                       fonts, tokens, base, shell, components
    js/main.js                 boot + wiring
    js/core/                   events, clock, loop (fixed step), store, router, rng (seeded)
    js/save/                   schema (registry), migrations, storage (versioned LocalStorage)
    js/ui/                     dom helper, shell, pages/home, pages/diagnostics
    tests/                     harness + suites (Node and browser)

## Rules for later phases
- `js/sim/` (Phase 3+) must never import from `ui/` or `render/`.
- All gameplay randomness goes through `core/rng.js`.
- Changing a saved shape = bump its version in `save/schema.js` and add a step in `save/migrations.js`.
- New save keys are registered in the phase that needs them.
