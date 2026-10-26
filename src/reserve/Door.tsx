import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { MEMBER, R } from './data';
import { WALL, wallMat } from './room';
import { DOT, MONO, paintTexture, spaced, wide } from './paint';
import { rv, useReserve, type Phase } from './state';

const { TH, DW, DH } = WALL;
/** outside face of the door wall, and the corridor that leads up to it */
export const FACE = R + TH;
const VEST = { hw: 1.75, len: 7, h: 3.6 };

const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const SIGNAL = new THREE.Color('#ff5a14');
const WHITE = new THREE.Color(1, 0.985, 0.96);

/** how far the leaves have slid into the wall, 0..1; they close again once you are inside */
export function doorOpen() {
  if (rv.phase === 'opening') return sstep(0.15, 1.6, rv.tp);
  if (rv.phase === 'hall') return 1 - sstep(1.5, 3.5, rv.tp);
  return 0;
}

const LINES: Record<Phase, [string, boolean]> = {
  door: ['PRESENT KEY', false],
  reading: ['READING KEY', true],
  verified: [`MEMBER ${MEMBER} · VERIFIED`, false],
  opening: [`WELCOME, MEMBER ${MEMBER}`, false],
  hall: [`WELCOME, MEMBER ${MEMBER}`, false],
};

/** the dot-matrix line over the door; it answers the key */
function useDisplay() {
  const tex = useMemo(() => paintTexture(1536, 160, () => {}), []);
  useEffect(() => {
    const paint = (p: Phase) => tex.repaint((g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      const [text, live] = LINES[p];
      g.fillStyle = live ? '#ff5a14' : '#f4f2ee'; g.textBaseline = 'middle';
      g.font = `900 92px ${DOT}`; spaced(g, text, w / 2, h / 2 + 4, 10, 'center');
    });
    paint(useReserve.getState().phase);
    return useReserve.subscribe((s, prev) => { if (s.phase !== prev.phase) paint(s.phase); });
  }, [tex]);
  return tex;
}

/** the reader plate: brushed aluminium, engraved, a ring that breathes until a key is held to it */
function readerTexture() {
  return paintTexture(512, 832, (g, w, h) => {
    g.fillStyle = '#b9bec2'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a2d30'; g.textBaseline = 'alphabetic';
    wide(g, 900, 92); spaced(g, 'P4CE', w / 2, 150, 4, 'center');
    g.font = `500 30px ${MONO}`; spaced(g, 'RESERVE', w / 2, 204, 14, 'center');
    g.lineWidth = 4; g.strokeStyle = '#2a2d30'; g.beginPath(); g.arc(w / 2, 480, 120, 0, Math.PI * 2); g.stroke();
    g.font = `500 24px ${MONO}`; spaced(g, 'PRESENT KEY', w / 2, 700, 8, 'center');
  });
}

function Leaf({ side }: { side: -1 | 1 }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: 0x2c2f32, metalness: 1, roughness: 0.42, anisotropy: 0.5, anisotropyRotation: Math.PI / 2, envMapIntensity: 0.9 }), []);
  useFrame(() => { if (ref.current) ref.current.position.x = side * (DW / 4 + doorOpen() * (DW / 2 + 0.04)); });
  return (
    <mesh ref={ref} material={mat} position={[side * DW / 4, DH / 2, R + TH / 2]}>
      <boxGeometry args={[DW / 2 + 0.01, DH, 0.08]} />
    </mesh>
  );
}

