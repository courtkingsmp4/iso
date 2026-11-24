// ui/shell.js - app frame: top bar, sidebar navigation, page outlet (spec 4.4).
// Phase 0 builds only the frame. The real nav (Play, Loadout, Shop ...) arrives in Phase 1.

import { h } from './dom.js';

export function mountShell(root, { nav }) {
  const links = new Map(); // path -> <a>

  const sidebar = h('nav', { class: 'sidebar', 'aria-label': 'Main' },
    nav.map((group) => h('div', { class: 'nav-group' },
      h('span', { class: 'nav-label' }, group.label),
      group.items.map((item) => {
        const a = h('a', { class: 'nav-link', href: '#' + item.path }, item.label);
        links.set(item.path, a);
        return a;
      }),
    )),
  );

  const outlet = h('main', { class: 'main', id: 'main', tabindex: '-1' });

  const shell = h('div', { class: 'shell' },
    h('header', { class: 'topbar' },
      h('a', { class: 'wordmark', href: '#/home', 'aria-label': 'ISO home' }, 'ISO'),
      h('span', { class: 'badge' }, 'Phase 0'),
      h('span', { class: 'spacer' }),
    ),
    sidebar,
    outlet,
  );

  root.replaceChildren(shell);

  return {
    outlet,
    setActive(path) {
      for (const [p, a] of links) {
        if (p === path) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      }
    },
  };
}
