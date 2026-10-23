import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FORMULAS } from '../data/formulas';
import { lab } from '../state/lab';
import { settled } from '../state/scroll';
import { bodyGeo, capGeo } from './capsule';
import { bodyMat, capMat } from './materials';
import { HERO_I, ease, hero, heroFrom, sstep } from './shared';
import { Tag } from './Tag';

const N = 500, S0 = 0.2, up = new THREE.Vector3(0, 1, 0);
const qTo = (d: THREE.Vector3) => new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize());

/** five shapes the 500 capsules move between: loose cloud, then one formation per formula */
function buildShapes() {
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const SH: THREE.Vector3[][] = [[], [], [], [], []], SQ: THREE.Quaternion[][] = [[], [], [], [], []];
  const delay = new Float32Array(N), swirl: THREE.Vector3[] = [];
  for (let i = 0; i < N; i++) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = Math.cbrt(rnd());
    SH[0].push(new THREE.Vector3(Math.sqrt(1 - u * u) * Math.cos(th) * r * 9, u * r * 3.6, Math.sqrt(1 - u * u) * Math.sin(th) * r * 5));
    SQ[0].push(new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6)));
    { const a = i % 10, b = Math.floor(i / 10) % 5, c = Math.floor(i / 50); SH[1].push(new THREE.Vector3((a - 4.5) * 0.5, (c - 4.5) * 0.62, (b - 2) * 0.5)); SQ[1].push(new THREE.Quaternion()); }
    { const sd = i % 2, t = Math.floor(i / 2) / 249, ang = t * Math.PI * 7 + sd * Math.PI; SH[2].push(new THREE.Vector3(Math.cos(ang) * 1.6, (t - 0.5) * 6.6, Math.sin(ang) * 1.6)); SQ[2].push(qTo(new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)))); }
    { const uu = ((i % 50) / 50) * Math.PI * 2, v = (Math.floor(i / 50) / 10) * Math.PI * 2, R = 2.5, rr = 0.62;
      SH[3].push(new THREE.Vector3((R + rr * Math.cos(v)) * Math.cos(uu), rr * Math.sin(v), (R + rr * Math.cos(v)) * Math.sin(uu))); SQ[3].push(qTo(new THREE.Vector3(-Math.sin(uu), 0, Math.cos(uu)))); }
    { const y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), t2 = i * 2.399963; const n = new THREE.Vector3(Math.cos(t2) * rr, y, Math.sin(t2) * rr); SH[4].push(n.clone().multiplyScalar(2.45)); SQ[4].push(qTo(n)); }
    delay[i] = rnd(); swirl.push(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(0.8 + rnd() * 1.6));
  }
  return { SH, SQ, delay, swirl };
}

