/* Escena exterior «Camino de la Aldea del Vado» para la maqueta (three.js r147, WebGLRenderer).
   Se incrusta con build.py junto a terreno.js y edificios.js. API: window.FenixAldea(ctx) devuelve la escena.
   Todo lo que se crea queda registrado en `own` y se libera en dispose(). Presupuesto y criterios: prototipo/exterior/BRIEF.md */
(function (root) {
  'use strict';
  root.FenixAldea = function (ctx) {
    const THREE = ctx.THREE, scene = ctx.scene, camera = ctx.camera, renderer = ctx.renderer, EXT = ctx.EXT;
    const TER = root.FenixTerreno, EDI = root.FenixEdificios;
    const V3 = THREE.Vector3, M4 = THREE.Matrix4, Q4 = THREE.Quaternion;
    const own = { geo: new Set(), mat: new Set(), tex: new Set(), rt: new Set() };
    const G = (g) => (own.geo.add(g), g), MT = (m) => (own.mat.add(m), m), TX = (t) => (t && own.tex.add(t), t);
    const group = new THREE.Group(); group.name = 'escenaAldea';
    const S = { listo: false, vivo: true, time: { value: 0 }, wind: { value: 1 } };   // uniform de tiempo compartido por los shaders de viento
    const sstep = TER.sstep, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
    let ter, rng, aniso = ctx.aniso || 4;

    /* ---------- carga de assets (webp → textura, glb → gltf, hdr → textura de cielo) ---------- */
    const TEXS = {};
    function loadTex(file, srgb) {
      return new Promise((res) => {
        const t = new THREE.TextureLoader().load(EXT[file], () => res(t), undefined, () => res(t));
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; if (srgb) t.encoding = THREE.sRGBEncoding; TX(t); TEXS[file] = t;
      });
    }
    function loadGlb(name) {
      return new Promise((res, rej) => new THREE.GLTFLoader().parse(ctx.b64buf(EXT[name + '.glb']), '', (g) => { track(g.scene); res(g); }, rej));
    }
    function track(o) {   // registra geometrías, materiales y texturas de un árbol de objetos cargado
      o.traverse((m) => {
        if (m.geometry) G(m.geometry);
        if (m.material) [].concat(m.material).forEach((mm) => { MT(mm); for (const k in mm) if (mm[k] && mm[k].isTexture) TX(mm[k]); });
      });
    }
    const GLB = {};
    function parts(g) {   // geometrías con la matriz de cada nodo ya aplicada
      g.scene.updateMatrixWorld(true); const out = [];
      g.scene.traverse((o) => { if (o.isMesh) { const ge = o.geometry.clone(); ge.applyMatrix4(o.matrixWorld); out.push({ name: o.name, geo: ge, mat: o.material }); } });
      return out;
    }
    // simplificación por agrupación de vértices (rejilla de N celdas en la dimensión mayor; el UV entra en la clave para no mezclar islas del atlas): rocas a ~30-40 % de triángulos
    function simplify(geo0, N) {
      const geo = geo0.index ? geo0.toNonIndexed() : geo0.clone(); geo.computeBoundingBox(); const bb = geo.boundingBox, sz = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z), cell = sz / N;
      const P = geo.attributes.position, Nn = geo.attributes.normal, U = geo.attributes.uv, map = new Map(), acc = [], id = new Int32Array(P.count);
      for (let i = 0; i < P.count; i++) {
        const key = Math.floor(P.getX(i) / cell) + ',' + Math.floor(P.getY(i) / cell) + ',' + Math.floor(P.getZ(i) / cell) + ',' + (U ? Math.floor(U.getX(i) * 40) + ',' + Math.floor(U.getY(i) * 40) : '');
        let k = map.get(key); if (k === undefined) { k = acc.length; map.set(key, k); acc.push([0, 0, 0, 0, 0, 0, 0, U ? U.getX(i) : 0, U ? U.getY(i) : 0]); }
        const a = acc[k]; a[0] += P.getX(i); a[1] += P.getY(i); a[2] += P.getZ(i); a[3] += Nn.getX(i); a[4] += Nn.getY(i); a[5] += Nn.getZ(i); a[6]++; id[i] = k;
      }
      const pos = [], nor = [], uv = [];
      for (let t = 0; t < P.count; t += 3) {
        const a = id[t], b = id[t + 1], c = id[t + 2]; if (a === b || b === c || a === c) continue;
        for (const k of [a, b, c]) { const q = acc[k], n = q[6], l = Math.hypot(q[3], q[4], q[5]) || 1; pos.push(q[0] / n, q[1] / n, q[2] / n); nor.push(q[3] / l, q[4] / l, q[5] / l); uv.push(q[7], q[8]); }
      }
      const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.dispose(); return out;
    }
    function boxOf(geos) { const b = new THREE.Box3(); for (const g of geos) { g.computeBoundingBox(); b.union(g.boundingBox); } return b; }
    // centra en XZ y apoya sobre y=0 un conjunto de geometrías (referencia: la primera = tronco / el propio nodo)
    function grounded(geos, refIdx) {
      const ref = geos[refIdx || 0]; ref.computeBoundingBox(); const bb = ref.boundingBox, p = ref.attributes.position;
      let sx = 0, sz = 0, n = 0; for (let i = 0; i < p.count; i++) if (p.getY(i) < bb.min.y + 0.45) { sx += p.getX(i); sz += p.getZ(i); n++; }
      const cx = n ? sx / n : (bb.min.x + bb.max.x) / 2, cz = n ? sz / n : (bb.min.z + bb.max.z) / 2;
      for (const g of geos) g.translate(-cx, -bb.min.y, -cz);
    }
    function centered(geo) { geo.computeBoundingBox(); const b = geo.boundingBox; geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); return geo; }
    function bakeNormalsRadial(geo, k) {   // normales de follaje: mezcla hacia radial desde el centro de la copa (volumen más suave, sin tarjetas planas)
      geo.computeBoundingBox(); const b = geo.boundingBox, c = new V3((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2 + (b.max.y - b.min.y) * 0.05, (b.min.z + b.max.z) / 2);
      const p = geo.attributes.position, n = geo.attributes.normal, v = new V3(), nn = new V3();
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).sub(c).normalize(); nn.fromBufferAttribute(n, i); nn.lerp(v, k).normalize(); n.setXYZ(i, nn.x, nn.y, nn.z); }
    }
    function avgColor(tex) {   // color medio del atlas (para calcular el tinte de las instancias)
      const im = tex.image, c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 16, 16);
      const d = x.getImageData(0, 0, 16, 16).data; let r = 0, g = 0, b = 0, w = 0;
      for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255; if (a < 0.4) continue; r += d[i] * a; g += d[i + 1] * a; b += d[i + 2] * a; w += a; }
      w = Math.max(w, 1e-3); const lin = (v) => Math.pow(v / 255, 2.2); return [lin(r / w), lin(g / w), lin(b / w)];
    }
    const GLBS = ['arbol_isla1_lod0', 'arbol_isla1_lod1', 'arbol_isla2_lod0', 'arbol_isla2_lod1', 'arbol_jacaranda_lod0', 'arbol_jacaranda_lod1', 'arbusto_02', 'helecho_02', 'hierba_briznas', 'hierba_lod', 'flores_prado',
      'roca_musgo_set', 'roca_09', 'piedra_01', 'barriles', 'cajon', 'cubo', 'farol', 'tocon', 'tronco_caido', 'acantilado_01', 'acantilado_02'];
    const TEXN = [['hierba', 1, 1, 1], ['camino', 1, 1, 1], ['barro', 1, 1, 0], ['roca_talud', 1, 1, 1], ['muro_piedra', 1, 1, 1], ['madera', 1, 1, 1], ['revoco', 1, 1, 1], ['teja', 1, 1, 1]];
    let skyTex = null;
    async function cargarAssets(prog) {
      const jobs = []; let done = 0, total = 0;
      const add = (p) => { total++; return p.then((v) => { done++; if (prog) prog(done / total); return v; }); };
      for (const [n, d, nm, arm] of TEXN) {
        if (d) jobs.push(add(loadTex(n + '_Diffuse.webp', true)));
        if (nm) jobs.push(add(loadTex(n + '_nor_gl.webp', false)));
        if (arm) jobs.push(add(loadTex(n + '_arm.webp', false)));
      }
      if (EXT['cielo_4k.webp']) jobs.push(add(loadTex('cielo_4k.webp', true)));
      for (const n of GLBS) if (EXT[n + '.glb']) jobs.push(add(loadGlb(n).then((g) => { GLB[n] = g; })));
      jobs.push(add(new Promise((res) => {   // HDRI: se recorta el disco solar (≤ 12) para que el PMREM no duplique el sol direccional
        const url = URL.createObjectURL(new Blob([ctx.b64buf(EXT['cielo_kloofendal_1k.hdr'])]));
        const ld = new THREE.RGBELoader(); ld.setDataType(THREE.FloatType);
        ld.load(url, (t) => {
          URL.revokeObjectURL(url);
          const src = t.image.data, w = t.image.width, h = t.image.height, out = new Uint16Array(src.length), toH = THREE.DataUtils.toHalfFloat;
          for (let i = 0; i < src.length; i += 4) { out[i] = toH(Math.min(src[i], 12)); out[i + 1] = toH(Math.min(src[i + 1], 12)); out[i + 2] = toH(Math.min(src[i + 2], 12)); out[i + 3] = toH(1); }
          t.dispose();
          const tex = new THREE.DataTexture(out, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
          tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.wrapS = THREE.RepeatWrapping; tex.needsUpdate = true;
          skyTex = TX(tex); res();
        });
      })));
      await Promise.all(jobs);
    }
    const T$ = (n) => TEXS[n + '.webp'] || TEXS[n];

    /* ---------- terreno: malla con splatting por máscara ---------- */
    let terrainMesh = null, splatTex = null;
    const wallCells = new Map();   // celdas de 1 m ocupadas por muros / edificios / rocas (para no poner hierba encima) → radio
    const stamps = [];             // {x,z,r,ao,mud} marcas de contacto que se pintan en la máscara
    function stamp(x, z, r, ao, mud) { stamps.push([x, z, r, ao, mud]); }
    const foot = [];               // huellas de edificios (OBB) para excluir hierba/árboles
    function inFoot(x, z, m) {
      for (let i = 0; i < foot.length; i++) {
        const f = foot[i]; const dx = x - f.x, dz = z - f.z, c = Math.cos(f.yaw), s = Math.sin(f.yaw), lx = dx * c - dz * s, lz = dx * s + dz * c;
        if (f.r) { if (dx * dx + dz * dz < (f.r + m) * (f.r + m)) return true; } else if (Math.abs(lx) < f.w / 2 + m && Math.abs(lz) < f.d / 2 + m) return true;
      }
      return false;
    }
    const wallGrid = new Uint8Array(240 * 240);   // 0,5 m: 1 = muro
    const wg = (x, z) => { const i = Math.floor((x + 60) * 2), j = Math.floor((z + 60) * 2); return i >= 0 && j >= 0 && i < 240 && j < 240 ? wallGrid[j * 240 + i] : 0; };

    function buildSplat() {
      const N = 1024, d = new Uint8Array(N * N * 4), k = 120 / N;
      // marcas de contacto: se rasterizan en mapas auxiliares
      const ao = new Float32Array(N * N).fill(1), mud = new Float32Array(N * N);
      for (const [x, z, r, a, m] of stamps) {
        const i0 = Math.max(0, Math.floor((x - r + 60) / k)), i1 = Math.min(N - 1, Math.ceil((x + r + 60) / k)), j0 = Math.max(0, Math.floor((z - r + 60) / k)), j1 = Math.min(N - 1, Math.ceil((z + r + 60) / k));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const dd = Math.hypot(-60 + (i + 0.5) * k - x, -60 + (j + 0.5) * k - z) / r; if (dd >= 1) continue;
          const f = 1 - dd * dd; const id = j * N + i;
          ao[id] = Math.min(ao[id], 1 - a * f); mud[id] = Math.max(mud[id], m * f);
        }
      }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = -60 + (i + 0.5) * k, z = -60 + (j + 0.5) * k, id = j * N + i;
        const dR = ter.roadDist(x, z), s = ter.roadS(x, z), w = ter.halfW(s);
        const n1 = ter.fbm2(x * 0.7, z * 0.7, 21, 3) - 0.5, n2 = ter.fbm2(x * 0.13, z * 0.13, 5, 3);
        // camino: núcleo sólido, borde irregular con ruido (nunca una línea recta de corte)
        const road = 1 - sstep(w * 0.78 + n1 * 0.9, w + 0.55 + n1 * 1.5, dR);
        // roca: pendiente fuerte y meseta rocosa
        const sl = ter.slopeAt(x, z), rock = sstep(0.65 + n1 * 0.25, 1.15, sl);
        // barro: franja en el borde del camino + charcos en zonas bajas húmedas
        const edge = sstep(w * 0.6, w + 0.4, dR) * (1 - sstep(w + 0.5, w + 2.4 + n1 * 2, dR)) * sstep(0.35, 0.62, n2 + n1 * 0.3);
        const wet = sstep(0.62, 0.74, ter.fbm2(x * 0.09 + 9, z * 0.09, 31, 3)) * (1 - sstep(0.1, 0.4, sl));
        const m = Math.max(edge * 0.8, wet * 0.7, mud[id]);
        d[id * 4] = Math.round(clamp(road * (1 - rock), 0, 1) * 255); d[id * 4 + 1] = Math.round(rock * 255); d[id * 4 + 2] = Math.round(clamp(m, 0, 1) * 255); d[id * 4 + 3] = Math.round(clamp(ao[id], 0, 1) * 255);
      }
      const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.anisotropy = aniso; t.needsUpdate = true;
      splatTex = TX(t); return t;
    }
    function terrainMaterial() {
      const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.5 });
      const U = { tSplat: { value: splatTex }, tGD: { value: T$('hierba_Diffuse') }, tGN: { value: T$('hierba_nor_gl') }, tGA: { value: T$('hierba_arm') }, tRD: { value: T$('camino_Diffuse') }, tRN: { value: T$('camino_nor_gl') }, tRA: { value: T$('camino_arm') },
        tMD: { value: T$('barro_Diffuse') }, tMN: { value: T$('barro_nor_gl') }, tKD: { value: T$('roca_talud_Diffuse') }, tKN: { value: T$('roca_talud_nor_gl') }, tKA: { value: T$('roca_talud_arm') } };
      m.userData.U = U;
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(position, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * normal);');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWP; varying vec3 vWN;
uniform sampler2D tSplat, tGD, tGN, tGA, tRD, tRN, tRA, tMD, tMN, tKD, tKN, tKA;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
vec4 aT(sampler2D t, vec2 uv, float s, float k){ vec4 a = texture2D(t, uv / s); vec4 b = texture2D(t, uv / (s * 2.31) + vec2(0.37, 0.11)); return mix(a, b, 0.25 + 0.5 * k); }
vec3 gN(vec4 t){ return t.xyz * 2.0 - 1.0; }
float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i), h31(i+vec3(1,0,0)), f.x), mix(h31(i+vec3(0,1,0)), h31(i+vec3(1,1,0)), f.x), f.y), mix(mix(h31(i+vec3(0,0,1)), h31(i+vec3(1,0,1)), f.x), mix(h31(i+vec3(0,1,1)), h31(i+vec3(1,1,1)), f.x), f.y), f.z); }
float rockCrack; float rockH(vec3 p){   // estratos horizontales + grietas (crestas de ruido) a dos escalas
  float st = vn3(vec3(p.x * 0.3 + p.z * 0.2, p.y * 2.4, p.z * 0.3 - p.x * 0.2));
  float r1 = 1.0 - abs(vn3(p * 1.15) * 2.0 - 1.0), r2 = 1.0 - abs(vn3(p * 3.3 + 11.0) * 2.0 - 1.0), r3 = vn3(p * 9.0);
  rockCrack = smoothstep(0.78, 0.97, r1) * 0.8 + smoothstep(0.82, 0.98, r2) * 0.5;
  return st * 0.45 + r1 * r1 * 0.7 + r2 * 0.22 + r3 * 0.08; }
