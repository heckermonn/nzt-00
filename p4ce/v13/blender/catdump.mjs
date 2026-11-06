// Dumps the catalogue facts the renders print (labels + invisible ink) from ../../v11/js/catalog.js
// into catalog_facts.json, so the Blender side never retypes a value.  Run: node catdump.mjs
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '../../v11/js/catalog.js'), 'utf8');
const tmp = path.join(here, '.catalog.tmp.mjs');
fs.writeFileSync(tmp, src);
const m = await import(tmp);
fs.unlinkSync(tmp);
const out = {source: 'public/p4ce/v11/js/catalog.js', products: {}, collections: m.CAT.map(c => ({c: c.c, n: c.n, lead: c.c + '-1'}))};
for (const p of m.ALL) out.products[p.id] = {id: p.id, n: p.n, g: p.g, q: p.q, s: p.s, c: p.c, cn: p.cn, pack: p.pack,
  act: p.act, oth: p.oth, conc: m.CONC[p.id] || null, serving: m.servingSize(p), keyLine: m.keyLine(p)};
fs.writeFileSync(path.join(here, 'catalog_facts.json'), JSON.stringify(out, null, 1));
console.log('wrote', Object.keys(out.products).length, 'products');
