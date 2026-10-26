import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useCart, type Flight } from './cart';
import { COLLECTIONS, R } from './data';
import { WALL, signTexture, wallMat } from './room';
import { LINE_K, lh } from './hud';
import { BELT, DONE, END_X, ITEM, LINE, STATIONS, beltPos, cameraX, itemX, stationP } from './line';
import { DOT, MONO, paintTexture, spaced } from './paint';
import { Specimen } from './Specimens';
import { DARK, STEEL, Station } from './Stations';
import { rv } from './state';

const { TH, DW, DH } = WALL;
/** the room: the door wall at z = R, a long back wall behind the line, ceiling overhead */
const ROOM = { x0: -4.5, x1: END_X + 5, back: -3.4, h: 5.4 };
const glow = (k: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.985, 0.96).multiplyScalar(k), toneMapped: false });

function Box({ x0, x1, y0, y1, z0, z1, mat = wallMat }: { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; mat?: THREE.Material }) {
  return <mesh material={mat} position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]}><boxGeometry args={[x1 - x0, y1 - y0, z1 - z0]} /></mesh>;
}

/** board-formed concrete box with the door cut into its front wall */
function Room({ narrow }: { narrow: boolean }) {
  const { x0, x1, back, h } = ROOM;
  const strip = useMemo(() => glow(2.2), []);
  const paint = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x6d6e6c }), []);
  const signs = useMemo(() => STATIONS.map((s) => { const c = COLLECTIONS[s.c]; return new THREE.MeshBasicMaterial({ map: signTexture(c.n, c.name, c.line), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color().setScalar(0.85) }); }), []);
  const dispatch = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, map: paintTexture(2048, 400, (g, w) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, 400); g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
    g.font = `500 54px ${MONO}`; spaced(g, 'END OF LINE', w / 2, 120, 20, 'center');
    g.font = `900 190px ${DOT}`; spaced(g, 'DISPATCH', w / 2, 330, 18, 'center');
  }) }), []);
  return (
    <group>
      {/* front wall with the door opening; the leaves belong to the door */}
      <Box x0={x0} x1={-DW / 2} y0={0} y1={h} z0={R} z1={R + TH} />
      <Box x0={DW / 2} x1={x1} y0={0} y1={h} z0={R} z1={R + TH} />
      <Box x0={-DW / 2} x1={DW / 2} y0={DH} y1={h} z0={R} z1={R + TH} />
      <Box x0={x0} x1={x1} y0={0} y1={h} z0={back - TH} z1={back} />
      <Box x0={x0 - TH} x1={x0} y0={0} y1={h} z0={back} z1={R} />
      <Box x0={x1} x1={x1 + TH} y0={0} y1={h} z0={back} z1={R} />
      <Box x0={x0} x1={x1} y0={h} y1={h + TH} z0={back} z1={R + TH} />
      {/* pilasters along the back wall, one bay of formwork apart */}
      {Array.from({ length: Math.floor((x1 - x0) / 5.5) }, (_, k) => {
        const x = x0 + 2.75 + k * 5.5;
        return <Box key={k} x0={x - 0.3} x1={x + 0.3} y0={0} y1={h} z0={back} z1={back + 0.35} />;
      })}
      {/* a strip of light the length of the line, and the walkway lines painted either side of it */}
      <mesh material={strip} position={[(x0 + x1) / 2, h - 0.02, 0]}><boxGeometry args={[x1 - x0 - 1, 0.02, 0.05]} /></mesh>
      {[-1.1, 1.1].map((z) => <mesh key={z} material={paint} position={[(LINE.x0 + LINE.x1) / 2, 0.002, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[LINE.x1 - LINE.x0, 0.05]} /></mesh>)}
      {STATIONS.map((s, k) => <mesh key={k} material={signs[k]} position={[s.x, 4.75, back + 0.01]}><planeGeometry args={[3.6, 3.6 * (640 / 2048)]} /></mesh>)}
      <mesh material={dispatch} position={[END_X + 1, 3.4, back + 0.01]}><planeGeometry args={[3.6, 3.6 * (400 / 2048)]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0, (back + R) / 2]}>
        <planeGeometry args={[x1 - x0, R - back]} />
        <MeshReflectorMaterial resolution={narrow ? 256 : 512} blur={[400, 120]} mixBlur={1} mixStrength={2.4} mirror={0.5}
          roughness={0.8} depthScale={0} metalness={0.2} color="#3a3a38" />
      </mesh>
      {Array.from({ length: 6 }, (_, k) => <pointLight key={k} position={[x0 + 3 + k * 8.5, h - 0.6, 1.8]} intensity={10} distance={12} decay={1.7} color="#e6ebee" />)}
      <hemisphereLight args={['#c8d0d6', '#2a2a28', 0.45]} />
    </group>
  );
}