vec3 tNd; float tRo; float tAO;`)
          .replace('#include <map_fragment>', `
vec3 N0 = normalize(vWN); vec2 xz = vWP.xz;
vec4 sp = texture2D(tSplat, (xz + 60.0) / 120.0);
float nk = vn(xz * 0.06), nk2 = vn(xz * 0.31 + 7.0);
vec4 gD = aT(tGD, xz, 1.7, nk); vec4 rD = aT(tRD, xz, 1.9, nk2); vec4 mD = aT(tMD, xz, 2.4, nk);
vec4 gA = aT(tGA, xz, 2.6, nk); vec4 rA = aT(tRA, xz, 1.9, nk2);
vec3 gNm = gN(aT(tGN, xz, 2.6, nk)); vec3 rNm = gN(aT(tRN, xz, 1.9, nk2)); vec3 mNm = gN(texture2D(tMN, xz / 2.4));
// roca triplanar real: 3 proyecciones × 2 escalas (anti-repetición), normales «whiteout» y oclusión del ARM en las grietas
vec3 bw = pow(abs(N0), vec3(7.0)); bw /= (bw.x + bw.y + bw.z);
vec2 uX = vWP.zy, uY = vWP.xz, uZ = vWP.xy;
vec4 kD = (mix(texture2D(tKD, uX * 0.4), texture2D(tKD, uX * 0.113 + 0.37), 0.4)) * bw.x + (mix(texture2D(tKD, uY * 0.4), texture2D(tKD, uY * 0.113 + 0.37), 0.4)) * bw.y + (mix(texture2D(tKD, uZ * 0.4), texture2D(tKD, uZ * 0.113 + 0.37), 0.4)) * bw.z;
vec4 kA = texture2D(tKA, uX * 0.4) * bw.x + texture2D(tKA, uY * 0.4) * bw.y + texture2D(tKA, uZ * 0.4) * bw.z;
vec3 tX = texture2D(tKN, uX * 0.4).xyz * 2.0 - 1.0, tY = texture2D(tKN, uY * 0.4).xyz * 2.0 - 1.0, tZ = texture2D(tKN, uZ * 0.4).xyz * 2.0 - 1.0;
tX = vec3(tX.xy + N0.zy, abs(tX.z) * N0.x); tY = vec3(tY.xy + N0.xz, abs(tY.z) * N0.y); tZ = vec3(tZ.xy + N0.xy, abs(tZ.z) * N0.z);
vec3 nW = normalize(tX.zyx * bw.x + tY.xzy * bw.y + tZ.xyz * bw.z);
{ float hb = rockH(vWP); vec3 sX = dFdx(vWP), sY = dFdy(vWP), R1 = cross(sY, nW), R2 = cross(nW, sX); float det = dot(sX, R1);
  vec3 gr = sign(det) * (dFdx(hb) * R1 + dFdy(hb) * R2); nW = normalize(nW - 0.14 * (1.0 - smoothstep(20.0, 70.0, length(vViewPosition))) * gr / max(abs(det), 1e-9)); }
