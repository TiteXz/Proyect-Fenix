// Re-enlaza el esqueleto del soldado (rig tipo Mixamo "UnknownSoldier_*") con los nombres y los ejes locales
// del rig del caballero anterior (MakeHuman/Quaternius: pelvis, spine_01..03, hand_l...) y le copia sus clips.
// Idea: cada hueso nuevo hereda la orientación de reposo del hueso viejo; las matrices de bind inversas
// absorben la diferencia de pose (T -> A) y de proporciones, así los clips viejos (rotaciones locales) valen tal cual.
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import * as THREE from 'three';
import sharp from 'sharp';

const [OLD, NEW, TEXB, TEXS, OUT] = process.argv.slice(2);
const S = 0.95;           // 1,91 m (pelo) -> ~1,81 m
const K_BOB = 0.9;        // amplitud de la traslación de la pelvis (piernas algo más cortas)
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const old = await io.read(OLD), nw = await io.read(NEW);
const V = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;

// --- mapeo de huesos: nombre del rig viejo (el que usa el código) -> hueso del soldado
const MAP = { pelvis: 'Hips', spine_01: 'Spine', spine_02: 'Spine1', spine_03: 'Spine2', neck_01: 'Neck', head: 'Head' };
for (const [s, S2] of [['l', 'Left'], ['r', 'Right']]) {
  Object.assign(MAP, { ['clavicle_' + s]: S2 + 'Shoulder', ['upperarm_' + s]: S2 + 'Arm', ['lowerarm_' + s]: S2 + 'ForeArm', ['hand_' + s]: S2 + 'Hand',
    ['thigh_' + s]: S2 + 'UpLeg', ['calf_' + s]: S2 + 'Leg', ['foot_' + s]: S2 + 'Foot', ['ball_' + s]: S2 + 'ToeBase' });
  for (const [f, F] of [['thumb', 'Thumb'], ['index', 'Index'], ['middle', 'Middle'], ['ring', 'Ring'], ['pinky', 'Pinky']])
    for (let i = 1; i <= 3; i++) MAP[`${f}_0${i}_${s}`] = `${S2}Hand${F}${i}`;
}
// hijo que marca la dirección de cada hueso (en ambos rigs)
const DIR = { spine_01: 'spine_02', spine_02: 'spine_03', spine_03: 'neck_01', neck_01: 'head' };
for (const s of ['l', 'r']) {
  Object.assign(DIR, { ['clavicle_' + s]: 'upperarm_' + s, ['upperarm_' + s]: 'lowerarm_' + s, ['lowerarm_' + s]: 'hand_' + s, ['hand_' + s]: 'middle_01_' + s,
    ['thigh_' + s]: 'calf_' + s, ['calf_' + s]: 'foot_' + s, ['foot_' + s]: 'ball_' + s });
  for (const f of ['thumb', 'index', 'middle', 'ring', 'pinky']) { DIR[`${f}_01_${s}`] = `${f}_02_${s}`; DIR[`${f}_02_${s}`] = `${f}_03_${s}`; }
}

const LEAF = { head: 'HeadTop_End' };
for (const [s, S2] of [['l', 'Left'], ['r', 'Right']]) {
  LEAF['ball_' + s] = S2 + 'Toe_End';
  for (const [f, F] of [['thumb', 'Thumb'], ['index', 'Index'], ['middle', 'Middle'], ['ring', 'Ring'], ['pinky', 'Pinky']]) LEAF[`${f}_03_${s}`] = `${S2}Hand${F}4`;
}
// --- rig viejo: reposo
const oNodes = Object.fromEntries(old.getRoot().listNodes().map((n) => [n.getName(), n]));
const oW = (n) => new M4().fromArray(oNodes[n].getWorldMatrix());
const oPos = (n) => new V().setFromMatrixPosition(oW(n));
const oQ = (n) => { const q = new Q(); oW(n).decompose(new V(), q, new V()); return q; };
const order = []; (function walk(n) { const nm = n.getName(); if (nm === 'Root' || MAP[nm]) { order.push(nm); n.listChildren().forEach(walk); } })(oNodes.Root);

