// ui/dom.js - tiny element builder. Uses textContent/text nodes only (no innerHTML).

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function setText(el, text) { if (el.textContent !== String(text)) el.textContent = String(text); }

export function kv(rows) {
  const dl = h('dl', { class: 'kv' });
  const refs = {};
  for (const [key, label, initial] of rows) {
    const dd = h('dd', {}, initial ?? '');
    refs[key] = dd;
    dl.append(h('dt', {}, label), dd);
  }
  return { el: dl, refs };
}
