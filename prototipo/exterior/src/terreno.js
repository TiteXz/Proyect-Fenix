/* Modelo de terreno puro (sin three.js) de la escena «Camino de la Aldea del Vado».
   Camino (spline Catmull-Rom de 7 puntos), campo de distancias, alturas y máscaras. Se incrusta en la maqueta dentro de aldea.js
   y se puede probar en Node: node prototipo/pruebas/terreno.test.js */
(function (root) {
  'use strict';
  function mulberry32(a) { return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash2(x, y, s) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise2(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm2(x, y, s, oct) { let t = 0, a = 0.5, f = 1; for (let i = 0; i < (oct || 4); i++) { t += a * vnoise2(x * f, y * f, s + i * 17); a *= 0.5; f *= 2.03; } return t; }
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  const PTS = [[0, 58], [-3, 42], [-9, 20], [-3, 0], [7, -15], [4, -32], [0, -46], [0, -62]];
  const SIZE = 120, HALF = 60, SEG = 160;

  function crear(seed) {
    seed = seed | 0 || 1337;
    // spline Catmull-Rom centrípeta simple, muestreada cada ~0,4 m
    const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
    const P = PTS, n = P.length, cx = [], cz = [];
    for (let i = 0; i < n - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), k = Math.ceil(len / 0.4);
      for (let j = 0; j < k; j++) { const t = j / k; cx.push(cr(p0[0], p1[0], p2[0], p3[0], t)); cz.push(cr(p0[1], p1[1], p2[1], p3[1], t)); }
    }
    cx.push(P[n - 1][0]); cz.push(P[n - 1][1]);
    const M = cx.length, cs = new Float32Array(M);
    for (let i = 1; i < M; i++) cs[i] = cs[i - 1] + Math.hypot(cx[i] - cx[i - 1], cz[i] - cz[i - 1]);
    // la aldea empieza en la puerta (0,-46): s de la puerta
    let sGate = 0; for (let i = 0; i < M; i++) if (cz[i] <= -46) { sGate = cs[i]; break; }
    const L = sGate, H_GATE = 13.2, H_PLAT = 14;
    const ease = (t) => 0.78 * t + 0.22 * sstep(0.03, 1, t);
    const roadH = (s) => (s >= L ? H_GATE + (H_PLAT - H_GATE) * sstep(0, 14, s - L) : H_GATE * ease(Math.max(0, s) / L));
    // semianchura del camino con ruido (±0,4 m de ancho total)
    const halfW = (s) => 1.6 + (fbm2(s * 0.09, 3.1, seed, 3) - 0.5) * 0.8;

    // campo de distancias al eje (rejilla 0,5 m): dist, s, lado (signo), x e z del punto más cercano
    const G = 0.5, GN = Math.round(SIZE / G) + 1;
    const gd = new Float32Array(GN * GN), gs = new Float32Array(GN * GN), gl = new Float32Array(GN * GN);
    // índice espacial: celdas de 4 m
    const B = 4, BN = Math.ceil(SIZE / B) + 1, bucket = [];
    for (let i = 0; i < BN * BN; i++) bucket.push([]);
    for (let i = 0; i < M; i++) {
      const bx = Math.floor((cx[i] + HALF) / B), bz = Math.floor((cz[i] + HALF) / B);
      if (bx >= 0 && bz >= 0 && bx < BN && bz < BN) bucket[bz * BN + bx].push(i);
    }
    for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
      const x = -HALF + i * G, z = -HALF + j * G;
      let best = 1e9, bi = -1;
      const bx = Math.floor((x + HALF) / B), bz = Math.floor((z + HALF) / B);
      for (let r = 1; r < 40 && bi < 0; r++) {
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r && r > 1) continue;
          const xx = bx + dx, zz = bz + dz; if (xx < 0 || zz < 0 || xx >= BN || zz >= BN) continue;
          const bl = bucket[zz * BN + xx];
          for (let k = 0; k < bl.length; k++) { const q = bl[k], d = (cx[q] - x) * (cx[q] - x) + (cz[q] - z) * (cz[q] - z); if (d < best) { best = d; bi = q; } }
        }
        if (bi >= 0 && Math.sqrt(best) > r * B - B) { /* puede haber algo más cerca en el anillo siguiente */ bi = bi; }
      }
      if (bi < 0) { // fuera de alcance: búsqueda bruta
        for (let q = 0; q < M; q++) { const d = (cx[q] - x) * (cx[q] - x) + (cz[q] - z) * (cz[q] - z); if (d < best) { best = d; bi = q; } }
      }
      // refinamiento: el anillo adyacente ya se exploró (r+1 no se visita si bi>=0); con celdas de 4 m y puntos cada 0,4 m el error es < 1 cm
      const k = j * GN + i; gd[k] = Math.sqrt(best); gs[k] = cs[bi];
      const tx = bi + 1 < M ? cx[bi + 1] - cx[bi] : cx[bi] - cx[bi - 1], tz = bi + 1 < M ? cz[bi + 1] - cz[bi] : cz[bi] - cz[bi - 1];
      gl[k] = (tx * (z - cz[bi]) - tz * (x - cx[bi])) >= 0 ? 1 : -1;
    }
    const bil = (arr, x, z) => {
      let fx = (x + HALF) / G, fz = (z + HALF) / G; fx = Math.min(GN - 1.001, Math.max(0, fx)); fz = Math.min(GN - 1.001, Math.max(0, fz));
      const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * GN + i;
      return arr[k] * (1 - u) * (1 - v) + arr[k + 1] * u * (1 - v) + arr[k + GN] * (1 - u) * v + arr[k + GN + 1] * u * v;
    };
    const roadDist = (x, z) => bil(gd, x, z);
    const roadS = (x, z) => bil(gs, x, z);
    const roadSide = (x, z) => { const k = Math.min(GN - 1, Math.max(0, Math.round((z + HALF) / G))) * GN + Math.min(GN - 1, Math.max(0, Math.round((x + HALF) / G))); return gl[k]; };

    // altura natural: rampa que sigue el perfil del camino + loma + bordes + ruido
    const zToS = (z) => { // s del eje para una z (z decrece con s): búsqueda binaria
      let lo = 0, hi = M - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cz[m] > z) lo = m; else hi = m; } return cs[lo];
    };
    const ramp = new Float32Array(Math.round(SIZE / 0.5) + 1);
    for (let i = 0; i < ramp.length; i++) ramp[i] = roadH(zToS(HALF - i * 0.5));
    const rampAt = (z) => { const f = Math.min(ramp.length - 1.001, Math.max(0, (HALF - z) / 0.5)), i = f | 0; return ramp[i] + (ramp[i + 1] - ramp[i]) * (f - i); };
    function natural(x, z) {
      const dR = roadDist(x, z);
      let h = rampAt(z) * (1 - 0.7 * sstep(3.5, 12, dR));                                            // la loma es un espolón: el camino sube por la cresta y los flancos caen (talud)
      h += (fbm2(x * 0.045, z * 0.045, seed) - 0.5) * 3.2 * (0.3 + 0.7 * sstep(3, 18, dR));          // ondulación suave del prado
      h += (fbm2(x * 0.16, z * 0.16, seed + 9) - 0.5) * 0.45;                                       // pequeñas irregularidades
      h += sstep(26, 58, Math.abs(x)) * 7.5 * (0.6 + 0.8 * fbm2(x * 0.03, z * 0.03, seed + 4));      // laderas laterales del valle
      h += sstep(36, 60, z) * 1.5;                                                                    // fondo del valle al sur
      return h;
    }
    function baseHeight(x, z) {
      const dR = roadDist(x, z), s = roadS(x, z), w = halfW(s);
      let h = natural(x, z);
      const wp = sstep(-37, -46, z) * (1 - sstep(22, 33, Math.abs(x)));                                // meseta de la aldea (14 m), con flancos de talud
      h += (H_PLAT + (fbm2(x * 0.1, z * 0.1, seed + 2) - 0.5) * 0.6 - h) * wp;
      // camino con ligero abombado inverso (rodadas) y banco suave al lado
      const rh = roadH(s) - 0.1 * (1 - Math.min(1, (dR / w) ** 2));
      const wgt = 1 - sstep(w + 0.4, w + 3.6, dR);
      return h + (rh - h) * wgt;
    }
    // talud rocoso: donde la pendiente del terreno base es fuerte se añaden estratos escalonados y salientes (ruido «ridged»), nunca sobre el camino ni la meseta
    function rockiness(x, z) {
      const e = 0.8, sl = Math.hypot(baseHeight(x + e, z) - baseHeight(x - e, z), baseHeight(x, z + e) - baseHeight(x, z - e)) / (2 * e);
      return sstep(0.5, 0.95, sl);
    }
    function height(x, z) {
      const h = baseHeight(x, z), m = rockiness(x, z);
      if (m < 0.001) return h;
      const t = h * 0.5 + (fbm2(x * 0.22, z * 0.22, seed + 31, 3) - 0.5) * 2.4, f = t - Math.floor(t);
      const terrace = (Math.floor(t) + sstep(0.5, 0.95, f) - t) * 1.1;                     // repisas de ~2 m con frente casi vertical
      const rid = (1 - Math.abs(fbm2(x * 0.45, z * 0.45, seed + 47, 3) * 2 - 1)) - 0.55;  // crestas y grietas
      return h + m * (terrace * 0.85 + rid * 1.5 + (fbm2(x * 1.3, z * 1.3, seed + 53, 2) - 0.5) * 0.35);
    }
    // malla
    const N1 = SEG + 1, hm = new Float32Array(N1 * N1);
    for (let j = 0; j < N1; j++) for (let i = 0; i < N1; i++) hm[j * N1 + i] = height(-HALF + i * SIZE / SEG, -HALF + j * SIZE / SEG);
    const cell = SIZE / SEG;
    const hAt = (x, z) => {
      let fx = (x + HALF) / cell, fz = (z + HALF) / cell; fx = Math.min(SEG - 0.001, Math.max(0, fx)); fz = Math.min(SEG - 0.001, Math.max(0, fz));
      const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * N1 + i;
      // misma diagonal que PlaneGeometry (a,b,d / b,c,d): se interpola por triángulo
      const h00 = hm[k], h10 = hm[k + 1], h01 = hm[k + N1], h11 = hm[k + N1 + 1];
      return u + v <= 1 ? h00 + (h10 - h00) * u + (h01 - h00) * v : h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
    };
    const slopeAt = (x, z) => { const e = 0.6, dx = (hAt(x + e, z) - hAt(x - e, z)) / (2 * e), dz = (hAt(x, z + e) - hAt(x, z - e)) / (2 * e); return Math.hypot(dx, dz); };   // tan(ángulo)
    return { seed, PTS, SIZE, HALF, SEG, cx, cz, cs, M, L, sGate, H_GATE, H_PLAT, roadH, halfW, roadDist, roadS, roadSide, height, hAt, slopeAt, hm, N1, cell, fbm2, vnoise2, hash2, sstep, mulberry32 };
  }
  const api = { crear, mulberry32, hash2, vnoise2, fbm2, sstep, SIZE, HALF, SEG };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FenixTerreno = api;
})(typeof window !== 'undefined' ? window : globalThis);
