import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { COLLECTIONS, R, slotAngle } from './data';
import { HALL, PLINTH } from './Hall';
import { SPEC, TAPE_K, hud } from './hud';
import { rv } from './state';

const { NW, NB, NH, ND } = HALL;
const ROWS = ['Format', 'Fill', 'Height', 'Light'];

/** the measured overlay: crop marks on the niche you face, a dimension line on its specimen, and a spec callout */
export function MeasureOverlay() {
  return (
    <svg className="measure" ref={(el) => { hud.svg = el; }} aria-hidden="true">
      <path className="m-line" ref={(el) => { hud.lines = el; }} />
      <path className="m-lead" ref={(el) => { hud.leader = el; }} />
      <text className="m-dim" ref={(el) => { hud.dim = el; }} />
      <text className="m-tag" ref={(el) => { hud.tag = el; }} textAnchor="end" />
      <g ref={(el) => { hud.callout = el; }}>
        {ROWS.map((k, i) => (
          <g key={k} transform={`translate(0 ${18 + i * 16})`}>
            <text className="m-key">{k}</text>
            <text className="m-val" x="64" ref={(el) => { if (el) hud.values[i] = el; }} />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** projects the bay you face onto the screen each frame and draws the overlay and the heading readouts */
export function Projector({ narrow }: { narrow: boolean }) {
  const size = useThree((s) => s.size);
  const v = useMemo(() => new THREE.Vector3(), []);
  const last = useRef(-1);
  useFrame(({ camera }) => {
    const deg = (((rv.yaw * 36) % 360) + 360) % 360;
    if (hud.hdg) hud.hdg.textContent = `${deg.toFixed(1).padStart(5, '0')}°`;
    if (hud.tape) hud.tape.style.transform = `translateX(${-(deg + 360) * TAPE_K}px)`;
    const svg = hud.svg; if (!svg || !hud.lines || !hud.leader || !hud.dim || !hud.tag || !hud.callout) return;

    const slot = Math.round(rv.yaw), m = ((slot % 10) + 10) % 10, bay = m - 1;
    const turn = Math.max(0, 1 - Math.abs(rv.yaw - slot) * 5), enter = rv.phase === 'hall' ? Math.min(1, rv.tp / 1.2) : 0;
    const alpha = bay < 0 ? 0 : turn * enter * (0.3 + 0.7 * rv.light[bay]);
    svg.style.opacity = alpha.toFixed(3);
    if (alpha < 0.01) return;

    const c = COLLECTIONS[bay], spec = SPEC[c.form];
    const a = slotAngle(m), ca = Math.cos(a + Math.PI), sa = Math.sin(a + Math.PI), W = size.width, H = size.height;
    // slot-local to screen pixels
    const at = (x: number, y: number, z: number): [number, number] => {
      v.set(Math.sin(a) * R + x * ca + z * sa, y, Math.cos(a) * R - x * sa + z * ca).project(camera);
      return [Math.round((v.x + 1) * 0.5 * W) + 0.5, Math.round((1 - v.y) * 0.5 * H) + 0.5];
    };

    // crop marks outside each corner of the niche opening
    const g = 7, arm = 18;
    let d = '';
    for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const [x, y] = at((sx * NW) / 2, sy > 0 ? NB + NH : NB, 0);
      d += `M${x + sx * g} ${y}h${sx * arm}M${x} ${y - sy * g}v${-sy * arm}`;
    }
    // the specimen's height, true to the product rather than the room
    const base = NB + PLINTH, top = base + spec.h * 1.35, z = -ND * 0.55;
    const [bx, by] = at(spec.x, base, z), [tx, ty] = at(spec.x, top, z);
    d += `M${bx} ${by}L${tx} ${ty}M${bx - 5} ${by}h10M${tx - 5} ${ty}h10`;
    hud.lines.setAttribute('d', d);
    hud.dim.setAttribute('x', String(bx + 10)); hud.dim.setAttribute('y', String(Math.round((by + ty) / 2) + 4));

    const [lx, ly] = at(-NW / 2, NB + NH, 0);
    hud.tag.setAttribute('x', String(lx - g - arm - 10)); hud.tag.setAttribute('y', String(ly + 4));
    hud.tag.style.display = lx < 190 ? 'none' : '';

    // leader from the top of the specimen out past the niche to the callout
    const [rx] = at(NW / 2, NB + NH, 0), [sx, sy] = at(0.06, top + 0.03, z);
    const cx = rx + 32, cy = Math.round(sy - 26), room = !narrow && cx + 200 < W - 72;
    hud.callout.style.display = room ? '' : 'none';
    hud.leader.setAttribute('d', room ? `M${sx} ${sy}L${sx + 26} ${cy}H${cx + 196}` : '');
    if (room) hud.callout.setAttribute('transform', `translate(${cx} ${cy})`);

    if (last.current !== bay) {
      last.current = bay;
      hud.dim.textContent = `H ${spec.mm} MM`;
      hud.tag.textContent = `N${c.n} · 2500 × 3300`;
      hud.values[0].textContent = spec.format; hud.values[1].textContent = spec.fill; hud.values[2].textContent = `${spec.mm} MM`;
    }
    hud.values[3].textContent = `${Math.round(rv.light[bay] * 100).toString().padStart(3, '0')} %`;
  });
  return null;
}
