import { useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useCart } from './cart';
import { COLLECTIONS } from './data';
import { BELT, CAPS, ITEM, STATIONS, itemX, smooth, stationP, stepOf } from './line';
import { DOT, blobTexture, paintTexture, spaced } from './paint';
import { MAT, TIN_S, JAR_S, VIAL_S, jarGeo, tinGeo, useLabel, vialGeo } from './Specimens';
import { rv } from './state';

/** machine steel: brushed and bright on the frame, dark on the working heads */
export const STEEL = new THREE.MeshStandardMaterial({ color: 0x9aa0a4, metalness: 1, roughness: 0.32, envMapIntensity: 1.1 });
export const DARK = new THREE.MeshStandardMaterial({ color: 0x232527, metalness: 0.7, roughness: 0.42, envMapIntensity: 0.8 });
const CREAM = new THREE.MeshPhysicalMaterial({ color: 0xf1eee8, roughness: 0.38, sheen: 0.4, sheenRoughness: 0.5 });
const CAPSULE = new THREE.MeshPhysicalMaterial({ color: 0xeceae5, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 });
const HOOD = new THREE.MeshPhysicalMaterial({ color: 0xf2f5f7, roughness: 0.22, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.2 });
const BLOB = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.8 });

const RAIL_Y = 2.42; // the carriage rail the tools hang from
const CARRY = 0.75; // spacing between tools on a carriage

/** the gantry over a station: two posts behind the belt, a beam, and a dot-matrix display reading the step */
function Gantry({ i }: { i: number }) {
  const st = STATIONS[i], c = COLLECTIONS[st.c];
  const last = useRef(-1);
  const screen = useMemo(() => {
    const t = paintTexture(1536, 96, () => {});
    return { t, mat: new THREE.MeshBasicMaterial({ map: t, toneMapped: false }) };
  }, []);
  useFrame(() => {
    const k = stepOf(st, stationP(i, rv.u));
    if (k === last.current) return;
    last.current = k;
    screen.t.repaint((g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f4f2ee'; g.textBaseline = 'middle'; g.font = `900 50px ${DOT}`;
      spaced(g, `${c.n} ${c.name}`, 28, h / 2 + 3, 6);
      spaced(g, `${String(k + 1).padStart(2, '0')} ${st.steps[k][1].toUpperCase()}`, w - 28, h / 2 + 3, 6, 'right');
    });
  });
  return (
    <group>
      {[-1.15, 1.15].map((x) => <mesh key={x} material={STEEL} position={[x, RAIL_Y / 2 + 0.1, -0.75]}><boxGeometry args={[0.1, RAIL_Y + 0.2, 0.1]} /></mesh>)}
      <mesh material={STEEL} position={[0, RAIL_Y + 0.12, -0.75]}><boxGeometry args={[2.5, 0.14, 0.14]} /></mesh>
      {/* arms forward to the rail over the belt */}
      {[-1.15, 1.15].map((x) => <mesh key={x} material={STEEL} position={[x, RAIL_Y + 0.12, -0.37]}><boxGeometry args={[0.08, 0.08, 0.76]} /></mesh>)}
      <mesh material={DARK} position={[0, RAIL_Y + 0.08, 0]}><boxGeometry args={[2.6, 0.06, 0.12]} /></mesh>
      <mesh material={screen.mat} position={[0, RAIL_Y + 0.12, -0.675]}><planeGeometry args={[2.3, 2.3 * (96 / 1536)]} /></mesh>
      {/* a light over the work */}
      <StationLight />
    </group>
  );
}

function StationLight() {
  const spot = useRef<THREE.SpotLight>(null), aim = useRef<THREE.Object3D>(null);
  useFrame(() => { if (spot.current && aim.current && spot.current.target !== aim.current) spot.current.target = aim.current; });
  return (
    <>
      <object3D ref={aim} position={[0.3, BELT + 0.2, 0]} />
      <spotLight ref={spot} position={[0.6, 4.6, 1.6]} angle={0.42} penumbra={0.8} decay={2} distance={9} intensity={48} color="#fff6ec" />
    </>
  );
}

/** the carriage block that indexes the tools along the rail */
function Carriage({ width, x }: { width: number; x: number }) {
  return <mesh material={DARK} position={[x, RAIL_Y - 0.03, 0]}><boxGeometry args={[width, 0.14, 0.26]} /></mesh>;
}

/** a tool on a vertical rod that runs up through the carriage */
function Rod({ y = 0 }: { y?: number }) {
  return <mesh material={STEEL} position={[0, y + 0.6, 0]}><cylinderGeometry args={[0.022, 0.022, 1.2, 16]} /></mesh>;
}

