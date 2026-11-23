/* Edificios de la aldea construidos con primitivas biseladas (sin modelos): entramado de madera + revoco, piedra, teja.
   Todo se acumula en un Builder por material (6 materiales compartidos → 6 mallas para toda la aldea).
   Unidades: metros; UV en metros (las texturas se repiten 1 vez por `tile` m). */
(function (root) {
  'use strict';
  function crear(THREE, rng) {
    const V = THREE.Vector3, M4 = THREE.Matrix4, Q = THREE.Quaternion;
    const TILE = { madera: 1.0, revoco: 1.9, teja: 2.1, piedra: 2.1, hierro: 1, cristal: 1 };
    const R = (a, b) => a + (b - a) * rng();
    const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

    /* ruido de valor 3D determinista por posición (no consume el rng: añadir suciedad no cambia el reparto de la aldea) */
    const hs3 = (x, y, z) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const vn3 = (x, y, z) => {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = x - xi, v = y - yi, w = z - zi, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), sw = w * w * (3 - 2 * w);
      const a = (i, j, k) => hs3(xi + i, yi + j, zi + k), l = (p, q, t) => p + (q - p) * t;
      return l(l(l(a(0, 0, 0), a(1, 0, 0), su), l(a(0, 1, 0), a(1, 1, 0), su), sv), l(l(a(0, 0, 1), a(1, 0, 1), su), l(a(0, 1, 1), a(1, 1, 1), su), sv), sw);
    };
    const lerp = (a, b, t) => a + (b - a) * t;

    /* ---- acumulador de triángulos por material ---- */
    function Builder() { this.d = {}; }
    Builder.prototype.push = function (m) { (this.st || (this.st = [])).push(this.base || null); this.base = this.base ? new M4().multiplyMatrices(this.base, m) : m.clone(); };
    Builder.prototype.pop = function () { this.base = this.st.pop(); };
    Builder.prototype.add = function (key, geo, m, o) {
      o = o || {};
      const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, nn = g.attributes.normal, uv = g.attributes.uv;
      const D = this.d[key] || (this.d[key] = { pos: [], nor: [], uv: [], col: [] });
      const mf = this.base ? new M4().multiplyMatrices(this.base, m) : m;
      const nm = new THREE.Matrix3().getNormalMatrix(mf), v = new V(), v2 = new V(), n = new V(), c = o.color || [1, 1, 1];
      const uo = o.uvo || [0, 0], us = o.uvs || 1;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(m); v2.copy(v); if (this.base) v2.applyMatrix4(this.base);
        n.fromBufferAttribute(nn, i).applyMatrix3(nm).normalize();
        D.pos.push(v2.x, v2.y, v2.z); D.nor.push(n.x, n.y, n.z);
        D.uv.push(uv ? uv.getX(i) * us + uo[0] : 0, uv ? uv.getY(i) * us + uo[1] : 0);
        // suciedad/humedad en la base y bajo aleros: oscurece los vértices cercanos al suelo (y local del edificio)
        let k = 1, cr = 1, cg = 1, cb = 1;
        if (o.grime) { const h = v.y - (o.y0 || 0); k = 0.5 + 0.5 * sstep(0, o.grime, h); }
        if (o.dirt) {   // manchas de humedad y churretones de lluvia (ruido estirado en vertical)
          const n = vn3(v2.x * 1.3, v2.y * 0.3, v2.z * 1.3) * 0.55 + vn3(v2.x * 4.5, v2.y * 1.1, v2.z * 4.5) * 0.45;
          k *= 1 - o.dirt * sstep(0.38, 0.8, n) * 0.55;
        }
        if (o.moss) {   // musgo en la base: parches por ruido, más denso cuanto más cerca del suelo
          const hh = v.y - (o.y0 || 0), mm = o.moss * (1 - sstep(0.15, 1.1, hh)) * sstep(0.3, 0.62, vn3(v2.x * 2.4, v2.y * 1.2, v2.z * 2.4));
          cr *= lerp(1, 0.55, mm); cg *= lerp(1, 1.12, mm); cb *= lerp(1, 0.4, mm); k *= lerp(1, 0.8, mm);
        }
        if (o.vcol) { const r = o.vcol(v2, n); cr *= r[0]; cg *= r[1]; cb *= r[2]; }
        const j = o.jit ? 1 + (rng() - 0.5) * o.jit : 1;
        D.col.push(c[0] * k * j * cr, c[1] * k * j * cg, c[2] * k * j * cb);
      }
      if (geo.index) g.dispose();
    };
    Builder.prototype.geometry = function (key) {
      const D = this.d[key]; if (!D) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(D.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(D.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(D.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(D.col, 3));
      g.computeBoundingSphere(); g.computeBoundingBox(); return g;
    };
    Builder.prototype.tris = function () { let t = 0; for (const k in this.d) t += this.d[k].pos.length / 9; return t; };

    /* ---- primitivas ---- */
    function boxM(w, h, d, tile, seg) {   // caja con UV en metros; seg = tamaño de celda (m) para teselar y poder pintar suciedad por vértice
      const ws = seg ? Math.max(1, Math.ceil(w / seg)) : 1, hsg = seg ? Math.max(1, Math.ceil(h / seg)) : 1, ds = seg ? Math.max(1, Math.ceil(d / seg)) : 1;
      const g = new THREE.BoxGeometry(w, h, d, ws, hsg, ds), uv = g.attributes.uv;
      const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]], cnt = [(ds + 1) * (hsg + 1), (ds + 1) * (hsg + 1), (ws + 1) * (ds + 1), (ws + 1) * (ds + 1), (ws + 1) * (hsg + 1), (ws + 1) * (hsg + 1)];
      let i = 0; for (let f = 0; f < 6; f++) for (let v = 0; v < cnt[f]; v++, i++) uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile);
      return g;
    }
    function bar(len, w, h, bev) {   // viga biselada de verdad (extrusión con chaflán), eje largo = Z, centrada
      bev = Math.min(bev || 0.014, w * 0.3, h * 0.3);
      const s = new THREE.Shape(); const a = w / 2 - bev, b = h / 2 - bev;
      s.moveTo(-a, -b); s.lineTo(a, -b); s.lineTo(a, b); s.lineTo(-a, b); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: len - 2 * bev, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 1, steps: 1, curveSegments: 1 });
      g.translate(0, 0, -(len - 2 * bev) / 2);
      // UV de madera en metros: u = ancho, v = a lo largo de la fibra
      const p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + p.getY(i) * 0.37) / TILE.madera, p.getZ(i) / TILE.madera);
      return g;
    }
    const mat = new M4(), q = new Q(), sc = new V(1, 1, 1), eu = new THREE.Euler();
    function xf(x, y, z, rx, ry, rz) { eu.set(rx || 0, ry || 0, rz || 0, 'YXZ'); q.setFromEuler(eu); return new M4().compose(new V(x, y, z), q.clone(), new V(1, 1, 1)); }
    const mul = (a, b) => new M4().multiplyMatrices(a, b);
    const rot = (rx, ry, rz) => xf(0, 0, 0, rx, ry, rz);

    /* polígono plano de tejado con UV en metros (u a lo largo del alero, v pendiente arriba) + cara inferior */
    function roofPoly(B, pts, eave, up, o) {   // pts: array de V en espacio local del edificio (CCW visto desde arriba)
      const n = new V().crossVectors(new V().subVectors(pts[1], pts[0]), new V().subVectors(pts[2], pts[0])).normalize();
      if (n.y < 0) { pts = pts.slice().reverse(); n.negate(); }
      const e1 = eave.clone().normalize(), e2 = new V().crossVectors(n, e1).normalize(); if (e2.y < 0) e2.negate();
      const o0 = pts[0], pos = [], nor = [], uv = [];
      const tile = TILE.teja, ou = rng(), ov = rng();
      const push = (p, nn) => { pos.push(p.x, p.y, p.z); nor.push(nn.x, nn.y, nn.z); const d = new V().subVectors(p, o0); uv.push(d.dot(e1) / tile + ou, d.dot(e2) / tile + ov); };
      // teselado: cada triángulo del abanico se divide en una rejilla baricéntrica (~0,55 m) para poder pintar musgo y oscurecimiento por vértice
      const sub = (A, B2, C) => {
        const nn = Math.max(1, Math.min(10, Math.ceil(Math.max(A.distanceTo(B2), B2.distanceTo(C), C.distanceTo(A)) / 0.55))), P = (i, j) => new V().copy(A).addScaledVector(new V().subVectors(B2, A), i / nn).addScaledVector(new V().subVectors(C, A), j / nn);
        for (let i = 0; i < nn; i++) for (let j = 0; j < nn - i; j++) {
          push(P(i, j), n); push(P(i + 1, j), n); push(P(i, j + 1), n);
          if (i + j < nn - 1) { push(P(i + 1, j), n); push(P(i + 1, j + 1), n); push(P(i, j + 1), n); }
        }
      };
      for (let i = 1; i < pts.length - 1; i++) sub(pts[0], pts[i], pts[i + 1]);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const eY = Math.min(...pts.map((p) => p.y)), tY = Math.max(...pts.map((p) => p.y)), mo = o.moss === undefined ? 1 : o.moss;
      B.add('teja', g, new M4(), { color: (o.color || [1, 1, 1]).map((c, i) => c * [0.78, 0.8, 0.74][i] * (0.8 + 0.4 * rng())), jit: 0.18,
        vcol: (p, nw) => {   // musgo en parches (más en la vertiente norte y junto al alero), hollín cerca de la cumbrera y tejas más oscuras en el alero
          const t = (p.y - eY) / Math.max(0.5, tY - eY), north = nw.z < 0 ? 1 : 0.45, m = mo * sstep(0.46, 0.72, vn3(p.x * 0.8, p.y * 0.7, p.z * 0.8)) * north * (1 - 0.55 * t);
          const d = 0.8 + 0.2 * vn3(p.x * 3.1, p.y * 3.1, p.z * 3.1) - 0.12 * (1 - sstep(0, 0.25, t));
          return [lerp(1, 0.52, m) * d, lerp(1, 1.18, m) * d, lerp(1, 0.4, m) * d];
        } });
      // grosor: una segunda capa 7 cm por debajo con la cara inferior (madera oscura) para que el borde no sea una lámina
      const cpos = [], cnor = []; for (let i = 1; i < pts.length - 1; i++) for (const q of [pts[0], pts[i + 1], pts[i]]) { cpos.push(q.x - n.x * 0.09, q.y - n.y * 0.09, q.z - n.z * 0.09); cnor.push(-n.x, -n.y, -n.z); }
      const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3)); g2.setAttribute('normal', new THREE.Float32BufferAttribute(cnor, 3)); g2.setAttribute('uv', new THREE.Float32BufferAttribute(Array.from({ length: cpos.length / 3 * 2 }, (_, i) => { const q = i >> 1; return i & 1 ? cpos[q * 3 + 1] : cpos[q * 3] + cpos[q * 3 + 2] * 0.7; }), 2));
      B.add('madera', g2, new M4(), { color: [0.5, 0.45, 0.4] });
    }

    /* ---- vegetación y detalles de flora (material 'flora': color por vértice, sin textura) ---- */
    const GREENS = [[0.16, 0.3, 0.07], [0.22, 0.36, 0.09], [0.12, 0.24, 0.06], [0.3, 0.4, 0.1]];
    function leaf(B, p, sz, col, nrm) {   // hoja = rombo de 2 triángulos orientado hacia `nrm`
      const nn = nrm.clone().normalize(), t = new V().crossVectors(nn, new V(0, 1, 0)); if (t.lengthSq() < 1e-3) t.set(1, 0, 0); t.normalize().multiplyScalar(sz * 0.5);
      const u = new V().crossVectors(t, nn).normalize().multiplyScalar(sz * 0.5), a = p.clone().addScaledVector(u, -1), b2 = p.clone().add(t), c = p.clone().addScaledVector(u, 1.2), d = p.clone().sub(t);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([a, b2, c, a, c, d].flatMap((q) => [q.x, q.y, q.z]), 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(6).fill(0).flatMap(() => [nn.x, nn.y, nn.z]), 3));
      B.add('flora', g, new M4(), { color: col, jit: 0.3 });
    }
    function hiedra(B, m, x, z, h, nrm, dens) {   // hiedra que trepa por un muro: tallo con zigzag y hojas; (x, z) en el plano local, el muro mira a +nrm
      let px = x, py = 0;
      for (let i = 0; i < h * (dens || 9); i++) {
        py += 0.11 + rng() * 0.07; px += (rng() - 0.5) * 0.12; if (py > h) break;
        const g = GREENS[Math.floor(rng() * 4)], n = nrm.clone(); n.x += (rng() - 0.5) * 0.6; n.y += (rng() - 0.3) * 0.5;
        for (let k = 0; k < 2; k++) leaf(B, new V(px + (rng() - 0.5) * 0.22, py + (rng() - 0.5) * 0.1, z + nrm.z * 0.03 + nrm.x * 0.03).applyMatrix4(m), 0.11 + rng() * 0.08, g.map((c) => c * (0.8 + 0.5 * rng())), n.clone().transformDirection(m));
      }
    }
    function mata(B, m, x, y, z, r, n, flowers) {   // mata de hojas (y flores) al pie de un muro o en una maceta
      for (let i = 0; i < n; i++) {
        const a = rng() * 6.28, d = Math.sqrt(rng()) * r, h = 0.05 + rng() * r * 1.3, p = new V(x + Math.cos(a) * d, y + h, z + Math.sin(a) * d).applyMatrix4(m);
        const up = new V(Math.cos(a) * 0.6, 0.9, Math.sin(a) * 0.6).transformDirection(m), g = GREENS[Math.floor(rng() * 4)];
        leaf(B, p, 0.12 + rng() * 0.14, g.map((c) => c * (0.8 + 0.5 * rng())), up);
      }
      if (flowers) for (let i = 0; i < flowers.n; i++) {
        const a = rng() * 6.28, d = Math.sqrt(rng()) * r * 0.9, p = new V(x + Math.cos(a) * d, y + r * 0.9 + rng() * r * 0.5, z + Math.sin(a) * d), c = flowers.cols[Math.floor(rng() * flowers.cols.length)];
        B.add('flora', new THREE.OctahedronGeometry(0.035 + rng() * 0.02, 0), mul(m, xf(p.x, p.y, p.z)), { color: c, jit: 0.2 });
      }
    }
    const FLOWERS = [[[1.0, 0.22, 0.3], [1.2, 0.5, 0.5]], [[1.3, 1.1, 0.25], [1.2, 0.7, 0.2]], [[0.8, 0.5, 1.1], [1.2, 1.2, 1.3]]];

    /* ---- ventana con marco, alféizar, dintel, cristal oscuro, contraventanas y maceta ---- */
    const SHUT = [[0.28, 0.34, 0.3], [0.22, 0.3, 0.4], [0.46, 0.2, 0.16], [0.5, 0.4, 0.2], [0.34, 0.26, 0.2]];
    function ventana(B, m, w, h, o) {
      B.add('cristal', new THREE.PlaneGeometry(w, h), mul(m, xf(0, 0, 0.035)), {});
      const t = 0.06, mc = o.marco || [0.5, 0.36, 0.26];
      for (const [x, y, lw, lh] of [[0, h / 2 + t / 2, w + t * 2, t], [-w / 2 - t / 2, 0, t, h], [w / 2 + t / 2, 0, t, h], [0, 0, 0.03, h], [0, 0, w, 0.03]])
        B.add('madera', boxM(lw, lh, 0.08, 1), mul(m, xf(x, y, 0.045)), { color: mc });
      B.add('madera', boxM(w + 0.2, 0.07, 0.2, 1), mul(m, xf(0, -h / 2 - 0.05, 0.1)), { color: mc.map((c) => c * 0.9), uvo: [rng(), rng()] });   // alféizar volado
      B.add('madera', boxM(w + 0.18, 0.09, 0.12, 1), mul(m, xf(0, h / 2 + 0.1, 0.07)), { color: mc.map((c) => c * 0.85), uvo: [rng(), rng()] });  // dintel
      if (o.postigos) {   // contraventanas de tablas: abiertas contra el muro (o una cerrada a medias), de color propio, con herrajes
        const col = o.postigo || SHUT[Math.floor(rng() * SHUT.length)], half = rng() < 0.3;
        for (const s2 of [-1, 1]) {
          const ang = half && s2 > 0 ? R(0.5, 1.1) : R(0.1, 0.7), sw = w / 2 + 0.02, pivot = mul(m, xf(s2 * (w / 2 + 0.065), 0, 0.09, 0, -s2 * ang));
          B.add('madera', boxM(sw, h + 0.06, 0.035, 0.9), mul(pivot, xf(s2 * sw / 2, 0, 0)), { color: col, uvo: [rng(), rng()], jit: 0.12 });
          for (const yy of [-h * 0.33, h * 0.33]) B.add('madera', boxM(sw * 0.96, 0.07, 0.025, 1), mul(pivot, xf(s2 * sw / 2, yy, 0.03)), { color: col.map((c) => c * 0.8) });   // travesaños
          B.add('hierro', boxM(0.09, 0.025, 0.02, 1), mul(pivot, xf(-s2 * 0.0, h * 0.33, 0.05)), {});
        }
      }
      if (o.maceta) {   // jardinera de madera con tierra, hojas y flores
        const fc = FLOWERS[Math.floor(rng() * 3)], bw = w + 0.18;
        B.add('madera', boxM(bw, 0.17, 0.2, 1), mul(m, xf(0, -h / 2 - 0.2, 0.19)), { color: [0.4, 0.28, 0.2], uvo: [rng(), rng()] });
        B.add('flora', new THREE.BoxGeometry(bw - 0.04, 0.03, 0.16), mul(m, xf(0, -h / 2 - 0.12, 0.19)), { color: [0.25, 0.16, 0.1] });
        mata(B, m, 0, -h / 2 - 0.12, 0.19, 0.1 + bw * 0.07, 16, { n: 9, cols: fc });
        for (const s2 of [-1, 1]) mata(B, m, s2 * bw * 0.35, -h / 2 - 0.12, 0.19, 0.09, 6, { n: 4, cols: fc });
      }
    }

    /* ---- puerta de tablas con herrajes, jambas, dintel y escalón de piedra (m: plano de la fachada; y0 = suelo local) ---- */
    function puerta(B, m, w, h, o) {
      const col = o.puerta || [0.34, 0.24, 0.17], pw = w / 4;
      for (let i = 0; i < 4; i++) B.add('madera', boxM(pw - 0.012, h, 0.06, 1), mul(m, xf(-w / 2 + pw * (i + 0.5), h / 2, 0.04)), { color: col.map((c) => c * (0.9 + 0.2 * rng())), uvo: [rng(), rng()] });
      for (const yy of [0.3, h - 0.3]) { B.add('madera', boxM(w, 0.12, 0.05, 1), mul(m, xf(0, yy, 0.085)), { color: col.map((c) => c * 0.85) }); B.add('hierro', boxM(w * 0.45, 0.035, 0.02, 1), mul(m, xf(-w * 0.25, yy, 0.115)), {}); }
      B.add('hierro', new THREE.SphereGeometry(0.04, 8, 6), mul(m, xf(w * 0.32, h * 0.48, 0.12)), {});   // tirador
      for (const s2 of [-1, 1]) B.add('madera', boxM(0.12, h + 0.1, 0.16, 1), mul(m, xf(s2 * (w / 2 + 0.06), h / 2 + 0.05, 0.05)), { color: o.marco || [0.5, 0.36, 0.26], uvo: [rng(), rng()] });
      B.add('madera', boxM(w + 0.4, 0.14, 0.2, 1), mul(m, xf(0, h + 0.12, 0.06)), { color: o.marco || [0.5, 0.36, 0.26], uvo: [rng(), rng()] });
      // escalera de piedra desgastada con musgo en las juntas: de la solera (y = 0) al suelo (y = -rise); un peldaño de 18-20 cm cada 0,3 m
      const rise = o.rise || 0.2, n = Math.max(1, Math.round(rise / 0.2)), st = rise / n;
      for (let i = 0; i < n; i++) {
        const top = -0.03 - i * st, dep = 0.34, H = top + rise;
        B.add('piedra', boxM(w + 0.5 + i * 0.25, H, dep + 0.04, 1.2, 0.25), mul(m, xf((rng() - 0.5) * 0.05, (top - rise) / 2, 0.3 + i * dep)), { color: [1.2 - i * 0.04, 1.15 - i * 0.04, 1.05 - i * 0.03], uvo: [rng(), rng()], jit: 0.1, dirt: 0.6, moss: 0.9, y0: m.elements[13] - rise });
      }
    }

    /* ---- farol de pared: ménsula de hierro forjado, marco con cristal y remate (sin llama: es de día) ---- */
    function farolPared(B, m) {
      B.add('hierro', boxM(0.05, 0.05, 0.42, 1), mul(m, xf(0, 0, 0.21)), {});
      B.add('hierro', boxM(0.04, 0.36, 0.04, 1), mul(m, xf(0, -0.16, 0.12, 0.5)), {});
      B.add('hierro', boxM(0.2, 0.03, 0.2, 1), mul(m, xf(0, -0.1, 0.4)), {}); B.add('hierro', new THREE.ConeGeometry(0.13, 0.12, 6), mul(m, xf(0, 0.2, 0.4)), {});
      B.add('cristal', new THREE.CylinderGeometry(0.085, 0.07, 0.24, 6), mul(m, xf(0, 0.0, 0.4)), {});
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.78; B.add('hierro', boxM(0.016, 0.26, 0.016, 1), mul(m, xf(Math.cos(a) * 0.1, 0.0, 0.4 + Math.sin(a) * 0.1)), {}); }
      B.add('hierro', boxM(0.2, 0.03, 0.2, 1), mul(m, xf(0, 0.11, 0.4)), {});
    }

    /* ---- pila de leña apilada contra un muro con tejadillo (m: origen en el suelo, z hacia fuera) ---- */
    function lenia(B, m, w, h) {
      const cols = Math.round(w / 0.17), rows = Math.round(h / 0.16);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols - (j % 2); i++) {
        const r = 0.065 + rng() * 0.02, x = -w / 2 + (i + 0.5 + (j % 2) * 0.5) * (w / cols), y = 0.08 + j * 0.15 + (rng() - 0.5) * 0.015;
        const cg = new THREE.CylinderGeometry(r, r, 0.62 + rng() * 0.08, 7, 1); cg.rotateX(Math.PI / 2);
        const uv = cg.attributes.uv; for (let q = 0; q < uv.count; q++) uv.setXY(q, uv.getX(q) * 0.4, uv.getY(q) * 0.6);
        B.add('madera', cg, mul(m, xf(x + (rng() - 0.5) * 0.02, y, 0.4 + (rng() - 0.5) * 0.04)), { color: [0.62 + rng() * 0.2, 0.48 + rng() * 0.12, 0.34 + rng() * 0.1], uvo: [rng(), rng()] });
      }
      for (const s2 of [-1, 1]) B.add('madera', bar(h + 0.15, 0.09, 0.09, 0.01), mul(m, mul(xf(s2 * (w / 2 + 0.06), (h + 0.15) / 2, 0.4), rot(Math.PI / 2, 0, 0))), { color: [0.45, 0.34, 0.25] });
      B.add('madera', boxM(w + 0.3, 0.05, 0.85, 1), mul(m, xf(0, h + 0.2, 0.32, -0.25)), { color: [0.42, 0.33, 0.26], uvo: [rng(), rng()] });
    }

    /* ---- pared con entramado: m = matriz del plano (x a lo ancho, y arriba, z hacia fuera), w ancho, h alto ---- */
    function paredEntramado(B, m, w, h, o) {
      const y0 = o.y0, gr = o.grime;
      B.add('revoco', boxM(w, h, 0.22, TILE.revoco, 0.45), mul(m, xf(0, h / 2, -0.11)), { color: o.revoco, uvo: [rng(), rng()], grime: gr, y0, jit: 0.06, dirt: 1, moss: gr ? 0.5 : 0 });
      const bw = 0.14, protr = 0.045, cols = Math.max(2, Math.round(w / 1.25)), dx = w / cols;
      // barras: bar() tiene el eje largo en Z; se rota para ponerla vertical (eje X→90º) u horizontal
      const vert = (x, y, len) => B.add('madera', bar(len, bw, 0.16, 0.016), mul(m, mul(xf(x, y, protr - 0.04), rot(Math.PI / 2, 0, 0))), { color: o.madera, jit: 0.2, uvo: [rng(), rng()], grime: gr, y0, dirt: 0.5 });
      const horiz = (x, y, len) => B.add('madera', bar(len, bw, 0.16, 0.016), mul(m, mul(xf(x, y, protr - 0.04), rot(0, Math.PI / 2, 0))), { color: o.madera, jit: 0.2, uvo: [rng(), rng()], grime: gr, y0, dirt: 0.5 });
      for (let i = 0; i <= cols; i++) vert(-w / 2 + i * dx, h / 2, h);
      const rows = Math.max(1, Math.round(h / 1.3));
      for (let j = 0; j <= rows; j++) horiz(0, j * h / rows, w + bw);
      // arriostres variados por panel: diagonal simple, en cruz de San Andrés, en «V» o poste intermedio; ninguna pared repite el dibujo
      const brace = (sx, sy, lw, lh, sgn, th) => { const L = Math.hypot(lw, lh), ang = Math.atan2(lh, lw) * sgn;
        B.add('madera', bar(L, th, th * 1.2, 0.012), mul(m, mul(xf(sx, sy, protr - 0.045 + (sgn < 0 ? 0.012 : 0)), new M4().makeRotationZ(ang).multiply(new M4().makeRotationY(Math.PI / 2)))), { color: o.madera, jit: 0.2, uvo: [rng(), rng()], grime: gr, y0, dirt: 0.5 }); };
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const sx = -w / 2 + (i + 0.5) * dx, sy = (j + 0.5) * h / rows, lw = dx - bw, lh = h / rows - bw, r = rng();
        if (r < 0.3) continue;
        if (r < 0.58) brace(sx, sy, lw, lh, rng() < 0.5 ? 1 : -1, 0.1);
        else if (r < 0.72) { brace(sx, sy, lw, lh, 1, 0.085); brace(sx, sy, lw, lh, -1, 0.085); }
        else if (r < 0.86) { brace(sx - lw / 4, sy, lw / 2, lh, 1, 0.085); brace(sx + lw / 4, sy, lw / 2, lh, -1, 0.085); }
        else vert(sx, sy, lh);
      }
    }

    /* ---- tejado a dos aguas con alero, doble hilada, fascia y cumbrera. L = largo del caballete (eje X local), D = fondo; devuelve altura de cumbrera ---- */
    function tejadoDosAguas(B, L, D, y, o) {
      const ang = (o.ang || 50) * Math.PI / 180, ov = o.alero || 0.5, half = D / 2 + ov * 0.5, rise = Math.tan(ang) * (D / 2);
      const x0 = -L / 2 - ov, x1 = L / 2 + ov, yE = y - Math.tan(ang) * ov * 0.45, zE = D / 2 + ov * 0.55;
      const A = new V(x0, yE, zE), Bp = new V(x1, yE, zE), C = new V(x1, y + rise, 0), Dp = new V(x0, y + rise, 0), A2 = new V(x0, yE, -zE), B2 = new V(x1, yE, -zE);
      const eave = new V(1, 0, 0);
      roofPoly(B, [A, Bp, C, Dp], eave, null, { color: o.color });
      roofPoly(B, [B2, A2, Dp, C], eave, null, { color: o.color });
      // hilada doble en el alero (listón grueso con tejas) y fascia
      const sl = Math.hypot(rise, D / 2) / 1; const ux = new V(0, rise, -D / 2).normalize();
      for (const s of [1, -1]) {
        const ey = yE + 0.03, ez = zE * s;
        B.add('teja', boxM(x1 - x0 + 0.1, 0.06, 0.5, TILE.teja), mul(xf(0, ey + 0.02, ez - s * 0.15, s * (-ang)), new M4()), { color: o.color, uvo: [rng(), rng()], jit: 0.1 });
        B.add('madera', bar(x1 - x0 + 0.1, 0.05, 0.16, 0.01), xf(0, yE - 0.06, ez + s * 0.01, s * -ang, 0, 0).multiply(new M4().makeRotationY(Math.PI / 2)), { color: [0.42, 0.33, 0.26] });
      }
      // canecillos bajo el alero (ménsulas en L) y cabios que asoman por el borde del faldón
      for (const sg of [1, -1]) for (let x = x0 + 0.35; x < x1 - 0.2; x += 0.62) {
        const ez2 = zE * sg;
        B.add('madera', boxM(0.1, 0.17, 0.07, 1), xf(x, yE - 0.17, ez2 - sg * 0.05), { color: [0.4, 0.3, 0.23], uvo: [rng(), rng()], jit: 0.15 });
        B.add('madera', boxM(0.1, 0.07, 0.3, 1), xf(x, yE - 0.12, ez2 - sg * 0.2, sg * 0.18), { color: [0.4, 0.3, 0.23], uvo: [rng(), rng()], jit: 0.15 });
        B.add('madera', boxM(0.075, 0.11, 0.2, 1), xf(x + 0.31, yE + 0.02, ez2 + sg * 0.05, sg * -ang), { color: [0.34, 0.26, 0.2], uvo: [rng(), rng()], jit: 0.2 });
      }
      // cumbrera redondeada
      const cg = new THREE.CylinderGeometry(0.13, 0.15, L + ov * 2 + 0.1, 8, 1); cg.rotateZ(Math.PI / 2);
      const uv = cg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 4);
      B.add('teja', cg, xf(0, y + rise + 0.05, 0), { color: o.color, vcol: (p) => { const m = sstep(0.45, 0.7, vn3(p.x * 1.2, 5, p.z * 1.2)); return [lerp(1, 0.55, m), lerp(1, 1.15, m), lerp(1, 0.42, m)]; } });
      // frontones (triángulos de revoco con entramado) cerrados bajo el alero
      for (const sx of [-1, 1]) {
        const g = new THREE.BufferGeometry(), hh = rise, w2 = D / 2;
        g.setAttribute('position', new THREE.Float32BufferAttribute([-w2, 0, 0, w2, 0, 0, 0, hh, 0], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, D / TILE.revoco, 0, D / 2 / TILE.revoco, hh / TILE.revoco], 2));
        B.add('revoco', g, xf(sx * (L / 2 + 0.02), y, 0, 0, sx > 0 ? Math.PI / 2 : -Math.PI / 2), { color: o.revoco, grime: 0 });
        for (const s2 of [-1, 1]) {   // vigas de borde del hastial: siguen la pendiente del faldón
          const len = Math.hypot(w2, hh);
          B.add('madera', bar(len, 0.1, 0.14, 0.012), xf(sx * (L / 2 + 0.07), y + hh / 2, s2 * w2 / 2, s2 * Math.atan2(hh, w2), 0, 0), { color: o.madera });
        }
      }
      return y + rise;
    }

    function chimenea(B, x, y, z, h, o) {
      B.add('piedra', boxM(0.8, h, 0.8, TILE.piedra), xf(x, y + h / 2, z), { color: [1.05, 1.0, 0.95], grime: 1.2, y0: y, uvo: [rng(), rng()], jit: 0.1 });
      B.add('piedra', boxM(1.0, 0.16, 1.0, TILE.piedra), xf(x, y + h + 0.08, z), { color: [0.95, 0.92, 0.88] });
      B.add('hierro', boxM(0.34, 0.3, 0.34, 1), xf(x, y + h + 0.3, z), {});
      o.chim.push([x, y + h + 0.5, z]);
    }

    /* ---- edificios ---- */
    const COL = { revoco: [[1.32, 1.25, 1.1], [1.38, 1.32, 1.2], [1.28, 1.24, 1.12]], madera: [[0.62, 0.45, 0.32], [0.5, 0.38, 0.28], [0.56, 0.4, 0.3]] };
    function casaEntramado(B, o) {   // o: {w, d, pisos, ang, chim, tint}
      const w = o.w, d = o.d, y0 = o.y0 || 0, ph = 2.55, rev = o.revoco || COL.revoco[0], mad = o.madera || COL.madera[0];
      const plinth = 0.8;
      B.add('piedra', boxM(w + 0.16, plinth + 1.2, d + 0.16, TILE.piedra, 0.4), xf(0, -1.2 + (plinth + 1.2) / 2, 0), { color: [1.15, 1.1, 1.0], grime: 1.0, y0: 0, uvo: [rng(), rng()], jit: 0.12, dirt: 0.9, moss: 1.2 });
      let y = plinth; const grime = 1.2;
      const g = { revoco: rev, madera: mad, y0: 0, grime };
      // planta baja
      const walls = (ww, dd, yb, h, gm) => {
        const oo = { revoco: rev, madera: mad, y0: gm ? 0 : -9, grime: gm ? 1.4 : 0 };
        paredEntramado(B, mul(xf(0, yb, dd / 2), new M4()), ww, h, oo);
        paredEntramado(B, mul(xf(0, yb, -dd / 2, 0, Math.PI), new M4()), ww, h, oo);
        paredEntramado(B, mul(xf(ww / 2, yb, 0, 0, Math.PI / 2), new M4()), dd, h, oo);
        paredEntramado(B, mul(xf(-ww / 2, yb, 0, 0, -Math.PI / 2), new M4()), dd, h, oo);
      };
      walls(w, d, y, ph, true);
      // ventanas y puerta en la fachada (+z)
      const fm = xf(0, y, d / 2 + 0.11);
      ventana(B, mul(fm, xf(-w * 0.28, 1.45, 0)), 0.62, 0.8, { postigos: true, maceta: true });
      ventana(B, mul(fm, xf(w * 0.3, 1.45, 0)), 0.62, 0.8, { postigos: rng() < 0.7, maceta: rng() < 0.5 });
      puerta(B, fm, 1.0, 1.95, { rise: plinth, marco: mad });
      farolPared(B, mul(fm, xf(0.95, 2.0, 0.04)));
      hiedra(B, fm, -w / 2 + 0.35, 0.1, 2.4, new V(0, 0, 1), 8); hiedra(B, mul(xf(w / 2, y, 0, 0, Math.PI / 2), new M4()), d * 0.3, 0.1, 2.4, new V(0, 0, 1), 6);
      for (let i = 0; i < 5; i++) if (i !== 2) mata(B, xf(0, 0, d / 2 + 0.22), -w / 2 + 0.5 + i * (w - 1) / 4 + (rng() - 0.5) * 0.4, 0, 0.0, 0.3, 14, i === 1 || i === 3 ? { n: 5, cols: FLOWERS[i % 3] } : null);
      lenia(B, xf(w / 2 + 0.05, 0, -d * 0.12, 0, Math.PI / 2), 1.5, 1.0);
      y += ph;
      let top = y;
      if (o.pisos > 1) {   // segundo piso volado 0,3 m al frente con vigas de apoyo
        const ov = 0.3;
        for (let i = 0; i < Math.round(w / 0.7) + 1; i++) B.add('madera', bar(ov + 0.5, 0.12, 0.18, 0.014), xf(-w / 2 + i * w / Math.round(w / 0.7), y - 0.12, d / 2 + ov / 2 - 0.15), { color: mad, uvo: [rng(), rng()], jit: 0.2 });
        B.add('madera', bar(w + 0.6, 0.2, 0.22, 0.016), xf(0, y - 0.02, d / 2 + ov - 0.02, 0, Math.PI / 2, 0), { color: mad });
        const h2 = 2.35, dd = d + ov, zc = ov / 2;
        const oo = { revoco: rev, madera: mad, y0: -9, grime: 0 };
        paredEntramado(B, xf(0, y, zc + dd / 2), w, h2, oo);
        paredEntramado(B, xf(0, y, zc - dd / 2, 0, Math.PI), w, h2, oo);
        paredEntramado(B, xf(w / 2, y, zc, 0, Math.PI / 2), dd, h2, oo);
        paredEntramado(B, xf(-w / 2, y, zc, 0, -Math.PI / 2), dd, h2, oo);
        const fm2 = xf(0, y, zc + dd / 2 + 0.11);
        ventana(B, mul(fm2, xf(-w * 0.27, 1.25, 0)), 0.6, 0.78, { postigos: true, maceta: rng() < 0.7 });
        ventana(B, mul(fm2, xf(w * 0.27, 1.25, 0)), 0.6, 0.78, { postigos: true, maceta: rng() < 0.5 });
        y += h2; top = y;
      } else {   // buhardilla en el tejado
        top = y;
      }
      // tejado
      const zoff = o.pisos > 1 ? 0.15 : 0;
      const roofY = top + 0.02, Dd = o.pisos > 1 ? d + 0.3 : d;
      const tm = xf(0, 0, zoff);
      B.push(tm);
      const ridge = tejadoDosAguas(B, w, Dd, roofY, { ang: o.ang || 50, alero: o.alero || 0.5, color: o.teja || [1.15, 1, 0.9], revoco: rev, madera: mad });
      chimenea(B, w / 2 - 0.9, roofY + 0.2, -Dd / 2 * 0.2, (ridge - roofY) + 0.9, o);
      B.pop();
      if (o.lucerna) {   // lucerna sobre la fachada
        const lm = xf(-w * 0.2, roofY + 0.5, Dd / 2 * 0.52 + zoff);
        B.add('revoco', boxM(1.1, 1.0, 0.8, TILE.revoco), lm, { color: rev });
        ventana(B, mul(lm, xf(0, 0.05, 0.4)), 0.5, 0.6, { postigos: false });
        for (let sgn = -1; sgn <= 1; sgn += 2) { const pts = [new V(sgn * 0.65, 0.5, 0.5), new V(sgn * 0.65, 0.5, -0.4), new V(0, 1.15, -0.4), new V(0, 1.15, 0.55)]; roofPoly(B, pts.map((p) => p.applyMatrix4(lm)), new V(0, 0, 1), null, { color: o.teja || [1.15, 1, 0.9] }); }
      }
      o.col.push({ x: 0, z: zoff, w: w + 0.3, d: Dd });
    }

    function casaPiedra(B, o) {   // cuatro aguas
      const w = o.w, d = o.d, h = 4.2, y0 = 0;
      B.add('piedra', boxM(w, h + 1.2, d, TILE.piedra, 0.5), xf(0, -1.2 + (h + 1.2) / 2, 0), { color: [1.25, 1.2, 1.1], grime: 1.6, y0: 0, uvo: [rng(), rng()], jit: 0.14, dirt: 1, moss: 1.3 });
      // sillares de esquina que sobresalen (alternados)
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) for (let i = 0; i < 11; i++) {
        const lw = i % 2 ? 0.52 : 0.34, ld = i % 2 ? 0.34 : 0.52;
        B.add('piedra', boxM(lw, 0.34, ld, TILE.piedra), xf(sx * (w / 2 - lw / 2 + 0.035), 0.17 + i * 0.37, sz * (d / 2 - ld / 2 + 0.035)), { color: [1.45, 1.4, 1.3], grime: 1.2, y0: 0, uvo: [rng(), rng()], jit: 0.12 });
      }
      B.add('piedra', boxM(w + 0.2, 0.3, d + 0.2, TILE.piedra), xf(0, h + 0.15, 0), { color: [1.2, 1.15, 1.1] });   // cornisa
      const fm = xf(0, 0, d / 2);
      puerta(B, fm, 1.0, 2.0, { rise: 0.2, marco: [0.55, 0.52, 0.48], puerta: [0.3, 0.22, 0.16] });
      B.add('piedra', boxM(1.7, 0.24, 0.5, TILE.piedra), mul(fm, xf(0, 2.3, 0.12)), { color: [1.3, 1.25, 1.2] });
      B.add('piedra', boxM(0.3, 2.1, 0.3, TILE.piedra), mul(fm, xf(-0.75, 1.05, 0.1)), { color: [1.3, 1.25, 1.2] }); B.add('piedra', boxM(0.3, 2.1, 0.3, TILE.piedra), mul(fm, xf(0.75, 1.05, 0.1)), { color: [1.3, 1.25, 1.2] });
      farolPared(B, mul(fm, xf(-1.2, 2.2, 0.1)));
      ventana(B, mul(fm, xf(-w * 0.3, 1.5, 0.04)), 0.7, 1.0, { postigos: true, maceta: true }); ventana(B, mul(fm, xf(w * 0.3, 1.5, 0.04)), 0.7, 1.0, { postigos: true });
      ventana(B, mul(fm, xf(-w * 0.3, 3.2, 0.04)), 0.55, 0.8, { postigos: true }); ventana(B, mul(fm, xf(w * 0.3, 3.2, 0.04)), 0.55, 0.8, { postigos: true, maceta: true });
      hiedra(B, fm, w / 2 - 0.4, 0.05, 4.0, new V(0, 0, 1), 9); hiedra(B, xf(-w / 2, 0, 0, 0, -Math.PI / 2), -d * 0.2, 0.05, 3.2, new V(0, 0, 1), 7);
      for (let i = 0; i < 6; i++) if (Math.abs(i - 2.5) > 0.6) mata(B, xf(0, 0, d / 2 + 0.2), -w / 2 + 0.6 + i * (w - 1.2) / 5, 0, 0, 0.3, 14, i % 2 ? { n: 5, cols: FLOWERS[i % 3] } : null);
      lenia(B, xf(-w / 2 - 0.05, 0, d * 0.15, 0, -Math.PI / 2), 1.8, 1.1);
      for (let i = 0; i < Math.round((w + d) * 2 / 0.55); i++) {   // modillones bajo la cornisa
        const t = (i * 0.55) % (2 * (w + d)); let x, z, ry;
        if (t < w) { x = -w / 2 + t; z = d / 2 + 0.05; ry = 0; } else if (t < w + d) { x = w / 2 + 0.05; z = d / 2 - (t - w); ry = Math.PI / 2; } else if (t < 2 * w + d) { x = w / 2 - (t - w - d); z = -d / 2 - 0.05; ry = Math.PI; } else { x = -w / 2 - 0.05; z = -d / 2 + (t - 2 * w - d); ry = -Math.PI / 2; }
        B.add('piedra', boxM(0.18, 0.22, 0.2, TILE.piedra), xf(x, h - 0.06, z, 0, ry), { color: [1.4, 1.35, 1.25], uvo: [rng(), rng()] });
      }
      // cuatro aguas
      const ang = 46 * Math.PI / 180, ov = 0.55, y = h + 0.3, hx = w / 2 + ov, hz = d / 2 + ov, rise = Math.tan(ang) * (d / 2 + ov), rl = (w - d) / 2;
      const cr = new V(rl, y + rise, 0), cl = new V(-rl, y + rise, 0);
      const T = rise / Math.tan(ang);
      const yE = y - Math.tan(ang) * ov * 0.2;
      const A = new V(-hx, yE, hz), Bp = new V(hx, yE, hz), Cc = new V(hx, yE, -hz), Dd = new V(-hx, yE, -hz);
      const col = o.teja || [1.1, 0.95, 0.85];
      const rr = Math.max(0.01, (w - d) / 2);
      const top1 = new V(rr, y + rise, 0), top2 = new V(-rr, y + rise, 0);
      roofPoly(B, [A, Bp, top1, top2], new V(1, 0, 0), null, { color: col });
      roofPoly(B, [Cc, Dd, top2, top1], new V(1, 0, 0), null, { color: col });
      roofPoly(B, [Bp, Cc, top1], new V(0, 0, -1), null, { color: col });
      roofPoly(B, [Dd, A, top2], new V(0, 0, 1), null, { color: col });
      const cg = new THREE.CylinderGeometry(0.12, 0.14, 2 * rr + 0.3, 8, 1); cg.rotateZ(Math.PI / 2); B.add('teja', cg, xf(0, y + rise + 0.04, 0), { color: col });
      chimenea(B, rr * 0.6, y + rise * 0.55, 0, rise * 0.55 + 1.3, o);
      o.col.push({ x: 0, z: 0, w: w + 0.2, d: d + 0.2 });
    }

    function almacen(B, o) {
      const w = o.w, d = o.d, h = 3.0;
      B.add('piedra', boxM(w + 0.1, 1.3 + 0.9, d + 0.1, TILE.piedra, 0.5), xf(0, -1.2 + 1.1, 0), { color: [1.15, 1.1, 1.0], grime: 1.0, y0: 0, uvo: [rng(), rng()], dirt: 1, moss: 1.2 });
      // tablas verticales (textura madera en metros, tinte gris-parda)
      for (const [x, z, ry, ww] of [[0, d / 2, 0, w], [0, -d / 2, Math.PI, w], [w / 2, 0, Math.PI / 2, d], [-w / 2, 0, -Math.PI / 2, d]])
        B.add('madera', boxM(ww, h - 0.9, 0.2, 1.2, 0.5), xf(x, 0.9 + (h - 0.9) / 2, z, 0, ry), { color: [0.78, 0.66, 0.54], grime: 1.2, y0: 0.9, uvo: [rng(), rng()], jit: 0.1, dirt: 1, moss: 0.4 });
      for (let i = 0; i <= Math.round(w / 1.6); i++) for (const sz of [1, -1]) B.add('madera', bar(h, 0.16, 0.18, 0.016), xf(-w / 2 + i * w / Math.round(w / 1.6), 0.9 + h / 2 - 0.45, sz * (d / 2 + 0.05), Math.PI / 2, 0, 0), { color: [0.5, 0.38, 0.28], jit: 0.2 });
      // portón grande y trampilla del henil
      B.add('madera', boxM(2.4, 2.3, 0.1, 1.0), xf(0, 0.9 + 1.15, d / 2 + 0.12), { color: [0.4, 0.3, 0.22], uvo: [rng(), rng()] });
      for (const x of [-0.6, 0, 0.6]) B.add('hierro', boxM(0.05, 2.1, 0.03, 1), xf(x, 0.9 + 1.15, d / 2 + 0.19), {});
      B.add('madera', boxM(0.9, 0.9, 0.08, 1.0), xf(w * 0.28, h - 0.45 + 0.9 * 0.5 - 0.5, d / 2 + 0.12), { color: [0.4, 0.3, 0.22] });
      hiedra(B, xf(w / 2, 0.9, 0, 0, Math.PI / 2), d * 0.25, 0.1, 2.0, new V(0, 0, 1), 7);
      lenia(B, xf(-w * 0.32, 0.9 - 0.9, d / 2 + 0.2, 0, 0), 1.8, 1.0);
      for (let i = 0; i < 5; i++) mata(B, xf(0, 0, d / 2 + 0.25), -w / 2 + 0.6 + i * (w - 1.2) / 4, 0, 0, 0.3, 12, i % 2 ? { n: 4, cols: FLOWERS[i % 3] } : null);
      tejadoDosAguas(B, w, d, h + 0.9, { ang: 40, alero: 0.55, color: o.teja || [1.05, 0.95, 0.85], revoco: o.revoco || COL.revoco[1], madera: COL.madera[1] });
      o.col.push({ x: 0, z: 0, w: w + 0.2, d: d + 0.2 });
    }

    function torre(B, o) {
      const r0 = 2.7, r1 = 2.35, h = 7.4, seg = 28;
      const g = new THREE.CylinderGeometry(r1, r0, h + 1.2, seg, 18, true);
      const p = g.attributes.position, uv = g.attributes.uv, circ = 2 * Math.PI * 2.5;
      for (let i = 0; i < p.count; i++) {   // ruido de vértices ±3 cm: la superficie deja de ser un cilindro perfecto
        const a = Math.atan2(p.getZ(i), p.getX(i)), y = p.getY(i), n = (Math.sin(a * 7 + y * 3.1) + Math.sin(a * 13 - y * 1.7)) * 0.015, r = Math.hypot(p.getX(i), p.getZ(i)) + n;
        p.setXYZ(i, Math.cos(a) * r, y, Math.sin(a) * r); uv.setXY(i, uv.getX(i) * circ / TILE.piedra, (uv.getY(i) * (h + 1.2)) / TILE.piedra);
      }
      g.computeVertexNormals();
      B.add('piedra', g, xf(0, (h + 1.2) / 2 - 1.2, 0), { color: [1.3, 1.25, 1.15], grime: 1.8, y0: 0, jit: 0.1, dirt: 1, moss: 1.3 });
      for (const a of [0.9, 2.6, 4.4]) hiedra(B, xf(Math.cos(a) * 2.58, 0, Math.sin(a) * 2.58, 0, -a + Math.PI / 2), 0, 0.0, 3.0 + rng() * 2.5, new V(0, 0, 1), 8);
      for (let i = 0; i < 12; i++) { const a = i * 0.52 + rng() * 0.3; mata(B, xf(0, 0, 0), Math.cos(a) * 2.9, 0, Math.sin(a) * 2.9, 0.3, 12, null); }
      // anillos de piedra (zócalo y cornisa con modillones)
      const ring = (r, y, hh, c) => { const cg = new THREE.CylinderGeometry(r, r, hh, seg, 1); const uv2 = cg.attributes.uv; for (let i = 0; i < uv2.count; i++) uv2.setXY(i, uv2.getX(i) * 2 * Math.PI * r / TILE.piedra, uv2.getY(i) * hh / TILE.piedra); B.add('piedra', cg, xf(0, y, 0), { color: c }); };
      ring(2.82, 0.2, 0.5, [1.4, 1.35, 1.25]); ring(2.72, h - 0.1, 0.35, [1.4, 1.35, 1.25]);
      for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; B.add('piedra', boxM(0.4, 0.5, 0.55, TILE.piedra), xf(Math.cos(a) * 2.45, h - 0.55, Math.sin(a) * 2.45, 0, -a + Math.PI / 2), { color: [1.4, 1.35, 1.25], uvo: [rng(), rng()] }); }
      // troneras, ventana y puerta
      for (const [y, a] of [[2.2, 0.4], [3.4, 2.2], [4.6, 4.0], [5.6, 5.4], [6.4, 1.2]]) { const m = xf(Math.cos(a) * 2.5, y, Math.sin(a) * 2.5, 0, -a + Math.PI / 2); B.add('cristal', new THREE.PlaneGeometry(0.22, 0.85), mul(m, xf(0, 0, 0.02)), {}); B.add('piedra', boxM(0.5, 1.1, 0.16, TILE.piedra), mul(m, xf(0, 0, -0.05)), { color: [1.5, 1.45, 1.35] }); }
      const dm = xf(Math.cos(1.57) * 2.62, 0, Math.sin(1.57) * 2.62, 0, -1.57 + Math.PI / 2);
      B.add('madera', boxM(1.1, 2.0, 0.14, 1), mul(dm, xf(0, 1.0, 0.0)), { color: [0.3, 0.22, 0.16] }); B.add('piedra', boxM(1.5, 0.3, 0.4, TILE.piedra), mul(dm, xf(0, 2.15, -0.05)), { color: [1.5, 1.45, 1.35] });
      // tejado cónico con teja (UV en metros alrededor del cono)
      const ch = 4.2, cr = 3.5, cy = h + 0.15, cgeo = new THREE.ConeGeometry(cr, ch, 32, 1, true), cp = cgeo.attributes.position, cu = cgeo.attributes.uv, sl = Math.hypot(cr, ch);
      for (let i = 0; i < cu.count; i++) cu.setXY(i, cu.getX(i) * 2 * Math.PI * cr / TILE.teja * 0.9, cu.getY(i) * sl / TILE.teja);
      B.add('teja', cgeo, xf(0, cy + ch / 2, 0), { color: [1.1, 0.95, 0.85], jit: 0.1 });
      const fg = new THREE.CylinderGeometry(cr + 0.02, cr + 0.02, 0.1, 32, 1, true); B.add('madera', fg, xf(0, cy + 0.03, 0), { color: [0.4, 0.3, 0.24] });
      B.add('hierro', new THREE.CylinderGeometry(0.03, 0.05, 1.1, 8), xf(0, cy + ch + 0.45, 0), {}); B.add('hierro', new THREE.SphereGeometry(0.11, 10, 8), xf(0, cy + ch + 1.0, 0), {});
      o.col.push({ circle: true, x: 0, z: 0, r: 2.95 });
    }

    return { rot, Builder, casaEntramado, casaPiedra, almacen, torre, bar, boxM, xf, mul, COL, TILE };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { crear }; else root.FenixEdificios = { crear };
})(typeof window !== 'undefined' ? window : globalThis);
