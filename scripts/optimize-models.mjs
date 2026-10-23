// Compresses the Blender exports in blender/source into src/assets/models.
// Meshopt is used rather than Draco because its decoder ships inside three-stdlib,
// so the site never has to fetch a decoder from a third-party CDN.
// A second, WebAssembly-free set goes to src/assets/models/plain for hosts whose
// content security policy blocks WebAssembly (the claude.ai artifact preview is one).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, prune, quantize, meshopt, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { mkdirSync, readdirSync, statSync } from 'node:fs';

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
mkdirSync('src/assets/models/plain', { recursive: true });
const kb = (p) => `${(statSync(p).size / 1024).toFixed(0)} KB`;
for (const f of readdirSync('blender/source').filter(f => f.endsWith('.glb'))) {
  const plain = await io.read(`blender/source/${f}`);
  await plain.transform(dedup(), weld(), prune(), quantize());
  await io.write(`src/assets/models/plain/${f}`, plain);
  const doc = await io.read(`blender/source/${f}`);
  await doc.transform(dedup(), weld(), prune(), reorder({ encoder: MeshoptEncoder }), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(`src/assets/models/${f}`, doc);
  console.log(f.padEnd(14), kb(`blender/source/${f}`), '->', kb(`src/assets/models/${f}`), `(plain ${kb(`src/assets/models/plain/${f}`)})`);
}
