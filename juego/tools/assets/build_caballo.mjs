// Caballo pinto: escala a metros, clips con los nombres que usa la maqueta, texturas WebP y punto de asiento.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { prune, resample, dedup } from '@gltf-transform/functions';
import * as THREE from 'three';
import sharp from 'sharp';

const [RAW, TEX, OUT, SCALE = '1'] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(RAW);
const root = doc.getRoot();
// clips: nombre en el FBX -> nombre que espera la maqueta
const KEEP = { 'Skeleton|1 Ilde': 'caballo_reposo', 'Skeleton|Walk': 'caballo_paso', 'Skeleton|Gallop': 'caballo_galope' };
for (const a of root.listAnimations()) { if (KEEP[a.getName()]) a.setName(KEEP[a.getName()]); else a.dispose(); }
// trote: no hay clip propio; se usa una copia del galope (medio galope), la maqueta lo reproduce más lento
const gal = root.listAnimations().find((a) => a.getName() === 'caballo_galope');
const tro = doc.createAnimation('caballo_trote');
for (const c of gal.listChannels()) { const s = c.getSampler(); const s2 = doc.createAnimationSampler().setInput(s.getInput()).setOutput(s.getOutput()).setInterpolation(s.getInterpolation()); tro.addSampler(s2).addChannel(doc.createAnimationChannel().setTargetNode(c.getTargetNode()).setTargetPath(c.getTargetPath()).setSampler(s2)); }

// texturas
doc.createExtension(EXTTextureWebP).setRequired(true);
const tex = async (name, file, size, opts = {}) => doc.createTexture(name).setMimeType('image/webp')
  .setImage(await sharp(`${TEX}/${file}`).resize(size, size).webp({ quality: opts.q || 86, alphaQuality: 90, ...(opts.lossless ? { lossless: true } : {}) }).toBuffer());
const M = Object.fromEntries(root.listMaterials().map((m) => [m.getName(), m]));
M.Horse.setName('caballo_pelaje').setBaseColorTexture(await tex('pelaje_color', 'TX_Horse.Pinto_Albedo.png', 2048)).setNormalTexture(await tex('pelaje_normal', 'TX_Horse_Normals.png', 2048, { q: 92 }))
  .setRoughnessFactor(0.62).setMetallicFactor(0);
M.Hair.setName('caballo_crin').setBaseColorTexture(await tex('crin_color', 'TX_HorseHair_Albedo.png', 1024)).setNormalTexture(await tex('crin_normal', 'TX_HorseHair_Normals.png', 1024, { q: 90 }))
  .setBaseColorFactor([0.62, 0.5, 0.4, 1]).setRoughnessFactor(0.55).setMetallicFactor(0).setAlphaMode('MASK').setAlphaCutoff(0.35).setDoubleSided(true);
M.Saddle.setName('montura_cuero').setBaseColorTexture(await tex('montura_color', 'TX_Saddle_Albedo.png', 1024)).setNormalTexture(await tex('montura_normal', 'TX_Saddle_Normals.png', 1024, { q: 90 }))
  .setRoughnessFactor(0.58).setMetallicFactor(0);
M.Horseshoe.setName('caballo_herradura').setBaseColorTexture(await tex('herradura_color', 'TX_Horseshoe_Albedo.png', 512)).setNormalTexture(await tex('herradura_normal', 'TX_Horseshoe_Normals.png', 512, { q: 90 }))
  .setRoughnessFactor(0.45).setMetallicFactor(0.8);
M.Cornea.setName('caballo_ojo').setBaseColorFactor([0.012, 0.007, 0.005, 1]).setRoughnessFactor(0.05).setMetallicFactor(0);
for (const m of root.listMaterials()) for (const t of [m.getBaseColorTexture(), m.getNormalTexture()]) void t;
// texturas vacías que dejó FBX2glTF (sin imagen)
for (const t of root.listTextures()) if (!t.getImage()) t.dispose();

// raíz en metros: el FBX trae el esqueleto x10
const scene = root.listScenes()[0];
const top = doc.createNode('caballo_pinto').setScale([0.1 * +SCALE, 0.1 * +SCALE, 0.1 * +SCALE]);
for (const n of scene.listChildren()) { scene.removeChild(n); top.addChild(n); }
scene.addChild(top);

// punto de asiento: centro de la silla, sobre el cuero, en el espacio del hueso de la espalda
const N = Object.fromEntries(root.listNodes().map((n) => [n.getName(), n]));
const saddle = N.Saddle1_Saddle_0.getMesh().listPrimitives()[0].getAttribute('POSITION');
const pts = []; for (let i = 0; i < saddle.getCount(); i++) pts.push(saddle.getElement(i, [0, 0, 0]));
const xs = pts.map((p) => p[0]).sort((a, b) => a - b), xc = (xs[0] + xs[xs.length - 1]) / 2;
const mid = pts.filter((p) => Math.abs(p[0] - xc) < 0.05);
const ys = mid.map((p) => p[1]); const y0 = Math.min(...ys), y1 = Math.max(...ys);
// perfil superior a lo largo de la silla y su punto más bajo en el tercio central (el asiento entre perilla y borrén)
let best = null;
for (let k = 0; k <= 20; k++) {
  const y = y0 + (y1 - y0) * (0.3 + 0.4 * k / 20);
  const near = mid.filter((p) => Math.abs(p[1] - y) < (y1 - y0) / 40); if (!near.length) continue;
  const z = Math.max(...near.map((p) => p[2])); if (!best || z < best[2]) best = [xc, y, z];
}
console.log('silla (malla, Z arriba):', best.map((v) => v.toFixed(3)).join(','), 'largo silla', (y1 - y0).toFixed(3));
const skin = N.Saddle1_Saddle_0.getSkin(), js = skin.listJoints();
const bone = N.BN_Spine_02_04, bi = js.indexOf(bone);
const ibm = new THREE.Matrix4().fromArray(Array.from(skin.getInverseBindMatrices().getArray().slice(bi * 16, bi * 16 + 16)));
const loc = new THREE.Vector3(...best).applyMatrix4(ibm);
const seatT = loc.toArray();
console.log('silla_asiento local', loc.toArray().map((v) => v.toFixed(3)).join(','));

await doc.transform(resample({ tolerance: 1e-4 }), prune(), dedup());
bone.addChild(doc.createNode('silla_asiento').setTranslation(seatT));
let tri = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tri += p.getIndices().getCount() / 3;
console.log('triángulos', tri, 'clips', root.listAnimations().map((a) => a.getName()).join(','));
await io.write(OUT, doc);