/** the product on the belt: clickable, with a soft shadow under it */
function useItem(i: number) {
  const st = STATIONS[i];
  const setDossier = useCart((s) => s.setDossier);
  const props = {
    onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (rv.phase === 'hall') setDossier(st.c); },
    onPointerOver: () => { document.body.style.cursor = 'pointer'; },
    onPointerOut: () => { document.body.style.cursor = ''; },
  };
  const r = ITEM[st.kind].r;
  const blob = <mesh material={BLOB} position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[r * 3, r * 3]} /></mesh>;
  return { props, blob };
}

/** 01 FOUNDATION: an aluminium tin; capsules are counted into it from a hopper, then a press seats the lid */
function TinStation({ i }: { i: number }) {
  const S = TIN_S * ITEM.tin.s, H = 0.231 * S;
  const g = useMemo(tinGeo, []);
  const caps = useMemo(() => {
    const geo = new THREE.CapsuleGeometry(0.032, 0.1, 4, 14);
    const rest = Array.from({ length: CAPS.n }, (_, k) => {
      const a = k * 2.39996, r = 0.21 * Math.sqrt((k + 0.5) / CAPS.n);
      return { x: Math.cos(a) * r, y: 0.05 + Math.floor(k / 7) * 0.055, z: Math.sin(a) * r, rx: Math.PI / 2 + Math.sin(k * 7.1) * 0.4, ry: k * 1.3 };
    });
    return { geo, rest };
  }, []);
  const item = useRef<THREE.Group>(null), lid = useRef<THREE.Mesh>(null), car = useRef<THREE.Group>(null), press = useRef<THREE.Group>(null);
  const capRefs = useRef<THREE.Mesh[]>([]);
  const { props, blob } = useItem(i);
  useFrame(() => {
    const p = stationP(i, rv.u), x = itemX(p);
    if (item.current) item.current.position.x = x;
    const cx = -CARRY * smooth((p - 0.55) / 0.05);
    if (car.current) car.current.position.x = cx;
    const down = smooth((p - 0.61) / 0.08) * (1 - smooth((p - 0.72) / 0.08));
    const plate = 1.78 - (1.78 - (BELT + H)) * down;
    if (press.current) press.current.position.y = plate;
    if (lid.current) {
      if (p < 0.69) lid.current.position.set(cx + CARRY, plate - H, 0);
      else lid.current.position.set(x, BELT, 0);
    }
    const outlet = 1.62 - BELT;
    capRefs.current.forEach((m, k) => {
      const f = Math.min(1, Math.max(0, (p - CAPS.start - k * CAPS.gap) / CAPS.fall)), r = caps.rest[k];
      m.visible = f > 0;
      const fall = f * f;
      m.position.set(r.x * fall, outlet + (r.y - outlet) * fall, r.z * fall);
      m.rotation.set(r.rx + (1 - f) * 3, r.ry, (1 - f) * 2);
    });
  });
  return (
    <group>
      <Gantry i={i} />
      <group ref={item} position={[0, BELT, 0]} {...props}>
        <mesh geometry={g.body} material={MAT.alu} scale={S} />
        {caps.rest.map((_, k) => <mesh key={k} ref={(m) => { if (m) capRefs.current[k] = m; }} geometry={caps.geo} material={CAPSULE} visible={false} />)}
        {blob}
      </group>
      <mesh ref={lid} geometry={g.lid} material={MAT.alu} scale={S} {...props} />
      <group ref={car}>
        <Carriage width={1.3} x={CARRY / 2} />
        {/* hopper over the tin */}
        <mesh material={STEEL} position={[0, 1.98, 0]}><cylinderGeometry args={[0.3, 0.07, 0.42, 36, 1, true]} /></mesh>
        <mesh material={DARK} position={[0, 1.7, 0]}><cylinderGeometry args={[0.07, 0.07, 0.16, 24]} /></mesh>
        <mesh material={STEEL} position={[0, 2.3, 0]}><cylinderGeometry args={[0.03, 0.03, 0.22, 12]} /></mesh>
        {/* press beside it */}
        <group position={[CARRY, 0, 0]}>
          <group ref={press}>
            <Rod y={0.03} />
            <mesh material={DARK} position={[0, 0.02, 0]}><cylinderGeometry args={[0.34, 0.34, 0.04, 40]} /></mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

/** 08 RENEW: a frosted jar; a nozzle fills it with cream, then a chuck lowers the lid and turns it home */
function JarStation({ i }: { i: number }) {
  const S = JAR_S * ITEM.jar.s, H = 0.207 * S, MOUTH = 0.15 * S;
  const g = useMemo(() => ({ ...jarGeo(), cream: new THREE.CylinderGeometry(0.255, 0.26, 1, 48), peak: new THREE.ConeGeometry(0.11, 0.06, 32), stream: new THREE.CylinderGeometry(0.014, 0.014, 1, 12) }), []);
  const item = useRef<THREE.Group>(null), lid = useRef<THREE.Mesh>(null), car = useRef<THREE.Group>(null);
  const nozzle = useRef<THREE.Group>(null), chuck = useRef<THREE.Group>(null), cream = useRef<THREE.Mesh>(null), peak = useRef<THREE.Mesh>(null), stream = useRef<THREE.Mesh>(null);
  const { props, blob } = useItem(i);
  useFrame(() => {
    const p = stationP(i, rv.u), x = itemX(p);
    if (item.current) item.current.position.x = x;
    const cx = -CARRY * smooth((p - 0.53) / 0.05);
    if (car.current) car.current.position.x = cx;
    // nozzle dips to the mouth while the jar fills
    const dip = smooth((p - 0.2) / 0.06) * (1 - smooth((p - 0.52) / 0.05));
    const tip = 1.8 - (1.8 - (BELT + MOUTH + 0.04)) * dip;
    if (nozzle.current) nozzle.current.position.y = tip;
    const f = smooth((p - 0.26) / 0.26), h = 0.27 * f;
    if (cream.current) { cream.current.visible = f > 0.001; cream.current.scale.y = Math.max(h, 0.001); cream.current.position.y = 0.027 + h / 2; }
    if (peak.current) { peak.current.visible = f > 0.95; peak.current.position.y = 0.027 + h + 0.03; }
    if (stream.current) {
      const on = p > 0.26 && p < 0.52, top = tip - BELT, bottom = 0.027 + h;
      stream.current.visible = on; stream.current.scale.y = Math.max(top - bottom, 0.001); stream.current.position.set(0, (top + bottom) / 2, 0);
    }
    // the chuck brings the lid down, turns it two full turns, and lets go
    const down = smooth((p - 0.58) / 0.08) * (1 - smooth((p - 0.78) / 0.04));
    const turn = smooth((p - 0.66) / 0.12) * Math.PI * 4;
    const face = 1.82 - (1.82 - (BELT + H)) * down;
    if (chuck.current) { chuck.current.position.y = face; chuck.current.rotation.y = turn; }
    if (lid.current) {
      if (p < 0.66) lid.current.position.set(cx + CARRY, face - H, 0); else lid.current.position.set(x, BELT, 0);
      lid.current.rotation.y = turn;
    }
  });
  return (
    <group>
      <Gantry i={i} />
      <group ref={item} position={[0, BELT, 0]} {...props}>
        <mesh ref={cream} geometry={g.cream} material={CREAM} visible={false} />
        <mesh ref={peak} geometry={g.peak} material={CREAM} visible={false} />
        <mesh geometry={g.body} material={MAT.frost} scale={S} />
        <mesh ref={stream} geometry={g.stream} material={CREAM} visible={false} />
        {blob}
      </group>
      <mesh ref={lid} geometry={g.lid} material={MAT.cap} scale={S} {...props} />
      <group ref={car}>
        <Carriage width={1.3} x={CARRY / 2} />
        <group ref={nozzle}>
          <mesh material={STEEL} position={[0, 0.14, 0]}><cylinderGeometry args={[0.026, 0.018, 0.28, 16]} /></mesh>
          <mesh material={DARK} position={[0, 0.36, 0]}><boxGeometry args={[0.16, 0.16, 0.16]} /></mesh>
          <Rod y={0.42} />
        </group>
        <group position={[CARRY, 0, 0]}>
          <group ref={chuck}>
            <mesh material={DARK} position={[0, 0.05, 0]}><cylinderGeometry args={[0.31, 0.31, 0.1, 6]} /></mesh>
            <Rod y={0.1} />
          </group>
        </group>
      </group>
    </group>
  );
}

/** 05 RESTORE: a vial dried under a frosted hood, its stopper pressed home, then crimped. No needles anywhere. */
function VialStation({ i }: { i: number }) {
  const st = STATIONS[i], c = COLLECTIONS[st.c];
  const S = VIAL_S * ITEM.vial.s;
  const g = useMemo(() => ({ ...vialGeo(), liquid: new THREE.CylinderGeometry(0.098 * S, 0.098 * S, 1, 40), hood: new THREE.CylinderGeometry(0.36, 0.36, 1, 48, 1, true), top: new THREE.CircleGeometry(0.36, 48) }), [S]);
  const label = useLabel(c.n, c.name);
  const item = useRef<THREE.Group>(null), car = useRef<THREE.Group>(null), hood = useRef<THREE.Group>(null), cold = useRef<THREE.PointLight>(null);
  const liquid = useRef<THREE.Mesh>(null), cake = useRef<THREE.Mesh>(null), stopper = useRef<THREE.Mesh>(null);
  const press = useRef<THREE.Group>(null), seal = useRef<THREE.Group>(null), crimper = useRef<THREE.Group>(null);
  const { props, blob } = useItem(i);
  const HOOD_H = 0.95;
  useFrame(() => {
    const p = stationP(i, rv.u), x = itemX(p);
    if (item.current) item.current.position.x = x;
    const cx = -CARRY * smooth((p - 0.57) / 0.03) - CARRY * smooth((p - 0.68) / 0.03);
    if (car.current) car.current.position.x = cx;
    // the hood comes down, the chamber pulls a vacuum and goes cold, the liquid sets into a dry cake
    const shut = smooth((p - 0.2) / 0.07) * (1 - smooth((p - 0.52) / 0.05));
    if (hood.current) hood.current.position.y = BELT + 1.25 * (1 - shut);
    const frost = smooth((p - 0.28) / 0.17) * (1 - smooth((p - 0.5) / 0.06));
    HOOD.opacity = 0.2 + 0.45 * frost;
    HOOD.emissive.setScalar(0.1 * frost);
    if (cold.current) cold.current.intensity = 2.2 * frost;
    const dry = smooth((p - 0.3) / 0.18), lh = 0.15 * S * (1 - dry);
    if (liquid.current) { liquid.current.visible = lh > 0.002; liquid.current.scale.y = Math.max(lh, 0.001); liquid.current.position.y = 0.012 * S + lh / 2; }
    if (cake.current) { cake.current.visible = dry > 0.01; cake.current.scale.set(S, S * Math.max(dry, 0.01), S); }
    // stopper rides half out while it dries, then the press seats it
    const pd = smooth((p - 0.61) / 0.03) * (1 - smooth((p - 0.65) / 0.03));
    const seated = smooth((p - 0.62) / 0.025);
    if (stopper.current) stopper.current.position.y = (0.385 + 0.035 * (1 - seated)) * S;
    if (press.current) press.current.position.y = BELT + 0.41 * S + 0.6 * (1 - pd);
    // the crimper carries the aluminium seal down and closes it round the neck
    const cd = smooth((p - 0.71) / 0.05) * (1 - smooth((p - 0.77) / 0.04));
    const lift = 0.65 * (1 - cd);
    if (crimper.current) crimper.current.position.y = BELT + 0.36 * S + lift;
    if (seal.current) {
      if (p < 0.76) seal.current.position.set(cx + 2 * CARRY, BELT + lift, 0); else seal.current.position.set(x, BELT, 0);
    }
  });
  return (
    <group>
      <Gantry i={i} />
      <group ref={item} position={[0, BELT, 0]} {...props}>
        <mesh ref={liquid} geometry={g.liquid} material={MAT.liquid} />
        <mesh ref={cake} geometry={g.cake} material={MAT.cake} visible={false} />
        <mesh geometry={g.glass} material={MAT.glass} scale={S} />
        <mesh ref={stopper} geometry={g.stopper} material={MAT.rubber} scale={S} />
        <mesh geometry={g.band} material={label} scale={S} position={[0, 0.17 * S, 0]} />
        {blob}
      </group>
      <group ref={seal} {...props}>
        <mesh geometry={g.crimp} material={MAT.alu} scale={S} />
        <mesh geometry={g.flip} material={MAT.cap} scale={S} />
      </group>
      <group ref={car}>
        <Carriage width={2.05} x={CARRY} />
        <group ref={hood}>
          <mesh geometry={g.hood} material={HOOD} position={[0, HOOD_H / 2, 0]} scale={[1, HOOD_H, 1]} />
          <mesh geometry={g.top} material={DARK} position={[0, HOOD_H, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          <mesh material={STEEL} position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.35, 0.39, 48]} /></mesh>
          <pointLight ref={cold} position={[0, HOOD_H * 0.7, 0]} intensity={0} distance={1.4} decay={2} color="#eef4f8" />
          <Rod y={HOOD_H} />
        </group>
        <group position={[CARRY, 0, 0]}>
          <group ref={press}><mesh material={DARK} position={[0, 0.03, 0]}><cylinderGeometry args={[0.15, 0.15, 0.06, 32]} /></mesh><Rod y={0.06} /></group>
        </group>
        <group position={[2 * CARRY, 0, 0]}>
          <group ref={crimper}>
            <mesh material={DARK} position={[0, 0.08 * S + 0.06, 0]}><cylinderGeometry args={[0.17, 0.2, 0.12, 6]} /></mesh>
            <Rod y={0.08 * S + 0.12} />
          </group>
        </group>
      </group>
    </group>
  );
}

export function Station({ i }: { i: number }) {
  const st = STATIONS[i];
  return (
    <group position={[st.x, 0, 0]}>
      {st.kind === 'tin' ? <TinStation i={i} /> : st.kind === 'jar' ? <JarStation i={i} /> : <VialStation i={i} />}
    </group>
  );
}
