// ui/pages/home.js - Phase 0 placeholder for the ISO home page (the real lobby is Phase 1).
// Shows live proof that the foundation modules are wired together.

import { h, kv, setText } from '../dom.js';

export const homePage = {
  id: 'home',
  title: 'Home',
  mount(container, ctx) {
    const { saves, loop, store } = ctx;
    const profile = saves.load('profile').data;

    const status = kv([
      ['storage', 'Saves', ''],
      ['boots', 'Times opened', String(profile.bootCount)],
      ['first', 'First opened', profile.createdAt ? new Date(profile.createdAt).toLocaleString() : 'just now'],
      ['route', 'Current route', store.get().path ?? '-'],
      ['ticks', 'Loop ticks', '0'],
    ]);
    status.refs.storage.append(
      h('span', { class: `badge ${saves.persistent ? 'good' : 'warn'}` },
        saves.persistent ? 'localStorage' : 'memory only (not saved)'),
    );

    const page = h('section', { class: 'page' },
      h('h1', {}, 'ISO'),
      h('p', {}, 'Foundation build. The game interface starts in Phase 1 and basketball in Phase 3; this phase only proves the engine room works.'),
      h('div', { class: 'panel' },
        h('h2', {}, 'System status'),
        status.el,
        h('div', { class: 'btn-row' },
          h('a', { class: 'btn btn-primary', href: '#/diagnostics' }, 'Open diagnostics'),
          h('a', { class: 'btn btn-outline', href: 'tests/index.html' }, 'Run tests in browser'),
        ),
      ),
    );
    container.append(page);

    let lastShown = -1;
    const off = loop.onRender(() => {
      if (loop.ticks !== lastShown && loop.ticks % 6 === 0) { lastShown = loop.ticks; setText(status.refs.ticks, loop.ticks); }
    });
    const offStore = store.subscribe((s) => setText(status.refs.route, s.path ?? '-'));
    return () => { off(); offStore(); };
  },
};
