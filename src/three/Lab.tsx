import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { lab } from '../state/lab';
import { Shadow } from '@react-three/drei';
import * as THREE from 'three';
import { BG, M, canvasTexture } from './materials';
import { B, BENCH_Y, D, P } from './shared';

const worldVert = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const lineFn = `float line(float x, float w){ float d = abs(fract(x - .5) - .5) / fwidth(x); return 1. - min(d / w, 1.); }`;

/** the room: measured floor grid, ceiling light bars, one long brushed bench and a gridded back wall */
export function Lab() {
  const floorMat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, vertexShader: worldVert, uniforms: { uK: { value: 1 } },
    fragmentShader: `varying vec3 vW; uniform float uK; ${lineFn}
      void main(){ float a = max(line(vW.x, 1.) * .35, line(vW.z, 1.) * .35); a = max(a, max(line(vW.x / 5., 1.4), line(vW.z / 5., 1.4)) * .6);
        float f = smoothstep(40., 6., abs(vW.z)) * smoothstep(70., 25., distance(cameraPosition, vW)); gl_FragColor = vec4(vec3(.36, .39, .41), a * f * .5 * uK); }`,
  }), []);
  const wallMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: worldVert,
    fragmentShader: `varying vec3 vW; ${lineFn}
      void main(){ vec3 c = vec3(.87, .885, .89);
        float a = max(line(vW.x / 2., 1.), line(vW.y / 2., 1.)) * .12 + max(line(vW.x / 10., 1.2), line(vW.y / 10., 1.2)) * .18;
        c = mix(c, vec3(.36, .39, .41), a); c *= .93 + .07 * smoothstep(-2., 10., vW.y); gl_FragColor = vec4(c, 1.); }`,
  }), []);
  // phones see the floor from higher up, where the grid reads too loud
  useFrame(() => { floorMat.uniforms.uK.value = lab.narrow ? 0.4 : 1; });
  const panels = useMemo(() => Array.from({ length: 31 }, (_, i) => (i - 4) * 6), []);
  const panelMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xd8dadb }), []);

  return (
    <group>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 22, 70]} />
      <Backdrop />
      <hemisphereLight args={[0xffffff, 0x9aa0a4, 0.6]} />
      <directionalLight position={[-6, 12, 10]} intensity={1.1} />
      <mesh rotation-x={-Math.PI / 2} position={[60, -4.2, 0]} material={floorMat}><planeGeometry args={[400, 200]} /></mesh>
      {panels.map((x) => <mesh key={x} position={[x, 13, -4]} rotation={[Math.PI / 2, 0, Math.PI / 2]} material={panelMat}><planeGeometry args={[30, 1.2]} /></mesh>)}
      <mesh position={[80, BENCH_Y - 0.25, -1]} material={M.brushed}><boxGeometry args={[120, 0.5, 14]} /></mesh>
      <mesh position={[80, BENCH_Y - 0.02, 6]}><boxGeometry args={[120, 0.06, 0.06]} /><meshBasicMaterial color={0x0e1011} /></mesh>
      <mesh position={[80, 12, -8]} material={wallMat}><planeGeometry args={[120, 30]} /></mesh>
      <Plate text={['03 ASSAY', 'BENCH 03 · IDENTITY / PURITY / POTENCY']} x={B.x - 5.5} y={7.5} />
      <Plate text={['04 SEAL', 'PACK LINE · N2 FLUSH · LIGHT 0.0%']} x={P.x - 4.5} y={9} />
      <Plate text={['05 DISPENSE', 'INDEXING TRAY · 30 WELLS']} x={D.x - 4} y={9} />
    </group>
  );
}

function Plate({ text, x, y, w = 6, h = 1.2 }: { text: [string, string]; x: number; y: number; w?: number; h?: number }) {
  const map = useMemo(() => canvasTexture(1024, (1024 * h) / w, (g, cw, ch) => {
    g.fillStyle = '#0e1011'; g.font = `900 ${ch * 0.5}px Doto, monospace`; g.textBaseline = 'middle'; g.fillText(text[0], 10, ch * 0.38);
    g.font = `500 ${ch * 0.16}px "IBM Plex Mono", monospace`; g.fillStyle = '#5d6468'; g.fillText(text[1], 14, ch * 0.82); g.fillRect(0, 0, cw, 4);
  }), [text, w, h]);
  return <mesh position={[x, y, -7.95]}><planeGeometry args={[w, h]} /><meshBasicMaterial map={map} transparent toneMapped={false} /></mesh>;
}

/** soft contact shadow on the bench */
export function Blob({ x, z, sx, sz }: { x: number; z: number; sx: number; sz: number }) {
  return <Shadow position={[x, BENCH_Y + 0.01, z]} scale={[sx, sz, 1]} opacity={0.38} color="black" colorStop={0} fog />;
}

/** while depth of field is on, give it a backdrop shell to focus against; on bare background depth it renders the sky black */
function Backdrop() {
  const m = useRef<THREE.Mesh>(null);
  useFrame(() => { if (m.current) m.current.visible = lab.k === 2; });
  return <mesh ref={m} scale={260}><sphereGeometry args={[1, 64, 32]} /><meshBasicMaterial color={BG} side={THREE.BackSide} fog={false} /></mesh>;
}
