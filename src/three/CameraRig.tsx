import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { lab, useUI } from '../state/lab';
import { blip } from '../audio/sound';
import { rail } from './rail';
import { entryPose, exitBlend } from './entryPath';

/** Runs first each frame: resolves the chapter from scroll, then puts the camera on the rail. */
export function CameraRig() {
  const { camera, size } = useThree();
  const key = useMemo(() => new THREE.PointLight(0xffffff, 90, 40, 2), []);
  const st = useMemo(() => ({ lastK: -1, fa: 0, fn: 0, entry: { pos: new THREE.Vector3(), aim: new THREE.Vector3() } }), []);

  useFrame((state, dt) => {
    let k = 0;
    for (let i = 0; i < lab.chapter.length; i++) if (lab.chapter[i] > 0) k = i;
    lab.k = k; lab.t = lab.chapter[k];
    if (k !== st.lastK) { st.lastK = k; useUI.getState().setChapter(k); blip(330 + k * 60, 0.08, 'sine', 0.03); }
    st.fa += dt; st.fn++; if (st.fa > 0.5) { lab.fps = Math.round(st.fn / st.fa); st.fa = 0; st.fn = 0; }

    let [pos, tgt, sx, sy] = rail(k, lab.t, lab.narrow);
    const p = state.pointer;
    if (!lab.reduce && lab.pointerIn) { pos.x += p.x * 0.6; pos.y += p.y * 0.35; }
    // until the visitor is through the airlock the camera walks the entry path, then hands over to the rail
    if (lab.entry.phase !== 'lab') {
      const e = entryPose(st.entry), b = exitBlend();
      if (!lab.reduce && lab.pointerIn) { e.pos.x += p.x * 0.12; e.pos.y += p.y * 0.08; }
      pos = e.pos.lerp(pos, b).clone(); tgt = e.aim.lerp(tgt, b).clone();
      // the door and airlock sit right of the copy on wide screens; the lab's own key light stays low until you are inside
      sx = sx * b + (lab.narrow ? 0 : 0.16) * (1 - b); sy *= b;
      key.intensity = 90 * (0.12 + 0.88 * b);
    } else key.intensity = 90;
    // a portrait phone needs a wider lens to take in the door and the airlock; it narrows back as you step into the lab
    const cam = camera as THREE.PerspectiveCamera, fov = lab.narrow && lab.entry.phase !== 'lab' ? 32 + 22 * (1 - exitBlend()) : 32;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    camera.position.copy(pos); camera.lookAt(tgt); lab.camX = pos.x;
    // shift the frame so the subject sits beside the copy instead of under it
    (camera as THREE.PerspectiveCamera).setViewOffset(size.width, size.height, -sx * size.width, -sy * size.height, size.width, size.height);
    key.position.set(pos.x + 4, 6, pos.z * 0.6 + 4);
  }, -2);

  return <primitive object={key} />;
}
