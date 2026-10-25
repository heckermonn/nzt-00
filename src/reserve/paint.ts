import * as THREE from 'three';

export const DISPLAY = '"Archivo", "Helvetica Neue", Arial, sans-serif';
export const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
export const DOT = '"Doto", "IBM Plex Mono", monospace';

/** canvas fonts don't load on their own; ask for the faces the scene paints with, then repaint */
export const fontsReady = typeof document === 'undefined' ? Promise.resolve() : Promise.all([
  document.fonts.load(`900 100px ${DISPLAY}`),
  document.fonts.load(`500 40px ${MONO}`),
  document.fonts.load(`900 100px ${DOT}`),
]).then(() => undefined, () => undefined);

type Paint = (g: CanvasRenderingContext2D, w: number, h: number) => void;

/** a canvas texture that repaints once the web fonts arrive; `repaint` swaps the painter (live displays) */
export function paintTexture(w: number, h: number, paint: Paint, color = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  const t = new THREE.CanvasTexture(c) as THREE.CanvasTexture & { repaint: (p?: Paint) => void };
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  let current = paint;
  t.repaint = (p) => { if (p) current = p; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); current(g, w, h); t.needsUpdate = true; };
  t.repaint(); fontsReady.then(() => t.repaint());
  return t;
}

/** wide display face; canvas only stretches where the browser supports it */
export function wide(g: CanvasRenderingContext2D, weight: number, px: number) {
  g.font = `${weight} ${px}px ${DISPLAY}`;
  if ('fontStretch' in g) (g as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = 'expanded';
}

export function spaced(g: CanvasRenderingContext2D, text: string, x: number, y: number, track: number, align: 'left' | 'center' | 'right' = 'left') {
  const chars = [...text], widths = chars.map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  let cx = align === 'left' ? x : align === 'center' ? x - total / 2 : x - total;
  const prev = g.textAlign; g.textAlign = 'left';
  chars.forEach((ch, i) => { g.fillText(ch, cx, y); cx += widths[i] + track; });
  g.textAlign = prev;
  return total;
}

/** seeded random so textures paint the same every load */
export function rng(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

/** soft round shadow, multiplied under objects that stand on a surface */
export function blobTexture() {
  return paintTexture(256, 256, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, 'rgba(0,0,0,.85)'); r.addColorStop(0.45, 'rgba(0,0,0,.45)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
}
