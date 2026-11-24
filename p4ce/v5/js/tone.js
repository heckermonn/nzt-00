/* P4CE v5 · one palette, drifted, never snapped.
   The page background, the WebGL sky and fog, and the paper sweep all read this one colour. */
import {tween, E, hex2rgb, rgb2hex, mixRGB} from './util.js';

export const STOPS = {
  night: '#0a0a0b',
  light: '#eeeae7',   /* the light beyond the door (the gate manifest's lightHex); the Atlas sky starts here */
  sand: '#e3ded5',    /* the Atlas plane: a warm grey that sits close to paper */
  stone: '#e9e6e0',   /* at a station */
  paper: '#f1efea'    /* the store */
};
const root = document.documentElement;
export const Tone = {
  rgb: hex2rgb(STOPS.paper), name: 'paper', tw: null,
  get hex() { return rgb2hex(this.rgb); },
  set(name) { if (this.tw) this.tw.tw.cancel(); this.name = name; this.rgb = hex2rgb(STOPS[name] || name); this.apply(); },
  /* set the colour directly (a move that computes it per frame), cancelling any drift in progress */
  put(rgb, name) { if (this.tw) { this.tw.tw.cancel(); this.tw = null; } this.rgb = rgb; if (name) this.name = name; this.apply(); },
  to(name, dur = 1200, ease = E.io, delay = 0) {
    const a = this.rgb.slice(), b = hex2rgb(STOPS[name] || name); this.name = name;
    if (this.tw) this.tw.tw.cancel();
    this.tw = tween(dur, e => { this.rgb = mixRGB(a, b, e); this.apply(); }, ease, delay);
    return this.tw;
  },
  apply() {
    const c = this.rgb, h = rgb2hex(c);
    root.style.setProperty('--bg', h);
    /* the sweep floor and the hairline both derive from the same colour */
    root.style.setProperty('--floor', rgb2hex(mixRGB(c, [176, 170, 160], .16)));
    root.style.setProperty('--haze', `rgba(${c.map(Math.round).join(',')},.0)`);
    const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = h;
  }
};
