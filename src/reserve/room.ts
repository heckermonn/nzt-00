import { concrete } from './concrete';
import { MONO, paintTexture, spaced, wide } from './paint';

/** the door wall: its thickness, and the opening the leaves close */
export const WALL = { TH: 0.35, DW: 1.9, DH: 3.1 };

/** béton brut throughout: every wall is one board-formed pour */
export const wallMat = concrete({ color: 0xa4a4a0, roughness: 0.94 });

/** a self-lit title for the wall, like an exhibition title wall */
export function signTexture(n: string, name: string, line: string) {
  return paintTexture(2048, 640, (g, w) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, 640);
    g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
    g.font = `500 54px ${MONO}`; spaced(g, n, w / 2, 150, 20, 'center');
    wide(g, 900, 210); spaced(g, name, w / 2, 400, 14, 'center');
    g.font = `500 50px ${MONO}`; g.globalAlpha = 0.72; spaced(g, line.toUpperCase(), w / 2, 520, 8, 'center'); g.globalAlpha = 1;
  });
}