// --- soldado: pose de bind (de las IBM del skin con más huesos)
const skins = nw.getRoot().listSkins().sort((a, b) => b.listJoints().length - a.listJoints().length);
const bind = {};
for (const sk of skins.slice().reverse()) { const a = sk.getInverseBindMatrices().getArray(); sk.listJoints().forEach((j, i) => { bind[j.getName()] = new M4().fromArray(Array.from(a.slice(i * 16, i * 16 + 16))).invert(); }); }
const nPos = (b) => new V().setFromMatrixPosition(bind['UnknownSoldier_' + MAP[b]]).multiplyScalar(S);

// --- pose: G = giro que lleva el hueso del soldado (pose T) a la pose de reposo del rig viejo (pose A)
const G = {}, Pp = {}, Pw = {};
const parentOf = {}; for (const nm of order) for (const c of oNodes[nm].listChildren()) if (order.includes(c.getName())) parentOf[c.getName()] = nm;
for (const b of order) {
  if (b === 'Root') { G[b] = new Q(); Pp[b] = new V(); Pw[b] = oW('Root'); continue; }
  const par = parentOf[b];
  if (b === 'pelvis') { G[b] = new Q(); Pp[b] = nPos(b); }
  else Pp[b] = Pp[par].clone().add(nPos(b).sub(nPos(par)).applyQuaternion(G[par]));
  let g = G[par] ? G[par].clone() : new Q();
  if (DIR[b]) {
    const dn = nPos(DIR[b]).sub(nPos(b)).applyQuaternion(g).normalize();
    const dO = oPos(DIR[b]).sub(oPos(b)).normalize();
    g = new Q().setFromUnitVectors(dn, dO).multiply(g);
    if (/^hand_/.test(b)) {   // giro sobre el eje del antebrazo: alinea la palma (índice -> meñique)
      const s = b.slice(-1);
      const sideN = nPos('index_01_' + s).sub(nPos('pinky_01_' + s)).applyQuaternion(g);
      const sideO = oPos('index_01_' + s).sub(oPos('pinky_01_' + s));
      const pr = (v) => v.sub(dO.clone().multiplyScalar(v.dot(dO))).normalize();
      const a = pr(sideN), c = pr(sideO);
      let ang = Math.acos(THREE.MathUtils.clamp(a.dot(c), -1, 1)); if (new V().crossVectors(a, c).dot(dO) < 0) ang = -ang;
      g = new Q().setFromAxisAngle(dO, ang).multiply(g); console.log("giro palma", b, (ang * 180 / Math.PI).toFixed(1));
    }
  } else if (LEAF[b]) {   // hueso terminal: su eje Y (rig de Blender) contra el hueso final del soldado (HeadTop_End, Toe_End, falange 4)
    const tipN = bind['UnknownSoldier_' + LEAF[b]];
    if (tipN) {
      const dn = new V().setFromMatrixPosition(tipN).multiplyScalar(S).sub(nPos(b)).applyQuaternion(g).normalize();
      const dO = new V(0, 1, 0).applyQuaternion(oQ(b)).normalize();
      g = new Q().setFromUnitVectors(dn, dO).multiply(g);
    }
  }
  if (b === 'head') console.log('corrección cabeza (grados):', (2 * Math.acos(Math.min(1, Math.abs(g.clone().invert().multiply(G[parentOf[b]]).w))) * 180 / Math.PI).toFixed(1));
  G[b] = g;
}
// suelo: baja/sube la pelvis para que la suela toque y=0 en la pose de reposo
const meshNodes = nw.getRoot().listNodes().filter((n) => n.getMesh() && n.getSkin());
const jointMap = (sk) => sk.listJoints().map((j) => { let n = j; while (n) { const nm = n.getName().replace('UnknownSoldier_', ''); const ob = Object.keys(MAP).find((k) => MAP[k] === nm); if (ob) return ob; n = n.getParentNode(); } return 'pelvis'; });
const deform = (b) => new M4().compose(Pp[b], G[b], new V(1, 1, 1)).multiply(new M4().makeTranslation(-nPos(b).x, -nPos(b).y, -nPos(b).z));
let minY = 1e9;
for (const mn of meshNodes) { const jm = jointMap(mn.getSkin()); for (const p of mn.getMesh().listPrimitives()) {
  const pos = p.getAttribute('POSITION'), J = p.getAttribute('JOINTS_0'), Wt = p.getAttribute('WEIGHTS_0'), v = new V(), acc = new V(), t = new V(), jj = [], ww = [];
  for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, jj); v.fromArray(jj).multiplyScalar(S); J.getElement(i, jj); Wt.getElement(i, ww); acc.set(0, 0, 0);
    for (let k = 0; k < 4; k++) if (ww[k] > 0) acc.addScaledVector(t.copy(v).applyMatrix4(deform(jm[jj[k]])), ww[k]); minY = Math.min(minY, acc.y); } } }