/** an indexing conveyor: steel rails, a dark slatted belt that only moves when the products do */
function Conveyor() {
  const len = LINE.x1 - LINE.x0, mid = (LINE.x0 + LINE.x1) / 2;
  const belt = useMemo(() => {
    const t = paintTexture(256, 64, (g, w, h) => {
      g.fillStyle = '#1b1c1d'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#0c0d0d'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 3, h);
      g.fillStyle = 'rgba(255,255,255,.035)'; for (let x = 16; x < w; x += 32) g.fillRect(x, 0, 1, h);
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(len / 0.4, 1);
    return { t, mat: new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, metalness: 0 }) };
  }, [len]);
  useFrame(() => { belt.t.offset.x = -beltPos(rv.u) / 0.4; });
  const legs = useMemo(() => Array.from({ length: Math.floor(len / 2.4) + 1 }, (_, k) => LINE.x0 + 0.3 + k * 2.4), [len]);
  return (
    <group>
      <mesh material={belt.mat} position={[mid, BELT - 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[len, 0.72]} /></mesh>
      <mesh material={DARK} position={[mid, LINE.y - 0.05, 0]}><boxGeometry args={[len, 0.12, 0.74]} /></mesh>
      {[-0.4, 0.4].map((z) => <mesh key={z} material={STEEL} position={[mid, BELT + 0.02, z]}><boxGeometry args={[len, 0.1, 0.05]} /></mesh>)}
      {[LINE.x0, LINE.x1].map((x) => <mesh key={x} material={STEEL} position={[x, LINE.y - 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 0.8, 24]} /></mesh>)}
      {legs.map((x) => [-0.32, 0.32].map((z) => <mesh key={`${x}${z}`} material={STEEL} position={[x, (LINE.y - 0.1) / 2, z]}><boxGeometry args={[0.06, LINE.y - 0.1, 0.06]} /></mesh>))}
    </group>
  );
}

/** the dispatch table at the end of the line: a steel bench and a tray of wells */
function Dispatch() {
  const wells = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x0f1011, roughness: 0.6 }), []);
  return (
    <group position={[END_X + 1, 0, -0.2]}>
      <pointLight position={[0, 2.6, 1.2]} intensity={6} distance={5} decay={2} color="#f3f1ec" />
      <mesh material={STEEL} position={[0, 0.9, 0]}><boxGeometry args={[2.2, 0.05, 1.1]} /></mesh>
      {[-1, 1].map((sx) => [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} material={STEEL} position={[sx * 1.02, 0.45, sz * 0.48]}><boxGeometry args={[0.05, 0.9, 0.05]} /></mesh>))}
      <mesh material={DARK} position={[0, 0.95, 0]}><boxGeometry args={[1.5, 0.06, 0.6]} /></mesh>
      {Array.from({ length: 10 }, (_, k) => Array.from({ length: 3 }, (_, j) => (
        <mesh key={`${k}${j}`} material={wells} position={[-0.63 + k * 0.14, 0.982, -0.16 + j * 0.16]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.05, 24]} /></mesh>
      )))}
    </group>
  );
}

