// Compresses the Blender exports in blender/source into src/assets/models.
// Meshopt is used rather than Draco because its decoder ships inside three-stdlib,
// so the site never has to fetch a decoder from a third-party CDN.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, prune, quantize, meshopt, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { readdirSync, statSync } from 'node:fs';

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
for (const f of readdirSync('blender/source').filter(f => f.endsWith('.glb'))) {
  const doc = await io.read(`blender/source/${f}`);
  await doc.transform(dedup(), weld(), prune(), reorder({ encoder: MeshoptEncoder }), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const out = `src/assets/models/${f}`;
  await io.write(out, doc);
  console.log(f.padEnd(14), `${(statSync(`blender/source/${f}`).size / 1024).toFixed(0)} KB ->`, `${(statSync(out).size / 1024).toFixed(0)} KB`);
}
