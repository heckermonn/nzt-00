/* P4CE v5 · the gate, chosen. Guests see exactly one gate; main.js talks to it only through this interface:
     init(onEnter) → Promise<{art, light}>   load what the gate needs (onEnter = {prepare(lightHex), go(lightHex)})
     show({key})                             put the gate up (key: a valid ?key= arrived, so let them straight in)
     frame(now)                              called every animation frame while live
     live                                    true while the gate is on screen
     state()                                 a plain object for the test hooks
   The gate owns its markup (it writes it into #gate) and its success: it stores membership, then hands its last
   frame of light to onEnter.prepare(light) and onEnter.go(light), and the Atlas resolves out of that light.
   Object 0047 (gates/object.js) is the default; ?gate=door brings back the Door (gates/door.js) for comparison.
   A future gate is one more module with the same five members, and one more line in KINDS. */
import {Q} from '../util.js';

const KINDS = {object: () => import('./object.js'), door: () => import('./door.js')};
export const GATE_KIND = KINDS[(Q.get('gate') || '').toLowerCase()] ? Q.get('gate').toLowerCase() : 'object';

let impl = null, ready = null, onEnter = null;
function load(enter) {
  if (enter) onEnter = enter;
  if (!ready) ready = KINDS[GATE_KIND]().catch(e => { console.warn('[p4] gate unavailable, the Door stands in', e); return KINDS.door(); }).then(m => { impl = m.gate; return impl.init(onEnter); });
  return ready;
}
export const Gate = {
  kind: GATE_KIND,
  init: enter => load(enter),
  /* a member who exits mid-session never ran init: load the gate on first show */
  show(o = {}) { if (impl) impl.show(o); else load().then(() => impl.show(o)); },
  frame(now, noRender) { if (impl && impl.live) impl.frame(now, noRender); },
  get live() { return !!(impl && impl.live); },
  state: () => impl ? Object.assign({kind: GATE_KIND}, impl.state()) : {kind: GATE_KIND, loading: true},
  get impl() { return impl; }
};
