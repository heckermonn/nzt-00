/* PR6 v8 · the plain gate: the fallback when three.js cannot be loaded (Object 0047 needs it). Same interface as
   gates/object.js, same code (0047RSRV, ?key=0047RSRV), same deadpan label, no object. Guests are told nothing. */
import {$, RM, store} from '../util.js';

const CODE = '0047RSRV', LIGHT = '#f2f3ef';
const ROOT = $('#gate');
ROOT.className = 'obj nogl ml plain'; ROOT.setAttribute('aria-label', 'Object 0047');
ROOT.innerHTML = `
  <div class="o-hud" aria-hidden="true"><p class="o-cap o-lbl"><b>Object 0047<span> / </span><br class="o-br">Do not touch</b><span class="o-cap2">Held for observation</span></p></div>
  <p class="o-status" id="pStatus" role="status" aria-live="polite">Not available.</p>
  <form class="g-form o-f on" id="pForm" autocomplete="off" novalidate style="--fx:50%;--fy:46%;--fw:300px">
    <label class="sr" for="pCode">Invitation code</label>
    <input id="pCode" type="text" autocapitalize="characters" spellcheck="false" maxlength="16" placeholder="Code">
    <button type="submit" class="g-go" aria-label="Present the code"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M11.5 5.5L16 10l-4.5 4.5"/></svg></button>
  </form>
  <div class="o-flood" id="pFlood" aria-hidden="true" style="display:block"></div>`;
const st = {live: false, mode: 'idle', onEnter: null};
function success() {
  if (st.mode === 'entering') return;
  st.mode = 'entering'; store.put('pr6.v8.member', '1');
  const f = $('#pFlood'); f.style.transition = `opacity ${RM ? 200 : 800}ms ease-in`; f.style.opacity = 1;
  const p = Promise.resolve(st.onEnter && st.onEnter.load && st.onEnter.load());
  setTimeout(() => p.then(() => { st.onEnter.prepare(LIGHT); st.onEnter.go(LIGHT); ROOT.style.transition = 'opacity .3s'; ROOT.style.opacity = 0; setTimeout(() => { st.live = false; ROOT.hidden = true; }, 320); }), RM ? 220 : 820);
}
$('#pForm').addEventListener('submit', e => {
  e.preventDefault(); const v = $('#pCode').value.replace(/\s+/g, '').toUpperCase();
  if (v === CODE) success(); else { $('#pCode').value = ''; $('#pStatus').textContent = 'No.'; }
});
export const gate = {
  async init(onEnter) { st.onEnter = onEnter; return {art: false, light: LIGHT}; },
  show(o = {}) {
    st.live = true; st.mode = 'idle'; ROOT.hidden = false; ROOT.style.opacity = ''; $('#pFlood').style.opacity = 0;
    if (o.key) setTimeout(success, 400); else setTimeout(() => $('#pCode').focus({preventScroll: true}), 60);
  },
  frame() {},
  get live() { return st.live; },
  state: () => ({mode: st.mode, gl: false})
};