console.log('suela en reposo y =', minY.toFixed(4));
for (const b of order) if (b !== 'Root') Pp[b].y -= minY;

// --- documento nuevo
const doc = new Document(); const buf = doc.createBuffer();
const scene = doc.createScene('Scene'); const top = doc.createNode('Caballero'); scene.addChild(top);
const nodes = {}, P = {};
for (const b of order) {
  const on = oNodes[b], n = doc.createNode(b); nodes[b] = n;
  const qLocal = new Q().fromArray(on.getRotation());
  if (b === 'Root') { n.setRotation(on.getRotation()).setTranslation(on.getTranslation()); P[b] = oW('Root'); top.addChild(n); continue; }
  const par = parentOf[b];
  P[b] = new M4().compose(Pp[b], oQ(b), new V(1, 1, 1));
  const tl = Pp[b].clone().applyMatrix4(P[par].clone().invert());
  n.setTranslation(tl.toArray()).setRotation(qLocal.toArray()); nodes[par].addChild(n);
}
const joints = order.filter((b) => b !== 'Root');
const ibm = new Float32Array(joints.length * 16);
joints.forEach((b, i) => { const m = P[b].clone().invert().multiply(deform(b)); m.toArray(ibm, i * 16); });
const skin = doc.createSkin('caballero').setSkeleton(nodes.Root).setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buf));
joints.forEach((b) => skin.addJoint(nodes[b]));