export function Door() {
  const display = useDisplay();
  const ring = useRef<THREE.MeshBasicMaterial>(null), seam = useRef<THREE.MeshBasicMaterial>(null);
  const bolts = useRef<THREE.MeshBasicMaterial[]>([]);
  const wash = useRef<THREE.SpotLight>(null), aim = useRef<THREE.Object3D>(null);
  useEffect(() => { if (wash.current && aim.current) wash.current.target = aim.current; }, []);
  const mats = useMemo(() => ({
    plate: new THREE.MeshPhysicalMaterial({ map: readerTexture(), metalness: 0.55, roughness: 0.42, anisotropy: 0.6, envMapIntensity: 1.1 }),
    frame: new THREE.MeshPhysicalMaterial({ color: 0xa9aeb2, metalness: 1, roughness: 0.28, envMapIntensity: 1 }),
    strip: new THREE.MeshBasicMaterial({ color: WHITE.clone().multiplyScalar(2.4), toneMapped: false }),
    screen: new THREE.MeshBasicMaterial({ map: display, toneMapped: false }),
  }), [display]);
  useFrame(({ clock }) => {
    const p = rv.phase, t = rv.tp, k = clock.elapsedTime;
    if (ring.current) {
      const c = ring.current.color;
      if (p === 'door') c.copy(SIGNAL).multiplyScalar(1.2 + Math.sin(k * 2.4) * 0.9);
      else if (p === 'reading') c.copy(SIGNAL).multiplyScalar(3.2);
      else c.copy(WHITE).multiplyScalar(2.2);
    }
    bolts.current.forEach((m, i) => {
      const released = p === 'opening' || p === 'hall' || (p === 'verified' && t > 0.15 + i * 0.16);
      if (released) m.color.copy(WHITE).multiplyScalar(2); else m.color.copy(SIGNAL).multiplyScalar(p === 'reading' ? 1.6 + Math.sin(k * 14) * 0.6 : 1.4);
    });
    // light from the hall leaking round the seam once the bolts are drawn
    if (seam.current) seam.current.color.copy(WHITE).multiplyScalar(p === 'verified' ? 0.4 + 3 * sstep(0.5, 1.2, t) : p === 'door' || p === 'reading' ? 0.15 : 0);
  });
  const x = DW / 2 + 0.48;
  return (
    <group>
      <Leaf side={-1} />
      <Leaf side={1} />
      {/* bright steel reveal round the opening */}
      <mesh material={mats.frame} position={[-DW / 2 - 0.02, DH / 2, FACE + 0.015]}><boxGeometry args={[0.04, DH + 0.04, 0.03]} /></mesh>
      <mesh material={mats.frame} position={[DW / 2 + 0.02, DH / 2, FACE + 0.015]}><boxGeometry args={[0.04, DH + 0.04, 0.03]} /></mesh>
      <mesh material={mats.frame} position={[0, DH + 0.02, FACE + 0.015]}><boxGeometry args={[DW + 0.08, 0.04, 0.03]} /></mesh>
      <mesh position={[0, DH / 2, FACE + 0.002]}><planeGeometry args={[0.006, DH]} /><meshBasicMaterial ref={seam} toneMapped={false} /></mesh>
      {/* display over the door */}
      <mesh material={mats.screen} position={[0, DH + 0.42, FACE + 0.006]}><planeGeometry args={[1.62, 1.62 * (160 / 1536)]} /></mesh>
      {/* bolt lamps */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[DW / 2 + 0.12, 1.25 + i * 0.32, FACE + 0.01]}>
          <circleGeometry args={[0.018, 24]} />
          <meshBasicMaterial ref={(m) => { if (m) bolts.current[i] = m; }} toneMapped={false} />
        </mesh>
      ))}
      {/* reader */}
      <group position={[x, 1.3, FACE + 0.012]}>
        <RoundedBox args={[0.17, 0.276, 0.02]} radius={0.006} smoothness={3} material={mats.plate} />
        <mesh position={[0, -0.0, 0.0105]}><ringGeometry args={[0.03, 0.034, 48]} /><meshBasicMaterial ref={ring} toneMapped={false} /></mesh>
        <pointLight position={[0, 0.05, 0.25]} intensity={0.35} distance={0.9} decay={2} color="#f1efe9" />
      </group>
      {/* the corridor up to the door */}
      <group>
        <mesh material={wallMat} position={[-VEST.hw, VEST.h / 2, FACE + VEST.len / 2]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[VEST.len, VEST.h]} /></mesh>
        <mesh material={wallMat} position={[VEST.hw, VEST.h / 2, FACE + VEST.len / 2]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[VEST.len, VEST.h]} /></mesh>
        <mesh material={wallMat} position={[0, VEST.h, FACE + VEST.len / 2]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[VEST.hw * 2, VEST.len]} /></mesh>
        <mesh material={wallMat} position={[0, VEST.h / 2, FACE + VEST.len]} rotation={[0, Math.PI, 0]}><planeGeometry args={[VEST.hw * 2, VEST.h]} /></mesh>
        <mesh material={mats.strip} position={[0, VEST.h - 0.01, FACE + VEST.len / 2 + 0.5]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[0.03, VEST.len - 1.4]} /></mesh>
        <object3D ref={aim} position={[0, 0.9, FACE]} />
        <spotLight ref={wash} position={[0, VEST.h - 0.05, FACE + 0.7]} angle={0.62} penumbra={0.9} intensity={9} distance={6} decay={2} color="#eef1f3" />
        <pointLight position={[0, VEST.h - 0.3, FACE + 4.5]} intensity={1.6} distance={6} decay={2} color="#dfe5ea" />
      </group>
    </group>
  );
}