/** a product on its way from the line to the tray: it lifts, arcs toward the lens and shrinks into the tray */
function FlightView({ f }: { f: Flight }) {
  const ref = useRef<THREE.Group>(null), t = useRef(0);
  const land = useCart((s) => s.land);
  const v = useMemo(() => ({ to: new THREE.Vector3(), dir: new THREE.Vector3(), at: new THREE.Vector3() }), []);
  const st = STATIONS.find((s) => s.c === f.c)!, s0 = ITEM[st.kind].s;
  useFrame(({ camera, size }, dt) => {
    const g = ref.current; if (!g) return;
    t.current += dt / (rv.reduce ? 0.01 : 0.85);
    const k = Math.min(1, t.current), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    // aim for the tray: its screen centre, a metre and a half in front of the lens
    const r = lh.tray?.getBoundingClientRect();
    const nx = r ? ((r.left + r.width / 2) / size.width) * 2 - 1 : 0.8, ny = r ? -(((r.top + r.height / 2) / size.height) * 2 - 1) : -0.8;
    v.dir.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize();
    v.to.copy(camera.position).addScaledVector(v.dir, 1.5);
    v.at.set(...f.from).lerp(v.to, e);
    v.at.y += Math.sin(Math.PI * k) * 0.5;
    g.position.copy(v.at);
    g.scale.setScalar(THREE.MathUtils.lerp(s0, 0.06, e));
    g.rotation.y = k * Math.PI * 1.5;
    if (k >= 1) land(f.id);
  });
  return <group ref={ref} position={f.from}><Specimen form={COLLECTIONS[f.c].form} n={COLLECTIONS[f.c].n} name={COLLECTIONS[f.c].name} /></group>;
}

function Flights() {
  const flights = useCart((s) => s.flights);
  return <>{flights.map((f) => <FlightView key={f.id} f={f} />)}</>;
}

/**
 * Puts the add button and crop marks on the finished product nearest the middle of the screen,
 * and writes the line position into the readout and the tape.
 */
function LineProjector() {
  const size = useThree((s) => s.size);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    const x = cameraX(rv.u);
    if (lh.pos) lh.pos.textContent = `${x.toFixed(1).padStart(4, '0')} m`;
    if (lh.tape) lh.tape.style.transform = `translateX(${-(x - LINE.x0) * LINE_K}px)`;
    if (!lh.add || !lh.crops || !lh.frame || !lh.tag) return;
    const W = size.width, H = size.height;
    const px = (wx: number, wy: number, wz = 0): [number, number, number] => {
      v.set(wx, wy, wz).project(camera);
      return [Math.round((v.x + 1) * 0.5 * W) + 0.5, Math.round((1 - v.y) * 0.5 * H) + 0.5, v.x];
    };
    let best = -1, bestX = Infinity;
    if (rv.phase === 'hall') STATIONS.forEach((s, i) => {
      const p = stationP(i, rv.u);
      if (p < DONE) return;
      const nx = Math.abs(px(s.x + itemX(p), BELT + ITEM[s.kind].h / 2)[2]);
      if (nx < 0.82 && nx < bestX) { bestX = nx; best = i; }
    });
    lh.ready = best;
    const show = best >= 0;
    lh.add.style.visibility = show ? 'visible' : 'hidden';
    lh.frame.style.opacity = show ? '1' : '0';
    if (!show) return;
    const s = STATIONS[best], it = ITEM[s.kind], cx = s.x + itemX(stationP(best, rv.u)), top = BELT + it.h;
    lh.from = [cx, BELT, 0];
    // crop marks just outside the product's silhouette
    const [l, t] = px(cx - it.r - 0.06, top + 0.06, it.r), [rr, b] = px(cx + it.r + 0.06, BELT - 0.01, it.r);
    const a = 14;
    lh.crops.setAttribute('d', `M${l} ${t + a}V${t}H${l + a}M${rr - a} ${t}H${rr}V${t + a}M${l} ${b - a}V${b}H${l + a}M${rr - a} ${b}H${rr}V${b - a}`);
    lh.tag.setAttribute('x', String(l)); lh.tag.setAttribute('y', String(b + 18));
    const c = COLLECTIONS[s.c];
    if (lh.tag.textContent !== `${c.n} ${c.name} · READY`) lh.tag.textContent = `${c.n} ${c.name} · READY`;
    lh.add.style.transform = `translate(${rr + 12}px, ${Math.round((t + b) / 2) - 22}px)`;
  });
  return null;
}

export function Line({ narrow }: { narrow: boolean }) {
  return (
    <group>
      <Room narrow={narrow} />
      <Conveyor />
      {STATIONS.map((_, i) => <Station key={i} i={i} />)}
      <Dispatch />
      <Flights />
      <LineProjector />
    </group>
  );
}

