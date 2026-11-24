// js/main.js - boot: wires core services, the shell and the router together.
// Page modules receive these services through the router context; nothing is global
// except a read-only developer handle on window.iso (see bottom).

import { createBus } from './core/events.js';
import { createStore } from './core/store.js';
import { createLoop } from './core/loop.js';
import { createRouter } from './core/router.js';
import { createSaveManager } from './save/storage.js';
import { mountShell } from './ui/shell.js';
import { h } from './ui/dom.js';
import { homePage } from './ui/pages/home.js';
import { diagnosticsPage } from './ui/pages/diagnostics.js';

const NAV = [
  { label: 'Play', items: [{ path: '/home', label: 'Home' }] },
  { label: 'System', items: [{ path: '/diagnostics', label: 'Diagnostics' }] },
];

const ROUTES = {
  '/home': homePage,
  '/diagnostics': diagnosticsPage,
};

function boot() {
  const root = document.getElementById('app');

  const bus = createBus();
  const saves = createSaveManager();

  // Profile: created on first boot, counts how many times the app was opened.
  const profile = saves.load('profile').data;
  saves.save('profile', {
    ...profile,
    createdAt: profile.createdAt ?? Date.now(),
    bootCount: profile.bootCount + 1,
  });

  const store = createStore({ path: null });
  const loop = createLoop();
  const shell = mountShell(root, { nav: NAV });

  const router = createRouter({
    routes: ROUTES,
    outlet: shell.outlet,
    defaultPath: '/home',
    context: { bus, saves, store, loop },
    onChange: ({ path, from }) => {
      store.set({ path });
      shell.setActive(path);
      bus.emit('route:change', { path, from });
    },
  });

  loop.start();
  router.start();

  window.iso = Object.freeze({ bus, saves, store, loop, router, phase: 0 });
}

try {
  boot();
} catch (err) {
  console.error('[iso] boot failed', err);
  const root = document.getElementById('app');
  root.replaceChildren(h('div', { class: 'error-box', role: 'alert' },
    h('h2', {}, 'ISO could not start'),
    h('p', {}, String(err?.message ?? err)),
    h('p', {}, 'Open the browser console for details.'),
  ));
}