// texturas
const texB = doc.createTexture('soldado_color').setMimeType('image/webp').setImage(await sharp(TEXB).resize(2048, 2048).webp({ quality: 88, alphaQuality: 90 }).toBuffer());
const texS = doc.createTexture('soldado_vaina').setMimeType('image/webp').setImage(await sharp(TEXS).resize(1024, 1024).webp({ quality: 86 }).toBuffer());
doc.createExtension((await import('@gltf-transform/extensions')).EXTTextureWebP).setRequired(true);
const matB = doc.createMaterial('soldado_cuerpo').setBaseColorTexture(texB).setRoughnessFactor(0.68).setMetallicFactor(0.15).setAlphaMode('MASK').setAlphaCutoff(0.5).setDoubleSided(true);
const matS = doc.createMaterial('soldado_vaina').setBaseColorTexture(texS).setRoughnessFactor(0.6).setMetallicFactor(0.2);
let tri = 0;
// la vaina vacía se descarta: el arma del juego va en la mano y la vaina atravesaba las piernas al correr
for (const mn of meshNodes.filter((m) => !/Scabbard/.test(m.getName()))) {
  const name = mn.getName().replace('UnknowSoldier_', '').toLowerCase();
  const jm = jointMap(mn.getSkin()).map((b) => joints.indexOf(b));
  const mesh = doc.createMesh(name);
  const JI = Object.fromEntries(joints.map((b, i) => [b, i]));
  for (const p of mn.getMesh().listPrimitives()) {
    const pos = p.getAttribute('POSITION'), nrm = p.getAttribute('NORMAL'), uv = p.getAttribute('TEXCOORD_0'), J = p.getAttribute('JOINTS_0'), Wt = p.getAttribute('WEIGHTS_0');
    const n = pos.getCount(), P3 = new Float32Array(n * 3), J4 = new Uint8Array(n * 4), W4 = new Float32Array(n * 4), a = [], w = [];
    for (let i = 0; i < n; i++) {
      const pv = pos.getElement(i, [0, 0, 0]); P3.set(pv.map((x) => x * S), i * 3);
      J.getElement(i, a); Wt.getElement(i, w); const acc = new Map();
      for (let k = 0; k < 4; k++) if (w[k] > 0) { const j = jm[a[k]]; acc.set(j, (acc.get(j) || 0) + w[k]); }
      if (name === 'armor' && pv[1] * S < 0.98) {   // faldón del abrigo: menos pantorrilla y más pelvis (si no, hace de membrana entre las piernas)
        const f = 0.3 + 0.45 * (1 - Math.min(1, Math.abs(pv[0] * S) / 0.16)) * (pv[2] < 0 ? 1 : 0.6);
        for (const s of ['l', 'r']) {
          const c = JI['calf_' + s], t = JI['thigh_' + s];
          if (acc.has(c)) { acc.set(t, (acc.get(t) || 0) + acc.get(c)); acc.delete(c); }
          if (acc.has(t)) { const mv = acc.get(t) * f; acc.set(t, acc.get(t) - mv); acc.set(JI.pelvis, (acc.get(JI.pelvis) || 0) + mv); }
        }
      }
      const ent = [...acc].sort((x, y) => y[1] - x[1]).slice(0, 4), sum = ent.reduce((s, e) => s + e[1], 0);
      ent.forEach(([j, wt], k) => { J4[i * 4 + k] = j; W4[i * 4 + k] = wt / sum; });
    }
    const acc = (type, arr) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
    const prim = doc.createPrimitive().setAttribute('POSITION', acc('VEC3', P3)).setAttribute('NORMAL', acc('VEC3', new Float32Array(nrm.getArray())))
      .setAttribute('TEXCOORD_0', acc('VEC2', new Float32Array(uv.getArray()))).setAttribute('JOINTS_0', acc('VEC4', J4)).setAttribute('WEIGHTS_0', acc('VEC4', W4))
      .setMaterial(/Scabbard/.test(mn.getName()) ? matS : matB);
    if (p.getIndices()) { const ix = p.getIndices().getArray(); prim.setIndices(acc('SCALAR', n > 65535 ? new Uint32Array(ix) : new Uint16Array(ix))); tri += ix.length / 3; }
    mesh.addPrimitive(prim);
  }
  top.addChild(doc.createNode(name).setMesh(mesh).setSkin(skin));
}
console.log('triángulos', tri);