float strata = vn(vec2(vWP.x * 0.21 + vWP.z * 0.17, vWP.y * 2.3)) * 0.6 + vn(vec2(vWP.x * 0.9 - vWP.z * 0.7, vWP.y * 6.0)) * 0.4;
float nG = vn(xz * 1.1) * 0.6 + vn(xz * 3.9 + 5.0) * 0.4;
float rh = rockH(vWP); float kL = dot(kD.rgb, vec3(0.33));
kD.rgb = mix(vec3(kL), kD.rgb, 0.1) * vec3(0.96, 0.93, 0.9) * mix(0.55, 1.45, strata) * mix(0.55, 1.0, rh) * 1.7;
kD.rgb = mix(kD.rgb, vec3(0.5, 0.45, 0.38) * kL * 2.2, 0.35 * smoothstep(0.35, 0.65, vn3(vWP * 0.18)));   // manchas de roca más clara/grisácea
kD.rgb *= 1.0 - 0.5 * min(rockCrack, 1.0);
float mossK = smoothstep(0.3, 0.72, N0.y + (nG - 0.5) * 0.3) * smoothstep(0.42, 0.72, nG) * 0.7;
kD.rgb = mix(kD.rgb, vec3(0.1, 0.14, 0.04) * (0.7 + kL * 2.0), mossK);
float lumR = dot(rD.rgb, vec3(0.33)); float lumG = dot(gD.rgb, vec3(0.33));
float wR = smoothstep(0.42, 0.62, sp.r + (lumR - 0.22) * 0.55);
float wM = smoothstep(0.35, 0.65, sp.b + (0.3 - dot(mD.rgb, vec3(0.33))) * 0.4) * (1.0 - wR);
float rk = 1.0 - smoothstep(0.55, 0.74, N0.y + (nG - 0.5) * 0.5 + (0.12 - 0.2 * sp.g));   // la hierba baja por la pendiente en lenguas (ruido) y se queda en las repisas
float wK = clamp(max(rk, smoothstep(0.55, 0.85, sp.g)), 0.0, 1.0); wR *= (1.0 - wK); wM *= (1.0 - wK);
// prado: el color sale de una paleta verde (con tinte de gran escala) y la luminancia de la textura aporta el detalle
float gl = dot(gD.rgb, vec3(0.33));
vec3 gTarget = mix(vec3(0.04, 0.1, 0.03), vec3(0.09, 0.15, 0.04), smoothstep(0.3, 0.75, vn(xz * 0.035 + 3.0)) * 0.85 + 0.15 * nk2);
gTarget = mix(gTarget, vec3(0.16, 0.14, 0.06), smoothstep(0.55, 0.8, vn(xz * 0.12 + 11.0)) * 0.55);
vec3 gCol = gTarget * pow(clamp(gl / 0.17, 0.2, 2.4), 1.5) * mix(vec3(1.0), vec3(1.15, 0.95, 0.7), clamp((gD.r - gD.g) * 3.0, 0.0, 0.6));
vec3 col = mix(gCol, mD.rgb * 1.15, wM); vec3 rC = rD.rgb * vec3(1.0, 0.97, 0.92); rC = mix(rC, vec3(dot(rC, vec3(0.33))) * vec3(1.12, 0.96, 0.8), 0.4) * 1.1; col = mix(col, rC, wR); col = mix(col, kD.rgb * vec3(1.02, 0.98, 0.93), wK);
diffuseColor.rgb *= col * mix(0.6, 1.0, sp.a) * mix(0.75, 1.0, mix(gA.r, rA.r, wR));
tRo = mix(mix(gA.g * 0.15 + 0.85, 0.95, wM), rA.g * 0.2 + 0.8, wR); tRo = mix(tRo, mix(0.95, 0.8, kA.g * 0.3), wK);
// normal: detalle UDN de cada capa proyectado en el suelo + roca triplanar
vec2 dn = mix(mix(gNm.xy, mNm.xy, wM), rNm.xy * 1.2, wR) * (1.0 - wK);
vec3 Nd = N0 + vec3(dn.x, 0.0, dn.y) * 0.8;
tNd = normalize(mix(normalize(Nd), nW, wK * 0.9));`)
          .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = tRo;')
          .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(tNd, 0.0)).xyz);');
      };
      m.customProgramCacheKey = () => 'aldea-terreno';
      return MT(m);
    }
    function buildTerrain() {
      const N = ter.SEG + 1, pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3), cell = ter.cell;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const k = (j * N + i) * 3, x = -60 + i * cell, z = -60 + j * cell, hx = (ter.height(x + 0.5, z) - ter.height(x - 0.5, z)), hz = (ter.height(x, z + 0.5) - ter.height(x, z - 0.5));
        pos[k] = x; pos[k + 1] = ter.hm[j * N + i]; pos[k + 2] = z;
        const l = Math.hypot(hx, 1, hz); nor[k] = -hx / l; nor[k + 1] = 1 / l; nor[k + 2] = -hz / l;
      }
      const idx = new Uint32Array(ter.SEG * ter.SEG * 6); let q = 0;
      for (let j = 0; j < ter.SEG; j++) for (let i = 0; i < ter.SEG; i++) { const a = j * N + i, b = a + 1, c = a + N, d = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
      const g = G(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.computeBoundingSphere(); g.computeBoundingBox();
      const mesh = new THREE.Mesh(g, terrainMaterial()); mesh.receiveShadow = true; mesh.name = 'terreno'; group.add(mesh); terrainMesh = mesh;
    }

    /* ---------- cielo (HDRI girado), entorno PMREM, sol y niebla ---------- */
    const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();
    const SUN_EL = 17 * Math.PI / 180, SUN_AZ = 245 * Math.PI / 180;   // sol de tarde bajo (17°) desde el suroeste: luz rasante y sombras largas
    const sunDir = new V3(Math.sin(SUN_AZ) * Math.cos(SUN_EL), Math.sin(SUN_EL), -Math.cos(SUN_AZ) * Math.cos(SUN_EL));   // hacia el sol: suroeste (x<0, z>0)
    const SKY4_ROT = 2.16;   // el sol de cielo_4k.webp (u = 0,586) cae en el azimut de nuestro sol (a la espalda de la cámara en C1)
    const SKY_ROT = Math.PI;   // gira el HDRI para que las nubes grandes caigan hacia la aldea (el sol queda a la espalda del jugador y no se ve)   // el sol del HDRI está en atan2(z,x)=34°; se gira para que caiga en 145° (= sunDir)
    const HOR = new V3(0.74, 0.62, 0.48);   // color del horizonte = color de la niebla (lineal)
    let sky = null, sunN = null, sunF = null, envRT = null, prevEnv = null, prevFog = null, prevBg = null;
    function skyMaterial(tex, rot, plain) {
      return MT(new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { tSky: { value: tex || skyTex }, uRot: { value: rot === undefined ? SKY_ROT : rot }, uVS: { value: plain ? 1.0 : 1.2 }, uVO: { value: plain ? 0.0 : 0.07 }, uGain: { value: 1.0 }, uHor: { value: HOR }, uSun: { value: sunDir }, uBand: { value: 1.0 }, uGlow: { value: 1.0 } },
        vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
        fragmentShader: `uniform sampler2D tSky; uniform float uRot, uGain, uBand, uGlow, uVS, uVO; uniform vec3 uHor, uSun; varying vec3 vDir;
          void main(){ vec3 d = normalize(vDir); float c = cos(uRot), s = sin(uRot); d = vec3(d.x * c + d.z * s, d.y, -d.x * s + d.z * c);
            vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, clamp(asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 * uVS + 0.5 + uVO, 0.0, 0.995));
            vec3 col = texture2D(tSky, uv).rgb * uGain;
            vec3 v = normalize(vDir); float el = max(v.y, 0.0), sd = max(dot(v, uSun), 0.0);
            // gradiente cálido hacia el horizonte (mismo color que la niebla) y resplandor del sol bajo
            float band = exp(-el * 7.0) * 0.92 + exp(-el * 2.0) * 0.07; col = mix(col, uHor * 1.05, clamp(band, 0.0, 1.0) * uBand);
            col += vec3(1.0, 0.62, 0.3) * (pow(sd, 5.0) * 0.55 + pow(sd, 48.0) * 1.6) * uGlow * (1.0 - el * 0.6);
            gl_FragColor = vec4(col, 1.0); }` }));
    }
    function buildSky() {
      const t4 = T$('cielo_4k'); if (t4) { t4.wrapS = THREE.RepeatWrapping; t4.wrapT = THREE.ClampToEdgeWrapping; t4.minFilter = THREE.LinearFilter; t4.generateMipmaps = false; t4.anisotropy = 1; }   // sin mipmaps: la costura del atan() no deja línea punteada
      sky = new THREE.Mesh(G(new THREE.SphereGeometry(420, 48, 32)), t4 ? skyMaterial(t4, SKY4_ROT, true) : skyMaterial()); sky.material.uniforms.uGain.value = t4 ? 2.3 : 1.5; sky.frustumCulled = false; sky.renderOrder = -10; sky.name = 'cielo'; group.add(sky);
      // entorno: el mismo cielo + suelo verde-tierra para el rebote (PMREM)
      const es = new THREE.Scene(), em = skyMaterial(); em.uniforms.uBand.value = 0.6; em.uniforms.uGlow.value = 0; const eg = G(new THREE.SphereGeometry(60, 32, 16));
      es.add(new THREE.Mesh(eg, em));
      const gm = MT(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.19, 0.1), side: THREE.DoubleSide })), gg = G(new THREE.CircleGeometry(55, 24));
      const gr = new THREE.Mesh(gg, gm); gr.rotation.x = -Math.PI / 2; gr.position.y = -1.5; es.add(gr);
      const pm = new THREE.PMREMGenerator(renderer); envRT = pm.fromScene(es, 0.02, 0.1, 200); pm.dispose(); own.rt.add(envRT); TX(envRT.texture);
    }
    function buildSun() {
      const col = lin(0xffc27f);
      const mk = (inten, size, extent, nb) => { const l = new THREE.DirectionalLight(col, inten); l.castShadow = true; const c = l.shadow.camera; Object.assign(c, { left: -extent, right: extent, top: extent, bottom: -extent, near: 1, far: 260 }); c.updateProjectionMatrix(); l.shadow.bias = -0.0004; l.shadow.normalBias = nb; l.shadow.mapSize.set(size, size); l.shadow.radius = 2; return l; };
      sunN = mk(S.I * 0.58, 2048, 22, 0.04); sunF = mk(S.I * 0.42, 2048, 70, 0.08); sunF.shadow.autoUpdate = false; sunF.shadow.needsUpdate = true;
      group.add(sunN, sunN.target, sunF, sunF.target);
      group.add(new THREE.HemisphereLight(0xa9c2ee, 0x7a6038, 0.36));   // relleno de cielo/suelo: las sombras quedan ligeramente azuladas
    }
    S.I = 4.4;
    const _r = new V3(), _u = new V3(), _c = new V3(), _f = new V3();
    function placeSun(l, cx, cy, cz, extent, size) {   // centra la cámara de sombra en el punto (ajustado al texel: sin parpadeo al moverse)
      _r.set(-sunDir.z, 0, sunDir.x).normalize(); _u.crossVectors(sunDir, _r).normalize();
      const tx = (extent * 2) / size; _c.set(cx, cy, cz);
      const a = _c.dot(_r), b = _c.dot(_u), a2 = Math.round(a / tx) * tx, b2 = Math.round(b / tx) * tx;
      _c.addScaledVector(_r, a2 - a).addScaledVector(_u, b2 - b);
      l.target.position.copy(_c); l.position.copy(_c).addScaledVector(sunDir, 120); l.target.updateMatrixWorld();
    }

    /* ---------- muros de piedra seca: bloques irregulares + textura, siguiendo el terreno ---------- */
    let E_ = null, BB = null, bmat = {};
    function pointAt(s, out) {   // punto del eje del camino a la distancia s (+ tangente unitaria)
      const cs = ter.cs, M = ter.M; let lo = 0, hi = M - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cs[m] <= s) lo = m; else hi = m; }
      const t = (s - cs[lo]) / Math.max(1e-6, cs[hi] - cs[lo]); out.x = lerp(ter.cx[lo], ter.cx[hi], t); out.z = lerp(ter.cz[lo], ter.cz[hi], t);
      const tx = ter.cx[hi] - ter.cx[lo], tz = ter.cz[hi] - ter.cz[lo], l = Math.hypot(tx, tz) || 1; out.tx = tx / l; out.tz = tz / l; return out;
    }
    const PA = { x: 0, z: 0, tx: 0, tz: 0 };
    function addBlock(D, cx, cy, cz, yaw, len, h, th, ins, base, moss) {
      const c = Math.cos(yaw), s = Math.sin(yaw), J = () => (rng() - 0.5);
      const hx = len / 2, hz = th / 2, ix = hx * (1 - ins), iz = hz * (1 - ins * 1.1);
      // 8 esquinas con ruido (bloque irregular, no una caja)
      const P = [];
      for (let k = 0; k < 8; k++) {
        const top = k >= 4, sx = (k & 1) ? 1 : -1, sz = (k & 2) ? 1 : -1, ax = top ? ix : hx, az = top ? iz : hz;
        const lx = sx * ax + J() * len * 0.07, lz = sz * az + J() * th * 0.07, ly = top ? h + J() * h * 0.1 : 0 + J() * h * 0.05;
        P.push([cx + lx * c + lz * s, cy + ly, cz - lx * s + lz * c]);
      }
      const uo = rng(), vo = rng(), T = 2.1;
      const face = (a, b, c2, d, nuv) => {   // a,b,c2,d en sentido antihorario visto desde fuera
        const A = P[a], B = P[b], C = P[c2], Dv = P[d];
        const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = Dv[0] - A[0], vy = Dv[1] - A[1], vz = Dv[2] - A[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        const uL = Math.hypot(ux, uy, uz), vL = Math.hypot(vx, vy, vz);
        const uvs = [[0, 0], [uL, 0], [uL, vL], [0, vL]], vs = [A, B, C, Dv];
        for (const t of [0, 1, 2, 0, 2, 3]) {
          const p = vs[t]; D.pos.push(p[0], p[1], p[2]); D.nor.push(nx, ny, nz); D.uv.push(uvs[t][0] / T + uo + (nuv ? 0.5 : 0), uvs[t][1] / T + vo);
          const hh = Math.max(0, p[1] - base);   // suciedad en la base (≥ 20 cm) + musgo en coronación y cara norte
          let k = 0.6 + 0.4 * sstep(0, 0.5, hh), r = 1.7 * k, g = 1.7 * k, bl = 1.68 * k;
          const mo = Math.max(ny > 0.6 ? 0.75 : 0, nz < -0.35 ? 0.45 : 0) * moss * (0.6 + 0.4 * rng());
          if (mo > 0) { r = lerp(r, 0.95, mo); g = lerp(g, 1.7, mo); bl = lerp(bl, 0.6, mo); }
          D.col.push(r, g, bl);
        }
      };
      // caras: 0..3 abajo, 4..7 arriba; índices bit0 = +x, bit1 = +z
      face(0, 2, 6, 4); face(1, 5, 7, 3); face(0, 4, 5, 1); face(2, 3, 7, 6); face(4, 6, 7, 5);
    }
    function buildWalls() {
      const D = BB.d.piedra || (BB.d.piedra = { pos: [], nor: [], uv: [], col: [] });
      let nblk = 0;
      for (const side of [-1, 1]) {
        const sStart = 5, sEnd = ter.L - 9;
        const covAt = (s) => ter.fbm2(s * 0.085 + side * 11, 2.7, ter.seed + 3, 3);
        let s = sStart;
        // pasadas de la fila: cada tramo con altura propia; los huecos y tramos caídos salen del ruido
        const runs = []; let cur = null;
        for (let t = sStart; t < sEnd; t += 0.5) {
          const cv = covAt(t), on = cv > 0.4;
          if (on) { const hf = clamp((cv - 0.4) * 5, 0.25, 1); if (!cur) { cur = { a: t, b: t, hf: [] }; runs.push(cur); } cur.b = t + 0.5; cur.hf.push(hf); } else cur = null;
        }
        for (const run of runs) {
          if (run.b - run.a < 1.4) continue; (S.runs || (S.runs = [])).push({ a: run.a, b: run.b, side });
          const offAt = (ss) => side * (ter.halfW(ss) + 1.6 + 0.25);
          const H0 = lerp(0.95, 1.2, rng());
          const hAtS = (ss) => { const i = clamp(Math.floor((ss - run.a) / 0.5), 0, run.hf.length - 1); return H0 * (0.3 + 0.7 * run.hf[i]); };
          const chk = 0.29, nc = 5;
          for (let c = 0; c < nc; c++) {
            let ss = run.a + (c % 2 ? 0.0 : 0.3 + rng() * 0.3);
            while (ss < run.b - 0.2) {
              const len = lerp(0.42, 0.95, rng()), s1 = Math.min(run.b, ss + len), sm = (ss + s1) / 2, Ht = hAtS(sm);
              if (c * chk >= Ht - 0.12 || s1 - ss < 0.2) { ss = s1; continue; }
              const top = (c + 1) * chk >= Ht - 0.03, hh = Math.max(0.15, Math.min(chk, Ht - c * chk));
              pointAt(sm, PA); const off = offAt(sm), nx = -PA.tz, nz = PA.tx;
              const x = PA.x + nx * off, z = PA.z + nz * off, yaw = Math.atan2(PA.tx, PA.tz) - Math.PI / 2 + (rng() - 0.5) * 0.08;
              const hb = Math.min(ter.hAt(x, z), ter.hAt(x + PA.tx * len * 0.5, z + PA.tz * len * 0.5), ter.hAt(x - PA.tx * len * 0.5, z - PA.tz * len * 0.5)) - 0.1;
              const th = lerp(0.46, 0.56, rng()), h = hh * lerp(1.1, 1.2, rng()) + 0.03 + (c === 0 ? 0.3 : 0);
              addBlock(D, x + (rng() - 0.5) * 0.03, hb + c * chk - (c === 0 ? 0.3 : 0), z, yaw, len * 1.02, h, top ? th * 1.02 : th, top ? 0.12 : 0.07, hb, top ? 1 : 0.7);
              nblk++; ss = s1;
            }
          }
          // colisión (cápsulas cada ~2 m) y marcas de contacto en el suelo
          for (let t = run.a; t < run.b - 0.3; t += 1.5) {
            const t2 = Math.min(run.b, t + 1.5), i = clamp(Math.floor((t - run.a) / 0.5), 0, run.hf.length - 1);
            pointAt(t, PA); const o1 = offAt(t), x1 = PA.x - PA.tz * o1, z1 = PA.z + PA.tx * o1; pointAt(t2, PA); const o2 = offAt(t2), x2 = PA.x - PA.tz * o2, z2 = PA.z + PA.tx * o2;
            if (run.hf[i] > 0.5) ctx.addSeg(x1, z1, x2, z2, 0.34);
            stamp((x1 + x2) / 2, (z1 + z2) / 2, 0.95, 0.5, 0.45);
            for (let u = 0; u <= 1; u += 0.25) { const wx = lerp(x1, x2, u), wz = lerp(z1, z2, u), i0 = Math.floor((wx + 60) * 2), j0 = Math.floor((wz + 60) * 2); for (let a = 0; a <= 0; a++) for (let b = 0; b <= 0; b++) { const ii = i0 + a, jj = j0 + b; if (ii >= 0 && jj >= 0 && ii < 240 && jj < 240) wallGrid[jj * 240 + ii] = 1; } }
          }
        }
      }
      S.blocks = nblk;
    }

    /* ---------- edificios, puerta y vallado ---------- */
    const chimneys = [];
    function placeBuilding(kind, x, z, yaw, o) {
      o.col = []; o.chim = [];
      const hs = [ter.hAt(x, z), ter.hAt(x + 3, z + 3), ter.hAt(x - 3, z + 3), ter.hAt(x + 3, z - 3), ter.hAt(x - 3, z - 3)], y = Math.max(...hs) + 0.15;
      const m = E_.xf(x, y, z, (rng() - 0.5) * 0.008, yaw, (rng() - 0.5) * 0.008);
      BB.push(m); E_[kind](BB, o); BB.pop();
      const c = Math.cos(yaw), s = Math.sin(yaw);
      for (const f of o.col) {
        const wx = x + f.x * c + f.z * s, wz = z - f.x * s + f.z * c;
        if (f.circle) { ctx.addSeg(wx, wz, wx, wz, f.r); foot.push({ x: wx, z: wz, r: f.r, yaw: 0 }); stamp(wx, wz, f.r + 1.6, 0.6, 0.5); continue; }
        foot.push({ x: wx, z: wz, w: f.w, d: f.d, yaw });
        const hw = f.w / 2, hd = f.d / 2, cn = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([a, b]) => [wx + a * c + b * s, wz - a * s + b * c]);
        for (let i = 0; i < 4; i++) { const a = cn[i], b = cn[(i + 1) % 4]; ctx.addSeg(a[0], a[1], b[0], b[1], 0.3); }
        stamp(wx, wz, Math.max(hw, hd) + 1.4, 0.55, 0.55);
      }
      for (const ch of o.chim) { const v = new V3(ch[0], ch[1], ch[2]).applyMatrix4(m); chimneys.push(v); }
      return y;
    }
    function buildAldea() {
      E_ = EDI.crear(THREE, rng); BB = new E_.Builder();
      const C = E_.COL;
      // aldea sobre la meseta (z < -46); calle central que termina en la plaza
      placeBuilding('casaEntramado', -11.5, -52, 0.22, { w: 6.2, d: 4.8, pisos: 2, ang: 52, revoco: C.revoco[0], madera: C.madera[0], teja: [1.0, 0.94, 0.88], lucerna: false });
      placeBuilding('casaEntramado', 11.5, -53, -0.3, { w: 5.0, d: 4.4, pisos: 1, ang: 48, revoco: C.revoco[1], madera: C.madera[2], teja: [1.0, 0.93, 0.86], lucerna: true });
      placeBuilding('casaPiedra', -0.5, -58.2, 0.02, { w: 7.4, d: 5.2, teja: [1.0, 0.94, 0.88] });
      placeBuilding('almacen', 21, -56, -0.12, { w: 8.0, d: 5.0, teja: [0.95, 0.92, 0.86], revoco: C.revoco[2] });
      placeBuilding('torre', -23, -57, 0, {});
      // puerta de la aldea: dos pilares de piedra, dintel y tejadillo
      const gy = Math.max(ter.hAt(-2.9, -45.5), ter.hAt(2.9, -45.5)) + 0.1;
      for (const sx of [-1, 1]) {
        BB.add('piedra', E_.boxM(0.95, 3.4 + 1.2, 0.95, 2.1), E_.xf(sx * 2.95, gy - 1.2 + 2.3, -45.5), { color: [1.35, 1.3, 1.2], grime: 1.6, y0: gy - 1.2, jit: 0.1, uvo: [rng(), rng()] });
        for (let i = 0; i < 8; i++) BB.add('piedra', E_.boxM(i % 2 ? 1.18 : 1.05, 0.3, i % 2 ? 1.05 : 1.18, 2.1), E_.xf(sx * 2.95 + (rng() - 0.5) * 0.04, gy + 0.2 + i * 0.4, -45.5 + (rng() - 0.5) * 0.04, 0, (rng() - 0.5) * 0.1), { color: [1.4, 1.35, 1.25], uvo: [rng(), rng()], jit: 0.12 });
        BB.add('piedra', E_.boxM(1.3, 0.22, 1.3, 2.1), E_.xf(sx * 2.95, gy + 3.6, -45.5), { color: [1.4, 1.35, 1.25] });
        ctx.addSeg(sx * 2.95, -45.5, sx * 2.95, -45.5, 0.62); foot.push({ x: sx * 2.95, z: -45.5, r: 0.8 }); stamp(sx * 2.95, -45.5, 2.0, 0.5, 0.5);
      }
      BB.add('madera', E_.bar(6.6, 0.26, 0.3, 0.02), E_.xf(0, gy + 3.55, -45.5, 0, Math.PI / 2, 0), { color: [0.5, 0.38, 0.28], uvo: [rng(), rng()] });
      // vallado de madera con cuerda en dos tramos (junto al camino, donde el muro se abre)
      const fence = (pts) => {
        const post = [];
        for (const [x, z] of pts) { const h = ter.hAt(x, z); post.push([x, h, z, 1.15 + rng() * 0.2]); BB.add('madera', E_.bar(1.5, 0.13, 0.14, 0.014), E_.xf(x, h + 0.55, z, Math.PI / 2, rng() * 3, (rng() - 0.5) * 0.05), { color: [0.55, 0.42, 0.32], jit: 0.25, uvo: [rng(), rng()] }); ctx.addSeg(x, z, x, z, 0.13); stamp(x, z, 0.7, 0.35, 0.3); }
        for (let i = 0; i < post.length - 1; i++) {
          const a = post[i], b = post[i + 1]; for (const hh of [0.95, 0.55]) {   // cuerda con catenaria sencilla
            const n = 8; let px = a[0], py = a[1] + hh, pz = a[2];
            for (let k = 1; k <= n; k++) {
              const t = k / n, x = lerp(a[0], b[0], t), z = lerp(a[2], b[2], t), y = lerp(a[1], b[1], t) + hh - Math.sin(Math.PI * t) * 0.11;
              const L = Math.hypot(x - px, y - py, z - pz), mid = new V3((x + px) / 2, (y + py) / 2, (z + pz) / 2), cg = new THREE.CylinderGeometry(0.018, 0.018, L, 5, 1);
              const q = new Q4().setFromUnitVectors(new V3(0, 1, 0), new V3(x - px, y - py, z - pz).normalize());
              BB.add('madera', cg, new M4().compose(mid, q, new V3(1, 1, 1)), { color: [1.1, 0.95, 0.7] }); cg.dispose(); px = x; py = y; pz = z;
            }
          }
        }
      };
      pointAt(34, PA); fence([[PA.x - 5.2 + 0, PA.z], [PA.x - 5.3, PA.z - 2.4], [PA.x - 5.4, PA.z - 4.8], [PA.x - 5.2, PA.z - 7.2], [PA.x - 5.0, PA.z - 9.6]]);
      pointAt(70, PA); fence([[PA.x + 5.0, PA.z + 4], [PA.x + 5.2, PA.z + 1.6], [PA.x + 5.3, PA.z - 0.8], [PA.x + 5.0, PA.z - 3.2]]);
    }
    function buildingMeshes() {
      const tw = (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
      const pbr = (n, o) => MT(new THREE.MeshStandardMaterial(Object.assign({ map: T$(n + '_Diffuse'), normalMap: T$(n + '_nor_gl'), roughnessMap: T$(n + '_arm'), vertexColors: true, roughness: 1, metalness: 0, envMapIntensity: 0.6 }, o)));
      bmat.madera = pbr('madera', { normalScale: new THREE.Vector2(1.4, 1.4) });
      bmat.revoco = pbr('revoco', { normalScale: new THREE.Vector2(1.6, 1.6) });
      bmat.teja = pbr('teja', { normalScale: new THREE.Vector2(1.5, 1.5), side: THREE.DoubleSide });
      bmat.piedra = pbr('muro_piedra', { normalScale: new THREE.Vector2(1.8, 1.8) });
      bmat.hierro = MT(new THREE.MeshStandardMaterial({ color: 0x2a2b2e, metalness: 0.75, roughness: 0.5, envMapIntensity: 0.8 }));
      bmat.cristal = MT(new THREE.MeshStandardMaterial({ color: 0x05090e, metalness: 0.1, roughness: 0.1, envMapIntensity: 0.8 }));
      bmat.flora = MT(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.5 }));
      for (const k of ['madera', 'revoco', 'teja', 'piedra', 'hierro', 'cristal', 'flora']) {
        const g = BB.geometry(k); if (!g) continue; G(g);
        const m = new THREE.Mesh(g, bmat[k]); m.castShadow = k !== 'cristal'; m.receiveShadow = true; m.name = 'aldea_' + k; group.add(m);
      }
      S.trisAldea = BB.tris();
    }

    /* ---------- fusión estática de props / rocas / arbustos por material y banda de 40 m (frustum culling grueso) ---------- */
    const statics = new Map();
    const canonMat = {};
    function sAdd(geo, mat, m, bandZ, nocast) {
      if (mat.name) mat = canonMat[mat.name] || (canonMat[mat.name] = mat);   // mismo nombre = mismo material (menos llamadas de dibujo)
      const g = geo.clone(); g.applyMatrix4(m);
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      const ng = g.index ? g.toNonIndexed() : g; if (ng !== g) g.dispose();
      const key = mat.uuid + '|' + Math.floor((m.elements[12] + 60) / 60) + ',' + Math.floor((m.elements[14] + 60) / 60) + (nocast ? 'n' : '');
      /* celdas de 60 m (4): el frustum culling descarta lo que no se ve */ let e = statics.get(key); if (!e) { e = { mat, list: [], nocast: !!nocast }; statics.set(key, e); } e.list.push(ng);
    }
    function sFlush() {
      for (const e of statics.values()) {
        let n = 0; for (const g of e.list) n += g.attributes.position.count;
        const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
        for (const g of e.list) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
        const mg = G(new THREE.BufferGeometry()); mg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); mg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); mg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); mg.computeBoundingSphere();
        const m = new THREE.Mesh(mg, e.mat); if (e.nocast) m.userData.veg = true; m.castShadow = !e.nocast && !/crate|bucket|stump|trunk|lantern/.test(e.mat.name); /* los props pequeños no proyectan sombra (ahorra llamadas en las pasadas de sombra) */ m.receiveShadow = true; group.add(m); S.trisStatic = (S.trisStatic || 0) + n / 3;
      }
      statics.clear();
    }

    /* ---------- vegetación, rocas y props ---------- */
    function mergeGeos(list) {
      let n = 0; for (const g of list) n += (g.index ? g.toNonIndexed() : g).attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
      for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
      const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return out;
    }
    function scatter(n, accept, tries) {
      const out = []; tries = tries || 20000;
      for (let t = 0; t < tries && out.length < n; t++) { const x = (rng() * 2 - 1) * 57, z = (rng() * 2 - 1) * 57; if (accept(x, z)) out.push([x, z]); }
      return out;
    }
    const roadOK = (x, z, off) => ter.roadDist(x, z) > ter.halfW(ter.roadS(x, z)) + off;
    const free = (x, z, m) => !inFoot(x, z, m) && !wg(x, z);
    const Mt = new M4(), Qt = new Q4(), Vt = new V3(), St = new V3(), Yv = new V3(0, 1, 0);
    function compose(x, y, z, yaw, sx, sy, sz, tiltX, tiltZ) {
      Qt.setFromEuler(new THREE.Euler(tiltX || 0, yaw, tiltZ || 0, 'YXZ')); return Mt.compose(Vt.set(x, y, z), Qt, St.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz));
    }
    function windify(mat, amp, heightRef, noInstance) {   // viento en el vertex shader sobre el MeshStandardMaterial (se conserva el PBR)
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = S.time; sh.uniforms.uWind = S.wind; sh.uniforms.uAmp = { value: amp }; sh.uniforms.uH = { value: heightRef };
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime, uWind, uAmp, uH;').replace('#include <begin_vertex>', `#include <begin_vertex>
        { float hh = clamp(position.y / uH, 0.0, 1.0); hh *= hh; vec2 ip = instanceMatrix[3].xz; float ph = dot(ip, vec2(0.13, 0.07)) * 1.4;
          transformed.x += uAmp * uWind * hh * (sin(uTime * 1.3 + ph + position.y * 0.3) + 0.3 * sin(uTime * 3.1 + ip.x * 1.7 + position.x));
          transformed.z += uAmp * uWind * hh * 0.7 * cos(uTime * 1.1 + ph * 1.3 + position.z * 0.4); }`);
      };
      mat.customProgramCacheKey = () => 'viento-arbol-' + amp;
    }
    // ----- árboles: 3 especies × LOD0/LOD1, instanciados; el LOD se reasigna cuando la cámara se mueve -----
    const SPECIES = [['arbol_isla1', 8.5], ['arbol_isla2', 7], ['arbol_jacaranda', 13]];
    const trees = [], treeMeshes = [];
    let lodCamX = 1e9, lodCamZ = 1e9, lodDist = 25, lodForce = true;
    function buildTrees() {
      // posiciones en 3 anillos: cercanos al camino, medios y de fondo; sin pisar camino, muros ni edificios
      const sp = (p) => ter.roadS(p[0], p[1]), taken = [];
      const ok = (x, z, minD) => { for (const t of taken) if (Math.hypot(t[0] - x, t[1] - z) < minD) return false; return free(x, z, 5) && ter.slopeAt(x, z) < 0.55; };
      const ring = (n, dmin, dmax, zmin, zmax, spc, pick) => {
        for (const p of scatter(n * 40, (x, z) => { const d = ter.roadDist(x, z); return d > dmin && d < dmax && z > zmin && z < zmax && ok(x, z, spc); }, 30000)) { if (taken.length >= ring.cap) break; if (ring.n >= n) break; if (!ok(p[0], p[1], spc)) continue; taken.push(p); ring.n++; trees.push({ x: p[0], z: p[1], sp: pick(), yaw: rng() * 6.28, sc: lerp(0.85, 1.2, rng()) }); }
        ring.n = 0;
      };
      ring.n = 0; ring.cap = 99;
      ring(4, 6.5, 10.5, -30, 52, 9, () => (rng() < 0.5 ? 0 : 1));
      ring(11, 11, 34, -42, 56, 8, () => { const r = rng(); return r < 0.4 ? 0 : r < 0.75 ? 1 : 2; });
      ring(7, 30, 70, -57, 57, 8, () => (rng() < 0.45 ? 2 : rng() < 0.5 ? 0 : 1));
      for (const p of scatter(60, (x, z) => z < -46 && Math.abs(x) > 27 && ok(x, z, 8))) { if (trees.filter((t) => t.z < -46).length >= 3) break; taken.push(p); trees.push({ x: p[0], z: p[1], sp: 1, yaw: rng() * 6.28, sc: lerp(0.9, 1.1, rng()) }); }
      for (const t of trees) { t.y = ter.hAt(t.x, t.z) - 0.12; stamp(t.x, t.z, 2.2, 0.35, 0.2); if (t.sp !== 2) ctx.addSeg(t.x, t.z, t.x, t.z, 0.4); else ctx.addSeg(t.x, t.z, t.x, t.z, 0.55); }
      // mallas instanciadas
      SPECIES.forEach(([name, H], si) => {
        const count = trees.filter((t) => t.sp === si).length; treeMeshes[si] = [[], []];
        for (const lod of [0, 1]) {
          const ps = parts(GLB[name + '_lod' + lod]), ti = Math.max(0, ps.findIndex((p) => !/leaves|branches/.test(p.mat.name)));
          grounded(ps.map((p) => p.geo), ti);
          for (const p of ps) {
            const kind = /leaves/.test(p.mat.name) ? 'l' : /branches/.test(p.mat.name) ? 'b' : 't';
            if (kind === 'l') bakeNormalsRadial(p.geo, 0.7);
            const mt = p.mat.clone(); MT(mt); mt.envMapIntensity = 0.55; if (kind === 'l') { mt.side = THREE.DoubleSide; mt.alphaTest = 0.5; mt.color.setRGB(1.0, 1.04, 0.92); mt.roughness = 0.85; mt.metalness = 0; }
            if (kind !== 't') windify(mt, kind === 'l' ? 0.1 : 0.035, H * 0.9);
            const im = new THREE.InstancedMesh(G(p.geo), mt, Math.max(1, count)); im.frustumCulled = false; im.castShadow = kind !== 'b'; im.receiveShadow = true; im.count = 0; im.name = name + '_' + lod + kind; if (kind !== 't') im.userData.veg = true; group.add(im); treeMeshes[si][lod].push(im);
          }
        }
      });
    }
    function updateTrees(force) {
      const cx = camera.position.x, cz = camera.position.z;
      if (!force && !lodForce && Math.abs(cx - lodCamX) + Math.abs(cz - lodCamZ) < 1.2) return;
      lodCamX = cx; lodCamZ = cz; lodForce = false;
      const n = [[0, 0], [0, 0], [0, 0]];
      for (const t of trees) {
        const lod = Math.hypot(t.x - cx, t.z - cz) < lodDist ? 0 : 1, i = n[t.sp][lod]++;
        compose(t.x, t.y, t.z, t.yaw, t.sc);
        for (const im of treeMeshes[t.sp][lod]) im.setMatrixAt(i, Mt);
      }
      for (let s = 0; s < 3; s++) for (let l = 0; l < 2; l++) for (const im of treeMeshes[s][l]) { im.count = n[s][l]; im.instanceMatrix.needsUpdate = true; }
    }
    // ----- rocas, arbustos, helechos y piedras: se fusionan por material (props estáticos) -----
    const Q_ = { dens: 12, big: 80, ledge: 14, mid: 60, scree: 100, fern: 12, shrub: 5 };
    function buildClutter() {
      const rocks = parts(GLB.roca_musgo_set).map((p) => ({ geo: centered(simplify(p.geo, 17)), mat: p.mat }));
      const r9 = parts(GLB.roca_09)[0]; r9.geo = centered(simplify(r9.geo, 18)); const peb = parts(GLB.piedra_01)[0]; centered(peb.geo);
      const widthOf = (g) => { g.computeBoundingBox(); return Math.max(g.boundingBox.max.x - g.boundingBox.min.x, g.boundingBox.max.z - g.boundingBox.min.z); };
      for (const p of rocks) { p.mat.roughness = 0.95; p.mat.metalness = 0; p.mat.envMapIntensity = 0.45; }
      const w9 = widthOf(r9.geo), wp = widthOf(peb.geo); r9.mat.roughness = 0.95; r9.mat.metalness = 0; r9.mat.envMapIntensity = 0.45; peb.mat.roughness = 0.95; peb.mat.metalness = 0; peb.mat.envMapIntensity = 0.45;
      const putRock = (x, z, w, big) => {
        const k = rng(), y = ter.hAt(x, z);
        if (k < 0.18 && !big) { const sc = w / w9; sAdd(r9.geo, r9.mat, compose(x, y - 0.04 * w, z, rng() * 6.28, sc, sc * lerp(0.7, 1, rng()), sc), z); }
        else { const r = rocks[Math.floor(rng() * rocks.length)], sc = w / widthOf(r.geo); sAdd(r.geo, r.mat, compose(x, y - 0.18 * w, z, rng() * 6.28, sc, sc * lerp(0.7, 1.0, rng()), sc, (rng() - 0.5) * 0.15, (rng() - 0.5) * 0.15), z); }
        stamp(x, z, w * 0.85, 0.5, 0.3); if (w > 0.9) ctx.addSeg(x, z, x, z, w * 0.33);
      };
      const sd = (x, z) => ter.halfW(ter.roadS(x, z));
      for (const p of scatter(16, (x, z) => { const d = ter.roadDist(x, z) - sd(x, z); return d > 0.4 && d < 1.0 && free(x, z, 1) && z > -44 && z < 56; })) putRock(p[0], p[1], lerp(0.35, 0.75, rng()));
      for (const p of scatter(12, (x, z) => { const d = ter.roadDist(x, z) - sd(x, z); return d > 2.3 && d < 4 && free(x, z, 1) && z > -44; })) putRock(p[0], p[1], lerp(0.6, 1.4, rng()));
      for (const p of scatter(10, (x, z) => ter.slopeAt(x, z) > 0.7 && ter.hAt(x, z) > 2 && roadOK(x, z, 2.5) && free(x, z, 3))) putRock(p[0], p[1], lerp(1.4, 2.6, rng()), true);
      for (const p of scatter(14, (x, z) => ter.slopeAt(x, z) < 0.5 && roadOK(x, z, 5) && free(x, z, 3))) putRock(p[0], p[1], lerp(0.5, 1.2, rng()));
      for (const p of scatter(36, (x, z) => { const d = ter.roadDist(x, z) - sd(x, z); return d > 0.0 && d < 2.6 && free(x, z, 0.6) && z > -47; })) { const w = lerp(0.1, 0.32, rng()), sc = w / wp, y = ter.hAt(p[0], p[1]); sAdd(peb.geo, peb.mat, compose(p[0], y - 0.02, p[1], rng() * 6.28, sc, sc * 0.8, sc), p[1], true); }
      // arbustos (arbusto_02) y helechos (helecho_02): 4 variantes; la normal del follaje se redondea
      const veg = (name, n, accept, w0, w1, bury) => {
        const ps = parts(GLB[name]).map((p) => ({ geo: centered(p.geo), mat: p.mat })); for (const p of ps) { bakeNormalsRadial(p.geo, 0.55); p.mat.envMapIntensity = 0.5; p.mat.metalness = 0; p.mat.roughness = 0.85; p.mat.side = THREE.DoubleSide; }
        for (const p of scatter(n, accept)) { const v = ps[Math.floor(rng() * ps.length)], sc = lerp(w0, w1, rng()), y = ter.hAt(p[0], p[1]); sAdd(v.geo, v.mat, compose(p[0], y - bury * sc, p[1], rng() * 6.28, sc, sc * lerp(0.85, 1.2, rng()), sc), p[1], true); stamp(p[0], p[1], 0.9 * sc + 0.3, 0.4, 0.1); }
      };
      veg('arbusto_02', 18, (x, z) => { const d = ter.roadDist(x, z) - sd(x, z); return ((d > 2.6 && d < 14) || (z < -44 && d > 6)) && free(x, z, 1.2) && ter.slopeAt(x, z) < 0.6; }, 0.8, 1.35, 0.03);
      veg('helecho_02', 16, (x, z) => { const d = ter.roadDist(x, z) - sd(x, z); return d > 1.9 && free(x, z, 0.8) && ter.slopeAt(x, z) < 0.7 && (d < 12 || ter.fbm2(x * 0.1, z * 0.1, 8, 3) > 0.55); }, 0.9, 1.7, 0.02);
      veg('arbusto_02', 8, (x, z) => inFoot(x, z, 2.4) && !inFoot(x, z, 1.0) && z < -44 && free(x, z, 0), 0.5, 0.9, 0.03);
      veg('helecho_02', 10, (x, z) => inFoot(x, z, 2.0) && !inFoot(x, z, 0.8) && z < -44, 0.7, 1.2, 0.02);
      // ----- talud de la loma: rocas grandes encastradas (medio enterradas, ejes alineados con la pendiente, escala no uniforme), repisas, detritos al pie y vegetación en grietas -----
      const slopeRocks = [];   // variantes: {geo, mat, w, h}
      const addVar = (geo, mat, nm) => { geo.computeBoundingBox(); const b = geo.boundingBox; slopeRocks.push({ geo, mat, w: Math.max(b.max.x - b.min.x, b.max.z - b.min.z), h: b.max.y - b.min.y, nm }); mat.roughness = 0.95; mat.metalness = 0; mat.envMapIntensity = 0.45; mat.color.setRGB(0.62, 0.62, 0.7); };
      for (const p of rocks) addVar(p.geo, p.mat, 'musgo');   
      for (const nm of ['acantilado_01', 'acantilado_02']) if (GLB[nm]) for (const p of parts(GLB[nm])) { addVar(centered(simplify(p.geo, 24)), p.mat, nm); }
      const tn = (x, z, out) => out.set(-(ter.hAt(x + 1, z) - ter.hAt(x - 1, z)) / 2, 1, -(ter.hAt(x, z + 1) - ter.hAt(x, z - 1)) / 2).normalize();
      const nT = new V3(), uA = new V3(), q1 = new Q4(), q2 = new Q4(), ss = new V3(), eu = new THREE.Euler(), cT = new THREE.Color();
      let nt = 0;
      const slopeRock = (x, z, w, flat, bury) => {
        const pool = flat && slopeRocks.some((q) => /acantilado/.test(q.nm)) ? slopeRocks.filter((q) => /acantilado/.test(q.nm)) : slopeRocks.filter((q) => !/acantilado/.test(q.nm)), v = pool[Math.floor(rng() * pool.length)], y = ter.hAt(x, z); tn(x, z, nT);
        uA.copy(Yv).lerp(nT, 0.72).normalize();                                   // el «arriba» de la roca es una mezcla vertical/normal de la pendiente
        q1.setFromUnitVectors(Yv, uA); q2.setFromAxisAngle(Yv, rng() * 6.28); q1.multiply(q2);
        const sx = w / v.w * (flat ? lerp(1.5, 2.2, rng()) : lerp(0.8, 1.2, rng())), sy = w / v.w * lerp(0.6, 1.15, rng()) * (flat ? 0.7 : 1), sz = w / v.w * lerp(0.7, 1.25, rng());
        ss.set(sx, sy, sz); const hW = v.h * sy;
        Vt.set(x, y, z).addScaledVector(nT, -bury * hW + 0.05);                      // medio enterrada a lo largo de la normal
        Mt.compose(Vt, q1, ss); sAdd(v.geo, v.mat, Mt, z); nt++;
        stamp(x, z, w * 0.9, 0.55, 0.15); if (w > 1.2) ctx.addSeg(x, z, x, z, w * 0.3);
      };
      const steep = (x, z) => ter.slopeAt(x, z) > 0.62 && ter.hAt(x, z) > 2.5 && roadOK(x, z, 4) && free(x, z, 2.5) && z > -50;
      for (const p of scatter(Q_.big, steep, 120000)) slopeRock(p[0], p[1], lerp(1.8, 4.6, rng() * rng() * 1.5), false, lerp(0.3, 0.5, rng()));
      for (const p of scatter(Q_.ledge, (x, z) => steep(x, z) && ter.slopeAt(x, z) < 1.1, 120000)) slopeRock(p[0], p[1], lerp(3.0, 5.6, rng()), true, lerp(0.35, 0.55, rng()));
      for (const p of scatter(Q_.mid, steep, 120000)) slopeRock(p[0], p[1], lerp(0.45, 1.1, rng()), false, lerp(0.2, 0.45, rng()));
      // detritos: piedras sueltas y gravas al pie del talud (donde la pendiente se suaviza bajo una ladera fuerte)
      const atFoot = (x, z) => { if (ter.slopeAt(x, z) > 0.5 || ter.hAt(x, z) < 1.5) return false; for (let a = 0; a < 8; a++) { const an = a * 0.785, ux = x + Math.cos(an) * 4.5, uz = z + Math.sin(an) * 4.5; if (ter.slopeAt(ux, uz) > 0.85 && ter.hAt(ux, uz) > ter.hAt(x, z) + 1.2) return true; } return false; };
      let scree = 0;
      for (const p of scatter(Q_.scree, (x, z) => atFoot(x, z) && roadOK(x, z, 2.5) && free(x, z, 1.5), 150000)) {
        const small = rng() < 0.7, w = small ? lerp(0.12, 0.42, rng()) : lerp(0.5, 1.1, rng()), y = ter.hAt(p[0], p[1]);
        if (small) { const sc = w / wp; sAdd(peb.geo, peb.mat, compose(p[0], y - 0.03 * w, p[1], rng() * 6.28, sc, sc * lerp(0.5, 0.9, rng()), sc * lerp(0.7, 1.3, rng()), (rng() - 0.5) * 0.5, (rng() - 0.5) * 0.5), p[1], true); }
        else slopeRock(p[0], p[1], w, false, 0.3);
        scree++;
      }
      // vegetación en las grietas: helechos y arbustillos en las repisas, entre las rocas
      const crack = (x, z) => ter.slopeAt(x, z) > 0.4 && ter.slopeAt(x, z) < 1.0 && ter.hAt(x, z) > 2 && roadOK(x, z, 3) && free(x, z, 1.5) && z > -50;
      veg('helecho_02', Q_.fern, crack, 0.5, 1.0, 0.02); veg('arbusto_02', Q_.shrub, crack, 0.35, 0.7, 0.04);
      S.talud = nt; S.scree = scree;
    }
    function buildProps() {   // modelos pequeños (barriles, cajón, cubo, farol, tronco, tocón) fusionados por material
      const place = (name, filter, x, z, yaw, sc, yOff) => {
        const ps = parts(GLB[name]).filter((p) => !filter || filter.test(p.name)); const all = ps.map((p) => p.geo);
        const b = boxOf(all), cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, y = ter.hAt(x, z) + (yOff || 0);
        for (const p of ps) { const g = p.geo.clone(); g.translate(-cx, -b.min.y, -cz); p.mat.roughness = Math.max(p.mat.roughness, 0.7); p.mat.metalness = 0; p.mat.envMapIntensity = 0.45; sAdd(g, p.mat, compose(x, y, z, yaw, sc), z); g.dispose(); }
        return b;
      };
      const bar = place('barriles', /barrel0[12]$/, -4.6, -44.2, 0.4, 1, -0.02); ctx.addSeg(-4.6, -44.2, -4.6, -44.2, 0.5); stamp(-4.6, -44.2, 1.4, 0.5, 0.4);
      place('barriles', /barrel01$/, -6.6, -49.6, 1.0, 1, 0); ctx.addSeg(-6.6, -49.6, -6.6, -49.6, 0.4);
      place('cajon', null, 7.4, -49.2, 0.3, 1.2, 0); ctx.addSeg(7.4, -49.2, 7.4, -49.2, 0.6); stamp(7.4, -49.2, 1.2, 0.5, 0.3);
      place('cubo', null, 8.2, -48.6, 0.8, 1.2, 0.0);
      pointAt(30, PA); const lx = PA.x + 6.6, lz = PA.z; place('tronco_caido', null, lx, lz, 0.5, 1, 0.0); ctx.addSeg(lx - 0.9, lz - 0.4, lx + 0.9, lz + 0.4, 0.45); stamp(lx, lz, 2, 0.5, 0.3);
      pointAt(62, PA); place('tocon', null, PA.x - 6.8, PA.z, 0.2, 1, 0.0); ctx.addSeg(PA.x - 6.8, PA.z, PA.x - 6.8, PA.z, 0.55); stamp(PA.x - 6.8, PA.z, 1.2, 0.5, 0.3);
      // farol colgado de un poste junto a la puerta
      const px = 4.4, pz = -44.6, ph = ter.hAt(px, pz);
      BB.add('madera', E_.bar(2.7, 0.16, 0.16, 0.014), E_.xf(px, ph + 1.3, pz, Math.PI / 2, 0, 0), { color: [0.5, 0.38, 0.28], jit: 0.2 });
      BB.add('madera', E_.bar(0.9, 0.1, 0.1, 0.01), E_.xf(px - 0.4, ph + 2.55, pz, 0, Math.PI / 2, 0), { color: [0.5, 0.38, 0.28] });
      const ps = parts(GLB.farol); const b = boxOf(ps.map((p) => p.geo));
      for (const p of ps) { const g = p.geo.clone(); g.translate(-(b.min.x + b.max.x) / 2, -b.max.y, -(b.min.z + b.max.z) / 2); p.mat.envMapIntensity = 0.6; p.mat.metalness = 0; sAdd(g, p.mat, compose(px - 0.8, ph + 2.45, pz, 0, 1.8), pz); g.dispose(); }
      ctx.addSeg(px, pz, px, pz, 0.15);
    }

    /* ---------- hierba y flores: briznas finas (tarjetas de 24 tris) instanciadas por chunk de 10 m, LOD de 4 tris, viento en el vertex shader ---------- */
    const chunks = [], lodChunks = [];   // chunks de 10 m {box, full:[meshes por grupo], n} y celdas LOD de 20 m {box, mesh, n}
    let grassMat = null, grassLodMat = null, flowerMat = null, grassTris = [0, 0];
    function tuftMaterial(flower, atlasTex, hRef) {
      // material de una cara con alphaTest 0,4 (el GLB trae cara delantera y trasera como geometría; DoubleSide las dejaría negras); v de las UV = altura (1 base, 0 punta)
      const m = new THREE.MeshStandardMaterial({ map: atlasTex, alphaTest: 0.4, side: THREE.FrontSide, roughness: 0.8, metalness: 0, envMapIntensity: 0.5 });
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = S.time; sh.uniforms.uWind = S.wind;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime, uWind; varying float vHt;')
          .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = normalize(mix(vec3(normal), vec3(0.0, 1.0, 0.0), 0.7));')
          .replace('#include <begin_vertex>', `#include <begin_vertex>
          vHt = clamp(1.0 - uv.y, 0.0, 1.0);
          { float hh = vHt * vHt; vec2 ip = instanceMatrix[3].xz; float ph = dot(ip, vec2(0.13, 0.07)) * 1.4;
            float w = sin(uTime * 1.6 + ph) + 0.35 * sin(uTime * 4.1 + ip.x * 2.3 + position.y * 3.0);
            transformed.x += 0.07 * uWind * hh * w * ${flower ? '0.8' : '1.0'}; transformed.z += 0.045 * uWind * hh * cos(uTime * 1.3 + ph * 1.1); }`);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHt;')
          .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb *= mix(0.3, 1.05, smoothstep(0.0, 0.8, vHt));`);
      };
      m.customProgramCacheKey = () => 'aldea-tuft2-' + flower;
      return MT(m);
    }
    const CARD_OFF = [[0, 0, 0.3], [0.13, 0.09, 2.2], [-0.12, 0.12, 4.1], [0.1, -0.14, 5.3]];
    function multiGeo(glb, prefix, idx, lodScale) {   // varias variantes fusionadas en una mata (una instancia = 3-4 tarjetas de briznas)
      const ps = parts(GLB[glb]), list = [];
      idx.forEach((i, k) => {
        const p = ps.find((q) => q.name.indexOf(prefix + i + '_') === 0 || q.name === prefix + i); if (!p) return;
        const o = CARD_OFF[k % 4], g = p.geo.clone(); g.rotateY(o[2]); g.translate(o[0], 0, o[1]); list.push(g);
      });
      const g = mergeGeos(list); list.forEach((x) => x.dispose()); if (lodScale) g.scale(lodScale, lodScale, lodScale); return G(g);
    }
    function buildGrass() {
      const hm = parts(GLB.hierba_briznas)[0], hl = parts(GLB.hierba_lod)[0];
      grassMat = tuftMaterial(false, hm.mat.map); grassLodMat = tuftMaterial(false, hl.mat.map);
      const GROUPS = [[0, 1, 2], [3, 4, 9], [6, 10, 11, 8], [12, 14, 13, 15]];   // 0-2 prado (3 tarjetas por instancia); 3 = solo bordes de camino (trébol / hojas anchas)
      const full = GROUPS.map((ix) => multiGeo('hierba_briznas', 'briznas_', ix)), lodG = multiGeo('hierba_lod', 'lod_', [0, 4], 1.2);
      grassTris = [full[0].attributes.position.count / 3, lodG.attributes.position.count / 3];
      const WT = [0.4, 0.75, 1.0];
      const CH = 12, NC = 10, DENS = Q_.dens, c = [1, 1, 1];
      const grassOK = (x, z) => {
        const dR = ter.roadDist(x, z), w = ter.halfW(ter.roadS(x, z));
        if (dR < w + 0.12 + (ter.fbm2(x * 1.7, z * 1.7, 4, 2) - 0.5) * 0.7) return 0;
        const sl = ter.slopeAt(x, z); if (sl > 1.0 || wg(x, z) || inFoot(x, z, 0.4)) return 0;
        const k = lerp(0.6, 1, sstep(w + 0.1, w + 2.4, dR)) * (1 - 0.85 * sstep(0.6, 1.0, sl));
        return k * (ter.hAt(x, z) > 13 ? 0.7 : 1);   // en la aldea la hierba es más baja/rala (suelo pisado)
      };
      const cap = Math.floor(CH * CH * DENS * 1.05), bufM = GROUPS.map(() => new Float32Array(cap * 16)), bufC = GROUPS.map(() => new Float32Array(cap * 3)), cnt = GROUPS.map(() => 0);
      const LC = 20, LN = 6, lodCells = []; for (let i = 0; i < LN * LN; i++) lodCells.push({ m: [], c: [], minH: 1e9, maxH: -1e9 });
      for (let cj = 0; cj < NC; cj++) for (let ci = 0; ci < NC; ci++) {
        const x0 = -60 + ci * CH, z0 = -60 + cj * CH, tries = Math.floor(CH * CH * DENS); cnt.fill(0); let minH = 1e9, maxH = -1e9;
        for (let t = 0; t < tries; t++) {
          const x = x0 + rng() * CH, z = z0 + rng() * CH, k = grassOK(x, z); if (!k || rng() > k) continue;
          const dR = ter.roadDist(x, z), w = ter.halfW(ter.roadS(x, z)), e = dR - w, y = ter.hAt(x, z);
          let g; if (e < 2.4 && rng() < 0.3 * (1 - sstep(0.3, 2.4, e) * 0.7)) g = 3; else { const r = rng(); g = 0; while (g < 2 && r > WT[g]) g++; }
          const edge = sstep(w + 0.1, w + 2.6, dR), tallN = ter.fbm2(x * 0.08 + 5, z * 0.08, 12, 3);
          const sc = lerp(0.85, 1.3, rng()), hs = sc * (0.5 + 0.5 * edge) * (0.9 + 0.35 * sstep(0.4, 0.75, tallN)) * (g > 2 ? 0.8 : 1);   // más corta y rala sobre el borde del camino
          compose(x, y - 0.02, z, rng() * 6.28, sc, hs, sc, (rng() - 0.5) * 0.2, (rng() - 0.5) * 0.2);
          const n = cnt[g]++; Mt.toArray(bufM[g], n * 16);
          // tinte casi blanco con variación de gran escala ±8 %: verde vivo en zonas húmedas/bajas, pajizo en las secas (~1/4), más seco junto al camino
          const big = ter.fbm2(x * 0.017 + 3, z * 0.017, 6, 3), humid = ter.fbm2(x * 0.03 + 9, z * 0.03, 77, 3), dryK = clamp(sstep(0.62, 0.78, big) * 0.9 + (1 - edge) * 0.3 + (rng() < 0.05 ? 0.4 : 0), 0, 1), v = lerp(0.92, 1.08, rng()) * (0.94 + 0.12 * ter.fbm2(x * 0.4, z * 0.4, 5, 2));
          const gr = 0.55 + 0.45 * sstep(0.35, 0.7, humid);
          let wl = 1; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (wg(x + a * 0.5, z + b * 0.5)) wl = 0.62;
          const sh = ter.slopeAt(x, z) > 0.6 ? 0.8 : 1;
          c[0] = v * lerp(0.74 + (1 - gr) * 0.1, 1.12, dryK) * wl * sh; c[1] = v * lerp(1.1 + gr * 0.06, 1.0, dryK) * wl * sh; c[2] = v * lerp(0.7, 0.8, dryK) * wl * sh;
          bufC[g][n * 3] = c[0]; bufC[g][n * 3 + 1] = c[1]; bufC[g][n * 3 + 2] = c[2];
          if (rng() < 0.45) { const lc = lodCells[Math.min(LN - 1, Math.floor((z + 60) / LC)) * LN + Math.min(LN - 1, Math.floor((x + 60) / LC))]; for (let q = 0; q < 16; q++) lc.m.push(Mt.elements[q]); lc.c.push(c[0], c[1], c[2]); lc.minH = Math.min(lc.minH, y); lc.maxH = Math.max(lc.maxH, y); }
          minH = Math.min(minH, y); maxH = Math.max(maxH, y);
        }
        if (!cnt.some((v) => v)) continue;
        const ch = { box: new THREE.Box3(new V3(x0, minH - 0.3, z0), new V3(x0 + CH, maxH + 1.2, z0 + CH)), cx: x0 + CH / 2, cz: z0 + CH / 2, h: CH / 2, full: [], n: [], flor: false };
        for (let g = 0; g < GROUPS.length; g++) {
          const n = cnt[g]; if (!n) continue;
          const im = new THREE.InstancedMesh(full[g], grassMat, n); im.instanceMatrix.array.set(bufM[g].subarray(0, n * 16)); im.instanceColor = new THREE.InstancedBufferAttribute(bufC[g].slice(0, n * 3), 3);
          im.userData.veg = true; im.frustumCulled = false; im.receiveShadow = true; im.castShadow = false; im.visible = false; group.add(im); ch.full.push(im); ch.n.push(n);
        }
        chunks.push(ch);
      }
      lodCells.forEach((lc, i) => {   // LOD de 20 m: una llamada por celda (instancias de 4 tris, 45 % de las matas)
        const n = lc.c.length / 3; if (!n) return; const cx0 = -60 + (i % LN) * LC, cz0 = -60 + Math.floor(i / LN) * LC;
        const lm = new THREE.InstancedMesh(lodG, grassLodMat, n); lm.instanceMatrix.array.set(lc.m); lm.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(lc.c), 3);
        lm.userData.veg = true; lm.frustumCulled = false; lm.receiveShadow = true; lm.castShadow = false; lm.visible = false; group.add(lm);
        lodChunks.push({ box: new THREE.Box3(new V3(cx0, lc.minH - 0.3, cz0), new V3(cx0 + LC, lc.maxH + 1.2, cz0 + LC)), cx: cx0 + LC / 2, cz: cz0 + LC / 2, h: LC / 2, mesh: lm, n });
      });
      // flores del prado: parches de 3-5 matas separadas ~0,7 m, por color (4 geometrías); desaturadas y medio ocultas en la hierba
      flowerMat = tuftMaterial(true, parts(GLB.flores_prado)[0].mat.map);
      const fps = parts(GLB.flores_prado), COLS = ['morada', 'blanca', 'amarilla', 'naranja'];
      const fgeo = COLS.map((cn) => { const list = fps.filter((p) => p.name.indexOf('flor_' + cn) === 0).map((p) => p.geo.clone()); const g = mergeGeos(list.slice(0, 2)); list.forEach((x) => x.dispose()); return G(g); });
      const CF = 60, NF = 2, ftmp = [[], [], [], []];
      for (let cj = 0; cj < NF; cj++) for (let ci = 0; ci < NF; ci++) {
        const x0 = -60 + ci * CF, z0 = -60 + cj * CF; ftmp.forEach((a) => { a.length = 0; });
        for (let t = 0; t < CF * CF * 0.08; t++) {
          const x = x0 + rng() * CF, z = z0 + rng() * CF, pf = ter.fbm2(x * 0.11 + 40, z * 0.11, ter.seed + 5, 3);
          if (pf < 0.5 || rng() > clamp((pf - 0.48) * 4.5, 0, 0.95)) continue;
          const ty = ter.fbm2(x * 0.06, z * 0.06, ter.seed + 8, 2) + (rng() - 0.5) * 0.4, type = ty < 0.36 ? 0 : ty < 0.5 ? 2 : ty < 0.62 ? 3 : 1, nm = 3 + Math.floor(rng() * 3);
          for (let q = 0; q < nm; q++) {
            const a = rng() * 6.28, r = 0.35 + rng() * 0.7, fx = x + Math.cos(a) * r, fz = z + Math.sin(a) * r, k = grassOK(fx, fz); if (!k || k < 0.6 || ter.roadDist(fx, fz) > 32) continue;
            const sc = lerp(0.85, 1.25, rng()); compose(fx, ter.hAt(fx, fz) - 0.02, fz, rng() * 6.28, sc, sc * lerp(0.9, 1.2, rng()), sc, (rng() - 0.5) * 0.2, (rng() - 0.5) * 0.2); ftmp[type].push(Mt.toArray([]));
          }
        }
        ftmp.forEach((arr, ty) => {
          if (!arr.length) return; const im = new THREE.InstancedMesh(fgeo[ty], flowerMat, arr.length); arr.forEach((a, i) => im.instanceMatrix.array.set(a, i * 16));
          const cols = new Float32Array(arr.length * 3); for (let i = 0; i < arr.length; i++) { const v = lerp(0.88, 1.08, rng()); cols[i * 3] = v; cols[i * 3 + 1] = v; cols[i * 3 + 2] = v; }
          im.instanceColor = new THREE.InstancedBufferAttribute(cols, 3); im.userData.veg = true; im.frustumCulled = false; im.receiveShadow = true; im.castShadow = false; im.visible = false; group.add(im);
          chunks.push({ box: new THREE.Box3(new V3(x0, -5, z0), new V3(x0 + CF, 25, z0 + CF)), cx: x0 + CF / 2, cz: z0 + CF / 2, h: CF / 2, full: [im], lod: null, n: [arr.length], flor: true });
        });
      }
    }
    const fr = new THREE.Frustum(), pm = new M4(), cbox = new THREE.Box3();
    let Q = { sombra: 2048, sombraFar: 2048, hierba: 1, r1: 20, r2: 56, lod0: 25, viento: true, flores: 1 };
    function updateGrass() {
      camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      fr.setFromProjectionMatrix(pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      const px = camera.position.x, pz = camera.position.z; let vis = 0;
      for (const c of chunks) {
        const dx = Math.max(Math.abs(c.cx - px) - c.h, 0), dz = Math.max(Math.abs(c.cz - pz) - c.h, 0), d = Math.hypot(dx, dz);
        const show = d < (c.flor ? Q.r2 * 0.9 : Q.r2) && fr.intersectsBox(c.box);
        if (c.flor) { const m = c.full[0]; m.visible = show && Q.flores > 0; if (m.visible) { m.count = Math.floor(c.n[0] * Q.flores); vis++; } continue; }
        const nearTier = d < Q.r1;
        for (let g = 0; g < c.full.length; g++) { c.full[g].visible = show && nearTier; if (show && nearTier) c.full[g].count = Math.max(1, Math.floor(c.n[g] * Q.hierba)); }
        if (show) vis++;
      }
      for (const c of lodChunks) {   // el LOD solo se dibuja donde no hay hierba completa: celdas cuyo centro está más allá de r1 (+ el borde de 10 m se solapa para no dejar huecos)
        const dx = Math.max(Math.abs(c.cx - px) - c.h, 0), dz = Math.max(Math.abs(c.cz - pz) - c.h, 0), d = Math.hypot(dx, dz);
        c.mesh.visible = d < Q.r2 && d + 2 * c.h > Q.r1 && fr.intersectsBox(c.box); if (c.mesh.visible) { c.mesh.count = Math.max(1, Math.floor(c.n * Q.hierba)); vis++; }
      }
      S.chunksVis = vis;
    }

    /* ---------- bucle por paso ---------- */
    let frameN = 0;
    const fwd = new V3();
    function update(dt, T, force) {
      S.time.value = T; S.wind.value = Q.viento ? 1 : 0.0;
      camera.getWorldDirection(fwd); const px = camera.position.x, pz = camera.position.z;
      sky.position.copy(camera.position);
      // cascada de sombras: cerca (40 m, sigue la cámara cada paso) y lejos (140 m, cada 4 pasos)
      placeSun(sunN, px + fwd.x * 12, ter.hAt(px + fwd.x * 12, pz + fwd.z * 12), pz + fwd.z * 12, 22, sunN.shadow.mapSize.x);
      if (force || frameN % 4 === 0) { placeSun(sunF, px + fwd.x * 30, 4, pz + fwd.z * 30, 70, sunF.shadow.mapSize.x); sunF.shadow.needsUpdate = true; }
      frameN++;
      updateTrees(false); updateGrass();
      if (chimneys.length && Math.random() < dt * 9) { const c = chimneys[Math.floor(Math.random() * chimneys.length)]; ctx.smoke(c, 1, 0xc9c3b8, { spd: 0.25, up: 1, life: 4.2, grav: 0.32, spread: 0.06, vx: 0.45, vz: 0.1, size: 0.7, grow: 2.4 }); }
    }
    function setQuality(q) {
      Object.assign(Q, q);
      for (const l of [sunN, sunF]) { if (!l) continue; }
      const set = (l, size) => { if (l.shadow.mapSize.x !== size) { l.shadow.mapSize.set(size, size); if (l.shadow.map) { l.shadow.map.dispose(); l.shadow.map = null; } } };
      if (sunN) { set(sunN, Q.sombra); set(sunF, Q.sombraFar); sunF.shadow.needsUpdate = true; }
      lodDist = Q.lod0; lodForce = true;
    }

    // la pasada de oclusión ambiental (SAO) no dibuja vegetación con alfa ni el cielo: se ocultan mientras dura
    const hidden = [];
    function aoHide(on) {
      if (on) { group.traverse((o) => { if ((o.userData.veg || o === sky) && o.visible) { o.visible = false; hidden.push(o); } }); } else { for (const o of hidden) o.visible = true; hidden.length = 0; }
    }

    /* ---------- construcción completa y liberación ---------- */
    async function cargar(prog) {
      await cargarAssets(prog);
      rng = TER.mulberry32(777); ter = TER.crear(1337);
      E_ = EDI.crear(THREE, () => rng()); BB = new E_.Builder();
      buildSky(); buildSun();
      buildAldea(); buildWalls(); buildProps(); buildTrees(); buildClutter();
      buildingMeshes(); sFlush();
      buildSplat(); buildTerrain(); buildGrass();
      prevEnv = scene.environment; prevFog = scene.fog; prevBg = scene.background;
      scene.environment = envRT.texture; scene.fog = new THREE.FogExp2(new THREE.Color(HOR.x * 0.92, HOR.y * 0.92, HOR.z * 0.92), 0.0052); scene.background = null;
      group.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { if (m.envMapIntensity !== undefined && !m.userData.envDone) { m.envMapIntensity *= 1.8; m.userData.envDone = true; } }); });   // reflejo/ambiente del HDRI ≈ 0,6-1
      if (ctx.atmo) { ctx.atmo.sun.copy(sunDir); ctx.atmo.hazeCol.copy(HOR).multiplyScalar(1.0); ctx.atmo.hide = aoHide; }
      scene.add(group); setQuality(Q); updateTrees(true);
      S.listo = true; return api;
    }
    function dispose() {
      if (ctx.atmo) ctx.atmo.hide = null;
      S.vivo = false; S.listo = false;
      scene.remove(group);
      if (scene.environment === (envRT && envRT.texture)) scene.environment = prevEnv; scene.fog = prevFog; scene.background = prevBg;
      group.traverse((o) => { if (o.isInstancedMesh && o.dispose) o.dispose(); });
      own.geo.forEach((g) => g.dispose()); own.mat.forEach((m) => m.dispose()); own.tex.forEach((t) => t.dispose()); own.rt.forEach((r) => r.dispose());
      for (const l of [sunN, sunF]) if (l && l.shadow.map) { l.shadow.map.dispose(); l.shadow.map = null; l.dispose && l.dispose(); }
      own.geo.clear(); own.mat.clear(); own.tex.clear(); own.rt.clear(); chunks.length = 0; lodChunks.length = 0; trees.length = 0; treeMeshes.length = 0; chimneys.length = 0; foot.length = 0; stamps.length = 0;
    }
    function spawnAt(s, side) {   // punto del camino (con desplazamiento lateral) y rumbo hacia la aldea
      pointAt(s, PA); const x = PA.x - PA.tz * side, z = PA.z + PA.tx * side; return { x, z, yaw: Math.atan2(PA.tx, PA.tz), y: ter.hAt(x, z) };
    }
    const api = {
      cargar, dispose, update, setQuality, spawnAt, S, group, get muros() { return S.runs; },
      get listo() { return S.listo; }, get ter() { return ter; }, heightAt: (x, z) => ter.hAt(x, z), sunDir, get sunN() { return sunN; }, get sunF() { return sunF; }, get trees() { return trees; },
      get stats() { return { bloques: S.blocks, trisAldea: S.trisAldea, trisEstaticos: S.trisStatic, taludes: S.talud, arboles: trees.length, chunks: chunks.length, chunksVisibles: S.chunksVis, matas: chunks.reduce((a, c) => a + (c.flor ? 0 : c.n.reduce((x, y) => x + y, 0)), 0), floresInst: chunks.reduce((a, c) => a + (c.flor ? c.n[0] : 0), 0), trisMata: grassTris }; },
      limite: (pos, r) => { const L = 57 - r; if (pos.x > L) pos.x = L; else if (pos.x < -L) pos.x = -L; if (pos.z > 60 - r) pos.z = 60 - r; else if (pos.z < -L) pos.z = -L; }
    };
    return api;
  };
})(typeof window !== 'undefined' ? window : globalThis);
