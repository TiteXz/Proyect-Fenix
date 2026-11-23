// Ronda 2: acantilados/peñascos Poly Haven (gltf 2k) -> GLB <= 6k tris, textura 2K WebP (diffuse 2K, normal 2K, ARM 1K).
// Uso: node procesar_acantilados.mjs <cache2> <salida> [nombre...]
import {NodeIO} from '@gltf-transform/core'; import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {flatten, weld, prune, dedup, simplifyPrimitive, compactPrimitive, textureCompress, getBounds} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer'; import sharp from 'sharp'; import fs from 'fs'; import path from 'path';
const [cache, outDir, ...only] = process.argv.slice(2); await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
// salida -> origen, tris objetivo, eje y longitud (m) a la que se escala la dimension mayor horizontal ('w') o la altura ('h')
const CFG = {
  acantilado_01: {src: 'mountainside', tris: 5800, w: 6.0},
  acantilado_02: {src: 'namaqualand_cliff_01', tris: 5800, w: 5.0},
  acantilado_03: {src: 'boulder_01', tris: 5200, h: 3.2},
  acantilado_04: {src: 'namaqualand_boulder_02', tris: 5200, w: 3.6},
};
const tri = p => p.getIndices().getCount() / 3;
for (const [name, c] of Object.entries(CFG)) {
  if (only.length && !only.includes(name)) continue;
  const doc = await io.read(path.join(cache, c.src, c.src + '_2k.gltf'));
  await doc.transform(flatten(), weld());
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    const ratio = c.tris / tri(p); if (ratio >= 1) continue;
    simplifyPrimitive(p, {simplifier: MeshoptSimplifier, ratio, error: 0.08, lockBorder: false});
    if (tri(p) > c.tris * 1.15) { const ia = p.getIndices(), pa = p.getAttribute('POSITION').getArray();
      const [ni] = MeshoptSimplifier.simplifySloppy(Uint32Array.from(ia.getArray()), pa, 3, null, Math.floor(c.tris) * 3, 0.1);
      ia.setArray(pa.length / 3 > 65535 ? Uint32Array.from(ni) : Uint16Array.from(ni)); }
    compactPrimitive(p);
  }
  const root = doc.getRoot(); const bb = getBounds(root.listScenes()[0]);
  const k = c.w ? c.w / Math.max(bb.max[0] - bb.min[0], bb.max[2] - bb.min[2]) : c.h / (bb.max[1] - bb.min[1]);
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { const a = p.getAttribute('POSITION'), arr = a.getArray(); for (let i = 0; i < arr.length; i++) arr[i] *= k; a.setArray(arr); }
  for (const nd of root.listNodes()) { nd.setTranslation([0,0,0]); nd.setScale([1,1,1]); nd.setRotation([0,0,0,1]); }
  const b2 = getBounds(root.listScenes()[0]);
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { const a = p.getAttribute('POSITION'), arr = a.getArray();
    for (let i = 0; i < arr.length; i += 3) { arr[i] -= (b2.min[0] + b2.max[0]) / 2; arr[i+1] -= b2.min[1]; arr[i+2] -= (b2.min[2] + b2.max[2]) / 2; } a.setArray(arr); }
  await doc.transform(prune(), dedup());
  await doc.transform(textureCompress({encoder: sharp, targetFormat: 'webp', resize: [2048, 2048], quality: 74, effort: 60, slots: /baseColor/}));
  await doc.transform(textureCompress({encoder: sharp, targetFormat: 'webp', resize: [2048, 2048], quality: 66, effort: 60, slots: /normal/}));
  await doc.transform(textureCompress({encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 68, effort: 60, slots: /metallicRoughness|occlusion/}));
  const out = path.join(outDir, name + '.glb'); await io.write(out, doc);
  let t = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) t += tri(p); const b3 = getBounds(root.listScenes()[0]);
  console.log(name, t, 'tris', (fs.statSync(out).size / 1048576).toFixed(2), 'MB', 'size', b3.max.map((v, i) => (v - b3.min[i]).toFixed(2)).join('x'));
}
