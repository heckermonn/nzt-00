/* PR6 / Form · the phone menu (lu, 5 Nov). Two hairlines that fold into a cross; a frosted sheet opens out of
   the button as a growing circle, its lines rise into place one by one: the four pages large, the nine Series as an
   index, the RUO line at the foot. Escape, a link or a route change closes it. Desktop keeps the header links. */
import {AREAS} from './catalog.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

export function mountMenu({quoteCount, base = ''}) {
  const head = document.getElementById('head');
  const btn = document.createElement('button');
  btn.className = 'mbtn'; btn.type = 'button';
  btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'sheet');
  btn.innerHTML = '<span class="mb-l m" aria-hidden="true"><span>Menu</span><span>Close</span></span><span class="mb-i" aria-hidden="true"><i></i><i></i></span><span class="vh">Menu</span>';
  head.appendChild(btn);
  const sheet = document.createElement('div');
  sheet.className = 'sheet'; sheet.id = 'sheet'; sheet.hidden = true;
  sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'Menu');
  const pages = [['index', 'Index'], ['catalogue', 'Catalogue'], ['quote', 'Quote list'], ['record', 'Institution record']];
  sheet.innerHTML = `<div class="sh-in">
    <p class="sh-eye m ln"><span>PR6 / Contents</span><span>Issue 01</span></p>
    <nav class="sh-pages" aria-label="Pages">${pages.map(([k, l], i) => `<a class="ln" href="${base}#${k}" data-sh="${k}"><span class="m n">${String(i + 1).padStart(2, '0')}</span><span class="t">${l}${k === 'quote' ? ' <sup class="m" data-q></sup>' : ''}</span></a>`).join('')}</nav>
    <p class="sh-h m ln">Series</p>
    <ol class="sh-series">${AREAS.map(a => `<li class="ln"><a href="${base}#series-${a.c}" data-sh="series-${a.c}"><span class="m n">${a.c}</span><span class="t">${esc(a.f)}</span></a></li>`).join('')}</ol>
    <p class="sh-foot m ln">For laboratory research use only · By invitation</p>
  </div>`;
  document.body.appendChild(sheet);
  const main = document.getElementById('main'), folio = document.getElementById('folio');
  let open = false, tm = 0;
  const lines = [...sheet.querySelectorAll('.ln')];
  lines.forEach((l, i) => l.style.setProperty('--i', i));
  const set = v => {
    if (v === open) return; open = v; clearTimeout(tm);
    btn.setAttribute('aria-expanded', String(v)); btn.querySelector('.vh').textContent = v ? 'Close menu' : 'Menu';
    document.documentElement.classList.toggle('sheet-open', v);
    [main, folio].forEach(e => e && (e.inert = v));
    if (v) {
      const r = btn.getBoundingClientRect();
      sheet.style.setProperty('--ox', (r.left + r.width / 2) + 'px'); sheet.style.setProperty('--oy', (r.top + r.height / 2) + 'px');
      const q = sheet.querySelector('[data-q]'); if (q) q.textContent = quoteCount();
      const here = base ? '' : (location.hash || '#index').slice(1);
      sheet.querySelectorAll('[data-sh]').forEach(a => a.toggleAttribute('aria-current', here === a.dataset.sh || (a.dataset.sh === 'catalogue' && /^(catalogue|lineup|rail|ring)$/.test(here))));
      sheet.hidden = false; void sheet.offsetWidth; sheet.classList.add('on');
      setTimeout(() => sheet.querySelector('.sh-pages a')?.focus({preventScroll: true}), 380);
    } else {
      sheet.classList.remove('on'); sheet.classList.add('off');
      tm = setTimeout(() => { sheet.hidden = true; sheet.classList.remove('off'); }, 620);
      btn.focus({preventScroll: true});
    }
  };
  btn.addEventListener('click', () => set(!open));
  sheet.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  addEventListener('keydown', e => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); set(false); }
    if (e.key === 'Tab') {  /* keep focus inside the sheet and the button */
      const f = [btn, ...sheet.querySelectorAll('a')], i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  addEventListener('hashchange', () => set(false));
  matchMedia('(min-width:761px)').addEventListener('change', e => { if (e.matches) set(false); });
  return {close: () => set(false)};
}