// --- clips del caballero anterior
const oPelvisRest = new V().fromArray(oNodes.pelvis.getTranslation()), nPelvisRest = new V().fromArray(nodes.pelvis.getTranslation());
for (const oa of old.getRoot().listAnimations()) {
  const an = doc.createAnimation(oa.getName());
  for (const ch of oa.listChannels()) {
    const tn = nodes[ch.getTargetNode().getName()], path = ch.getTargetPath();
    if (!tn || path === 'scale' || (path === 'translation' && tn !== nodes.pelvis)) continue;
    const s = ch.getSampler(); let out = new Float32Array(s.getOutput().getArray());
    if (path === 'translation') for (let i = 0; i < out.length; i += 3) for (let k = 0; k < 3; k++) out[i + k] = nPelvisRest.getComponent(k) + K_BOB * (out[i + k] - oPelvisRest.getComponent(k));
    const smp = doc.createAnimationSampler().setInterpolation(s.getInterpolation())
      .setInput(doc.createAccessor().setType('SCALAR').setArray(new Float32Array(s.getInput().getArray())).setBuffer(buf))
      .setOutput(doc.createAccessor().setType(s.getOutput().getType()).setArray(out).setBuffer(buf));
    an.addSampler(smp).addChannel(doc.createAnimationChannel().setTargetNode(tn).setTargetPath(path).setSampler(smp));
  }
}
// --- postura: los clips venían de un rig con piernas y brazos más largos y se veían agachados en el soldado.
// 1) Piernas: la caída de la pelvis se escala (proporción de pierna × factor por clip), la separación lateral de los pies
//    se estrecha en reposo/guardia, y las piernas se recolocan con IK de dos huesos (la rodilla conserva su plano de
//    flexión y el pie su orientación). El objetivo de altura es la SUELA real: la de las botas del soldado (vértices
//    con skinning) debe quedar a la altura a la que estaba la suela de los escarpes del caballero anterior (×proporción),
//    o sea, a 0 cuando el pie apoya: ni flota ni se hunde.
// 2) Tronco: en reposo/guardia/hechizos se endereza parte de la inclinación hacia delante.
// 3) Cabeza: el clip bajaba la barbilla (el yelmo anterior lo ocultaba); se sube la mirada (cuello 40 %, cabeza 60 %).
// Montado: solo cabeza. Rodar y morir: sin tocar.
const LEGFIX = { reposo: 0.3, guardia: 0.3, andar: 0.7, correr: 0.65, tajo: 0.45, martillazo: 0.45, disparo_arco: 0.35, conjurar: 0.35, invocar: 0.4, hechizo: 0.4, golpeado: 0.5 };
const LAT = { reposo: 0.45, guardia: 0.45, disparo_arco: 0.6, conjurar: 0.6, invocar: 0.6, hechizo: 0.6, golpeado: 0.7 };   // anchura lateral del apoyo
const SPINE = { reposo: 0.5, guardia: 0.5, disparo_arco: 0.35, conjurar: 0.35, invocar: 0.35, hechizo: 0.35 };       // fracción de inclinación que se quita
const NO_TOCAR = new Set(['morir', 'rodar']);
if (!process.env.SIN_POSTURA) {
  const mkTree = (rootNode) => { const map = {}, rest = []; const mk = (n) => { const o = new THREE.Object3D(); o.name = n.getName(); o.position.fromArray(n.getTranslation()); o.quaternion.fromArray(n.getRotation()); o.scale.fromArray(n.getScale()); map[o.name] = o; rest.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]); for (const c of n.listChildren()) if (!c.getMesh()) o.add(mk(c)); return o; }; const top = new THREE.Object3D(); top.add(mk(rootNode)); top.updateMatrixWorld(true); return { top, map, reset: () => rest.forEach(([o, p, q, s]) => { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(s); }) }; };
  const toClip = (a) => new THREE.AnimationClip(a.getName(), -1, a.listChannels().map((c) => { const s = c.getSampler(), nm = c.getTargetNode().getName(), t = Array.from(s.getInput().getArray()), v = Array.from(s.getOutput().getArray()), p = c.getTargetPath();
    const T = p === 'rotation' ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack; const tr = new T(nm + (p === 'rotation' ? '.quaternion' : p === 'translation' ? '.position' : '.scale'), t, v); if (s.getInterpolation() === 'STEP') tr.setInterpolation(THREE.InterpolateDiscrete); return tr; }));
  const OT = mkTree(oNodes.Root), NT = mkTree(nodes.Root);
  const wp = (o) => o.getWorldPosition(new V()), wq = (o) => o.getWorldQuaternion(new Q());
  const oRestPel = wp(OT.map.pelvis).y, nRestPel = wp(NT.map.pelvis).y;
  const len = (m, a, b) => wp(m[a]).distanceTo(wp(m[b]));
  const LA = len(NT.map, 'thigh_l', 'calf_l'), LB = len(NT.map, 'calf_l', 'foot_l');
  const r = (LA + LB) / (len(OT.map, 'thigh_l', 'calf_l') + len(OT.map, 'calf_l', 'foot_l'));
  // vértices de suela por lado (x>0 = izquierda en ambos modelos): [pos bind, [[IBM, hueso, peso]...]]
  const soleVerts = (prim, jointNames, ibmArr, tree, maxY) => { const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0'), out = { l: [], r: [] };
    const ibmM = jointNames.map((_, i) => new M4().fromArray(Array.from(ibmArr.slice(i * 16, i * 16 + 16))));
    for (let i = 0; i < P.getCount(); i++) { const p = P.getElement(i, [0, 0, 0]); if (p[1] > maxY) continue; const j = J.getElement(i, [0, 0, 0, 0]), w = W.getElement(i, [0, 0, 0, 0]);
      const inf = []; for (let k = 0; k < 4; k++) if (w[k] > 0 && tree.map[jointNames[j[k]]]) inf.push([ibmM[j[k]], tree.map[jointNames[j[k]]], w[k]]);
      if (inf.length) out[p[0] > 0 ? 'l' : 'r'].push([new V(...p), inf]); }
    return out; };
  const soleY = (verts) => { let m = 1e9; const v = new V(), acc = new V(), mm = new M4(); for (const [p, inf] of verts) { acc.set(0, 0, 0); for (const [ib, bone, w] of inf) { mm.multiplyMatrices(bone.matrixWorld, ib); acc.addScaledVector(v.copy(p).applyMatrix4(mm), w); } if (acc.y < m) m = acc.y; } return m; };
  const legMesh = doc.getRoot().listMeshes().find((m) => m.getName() === 'leg');
  const nSole = soleVerts(legMesh.listPrimitives()[0], joints, ibm, NT, 0.09);
  const oEsc = oNodes.escarpes, oSk = oEsc.getSkin();
  const oSole = soleVerts(oEsc.getMesh().listPrimitives()[0], oSk.listJoints().map((j) => j.getName()), oSk.getInverseBindMatrices().getArray(), OT, 0.06);
  console.log('pierna nueva/vieja', r.toFixed(3), 'pelvis reposo', nRestPel.toFixed(3), 'vértices de suela nuevo', nSole.l.length, nSole.r.length, 'viejo', oSole.l.length, oSole.r.length, 'suela reposo nuevo', soleY(nSole.l).toFixed(3), 'viejo', soleY(oSole.l).toFixed(3));
  const headIbm = new M4().fromArray(Array.from(ibm.slice(joints.indexOf('head') * 16, joints.indexOf('head') * 16 + 16)));
  const facePitch = () => { const d = new V(0, 0, 1).transformDirection(new M4().multiplyMatrices(NT.map.head.matrixWorld, headIbm)); return [THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(d.y, -1, 1))), d]; };
  const lean = () => { const c = wp(NT.map.neck_01).sub(wp(NT.map.spine_01)); const h = new V(c.x, 0, c.z); return [THREE.MathUtils.radToDeg(Math.atan2(h.length(), c.y)), h]; };
  const rotW = (bone, axis, ang) => { if (!ang) return; const q = new Q().setFromAxisAngle(axis, ang).multiply(wq(bone)); bone.quaternion.copy(wq(bone.parent).invert().multiply(q)); NT.top.updateMatrixWorld(true); };
  const sample = (tree, clip, t) => { tree.reset(); const mx = new THREE.AnimationMixer(tree.top); mx.clipAction(clip).play(); mx.setTime(t); tree.top.updateMatrixWorld(true); };
  const knee = (m, s) => { const h = wp(m['thigh_' + s]), k = wp(m['calf_' + s]), f = wp(m['foot_' + s]); return THREE.MathUtils.radToDeg(h.sub(k).angleTo(f.sub(k))); };
  const stats = () => ({ pel: [], kn: [], sole: [], pitch: [], lean: [], ancho: [] });
  const note = (st) => { const N = NT.map; st.pel.push(wp(N.pelvis).y); st.kn.push((knee(N, 'l') + knee(N, 'r')) / 2); st.sole.push(Math.min(soleY(nSole.l), soleY(nSole.r))); st.pitch.push(facePitch()[0]); st.lean.push(lean()[0]); st.ancho.push(Math.abs(wp(N.foot_l).x - wp(N.foot_r).x)); };
  const fmt = (a) => `${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2)} [${Math.min(...a).toFixed(2)}–${Math.max(...a).toFixed(2)}]`;
  const rootQInv = wq(NT.map.Root).invert(), Y = new V(0, 1, 0);
  for (const an of doc.getRoot().listAnimations()) {
    const name = an.getName(); if (NO_TOCAR.has(name)) continue;
    const c = LEGFIX[name], lat = LAT[name] ?? 1, sp = SPINE[name] || 0, legs = c !== undefined;
    const oa = old.getRoot().listAnimations().find((a) => a.getName() === name);
    const oClip = toClip(oa), nClip = toClip(an);
    const keyT = an.listSamplers().flatMap((s) => Array.from(s.getInput().getArray())), dur = Math.max(...keyT);
    // a 60 fps: con las claves originales (24 fps) la interpolación lineal de muslo/pantorrilla hundía el pie entre claves al correr
    const times = Array.from({ length: Math.round(dur * 60) + 1 }, (_, i) => Math.min(dur, i / 60));
    const before = stats(), after = stats();
    const bones = ['neck_01', 'head'].concat(sp ? ['spine_01', 'spine_02'] : [], legs ? ['thigh_l', 'calf_l', 'foot_l', 'thigh_r', 'calf_r', 'foot_r'] : []);
    const out = Object.fromEntries(bones.map((b) => [b, []])); if (legs) out.pelvis = [];
    for (const t of times) {
      sample(OT, oClip, t); const M = OT.map;
      const oPel = wp(M.pelvis), oA = { l: wp(M.foot_l), r: wp(M.foot_r) }, oH = { l: wp(M.thigh_l), r: wp(M.thigh_r) }, oS = { l: soleY(oSole.l), r: soleY(oSole.r) };
      sample(NT, nClip, t); const N = NT.map; note(before);
      // tronco
      if (sp) { const [l, h] = lean(); if (l > 8 && h.lengthSq() > 1e-8) { const ax = h.normalize().cross(Y).normalize(), a = THREE.MathUtils.degToRad((l - 8) * sp); rotW(N.spine_01, ax, a / 2); rotW(N.spine_02, ax, a / 2); } }
      // cabeza: la cara baja como mucho a -6°, conservando un 25 % de lo que bajaba de más
      { const [p, d] = facePitch(); const tg = p > -6 ? p : -6 + (p + 6) * 0.25, h = new V(d.x, 0, d.z);
        if (tg > p && h.lengthSq() > 1e-6) { const ax = h.normalize().cross(Y).normalize(), a = THREE.MathUtils.degToRad(tg - p); rotW(N.neck_01, ax, a * 0.4); rotW(N.head, ax, a * 0.6); } }
      if (legs) {
        const fq = { l: wq(N.foot_l), r: wq(N.foot_r) }, kn0 = { l: wp(N.calf_l), r: wp(N.calf_r) };
        const tgt = {};
        const placePelvis = () => { for (let it = 0; it < 3; it++) { let dy = 0;
          for (const s of ['l', 'r']) { const h = wp(N['thigh_' + s]); const dxz = Math.hypot(tgt[s].x - h.x, tgt[s].z - h.z), Lmax = (LA + LB) * 0.985, v = Math.sqrt(Math.max(0, Lmax * Lmax - dxz * dxz)); dy = Math.min(dy, v - (h.y - tgt[s].y)); }
          if (dy > -1e-4) break; N.pelvis.position.add(new V(0, dy, 0).applyQuaternion(rootQInv)); NT.top.updateMatrixWorld(true); } };
        const ik = () => { for (const s of ['l', 'r']) {
          const th = N['thigh_' + s], ca = N['calf_' + s], fo = N['foot_' + s];
          const h = wp(th), T = tgt[s], dv = T.clone().sub(h), d = THREE.MathUtils.clamp(dv.length(), Math.abs(LA - LB) + 1e-3, LA + LB - 1e-4), u = dv.normalize();
          const pole = kn0[s].clone().sub(h); pole.sub(u.clone().multiplyScalar(pole.dot(u))); if (pole.lengthSq() < 1e-8) pole.set(0, 0, 1).applyQuaternion(wq(N.pelvis)); pole.normalize();
          const ca2 = (LA * LA + d * d - LB * LB) / (2 * LA * d), K = h.clone().addScaledVector(u, LA * ca2).addScaledVector(pole, LA * Math.sqrt(Math.max(0, 1 - ca2 * ca2)));
          const turn = (bone, from, to) => { const q = new Q().setFromUnitVectors(from.normalize(), to.normalize()).multiply(wq(bone)); bone.quaternion.copy(wq(bone.parent).invert().multiply(q)); NT.top.updateMatrixWorld(true); };
          turn(th, wp(ca).sub(h), K.clone().sub(h)); turn(ca, wp(fo).sub(wp(ca)), T.clone().sub(wp(ca)));
          fo.quaternion.copy(wq(ca).invert().multiply(fq[s])); NT.top.updateMatrixWorld(true); } };
        // pelvis: caída escalada y suavizada
        const dy0 = (nRestPel - (oRestPel - oPel.y) * r * c) - wp(N.pelvis).y;
        N.pelvis.position.add(new V(0, dy0, 0).applyQuaternion(rootQInv)); NT.top.updateMatrixWorld(true);
        // tobillo: desplazamiento del clip original (escalado); hacia fuera, estrechado por LAT
        const hipMid = wp(N.thigh_l).add(wp(N.thigh_r)).multiplyScalar(0.5);
        for (const s of ['l', 'r']) {
          const h = wp(N['thigh_' + s]), d = oA[s].clone().sub(oH[s]).multiplyScalar(r), out = Math.sign(h.x - hipMid.x);
          tgt[s] = new V(h.x + (Math.sign(d.x) === out ? d.x * lat : d.x), wp(N['foot_' + s]).y, h.z + d.z);
        }
        placePelvis(); ik();
        // suela: la del soldado a la altura de la del caballero anterior (0 si apoyaba)
        for (let it = 0; it < 3; it++) { for (const s of ['l', 'r']) tgt[s].y += Math.max(0, oS[s]) * r - soleY(nSole[s]); placePelvis(); ik(); }
      }
      note(after);
      const push = (b) => { const q = N[b].quaternion, a = out[b], n = a.length; if (n && q.x * a[n - 4] + q.y * a[n - 3] + q.z * a[n - 2] + q.w * a[n - 1] < 0) q.set(-q.x, -q.y, -q.z, -q.w); a.push(...q.toArray()); };
      bones.forEach(push); if (legs) out.pelvis.push(...N.pelvis.position.toArray());
    }
    const inp = doc.createAccessor().setType('SCALAR').setArray(new Float32Array(times)).setBuffer(buf);
    for (const [b, arr] of Object.entries(out)) {
      const path = b === 'pelvis' ? 'translation' : 'rotation';
      for (const ch of an.listChannels().filter((ch) => ch.getTargetNode() === nodes[b] && ch.getTargetPath() === path)) { const s = ch.getSampler(); ch.dispose(); s.dispose(); }
      const smp = doc.createAnimationSampler().setInterpolation('LINEAR').setInput(inp).setOutput(doc.createAccessor().setType(path === 'translation' ? 'VEC3' : 'VEC4').setArray(new Float32Array(arr)).setBuffer(buf));
      an.addSampler(smp).addChannel(doc.createAnimationChannel().setTargetNode(nodes[b]).setTargetPath(path).setSampler(smp));
    }
    console.log(`${name.padEnd(14)} pelvis ${fmt(before.pel)} -> ${fmt(after.pel)} | rodilla ${fmt(before.kn)} -> ${fmt(after.kn)} | suela ${fmt(before.sole)} -> ${fmt(after.sole)} | ancho ${fmt(before.ancho)} -> ${fmt(after.ancho)} | cara ${fmt(before.pitch)} -> ${fmt(after.pitch)} | tronco ${fmt(before.lean)} -> ${fmt(after.lean)}`);
  }
}
await doc.transform(prune({ keepLeaves: true }));
await io.write(OUT, doc);
console.log('ok', OUT);