export function Swarm() {
  const group = useRef<THREE.Group>(null);
  const caps = useRef<THREE.InstancedMesh>(null), bodies = useRef<THREE.InstancedMesh>(null), tag = useRef<HTMLDivElement>(null);
  const { SH, SQ, delay, swirl } = useMemo(buildShapes, []);
  const geo = useMemo(() => ({ cap: capGeo(), body: bodyGeo() }), []);
  const off = useMemo(() => new Float32Array(N * 3), []), vel = useMemo(() => new Float32Array(N * 3), []);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), v: new THREE.Vector3(), s: new THREE.Vector3(), p: new THREE.Vector3(),
    inv: new THREE.Matrix4(), ro: new THREE.Vector3(), rd: new THREE.Vector3(), c: new THREE.Vector3(), a: new THREE.Color(), b: new THREE.Color() }), []);
  const label = useRef({ i: -1 });

  useFrame((state, dt) => {
    const g = group.current, C = caps.current, Bd = bodies.current; if (!g || !C || !Bd) return;
    const { k, t } = lab, lt = settled(k, t), now = state.clock.elapsedTime * 1000;
    // morph value: 0 cloud, 1 lattice, 2 helix, 3 ring, 4 sphere
    let m = 4;
    if (k === 0) m = sstep(0.25, 1, t);
    else if (k === 1) { m = 1; for (let i = 1; i < 4; i++) m += sstep(0, 1, lab.card[i]); }
    const a0 = Math.min(3, Math.floor(m)), fr = m - a0;
    const cf = Math.max(0, Math.min(3, m - 1)), ci = Math.floor(cf);
    if (k === 0) capMat.color.set(0xffffff);
    else capMat.color.copy(tmp.a.set(FORMULAS[ci].tint).lerp(tmp.b.set(FORMULAS[Math.min(3, ci + 1)].tint), cf - ci));

    g.rotation.y = (g.rotation.y + dt * (k === 0 ? 0.03 : 0.12) * (lab.reduce ? 0 : 1) + lab.spin) % (Math.PI * 2);
    lab.spin *= Math.pow(0.02, dt);
    const recede = k >= 2 ? (k === 2 ? sstep(0, 0.5, t) : 1) : 0;
    g.position.set(0, 0, -recede * 9); g.visible = k < 4; g.updateMatrixWorld();

    // cursor force field, computed in swarm space
    state.raycaster.setFromCamera(state.pointer, state.camera); tmp.inv.copy(g.matrixWorld).invert();
    tmp.ro.copy(state.raycaster.ray.origin).applyMatrix4(tmp.inv); tmp.rd.copy(state.raycaster.ray.direction).transformDirection(tmp.inv);
    const force = k <= 1 && lab.pointerIn && !lab.reduce; let dis = 0;
    const A = SH[a0], Bs = SH[a0 + 1], QA = SQ[a0], QB = SQ[a0 + 1], damp = Math.pow(0.03, dt);
    for (let i = 0; i < N; i++) {
      const e = ease(Math.min(1, Math.max(0, fr * 1.7 - delay[i] * 0.7)));
      const p = tmp.p.copy(A[i]).lerp(Bs[i], e).addScaledVector(swirl[i], Math.sin(e * Math.PI));
      if (a0 === 0 && e < 1) { p.y += Math.sin(now / 1400 + i) * 0.25 * (1 - e); p.x += Math.cos(now / 1700 + i * 1.3) * 0.3 * (1 - e); }
      const q = tmp.q.copy(QA[i]).slerp(QB[i], e);
      if (a0 === 0) q.multiply(tmp.q2.setFromAxisAngle(up, (now / 3000) * (1 - e) + i));
      const j = i * 3;
      if (force) {
        tmp.c.copy(p).sub(tmp.ro); const s = tmp.c.dot(tmp.rd); tmp.c.copy(tmp.ro).addScaledVector(tmp.rd, s); tmp.v.copy(p).sub(tmp.c); const d = tmp.v.length();
        if (d < 1.2) { const f = (1.2 - d) / 1.2; tmp.v.normalize().multiplyScalar(f * f * 14 * dt); vel[j] += tmp.v.x; vel[j + 1] += tmp.v.y; vel[j + 2] += tmp.v.z; }
      }
      for (let c = 0; c < 3; c++) { vel[j + c] += -off[j + c] * 9 * dt; vel[j + c] *= damp; off[j + c] += vel[j + c] * dt * 6; }
      const ol = Math.abs(off[j]) + Math.abs(off[j + 1]) + Math.abs(off[j + 2]); if (ol > 0.08) dis++;
      if (recede) p.addScaledVector(swirl[i], recede * 0.9);
      p.x += off[j]; p.y += off[j + 1]; p.z += off[j + 2];
      if (ol > 0.02) q.multiply(tmp.q2.setFromAxisAngle(up, ol * 2));
      if (i === HERO_I) heroFrom.copy(g.matrixWorld).multiply(tmp.m.compose(p, q, tmp.s.setScalar(S0)));
      tmp.s.setScalar(i === HERO_I && hero.visible ? 0 : S0 * (1 + Math.min(0.4, ol)));
      tmp.m.compose(p, q, tmp.s); C.setMatrixAt(i, tmp.m); Bd.setMatrixAt(i, tmp.m);
    }
    C.instanceMatrix.needsUpdate = Bd.instanceMatrix.needsUpdate = true;
    lab.disturbed += (dis - lab.disturbed) * 0.2;

    // formation label tracks the shape on screen
    const fIdx = k === 1 ? Math.min(3, Math.round(m - 1)) : 0, show = k === 1 || (k === 0 && t > 0.8);
    if (tag.current) {
      tag.current.classList.toggle('on', show);
      if (show && label.current.i !== fIdx) { label.current.i = fIdx; const f = FORMULAS[fIdx]; tag.current.innerHTML = `<b>${f.code}</b>${f.name}<span>${f.shape} · 500 caps</span>`; }
    }
    void lt;
  });

  return (
    <group ref={group}>
      <instancedMesh ref={caps} args={[geo.cap, capMat, N]} frustumCulled={false} />
      <instancedMesh ref={bodies} args={[geo.body, bodyMat, N]} frustumCulled={false} />
      <Tag ref={tag} position={[2.9, 1.8, 0]} flat>{null}</Tag>
    </group>
  );
}
