import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { lab, useUI } from '../state/lab';
import { clunk, hiss, setFans, blip } from '../audio/sound';
import { M, canvasTexture } from './materials';
import { ENTRY, frostAmount, innerOpen, outerOpen } from './entryPath';
import { sstep } from './shared';

const { outerZ, innerZ, floorY, ceilY, hw, dw, doorTop } = ENTRY;
const LOCK_LEN = outerZ - innerZ, LOCK_MID = (outerZ + innerZ) / 2, LOCK_H = ceilY - floorY;
const VEST = { hw: 4.2, z1: 57, ceil: 3.6 };
const HOLD_S = 1.5, CYCLE_S = 6;

/** white light pushed past the bloom threshold */
const glow = (k: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(k), toneMapped: false });

/** door leaf face: the facility mark embossed across both leaves, split down the seam */
function leafTextures() {
  const paint = (g: CanvasRenderingContext2D, w: number, h: number) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${h * 0.2}px Archivo, "Arial Black", sans-serif`;
    g.fillText('NZT-00', w / 2, h * 0.46);
    // ribbed kick plate and a recessed handle line on each leaf
    for (let i = 0; i < 9; i++) g.fillRect(w * 0.04, h * (0.84 + i * 0.016), w * 0.92, h * 0.005);
    g.fillRect(w * 0.04, h * 0.62, w * 0.92, h * 0.004);
  };
  const L = canvasTexture(1024, 1024, paint), R = canvasTexture(1024, 1024, paint);
  L.repeat.set(0.5, 1); R.repeat.set(0.5, 1); R.offset.set(0.5, 0);
  return [L, R];
}

function sign() {
  return canvasTexture(1024, 160, (g, w, h) => {
    g.fillStyle = '#0d0f10'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e7e9ea'; g.font = '900 60px Doto, "IBM Plex Mono", monospace'; g.textBaseline = 'middle';
    g.fillText('SECTOR 00', 36, h * 0.5);
    g.font = '500 26px "IBM Plex Mono", monospace'; g.fillStyle = '#8a9195'; g.textAlign = 'right';
    g.fillText('RESTRICTED · AUTHORISED PERSONNEL ONLY', w - 36, h * 0.36);
    g.fillText('NZT-00 FACILITY · CLEAN ZONE BEYOND', w - 36, h * 0.66);
  });
}

/** airlock walls: white panels, seams, perforated nozzle fields */
function panelTexture() {
  const t = canvasTexture(1024, 512, (g, w, h) => {
    g.fillStyle = '#eceff0'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(14,16,17,.22)'; g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo((i * w) / 4, 0); g.lineTo((i * w) / 4, h); g.stroke(); }
    g.beginPath(); g.moveTo(0, h * 0.28); g.lineTo(w, h * 0.28); g.stroke();
    g.fillStyle = 'rgba(14,16,17,.5)';
    for (let p = 0; p < 4; p++) for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(p * (w / 4) + 46 + i * 34, h * 0.4 + j * 30, 5, 0, Math.PI * 2); g.fill(); }
    g.font = '500 20px "IBM Plex Mono", monospace'; g.fillText('AIRLOCK 01 · ISO 5', 24, h * 0.2);
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function gratingTexture() {
  const t = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#8d9497'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a3f42'; for (let i = 0; i < 8; i++) g.fillRect(8, i * 32 + 10, w - 16, 12);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 7);
  return t;
}

function innerLabel() {
  return canvasTexture(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(14,16,17,.85)';
    g.font = '900 64px Doto, "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.fillText('LAB', w / 2, h * 0.36);
    g.font = '500 22px "IBM Plex Mono", monospace'; g.fillText('CLEAN ZONE · KEEP SEALED', w / 2, h * 0.47);
  });
}

/** dust you can count: each particle has a threshold, and the cycle removes them in order */
function useDust(n: number) {
  return useMemo(() => {
    const pos = new Float32Array(n * 3), seed = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      seed[i * 4] = (Math.random() * 2 - 1) * (hw - 0.15);
      seed[i * 4 + 1] = floorY + 0.1 + Math.random() * (LOCK_H - 0.3);
      seed[i * 4 + 2] = innerZ + 0.4 + Math.random() * (LOCK_LEN - 0.8);
      seed[i * 4 + 3] = Math.random();
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0x4d5458, size: 0.028, transparent: true, opacity: 0.85, depthWrite: false });
    return { geo, mat, seed };
  }, [n]);
}

export function Entry() {
  const root = useRef<THREE.Group>(null);
  const oL = useRef<THREE.Mesh>(null), oR = useRef<THREE.Mesh>(null), iL = useRef<THREE.Mesh>(null), iR = useRef<THREE.Mesh>(null);
  const bolts = useRef<THREE.Mesh[]>([]), ring = useRef<THREE.Mesh>(null), strip = useRef<THREE.Mesh>(null);
  const mist = useRef<THREE.Mesh[]>([]), label = useRef<THREE.Mesh>(null);
  const dust = useDust(900), dustRef = useRef<THREE.Points>(null);

  const mats = useMemo(() => {
    const [tl, tr] = leafTextures();
    const leaf = (t: THREE.Texture) => new THREE.MeshStandardMaterial({ color: 0x8a9094, metalness: 0.92, roughness: 0.46, envMapIntensity: 0.2, bumpMap: t, bumpScale: 4 });
    return {
      leafL: leaf(tl), leafR: leaf(tr),
      vest: new THREE.MeshBasicMaterial({ color: 0x0c0e0f }),
      vestWall: new THREE.MeshStandardMaterial({ color: 0x3a3f42, metalness: 0.7, roughness: 0.55, envMapIntensity: 0.12 }),
      vestFloor: new THREE.MeshStandardMaterial({ color: 0x15181a, metalness: 0.6, roughness: 0.35 }),
      frame: new THREE.MeshStandardMaterial({ color: 0x6d7478, metalness: 1, roughness: 0.3, envMapIntensity: 0.4 }),
      sign: new THREE.MeshBasicMaterial({ map: sign() }),
      wall: new THREE.MeshStandardMaterial({ map: panelTexture(), roughness: 0.55 }),
      floor: new THREE.MeshStandardMaterial({ map: gratingTexture(), metalness: 0.7, roughness: 0.5 }),
      ceil: glow(1.3),
      glass: new THREE.MeshStandardMaterial({ color: 0xf2f4f5, roughness: 1, transparent: true, opacity: 0.72 }),
      label: new THREE.MeshBasicMaterial({ map: innerLabel(), transparent: true, depthWrite: false }),
      dark: new THREE.MeshStandardMaterial({ color: 0x141617, roughness: 0.4 }),
      boltOff: new THREE.MeshBasicMaterial({ color: 0x2a2e30 }),
      boltOn: glow(3),
      uv: new THREE.MeshBasicMaterial({ color: 0xdde6ff, toneMapped: false }),
      ring: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5a14).multiplyScalar(2.2), toneMapped: false }),
      strip: glow(2.4),
    };
  }, []);
  const mistMats = useMemo(() => {
    const map = canvasTexture(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
    return [0, 1, 2, 3].map(() => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, map }));
  }, []);

  const st = useMemo(() => ({ bolt: 0, stage: -1, fans: 0 }), []);

  // runs before the camera rig so the rig reads this frame's phase
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05), e = lab.entry, ui = useUI.getState();
    if (root.current) root.current.visible = e.phase !== 'lab';
    if (e.phase === 'lab') return;
    e.tp += dt;

    if (e.phase === 'door') {
      e.hold = e.holding ? Math.min(1, e.hold + dt / HOLD_S) : Math.max(0, e.hold - dt * 1.6);
      const b = Math.floor(e.hold * 3 + 1e-4);
      if (b > st.bolt) clunk();
      st.bolt = b;
      if (e.hold >= 1) { hiss(1.6, 2400, 0.14); ui.setPhase('opening'); }
    } else if (e.phase === 'opening') {
      if (e.tp > 3.7) ui.setPhase('airlock');
    } else if (e.phase === 'airlock') {
      if (e.holding) e.cycle = Math.min(1, e.cycle + dt / CYCLE_S);
      const stage = Math.min(2, Math.floor(e.cycle * 3));
      if (e.holding && stage !== st.stage) { st.stage = stage; blip(stage === 1 ? 180 : 520, 0.25, 'sine', 0.06); if (stage === 2) hiss(2.2, 900, 0.1); }
      const fans = e.holding && e.cycle < 1 / 3 ? 1 : 0;
      if (fans !== st.fans) { st.fans = fans; setFans(fans); }
      if (e.cycle >= 1) { setFans(0); blip(1320, 0.1); setTimeout(() => blip(1760, 0.12), 120); ui.setPhase('cleared'); }
    } else if (e.phase === 'cleared') {
      if (e.tp > 1.8) { hiss(1.4, 2000, 0.12); ui.setPhase('exit'); }
    } else if (e.phase === 'exit') {
      if (e.tp > 4.3) { ui.setPhase('lab'); (window as unknown as { __lenis?: { start(): void } }).__lenis?.start(); }
    }
    e.frost = frostAmount();

    // doors slide into the walls
    const o = outerOpen(), n = innerOpen();
    if (oL.current && oR.current) { oL.current.position.x = -dw / 2 - o * dw * 1.02; oR.current.position.x = dw / 2 + o * dw * 1.02; }
    if (iL.current && iR.current) { iL.current.position.x = -dw / 2 - n * dw * 1.02; iR.current.position.x = dw / 2 + n * dw * 1.02; }
    bolts.current.forEach((m, i) => { if (m) m.material = (e.phase === 'door' ? e.hold * 3 > i + 0.999 : true) ? mats.boltOn : mats.boltOff; });
    if (ring.current) { const pulse = e.phase === 'door' ? 0.75 + 0.25 * Math.sin(performance.now() / 260) : 0.2; ring.current.scale.setScalar(1 + e.hold * 0.12); mats.ring.color.setRGB(1, 0.353, 0.078).multiplyScalar(2.2 * pulse); }
    if (strip.current) strip.current.scale.x = 1 - o;

    // UV-C bars come up for the middle third of the cycle
    const c = e.phase === 'airlock' ? e.cycle : e.phase === 'door' || e.phase === 'opening' ? 0 : 1;
    const uvOn = sstep(0.3, 0.38, c) * (1 - sstep(0.64, 0.7, c));
    mats.uv.color.setRGB(0.86, 0.9, 1).multiplyScalar(1.1 + uvOn * 3.2);
    if (label.current) label.current.visible = n < 0.05;
    const purge = sstep(0.64, 0.75, c) * (1 - sstep(0.9, 1, c));
    mist.current.forEach((m, i) => { if (!m) return; mistMats[i].opacity = purge * 0.5; m.position.y = floorY + 0.6 + i * 0.35 + Math.sin(performance.now() / 900 + i) * 0.1; });

    // dust: drifts, then the air shower drives it to the floor vents and it is gone
    const p = dust.geo.attributes.position as THREE.BufferAttribute, s = dust.seed, now = performance.now() / 1000;
    const removed = c * 1.04, wind = e.phase === 'airlock' && e.holding && c < 1 / 3 ? 1 : 0;
    for (let i = 0; i < s.length / 4; i++) {
      if (s[i * 4 + 3] < removed) { p.setXYZ(i, 0, -50, 0); continue; }
      const fall = wind * ((now * 2.2 + s[i * 4 + 3] * 7) % 1) * LOCK_H;
      p.setXYZ(i, s[i * 4] + Math.sin(now * 0.4 + i) * 0.06, Math.max(floorY + 0.05, s[i * 4 + 1] + Math.sin(now * 0.3 + i * 1.7) * 0.08 - fall), s[i * 4 + 2] + Math.cos(now * 0.35 + i) * 0.06);
    }
    p.needsUpdate = true;
  }, -3);

  const leafW = dw * 1.0, leafH = doorTop - floorY;
  const nozzles = useMemo(() => { const a: [number, number, number][] = []; for (let z = innerZ + 1.6; z < outerZ - 1; z += 1.6) a.push([0, ceilY - 0.12, z]); return a; }, []);
  const uvZ = useMemo(() => [innerZ + 2, innerZ + 5, innerZ + 8, innerZ + 11], []);

  return (
    <group ref={root}>
      {/* vestibule: a dark box around the visitor, lit only by the door */}
      <mesh position={[-VEST.hw, (floorY + VEST.ceil) / 2, (outerZ + VEST.z1) / 2]} rotation-y={Math.PI / 2} material={mats.vest}><planeGeometry args={[VEST.z1 - outerZ, VEST.ceil - floorY]} /></mesh>
      <mesh position={[VEST.hw, (floorY + VEST.ceil) / 2, (outerZ + VEST.z1) / 2]} rotation-y={-Math.PI / 2} material={mats.vest}><planeGeometry args={[VEST.z1 - outerZ, VEST.ceil - floorY]} /></mesh>
      <mesh position={[0, VEST.ceil, (outerZ + VEST.z1) / 2]} rotation-x={Math.PI / 2} material={mats.vest}><planeGeometry args={[VEST.hw * 2, VEST.z1 - outerZ]} /></mesh>
      <mesh position={[0, (floorY + VEST.ceil) / 2, VEST.z1]} rotation-y={Math.PI} material={mats.vest}><planeGeometry args={[VEST.hw * 2, VEST.ceil - floorY]} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, floorY + 0.005, (outerZ + VEST.z1) / 2]} material={mats.vestFloor}><planeGeometry args={[VEST.hw * 2, VEST.z1 - outerZ]} /></mesh>
      {/* the wall with the outer door cut out of it */}
      <group position={[0, 0, outerZ]}>
        <mesh position={[-(VEST.hw + dw) / 2, (floorY + VEST.ceil) / 2, 0.06]} material={mats.vestWall}><boxGeometry args={[VEST.hw - dw, VEST.ceil - floorY, 0.1]} /></mesh>
        <mesh position={[(VEST.hw + dw) / 2, (floorY + VEST.ceil) / 2, 0.06]} material={mats.vestWall}><boxGeometry args={[VEST.hw - dw, VEST.ceil - floorY, 0.1]} /></mesh>
        <mesh position={[0, (doorTop + VEST.ceil) / 2, 0.06]} material={mats.vestWall}><boxGeometry args={[dw * 2, VEST.ceil - doorTop, 0.1]} /></mesh>
        <mesh position={[0, doorTop + 0.55, 0.12]} material={mats.sign}><planeGeometry args={[2.6, 0.41]} /></mesh>
        {[0, 1, 2].map((i) => <mesh key={i} ref={(m) => { if (m) bolts.current[i] = m; }} position={[-0.3 + i * 0.3, doorTop + 0.14, 0.12]} material={mats.boltOff}><circleGeometry args={[0.035, 20]} /></mesh>)}
        {/* keypad: the one live control */}
        <group position={[dw + 0.55, 0.15, 0.12]}>
          <mesh material={mats.dark}><boxGeometry args={[0.44, 0.7, 0.04]} /></mesh>
          {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[-0.11 + (i % 3) * 0.11, 0.2 - Math.floor(i / 3) * 0.09, 0.025]} material={mats.frame}><boxGeometry args={[0.08, 0.065, 0.02]} /></mesh>)}
          <mesh ref={ring} position={[0, -0.22, 0.03]} material={mats.ring}><ringGeometry args={[0.05, 0.062, 40]} /></mesh>
        </group>
        <mesh ref={strip} position={[0, floorY + 0.02, 0.2]} material={mats.strip}><planeGeometry args={[dw * 2, 0.025]} /></mesh>
      </group>
      <mesh ref={oL} position={[-dw / 2, (floorY + doorTop) / 2, outerZ]} material={mats.leafL}><boxGeometry args={[leafW, leafH, 0.1]} /></mesh>
      <mesh ref={oR} position={[dw / 2, (floorY + doorTop) / 2, outerZ]} material={mats.leafR}><boxGeometry args={[leafW, leafH, 0.1]} /></mesh>
      <spotLight position={[0, VEST.ceil - 0.1, outerZ + 2.2]} target-position={[0, 0, outerZ]} angle={0.7} penumbra={0.9} intensity={18} distance={10} decay={1.6} />

      {/* airlock */}
      <group>
        <mesh position={[-hw, floorY + LOCK_H / 2, LOCK_MID]} rotation-y={Math.PI / 2} material={mats.wall}><planeGeometry args={[LOCK_LEN, LOCK_H]} /></mesh>
        <mesh position={[hw, floorY + LOCK_H / 2, LOCK_MID]} rotation-y={-Math.PI / 2} material={mats.wall}><planeGeometry args={[LOCK_LEN, LOCK_H]} /></mesh>
        <mesh position={[0, floorY, LOCK_MID]} rotation-x={-Math.PI / 2} material={mats.floor}><planeGeometry args={[hw * 2, LOCK_LEN]} /></mesh>
        <mesh position={[0, ceilY, LOCK_MID]} rotation-x={Math.PI / 2} material={mats.ceil}><planeGeometry args={[hw * 2, LOCK_LEN]} /></mesh>
        {nozzles.map((p, i) => <mesh key={i} position={p} material={mats.frame}><boxGeometry args={[hw * 1.6, 0.16, 0.22]} /></mesh>)}
        {uvZ.map((z) => [-1, 1].map((sx) => (
          <mesh key={`${z}${sx}`} position={[sx * (hw - 0.06), floorY + LOCK_H / 2, z]} material={mats.uv}>
            <cylinderGeometry args={[0.035, 0.035, LOCK_H - 0.6, 12]} />
          </mesh>
        )))}
        <points ref={dustRef} geometry={dust.geo} material={dust.mat} frustumCulled={false} />
        {[0, 1, 2, 3].map((i) => <mesh key={i} ref={(m) => { if (m) mist.current[i] = m; }} position={[(i - 1.5) * 0.9, floorY + 0.6, LOCK_MID - 2 + i]} material={mistMats[i]}><planeGeometry args={[3.2, 2.2]} /></mesh>)}
      </group>
      {/* inner wall and the frosted door to the lab */}
      <group position={[0, 0, innerZ]}>
        <mesh position={[-(hw + dw) / 2, floorY + LOCK_H / 2, -0.06]} material={mats.frame}><boxGeometry args={[hw - dw, LOCK_H, 0.1]} /></mesh>
        <mesh position={[(hw + dw) / 2, floorY + LOCK_H / 2, -0.06]} material={mats.frame}><boxGeometry args={[hw - dw, LOCK_H, 0.1]} /></mesh>
        <mesh position={[0, (doorTop + ceilY) / 2, -0.06]} material={mats.frame}><boxGeometry args={[dw * 2, ceilY - doorTop, 0.1]} /></mesh>
      </group>
      <mesh ref={iL} position={[-dw / 2, (floorY + doorTop) / 2, innerZ]} material={mats.glass}><boxGeometry args={[leafW, leafH, 0.06]} /></mesh>
      <mesh ref={iR} position={[dw / 2, (floorY + doorTop) / 2, innerZ]} material={mats.glass}><boxGeometry args={[leafW, leafH, 0.06]} /></mesh>
      <mesh ref={label} position={[0, 0.7, innerZ + 0.05]} material={mats.label}><planeGeometry args={[1.6, 1.6]} /></mesh>
    </group>
  );
}
