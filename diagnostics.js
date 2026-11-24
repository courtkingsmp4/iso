// ui/pages/diagnostics.js - Phase 0 verification page. Every panel exercises a real module.

import { h, kv, setText } from '../dom.js';
import { createRng } from '../../core/rng.js';

export const diagnosticsPage = {
  id: 'diagnostics',
  title: 'Diagnostics',
  mount(container, ctx) {
    const { saves, loop, bus } = ctx;
    const cleanups = [];

    // ---- 1. Save round trip -------------------------------------------------
    const loaded = saves.load('diagnostics');
    let state = loaded.data;

    const counterEl = h('div', { class: 'bignum', 'aria-live': 'polite' }, String(state.counter));
    const loadStatus = h('span', { class: 'badge' }, `load status: ${loaded.status}`);
    const envelope = h('pre', { class: 'out' });
    const saveMsg = h('p', { class: 'hint', role: 'status' }, '');
    const noteInput = h('input', { class: 'input', id: 'diag-note', type: 'text', maxlength: '80', value: state.note, placeholder: 'Type something, then reload the page' });

    function refreshEnvelope() {
      const env = saves.peek('diagnostics');
      envelope.textContent = env ? JSON.stringify(env, null, 2) : '(nothing saved yet)';
    }
    function persist(msg) {
      const ok = saves.save('diagnostics', state);
      setText(saveMsg, ok ? msg : `Save failed: ${saves.lastError ?? 'unknown error'}`);
      refreshEnvelope();
    }

    noteInput.addEventListener('input', () => { state = { ...state, note: noteInput.value }; persist('Note saved.'); });

    const savePanel = h('div', { class: 'panel' },
      h('h2', {}, 'Save round trip'),
      h('p', { class: 'hint' }, 'Add to the counter and type a note, then reload the page. Both values should come back.'),
      counterEl,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-primary', type: 'button', onclick: () => {
          state = { ...state, counter: state.counter + 1 };
          setText(counterEl, state.counter); persist('Counter saved.');
        } }, 'Add 1 and save'),
        h('button', { class: 'btn btn-outline', type: 'button', onclick: () => location.reload() }, 'Reload page'),
        h('button', { class: 'btn', type: 'button', onclick: () => {
          saves.reset('diagnostics');
          state = saves.load('diagnostics').data;
          setText(counterEl, state.counter); noteInput.value = state.note;
          setText(saveMsg, 'Diagnostics save cleared.'); refreshEnvelope();
        } }, 'Clear saved data'),
      ),
      h('div', { class: 'field' }, h('label', { for: 'diag-note' }, 'Note'), noteInput),
      h('div', {}, loadStatus, ' ', h('span', { class: `badge ${saves.persistent ? 'good' : 'warn'}` }, `backend: ${saves.backendKind}`)),
      saveMsg,
      h('p', { class: 'hint' }, 'Stored envelope (key iso:v1:diagnostics):'),
      envelope,
    );
    refreshEnvelope();

    // ---- 2. Fixed-step loop -------------------------------------------------
    const loopInfo = kv([
      ['running', 'Loop running', ''],
      ['ticks', 'Update ticks', '0'],
      ['hz', 'Measured updates per second', '-'],
      ['fps', 'Measured frames per second', '-'],
    ]);
    let winStart = performance.now(), winTicks = loop.ticks, winFrames = loop.frames, lastPaint = 0;
    cleanups.push(loop.onRender(() => {
      const now = performance.now();
      if (now - lastPaint < 250) return;
      lastPaint = now;
      setText(loopInfo.refs.running, loop.running ? 'yes' : 'no');
      setText(loopInfo.refs.ticks, loop.ticks);
      const span = now - winStart;
      if (span >= 1000) {
        setText(loopInfo.refs.hz, ((loop.ticks - winTicks) * 1000 / span).toFixed(1) + ` (target ${loop.hz})`);
        setText(loopInfo.refs.fps, ((loop.frames - winFrames) * 1000 / span).toFixed(1));
        winStart = now; winTicks = loop.ticks; winFrames = loop.frames;
      }
    }));
    const loopPanel = h('div', { class: 'panel' },
      h('h2', {}, 'Fixed-step loop'),
      h('p', { class: 'hint' }, 'Updates should hold steady at the target rate even if the display refresh rate differs.'),
      loopInfo.el,
    );

    // ---- 3. Seeded RNG ------------------------------------------------------
    const seedInput = h('input', { class: 'input', id: 'diag-seed', type: 'text', value: 'iso' });
    const rngOut = h('pre', { class: 'out' });
    function rollRng() {
      const rng = createRng(seedInput.value);
      rngOut.textContent = Array.from({ length: 8 }, () => rng.int(1, 99)).join('  ');
    }
    seedInput.addEventListener('input', rollRng); rollRng();
    const rngPanel = h('div', { class: 'panel' },
      h('h2', {}, 'Seeded random numbers'),
      h('p', { class: 'hint' }, 'The same seed must always give the same eight numbers, on every device.'),
      h('div', { class: 'field' }, h('label', { for: 'diag-seed' }, 'Seed'), seedInput),
      rngOut,
    );

    // ---- 4. Router + event bus ---------------------------------------------
    const routeLog = h('pre', { class: 'out' }, '');
    const entries = [];
    function logRoute(e) {
      entries.unshift(`${new Date().toLocaleTimeString()}  ${e.from ?? '(start)'} -> ${e.path}`);
      routeLog.textContent = entries.slice(0, 6).join('\n');
    }
    logRoute({ from: null, path: ctx.path });
    cleanups.push(bus.on('route:change', logRoute));
    const routePanel = h('div', { class: 'panel' },
      h('h2', {}, 'Router and event bus'),
      h('p', { class: 'hint' }, 'Switch pages with the sidebar or the buttons. Each change is delivered over the event bus.'),
      h('div', { class: 'btn-row' },
        h('a', { class: 'btn btn-outline', href: '#/home' }, 'Go to Home'),
        h('a', { class: 'btn btn-outline', href: '#/does-not-exist' }, 'Try an unknown route'),
      ),
      routeLog,
    );

    container.append(h('section', { class: 'page' },
      h('h1', {}, 'Diagnostics'),
      h('p', {}, 'Each panel exercises one Phase 0 module for real. Nothing here is simulated.'),
      savePanel, loopPanel, rngPanel, routePanel,
    ));

    return () => cleanups.forEach((fn) => fn());
  },
};
