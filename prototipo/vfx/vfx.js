/* FenixVFX — efectos visuales de hechizos (three.js r147, script global).
 * window.FenixVFX(THREE, scene, camera, { flash, pixelHeight, anisotropy }) -> api
 * Pensado para un pipeline HDR lineal (HalfFloat RT -> bloom -> exposición+ACES+gamma):
 * los colores > 1 brillan. Todo se reutiliza (pools); solo se reserva memoria al crear el módulo.
 */
(function () {
  'use strict';

  window.FenixVFX = function (THREE, scene, camera, opts) {
    opts = opts || {};
    var flash = opts.flash || function () {};
    var ANISO = opts.anisotropy || 4;
    var TAU = Math.PI * 2;
    var rand = Math.random;
    function rr(a, b) { return a + (b - a) * rand(); }
    function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function easeOut(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }

    // ---------------------------------------------------------------- utilidades
    var _c = new THREE.Color(), _c2 = new THREE.Color();
    var _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3();
    var UP = new THREE.Vector3(0, 1, 0);
    var U_TIME = { value: 0 };
    var disposables = [];
    function track(o) { disposables.push(o); return o; }
    function lin(hex, out) { return out.setHex(hex).convertSRGBToLinear(); }

    function canvas(w, h) {
      var c = document.createElement('canvas'); c.width = w; c.height = h || w; return c;
    }
    function ctex(cv, wrap) {
      var t = new THREE.CanvasTexture(cv);
      t.anisotropy = ANISO;
      if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
      return track(t);
    }
    // RNG determinista (mulberry32)
    function rng(seed) {
      var a = seed >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        var t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    // ---------------------------------------------------------------- texturas procedurales
    // Atlas 2x2 de puntos aditivos: 0 punto suave, 1 destello en estrella, 2 lengua de llama, 3 ascua
    var sparkAtlas = (function () {
      var S = 128, cv = canvas(S * 2), g = cv.getContext('2d'), i, gr;
      // 0: punto suave (casi gaussiano)
      gr = g.createRadialGradient(64, 64, 0, 64, 64, 62);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.75)');
      gr.addColorStop(0.45, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
      // 1: destello de 4 puntas + halo
      g.save(); g.translate(S + 64, 64);
      gr = g.createRadialGradient(0, 0, 0, 0, 0, 40);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 40, 0, TAU); g.fill();
      for (i = 0; i < 4; i++) {
        var L = i % 2 ? 46 : 60;
        g.rotate(Math.PI / 2);
        var lg = g.createLinearGradient(0, 0, L, 0);
        lg.addColorStop(0, 'rgba(255,255,255,1)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = lg; g.beginPath(); g.moveTo(0, -3.2); g.lineTo(L, 0); g.lineTo(0, 3.2); g.closePath(); g.fill();
      }
      g.restore();
      // 2: lengua de llama: fBm con perfil de gota (ancha abajo, afilada arriba)
      (function () {
        var im = g.createImageData(S, S), dd = im.data;
        for (var py = 0; py < S; py++) for (var px = 0; px < S; px++) {
          var u = (px / S - 0.5) * 2, y = py / S, prof = Math.max(0, 1 - Math.abs(u + (fbm2(y * 3, 9, 7, 2) - 0.5) * 0.5) / (0.12 + 0.62 * Math.pow(y, 0.8)));
          var n = fbm2(u * 2.4 + 3, y * 3.6, 11, 4), vf = sstep(0.0, 0.22, y) * sstep(1.0, 0.72, y);
          var a = Math.max(0, Math.min(1, prof * vf * (n * 1.7 - 0.18))), idx = (py * S + px) * 4;
          dd[idx] = dd[idx + 1] = dd[idx + 2] = 255; dd[idx + 3] = a * 255;
        }
        g.putImageData(im, 0, S);
      })();
      // 3: ascua (núcleo duro + halo corto)
      gr = g.createRadialGradient(S + 64, S + 64, 0, S + 64, S + 64, 60);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.1, 'rgba(255,255,255,1)');
      gr.addColorStop(0.2, 'rgba(255,255,255,0.35)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.06)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(S, S, S, S);
      return ctex(cv);
    })();

    // ruido de valor 2D con semilla (para generar atlas al arrancar)
    function hash21(x, y, s) { var h = Math.imul((x * 374761393 + y * 668265263 + s * 1442695041) | 0, 1274126177); h = (h ^ (h >>> 13)) >>> 0; h = Math.imul(h, 1103515245) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
    function vn2(x, y, s) {
      var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      var a = hash21(ix, iy, s), b = hash21(ix + 1, iy, s), c = hash21(ix, iy + 1, s), d = hash21(ix + 1, iy + 1, s);
      return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
    }
    function fbm2(x, y, s, oct) { var a = 0.5, sum = 0, n = 0; for (var i = 0; i < oct; i++) { sum += a * vn2(x, y, s + i); n += a; x = x * 2.03 + 1.7; y = y * 2.03 - 3.1; a *= 0.5; } return sum / n; }
    function sstep(a, b, x) { var t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }

    // Atlas 2x2 de humo: ruido fBm de 5 octavas con dominio deformado (silueta irregular, sin círculos radiales). El alfa guarda la densidad.
    var smokeAtlas = (function () {
      var S = 256, cv = canvas(S * 2), g = cv.getContext('2d'), img = g.createImageData(S * 2, S * 2), d = img.data;
      for (var cell = 0; cell < 4; cell++) {
        var ox = (cell % 2) * S, oy = (cell >> 1) * S, sd = cell * 17 + 3;
        for (var py = 0; py < S; py++) for (var px = 0; px < S; px++) {
          var u = (px / S - 0.5) * 2, v = (py / S - 0.5) * 2, r = Math.sqrt(u * u + v * v);
          var wx = fbm2(u * 1.3 + sd, v * 1.3, sd + 1, 3) - 0.5, wy = fbm2(u * 1.3 - sd, v * 1.3 + 4, sd + 2, 3) - 0.5;
          var n = fbm2(u * 2.1 + wx * 1.7 + sd * 0.37, v * 2.1 + wy * 1.7, sd + 3, 5);
          var m = Math.pow(Math.max(0, Math.min(1, (1 - r) / 0.8)), 1.2);
          var val = Math.max(0, Math.min(1, (n - 0.3) * 2.1)) * m, idx = ((oy + py) * S * 2 + ox + px) * 4;
          d[idx] = d[idx + 1] = d[idx + 2] = 255; d[idx + 3] = val * 255;
        }
      }
      g.putImageData(img, 0, 0);
      return ctex(cv);
    })();

    var glowTex = (function () {
      var cv = canvas(128), g = cv.getContext('2d');
      var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.12, 'rgba(255,255,255,0.6)');
      gr.addColorStop(0.35, 'rgba(255,255,255,0.18)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.04)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      return ctex(cv);
    })();

    var ringTex = (function () {
      var cv = canvas(256), g = cv.getContext('2d');
      var gr = g.createRadialGradient(128, 128, 0, 128, 128, 127);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,0)');
      gr.addColorStop(0.86, 'rgba(255,255,255,0.12)'); gr.addColorStop(0.94, 'rgba(255,255,255,1)');
      gr.addColorStop(0.975, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      return ctex(cv);
    })();

    // Marca quemada (oscura, alfa)
    var scorchTex = (function () {
      var S = 512, cv = canvas(S), g = cv.getContext('2d'), R = rng(99), i;
      for (i = 0; i < 90; i++) {
        var a = R() * TAU, d = Math.pow(R(), 0.7) * 150, x = 256 + Math.cos(a) * d, y = 256 + Math.sin(a) * d, r = 20 + R() * 60;
        var gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,' + (0.18 + R() * 0.2) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
      // rayos de quemadura
      g.lineCap = 'round';
      for (i = 0; i < 48; i++) {
        var an = R() * TAU, r0 = 60 + R() * 60, r1 = r0 + 60 + R() * 120;
        g.strokeStyle = 'rgba(255,255,255,' + (0.08 + R() * 0.18) + ')'; g.lineWidth = 3 + R() * 10;
        g.beginPath(); g.moveTo(256 + Math.cos(an) * r0, 256 + Math.sin(an) * r0);
        g.lineTo(256 + Math.cos(an + rr(-0.06, 0.06)) * r1, 256 + Math.sin(an + rr(-0.06, 0.06)) * r1); g.stroke();
      }
      g.globalCompositeOperation = 'destination-in';
      var m = g.createRadialGradient(256, 256, 40, 256, 256, 255);
      m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.6, 'rgba(0,0,0,0.75)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = m; g.fillRect(0, 0, S, S);
      return ctex(cv);
    })();

    // Grietas (incandescentes para fuego / brillantes para hielo)
    function crackTexture(seed, branchy) {
      var S = 512, cv = canvas(S), g = cv.getContext('2d'), R = rng(seed);
      g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
      g.shadowColor = '#fff'; g.shadowBlur = 6;
      function branch(x, y, ang, len, w, depth) {
        g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
        var steps = 6 + (R() * 5 | 0), sl = len / steps;
        for (var i = 0; i < steps; i++) {
          ang += rr(-0.35, 0.35) * (branchy ? 0.5 : 1);
          x += Math.cos(ang) * sl; y += Math.sin(ang) * sl;
          g.lineTo(x, y);
          if (depth < (branchy ? 3 : 2) && R() < (branchy ? 0.5 : 0.25)) {
            g.stroke();
            var side = R() < 0.5 ? -1 : 1;
            branch(x, y, ang + side * (branchy ? 0.9 : rr(0.4, 1.1)), len * (branchy ? 0.35 : 0.45), w * 0.6, depth + 1);
            g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
          }
          w *= 0.93; g.lineWidth = w;
        }
        g.stroke();
      }
      var n = branchy ? 9 : 11;
      for (var k = 0; k < n; k++) {
        var a = k / n * TAU + rr(-0.2, 0.2);
        branch(256 + Math.cos(a) * 18, 256 + Math.sin(a) * 18, a, rr(130, 220), branchy ? 4 : 5, 0);
      }
      if (branchy) { // escarcha difusa central
        var gr = g.createRadialGradient(256, 256, 0, 256, 256, 200);
        gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.shadowBlur = 0; g.fillStyle = gr; g.fillRect(0, 0, S, S);
      }
      return ctex(cv);
    }
    var fireCrackTex = crackTexture(31, false);
    // Lava: celdas de Voronoi; las grietas (F2-F1 pequeño) brillan, las placas forman la costra oscura
    function voronoiTex(seed, crust) {
      var S = 256, cv = canvas(S), g = cv.getContext('2d'), img = g.createImageData(S, S), d = img.data, N = 6, px, py, i, j;
      for (py = 0; py < S; py++) for (px = 0; px < S; px++) {
        var wu = (fbm2(px / S * 3, py / S * 3, seed + 20, 3) - 0.5) * 2.2, wv = (fbm2(px / S * 3 + 7, py / S * 3, seed + 21, 3) - 0.5) * 2.2;
        var u = px / S * N + wu, v = py / S * N + wv, cx = Math.floor(u), cy = Math.floor(v), f1 = 9, f2 = 9;
        for (j = -1; j <= 1; j++) for (i = -1; i <= 1; i++) {
          var gx = cx + i, gy = cy + j, ox = gx + hash21(gx, gy, seed) * 0.85 + 0.07, oy = gy + hash21(gx, gy, seed + 5) * 0.85 + 0.07;
          var dd = Math.sqrt((u - ox) * (u - ox) + (v - oy) * (v - oy));
          if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
        }
        var e = f2 - f1, r = Math.sqrt(Math.pow(px / S - 0.5, 2) + Math.pow(py / S - 0.5, 2)) * 2, m = sstep(1.0, 0.45, r);
        var n = fbm2(px / S * 5, py / S * 5, seed + 9, 3), a;
        if (crust) a = m * sstep(0.03, 0.16, e + (n - 0.5) * 0.08) * 0.96;
        else a = m * (1 - sstep(0.0, 0.1 + n * 0.05, e)) * (0.55 + 0.9 * n);
        var k = (py * S + px) * 4; d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = Math.max(0, Math.min(1, a)) * 255;
      }
      g.putImageData(img, 0, 0); return ctex(cv);
    }
    var lavaGlowTex = voronoiTex(7, false), lavaCrustTex = voronoiTex(7, true);
    var frostTex = crackTexture(57, true);

    // Vetas verticales para la columna de luz (repetible)
    var streakTex = (function () {
      var W = 128, H = 256, cv = canvas(W, H), g = cv.getContext('2d'), R = rng(4242);
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 90; i++) {
        var x = R() * W, w = 1 + R() * 6, y = R() * H, h = 40 + R() * 200, al = 0.08 + R() * 0.3;
        for (var dx = -W; dx <= W; dx += W) for (var dy = -H; dy <= H; dy += H) {
          var lg = g.createLinearGradient(0, y + dy, 0, y + dy + h);
          lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,' + al + ')'); lg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = lg; g.fillRect(x + dx - w / 2, y + dy, w, h);
        }
      }
      return ctex(cv, true);
    })();

    // ---------------------------------------------------------------- círculos de runas
    var KINDS = {
      fuego: { seed: 1101, glyphs: 22, hex: 0xff6a1a, hdr: [2.4, 0.9, 0.2], sub: [1.9, 0.5, 0.1] },
      escarcha: { seed: 2203, glyphs: 26, hex: 0x8fdcff, hdr: [0.6, 1.5, 2.5], sub: [0.35, 1.0, 2.0] },
      luz: { seed: 3307, glyphs: 30, hex: 0xffd27a, hdr: [2.5, 1.9, 0.9], sub: [1.9, 1.3, 0.5] },
      rayo: { seed: 4409, glyphs: 24, hex: 0xb9a8ff, hdr: [0.7, 1.0, 2.0], sub: [0.5, 0.7, 1.6] },
      tierra: { seed: 5501, glyphs: 20, hex: 0xb0884e, hdr: [1.0, 0.7, 0.3], sub: [0.7, 0.5, 0.2] },
      sombra: { seed: 6607, glyphs: 28, hex: 0x8a4fd0, hdr: [0.5, 0.2, 0.9], sub: [0.35, 0.14, 0.7] },
      aire: { seed: 7703, glyphs: 24, hex: 0xcfeee2, hdr: [0.9, 1.1, 1.0], sub: [0.6, 0.8, 0.75] }
    };
    KINDS.hielo = KINDS.escarcha;
    function kindOf(k) { return KINDS[k] || KINDS.fuego; }

    // Glifo original: trazo vertical + 1-3 ramas/diagonales en rejilla 3x4 (+ marca opcional)
    function drawGlyph(g, R, w, h) {
      var cols = [-w / 2, 0, w / 2], rows = [-h / 2, -h / 6, h / 6, h / 2];
      g.beginPath(); g.moveTo(0, rows[0]); g.lineTo(0, rows[3]);
      var nb = 1 + (R() * 3 | 0), used = {};
      for (var b = 0; b < nb; b++) {
        var r0 = R() * 4 | 0, side = R() < 0.5 ? 0 : 2, type = R() * 4 | 0, key = r0 + '_' + side + '_' + type;
        if (used[key]) continue; used[key] = 1;
        var y0 = rows[r0];
        if (type === 0) { // diagonal hacia arriba
          var r1 = Math.max(0, r0 - 1); g.moveTo(0, y0); g.lineTo(cols[side], rows[r1] === y0 ? rows[0] : rows[r1]);
        } else if (type === 1) { // diagonal hacia abajo
          var r2 = Math.min(3, r0 + 1); g.moveTo(0, y0); g.lineTo(cols[side], rows[r2] === y0 ? rows[3] : rows[r2]);
        } else if (type === 2) { // rama horizontal con gancho
          g.moveTo(0, y0); g.lineTo(cols[side], y0); g.lineTo(cols[side], y0 + (r0 < 2 ? h / 5 : -h / 5));
        } else { // chevron
          var rm = Math.min(2, Math.max(1, r0));
          g.moveTo(0, rows[rm - 1]); g.lineTo(cols[side], rows[rm]); g.lineTo(0, rows[rm + 1]);
        }
      }
      g.stroke();
      if (R() < 0.35) { g.beginPath(); g.arc(R() < 0.5 ? -w * 0.42 : w * 0.42, rows[R() * 4 | 0] * 0.8, 2.6, 0, TAU); g.fill(); }
    }

    function glyphBand(g, R, cx, cy, rMid, count, gw, gh, lw) {
      g.lineWidth = lw;
      for (var i = 0; i < count; i++) {
        var a = i / count * TAU;
        g.save(); g.translate(cx + Math.cos(a) * rMid, cy + Math.sin(a) * rMid); g.rotate(a + Math.PI / 2);
        drawGlyph(g, R, gw, gh);
        g.restore();
        // separador: rombo pequeño
        var a2 = (i + 0.5) / count * TAU;
        g.save(); g.translate(cx + Math.cos(a2) * rMid, cy + Math.sin(a2) * rMid); g.rotate(a2);
        g.beginPath(); g.moveTo(-4, 0); g.lineTo(0, -4); g.lineTo(4, 0); g.lineTo(0, 4); g.closePath(); g.fill();
        g.restore();
      }
    }
    function ring(g, c, r, lw) { g.lineWidth = lw; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); }
    function starPoly(g, c, n, step, r, rot) {
      g.beginPath();
      for (var i = 0; i <= n; i++) {
        var k = (i * step) % n, a = k / n * TAU + rot;
        if (i === 0) g.moveTo(c + Math.cos(a) * r, c + Math.sin(a) * r); else g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
      }
      g.stroke();
    }
    function ticks(g, c, r0, r1, n, lw) {
      g.lineWidth = lw; g.beginPath();
      for (var i = 0; i < n; i++) { var a = i / n * TAU; g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); }
      g.stroke();
    }

    function drawRuneCircle2(g, kind) {   // rayo, tierra, sombra, aire: trazo fino, serifa de inscripción
      var K = kindOf(kind), R = rng(K.seed), c = 512, i, a;
      g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
      ring(g, c, 500, 4); ring(g, c, 480, 2); ticks(g, c, 484, 496, 72, 2);
      glyphBand(g, R, c, c, 432, K.glyphs, 30, 48, 3.2);
      ring(g, c, 388, 3); ring(g, c, 376, 1.5);
      g.lineWidth = 3;
      if (kind === 'rayo') { starPoly(g, c, 8, 3, 366, -Math.PI / 2); g.lineWidth = 2; starPoly(g, c, 8, 2, 296, -Math.PI / 2 + Math.PI / 8); }
      else if (kind === 'tierra') { for (i = 0; i < 2; i++) starPoly(g, c, 4, 1, 366, i * Math.PI / 4 + Math.PI / 4); g.lineWidth = 2; starPoly(g, c, 4, 1, 262, Math.PI / 4); for (i = 0; i < 4; i++) { a = i / 4 * TAU; g.beginPath(); g.arc(c + Math.cos(a) * 366, c + Math.sin(a) * 366, 12, 0, TAU); g.stroke(); } }
      else if (kind === 'sombra') { for (i = 0; i < 3; i++) { a = i / 3 * TAU - Math.PI / 2; g.beginPath(); g.arc(c + Math.cos(a) * 130, c + Math.sin(a) * 130, 230, 0, TAU); g.stroke(); } ring(g, c, 350, 2); }
      else { g.lineWidth = 2.4; for (var arm = 0; arm < 3; arm++) { g.beginPath(); for (var t = 0; t < 5.5 * Math.PI; t += 0.12) { var rr0 = 30 + t * 17, an = t + arm * TAU / 3; if (t === 0) g.moveTo(c + Math.cos(an) * rr0, c + Math.sin(an) * rr0); else g.lineTo(c + Math.cos(an) * rr0, c + Math.sin(an) * rr0); } g.stroke(); } }
      ring(g, c, 222, 2.5); glyphBand(g, R, c, c, 196, Math.round(K.glyphs * 0.6), 16, 24, 2.6); ring(g, c, 168, 2.5);
      g.save(); g.translate(c, c); g.lineWidth = 4;
      if (kind === 'rayo') { g.beginPath(); g.moveTo(24, -120); g.lineTo(-30, -10); g.lineTo(14, -10); g.lineTo(-22, 120); g.lineTo(46, -22); g.lineTo(0, -22); g.closePath(); g.stroke(); }
      else if (kind === 'tierra') { g.beginPath(); g.moveTo(-110, 70); g.lineTo(-40, -70); g.lineTo(0, -10); g.lineTo(46, -96); g.lineTo(118, 70); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(-60, 70); g.lineTo(-20, 20); g.lineTo(20, 70); g.stroke(); }
      else if (kind === 'sombra') { g.beginPath(); g.arc(0, 0, 100, Math.PI * 0.2, Math.PI * 1.8); g.arc(36, 0, 76, Math.PI * 1.75, Math.PI * 0.25, true); g.stroke(); g.beginPath(); g.arc(-56, -8, 8, 0, TAU); g.fill(); }
      else { g.lineWidth = 3.4; for (i = 0; i < 3; i++) { g.save(); g.rotate(i * TAU / 3); g.beginPath(); g.moveTo(-60, -40); g.bezierCurveTo(-20, -90, 60, -80, 70, -30); g.bezierCurveTo(78, 6, 40, 20, 24, -2); g.stroke(); g.restore(); } }
      g.restore();
    }
    function drawRuneCircle(g, kind) {
      if (kind === 'rayo' || kind === 'tierra' || kind === 'sombra' || kind === 'aire') return drawRuneCircle2(g, kind);
      var K = kindOf(kind), R = rng(K.seed), c = 512, i, a;
      g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
      // anillo exterior doble con muescas
      ring(g, c, 500, 7); ring(g, c, 478, 3);
      ticks(g, c, 482, 496, kind === 'luz' ? 96 : 72, 2);
      // banda de glifos
      glyphBand(g, R, c, c, 432, K.glyphs, 34, 54, 5);
      ring(g, c, 386, 4); ring(g, c, 372, 2);
      // figura geométrica
      if (kind === 'escarcha') {
        starPoly(g, c, 8, 3, 366, -Math.PI / 2); g.lineWidth = 3; starPoly(g, c, 8, 3, 366, -Math.PI / 2);
        g.lineWidth = 2; starPoly(g, c, 8, 2, 300, -Math.PI / 2 + Math.PI / 8);
        for (i = 0; i < 8; i++) { a = i / 8 * TAU - Math.PI / 2; g.lineWidth = 3; g.beginPath(); g.arc(c + Math.cos(a) * 366, c + Math.sin(a) * 366, 16, 0, TAU); g.stroke(); }
      } else if (kind === 'luz') {
        g.lineWidth = 3; starPoly(g, c, 12, 5, 366, -Math.PI / 2);
        g.lineWidth = 2; g.beginPath();
        for (i = 0; i < 24; i++) { a = i / 24 * TAU; var r1 = i % 2 ? 300 : 352; g.moveTo(c + Math.cos(a) * 226, c + Math.sin(a) * 226); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); }
        g.stroke();
        for (i = 0; i < 12; i++) { a = i / 12 * TAU - Math.PI / 2; g.beginPath(); g.arc(c + Math.cos(a) * 366, c + Math.sin(a) * 366, 7, 0, TAU); g.fill(); }
      } else {
        g.lineWidth = 4;
        starPoly(g, c, 3, 1, 366, -Math.PI / 2); starPoly(g, c, 3, 1, 366, Math.PI / 2);
        g.lineWidth = 2; ring(g, c, 212, 2);
        for (i = 0; i < 6; i++) { a = i / 6 * TAU - Math.PI / 2; g.lineWidth = 3; g.beginPath(); g.arc(c + Math.cos(a) * 366, c + Math.sin(a) * 366, 18, 0, TAU); g.stroke();
          g.beginPath(); g.arc(c + Math.cos(a) * 366, c + Math.sin(a) * 366, 6, 0, TAU); g.fill(); }
      }
      // banda interior de glifos menores
      ring(g, c, 222, 3);
      glyphBand(g, R, c, c, 196, Math.round(K.glyphs * 0.6), 18, 28, 3);
      ring(g, c, 168, 3); ring(g, c, 158, 1.5);
      // símbolo central
      g.save(); g.translate(c, c);
      if (kind === 'escarcha') {
        g.lineWidth = 7;
        for (i = 0; i < 6; i++) {
          g.save(); g.rotate(i / 6 * TAU);
          g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -128);
          g.moveTo(0, -52); g.lineTo(-30, -84); g.moveTo(0, -52); g.lineTo(30, -84);
          g.moveTo(0, -92); g.lineTo(-20, -114); g.moveTo(0, -92); g.lineTo(20, -114);
          g.stroke(); g.restore();
        }
        g.lineWidth = 4; starPoly(g, 0, 6, 1, 34, 0);
      } else if (kind === 'luz') {
        g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 52, 0, TAU); g.stroke();
        g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill();
        for (i = 0; i < 12; i++) {
          g.save(); g.rotate(i / 12 * TAU);
          g.beginPath(); g.moveTo(-9, -62);
          g.quadraticCurveTo(-4, -96, 0, i % 2 ? -116 : -140); g.quadraticCurveTo(4, -96, 9, -62); g.closePath();
          g.lineWidth = 3; g.stroke(); if (i % 2 === 0) g.fill();
          g.restore();
        }
      } else {
        // llama estilizada (contorno exterior + lengua interior + base)
        g.lineWidth = 7;
        g.beginPath(); g.moveTo(0, -140);
        g.bezierCurveTo(30, -90, 92, -50, 74, 18); g.bezierCurveTo(62, 70, 22, 92, 0, 94);
        g.bezierCurveTo(-22, 92, -62, 70, -74, 18); g.bezierCurveTo(-88, -32, -40, -54, -36, -98);
        g.bezierCurveTo(-14, -70, -6, -60, 0, -140); g.stroke();
        g.lineWidth = 5; g.beginPath(); g.moveTo(4, -42);
        g.bezierCurveTo(26, -10, 42, 20, 28, 48); g.bezierCurveTo(16, 70, -16, 70, -28, 48); g.bezierCurveTo(-38, 26, -18, 6, 4, -42);
        g.stroke();
        g.beginPath(); g.arc(0, 40, 10, 0, TAU); g.fill();
      }
      g.restore();
    }

    var runeCache = {}, runeRingCache = {};
    function runeTexture(kind) {
      if (kind === 'hielo') kind = 'escarcha';
      if (!KINDS[kind]) kind = 'fuego';
      if (runeCache[kind]) return runeCache[kind];
      var cv = canvas(1024), g = cv.getContext('2d');
      // pasada de halo y pasada nítida
      g.save(); g.shadowColor = 'rgba(255,255,255,0.9)'; g.shadowBlur = 14; g.globalAlpha = 0.55; drawRuneCircle(g, kind); g.restore();
      drawRuneCircle(g, kind);
      var t = ctex(cv); t.generateMipmaps = true;
      runeCache[kind] = t; return t;
    }
    // Anillo exterior suelto (gira en sentido contrario)
    function runeRingTexture(kind) {
      if (runeRingCache[kind]) return runeRingCache[kind];
      var K = kindOf(kind), cv = canvas(1024), g = cv.getContext('2d'), R = rng(K.seed * 7 + 3), c = 512;
      g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
      for (var pass = 0; pass < 2; pass++) {
        g.save();
        if (pass === 0) { g.shadowColor = '#fff'; g.shadowBlur = 12; g.globalAlpha = 0.5; }
        R = rng(K.seed * 7 + 3);
        ring(g, c, 504, 3); ring(g, c, 420, 3);
        ticks(g, c, 420, 436, 120, 1.5);
        g.lineWidth = 4;
        for (var i = 0; i < 6; i++) { // arcos segmentados
          var a0 = i / 6 * TAU + 0.12, a1 = (i + 1) / 6 * TAU - 0.12;
          g.beginPath(); g.arc(c, c, 492, a0, a1); g.stroke();
        }
        glyphBand(g, R, c, c, 462, K.glyphs + 8, 22, 34, 3.5);
        g.restore();
      }
      runeRingCache[kind] = ctex(cv);
      return runeRingCache[kind];
    }

    // ---------------------------------------------------------------- sistema de partículas (Points)
    var PS_VERT = [
      'attribute vec3 aColor; attribute float aSize; attribute float aAlpha; attribute vec2 aMisc;',
      'uniform float uScale; uniform float uFogDensity;',
      'varying vec3 vC; varying float vA; varying vec2 vMisc; varying float vFog;',
      'void main(){',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  float z = -mv.z;',
      '  gl_PointSize = aAlpha > 0.002 ? aSize * uScale / max(z, 0.05) : 0.0;',
      '  gl_Position = projectionMatrix * mv;',
      '  if (aAlpha <= 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);',
      '  vC = aColor; vA = aAlpha; vMisc = aMisc;',
      '  vFog = 1.0 - exp(-uFogDensity * uFogDensity * z * z);',
      '}'
    ].join('\n');
    var PS_FRAG_COMMON = [
      'uniform sampler2D map; uniform vec3 uFogColor;',
      'varying vec3 vC; varying float vA; varying vec2 vMisc; varying float vFog;',
      'vec4 sampleCell(){',
      '  vec2 p = gl_PointCoord - 0.5; float s = sin(vMisc.y), c = cos(vMisc.y);',
      '  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;',
      '  p = clamp(p, 0.01, 0.99);',
      '  float cell = vMisc.x; vec2 off = vec2(mod(cell, 2.0), 1.0 - floor(cell / 2.0)) * 0.5;',
      '  return texture2D(map, off + vec2(p.x, 1.0 - p.y) * 0.5);',
      '}'
    ].join('\n');
    var PS_FRAG_ADD = PS_FRAG_COMMON + '\nvoid main(){ vec4 t = sampleCell(); float a = t.a * vA * (1.0 - vFog); if (a < 0.002) discard; gl_FragColor = vec4(vC * a, a); }';
    var PS_FRAG_SMOKE = PS_FRAG_COMMON + '\nvoid main(){ vec4 t = sampleCell(); float n = t.a; float k = clamp(vA / 0.35, 0.0, 1.0); float thr = 0.34 * (1.0 - k);' +
      ' float a = smoothstep(thr, thr + 0.5, n) * vA * (0.6 + 0.8 * n); if (a < 0.004) discard; vec3 c = vC * (0.6 + 0.4 * n); gl_FragColor = vec4(mix(c, uFogColor, vFog), min(a, 1.0)); }';

    function ParticleSystem(max, additive) {
      this.max = max; this.cursor = 0; this.additive = additive;
      var geo = new THREE.BufferGeometry();
      this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3);
      this.size = new Float32Array(max); this.alpha = new Float32Array(max); this.misc = new Float32Array(max * 2);
      geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aMisc', new THREE.BufferAttribute(this.misc, 2).setUsage(THREE.DynamicDrawUsage));
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
      // estado de simulación
      this.vel = new Float32Array(max * 3); this.tgt = new Float32Array(max * 3);
      this.c0 = new Float32Array(max * 3); this.c1 = new Float32Array(max * 3);
      this.age = new Float32Array(max); this.life = new Float32Array(max);
      this.s0 = new Float32Array(max); this.grow = new Float32Array(max);
      this.grav = new Float32Array(max); this.drag = new Float32Array(max);
      this.amul = new Float32Array(max); this.rotv = new Float32Array(max); this.mode = new Uint8Array(max);
      this.alive = 0;
      this.mat = track(new THREE.ShaderMaterial({
        uniforms: { map: { value: additive ? sparkAtlas : smokeAtlas }, uScale: { value: (opts.pixelHeight || 800) / 2 },
          uFogDensity: { value: 0 }, uFogColor: { value: new THREE.Color(0, 0, 0) } },
        vertexShader: PS_VERT, fragmentShader: additive ? PS_FRAG_ADD : PS_FRAG_SMOKE,
        transparent: true, depthWrite: false,
        blending: additive ? THREE.CustomBlending : THREE.NormalBlending,
        blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation
      }));
      this.geo = track(geo);
      this.points = new THREE.Points(geo, this.mat);
      this.points.frustumCulled = false;
      this.points.renderOrder = additive ? 20 : 10;
      scene.add(this.points);
    }
    ParticleSystem.prototype.spawn = function () {
      var i = this.cursor; this.cursor = (i + 1) % this.max;
      return i;
    };
    ParticleSystem.prototype.update = function (dt) {
      var max = this.max, P = this.pos, V = this.vel, i, i3, any = 0;
      for (i = 0; i < max; i++) {
        var life = this.life[i]; if (life <= 0) continue;
        var age = this.age[i] + dt;
        i3 = i * 3;
        if (age >= life) { this.life[i] = 0; this.alpha[i] = 0; this.size[i] = 0; continue; }
        any++;
        this.age[i] = age;
        var t = age / life;
        if (this.mode[i] === 1) { // convergencia: lerp con aceleración hacia el objetivo
          var e = t * t * (1.4 - 0.4 * t);
          P[i3] = V[i3] + (this.tgt[i3] - V[i3]) * e;
          P[i3 + 1] = V[i3 + 1] + (this.tgt[i3 + 1] - V[i3 + 1]) * e;
          P[i3 + 2] = V[i3 + 2] + (this.tgt[i3 + 2] - V[i3 + 2]) * e;
        } else {
          var dr = 1 / (1 + this.drag[i] * dt);
          V[i3] *= dr; V[i3 + 1] = V[i3 + 1] * dr + this.grav[i] * dt; V[i3 + 2] *= dr;
          P[i3] += V[i3] * dt; P[i3 + 1] += V[i3 + 1] * dt; P[i3 + 2] += V[i3 + 2] * dt;
          if (this.grav[i] < -0.5 && P[i3 + 1] < 0.02) { P[i3 + 1] = 0.02; V[i3 + 1] *= -0.35; V[i3] *= 0.6; V[i3 + 2] *= 0.6; }
        }
        var a;
        if (this.additive) a = Math.min(1, t * 12) * Math.pow(1 - t, 1.3);
        else a = Math.min(1, t * 5) * (1 - t) * (1 - t * 0.3);
        this.alpha[i] = a * this.amul[i];
        this.size[i] = this.s0[i] * (1 + (this.grow[i] - 1) * (this.mode[i] === 1 ? t : Math.sqrt(t)));
        var k = this.additive ? Math.min(1, t * 1.5) : t;
        this.col[i3] = this.c0[i3] + (this.c1[i3] - this.c0[i3]) * k;
        this.col[i3 + 1] = this.c0[i3 + 1] + (this.c1[i3 + 1] - this.c0[i3 + 1]) * k;
        this.col[i3 + 2] = this.c0[i3 + 2] + (this.c1[i3 + 2] - this.c0[i3 + 2]) * k;
        this.misc[i * 2 + 1] += this.rotv[i] * dt;
      }
      this.alive = any;
      var at = this.geo.attributes;
      at.position.needsUpdate = at.aColor.needsUpdate = at.aSize.needsUpdate = at.aAlpha.needsUpdate = at.aMisc.needsUpdate = true;
      if (scene.fog) {
        this.mat.uniforms.uFogColor.value.copy(scene.fog.color);
        this.mat.uniforms.uFogDensity.value = scene.fog.density !== undefined ? scene.fog.density : 0;
      }
    };

    var psAdd = new ParticleSystem(2000, true);
    var psSmoke = new ParticleSystem(600, false);

    var TEX_IDX = { dot: 0, star: 1, flame: 2, ember: 3 };
    function init(ps, i, o, hex, hdr, defLife, defGrow) {
      var i3 = i * 3;
      lin(hex, _c).multiplyScalar(hdr);
      ps.c0[i3] = _c.r; ps.c0[i3 + 1] = _c.g; ps.c0[i3 + 2] = _c.b;
      if (o.c2 !== undefined) lin(o.c2, _c2).multiplyScalar(hdr * (o.hdr2 !== undefined ? o.hdr2 : 1)); else _c2.copy(_c);
      ps.c1[i3] = _c2.r; ps.c1[i3 + 1] = _c2.g; ps.c1[i3 + 2] = _c2.b;
      ps.col[i3] = _c.r; ps.col[i3 + 1] = _c.g; ps.col[i3 + 2] = _c.b;
      var life = (o.life !== undefined ? o.life : (defLife || 0.6)) * rr(0.7, 1.3);
      ps.age[i] = 0; ps.life[i] = life;
      var sz = (o.size !== undefined ? o.size : 0.28) * rr(0.7, 1.3);
      ps.s0[i] = sz; ps.size[i] = sz; ps.grow[i] = o.grow !== undefined ? o.grow : (defGrow || 1);
      ps.amul[i] = o.alpha !== undefined ? o.alpha : (ps.additive ? 1 : 0.55);
      ps.alpha[i] = 0.003;
      var tx = o.tex; if (typeof tx === 'string') tx = TEX_IDX[tx] || 0;
      ps.misc[i * 2] = ps.additive ? (tx || 0) : (rand() * 4 | 0);
      ps.misc[i * 2 + 1] = rand() * TAU;
      ps.rotv[i] = (o.rot !== undefined ? o.rot : (ps.additive ? 0 : 0.6)) * rr(-1, 1);
    }

    function emit(pos, n, colorHex, o) {
      o = o || {};
      var ps = o.blend === 'smoke' ? psSmoke : psAdd;
      var spd = o.spd !== undefined ? o.spd : 3, up = o.up !== undefined ? o.up : 1, spread = o.spread !== undefined ? o.spread : 0.1;
      var hdr = o.hdr !== undefined ? o.hdr : (ps.additive ? 2.2 : 1);
      var grav = o.grav !== undefined ? o.grav : -5, drag = o.drag !== undefined ? o.drag : 1.6;
      var vx = o.vx || 0, vy = o.vy || 0, vz = o.vz || 0;
      for (var k = 0; k < n; k++) {
        var i = ps.spawn(), i3 = i * 3;
        // dirección aleatoria uniforme en la esfera
        var u = rand() * 2 - 1, th = rand() * TAU, s = Math.sqrt(1 - u * u);
        var dx = s * Math.cos(th), dy = u, dz = s * Math.sin(th);
        var rad = spread * Math.cbrt(rand());
        ps.pos[i3] = pos.x + dx * rad; ps.pos[i3 + 1] = pos.y + dy * rad; ps.pos[i3 + 2] = pos.z + dz * rad;
        var sp = spd * rr(0.4, 1);
        if (o.flat) dy *= 0.15;
        ps.vel[i3] = dx * sp + vx; ps.vel[i3 + 1] = dy * sp + up * rr(0.5, 1.2) + vy; ps.vel[i3 + 2] = dz * sp + vz;
        ps.grav[i] = grav; ps.drag[i] = drag; ps.mode[i] = 0;
        init(ps, i, o, colorHex, hdr);
      }
    }

    function emitTo(target, n, colorHex, o) {
      o = o || {};
      var ps = o.blend === 'smoke' ? psSmoke : psAdd;
      var radius = o.radius !== undefined ? o.radius : 0.9, hdr = o.hdr !== undefined ? o.hdr : 2.2;
      for (var k = 0; k < n; k++) {
        var i = ps.spawn(), i3 = i * 3;
        var u = rand() * 2 - 1, th = rand() * TAU, s = Math.sqrt(1 - u * u), r = radius * rr(0.6, 1);
        ps.vel[i3] = target.x + s * Math.cos(th) * r; ps.vel[i3 + 1] = target.y + u * r; ps.vel[i3 + 2] = target.z + s * Math.sin(th) * r;
        ps.pos[i3] = ps.vel[i3]; ps.pos[i3 + 1] = ps.vel[i3 + 1]; ps.pos[i3 + 2] = ps.vel[i3 + 2];
        ps.tgt[i3] = target.x; ps.tgt[i3 + 1] = target.y; ps.tgt[i3 + 2] = target.z;
        ps.grav[i] = 0; ps.drag[i] = 0; ps.mode[i] = 1;
        init(ps, i, o, colorHex, hdr, 0.5, 0.25);
      }
    }

    // ---------------------------------------------------------------- quads (círculos, ondas, marcas)
    var planeGeo = track(new THREE.PlaneGeometry(1, 1));
    var quads = [];
    function Quad() {
      this.mat = track(new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      this.mesh = new THREE.Mesh(planeGeo, this.mat);
      this.mesh.visible = false; this.mesh.frustumCulled = false;
      this.base = new THREE.Color(1, 1, 1);
      this.active = false; this.managed = false;
      scene.add(this.mesh);
    }
    for (var qi = 0; qi < 44; qi++) quads.push(new Quad());
    // cfg: { tex, color:[r,g,b] o hex, hdr, additive, pos, y, s0, s1, life, fadeIn, hold, alpha, spin, rot, order }
    function quad(cfg) {
      var q = null, oldest = null, i;
      for (i = 0; i < quads.length; i++) {
        if (!quads[i].active) { q = quads[i]; break; }
        if (!quads[i].managed && (!oldest || quads[i].age / quads[i].life > oldest.age / oldest.life)) oldest = quads[i];
      }
      q = q || oldest; if (!q) return null;
      q.active = true; q.managed = !!cfg.managed; q.age = 0;
      q.life = cfg.life || 1; q.fadeIn = cfg.fadeIn || 0.0001; q.hold = cfg.hold || 0;
      q.s0 = cfg.s0 !== undefined ? cfg.s0 : 1; q.s1 = cfg.s1 !== undefined ? cfg.s1 : q.s0;
      q.a0 = cfg.alpha !== undefined ? cfg.alpha : 1; q.spin = cfg.spin || 0; q.ease = cfg.ease || 'out';
      var m = q.mat;
      if (m.map !== cfg.tex) { m.map = cfg.tex; }
      if (cfg.additive !== false) { m.blending = THREE.AdditiveBlending; } else { m.blending = THREE.NormalBlending; }
      if (Array.isArray(cfg.color)) q.base.setRGB(cfg.color[0], cfg.color[1], cfg.color[2]);
      else lin(cfg.color !== undefined ? cfg.color : 0xffffff, q.base);
      q.base.multiplyScalar(cfg.hdr || 1);
      q.additive = cfg.additive !== false;
      m.color.copy(q.base); m.opacity = 0;
      var me = q.mesh; me.visible = true; me.renderOrder = cfg.order || 5;
      if (cfg.pos) me.position.set(cfg.pos.x, cfg.y !== undefined ? cfg.y : 0.02, cfg.pos.z);
      me.rotation.set(-Math.PI / 2, 0, cfg.rot !== undefined ? cfg.rot : rand() * TAU);
      me.scale.setScalar(q.s0);
      q.intensity = 1;
      return q;
    }
    function freeQuad(q) { q.active = false; q.managed = false; q.mesh.visible = false; }
    function setQuadAlpha(q, a) {
      // aditivo: escalar color (opacity multiplica también, pero así funciona igual para HDR)
      q.mat.opacity = a;
    }
    function updateQuads(dt) {
      for (var i = 0; i < quads.length; i++) {
        var q = quads[i]; if (!q.active || q.managed) continue;
        q.age += dt;
        var t = q.age / q.life;
        if (t >= 1) { freeQuad(q); continue; }
        var e = q.ease === 'lin' ? t : easeOut(t);
        q.mesh.scale.setScalar(q.s0 + (q.s1 - q.s0) * e);
        var a = q.a0 * Math.min(1, q.age / q.fadeIn);
        if (t > q.hold) a *= 1 - (t - q.hold) / (1 - q.hold);
        setQuadAlpha(q, a);
        q.mat.color.copy(q.base).multiplyScalar(q.intensity);
        if (q.spin) q.mesh.rotateZ(q.spin * dt);
      }
    }

    // ---------------------------------------------------------------- shaders de malla
    var NOISE = [
      'float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
      'float vn(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),',
      '             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }',
      'float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * vn(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }'
    ].join('\n');

    // Bola de fuego: esfera desplazada por ruido, rampa de temperatura HDR, aditiva
    var FIRE_VERT = NOISE + [
      '\nuniform float uTime; uniform float uSeed; uniform float uDisp;',
      'varying vec3 vP; varying vec3 vN; varying vec3 vV;',
      'void main(){',
      '  vec3 q = position * 1.6 + vec3(uSeed, -uTime * 1.8, uSeed * 0.7);',
      '  float n = fbm(q);',
      '  vec3 p = position + normal * (n - 0.45) * uDisp;',
      '  vP = position * 3.8 + vec3(uSeed, -uTime * 2.6, -uSeed);',
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);',
      '  gl_Position = projectionMatrix * mv;',
      '}'
    ].join('\n');
    var FIRE_FRAG = NOISE + [
      '\nuniform float uFade; uniform float uHeat; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;',
      'varying vec3 vP; varying vec3 vN; varying vec3 vV;',
      'void main(){',
      '  float fr = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);',
      '  float n = fbm(vP);',
      '  float heat = clamp(n * 1.6 + fr * 0.3 - 0.82 + uHeat * 0.62, 0.0, 1.1);',
      '  vec3 col = heat < 0.5 ? mix(uC1, uC2, heat * 2.0) : mix(uC2, uC3, min((heat - 0.5) * 2.0, 1.4));',
      '  float a = smoothstep(0.0, 0.6, fr) * smoothstep(0.14, 0.6, heat) * uFade;',
      '  gl_FragColor = vec4(col * a, a);',
      '}'
    ].join('\n');
    var fireMatBase = track(new THREE.ShaderMaterial({
      uniforms: { uTime: U_TIME, uSeed: { value: 0 }, uDisp: { value: 0.35 }, uFade: { value: 1 }, uHeat: { value: 1 },
        uC1: { value: new THREE.Color(0.25, 0.02, 0.0) }, uC2: { value: new THREE.Color(1.5, 0.27, 0.03) }, uC3: { value: new THREE.Color(2.3, 0.78, 0.1) } },
      vertexShader: FIRE_VERT, fragmentShader: FIRE_FRAG, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor
    }));
    function fireMat() { var m = track(fireMatBase.clone()); m.uniforms.uTime = U_TIME; return m; }
    var sphereGeo = track(new THREE.IcosahedronGeometry(1, 4));
    var fireballs = [];
    for (var fi = 0; fi < 8; fi++) {
      var fm = fireMat(), fmesh = new THREE.Mesh(sphereGeo, fm);
      fmesh.visible = false; fmesh.renderOrder = 15; scene.add(fmesh);
      fireballs.push({ mesh: fmesh, mat: fm, active: false, age: 0, life: 1, r0: 0, r1: 1, heat0: 1, heat1: 0, rise: 0, x: 0, y: 0, z: 0 });
    }
    function fireball(pos, r0, r1, life, heat0, heat1, rise, delay) {
      var f = null, i;
      for (i = 0; i < fireballs.length; i++) if (!fireballs[i].active) { f = fireballs[i]; break; }
      if (!f) return;
      f.active = true; f.age = -(delay || 0); f.life = life; f.r0 = r0; f.r1 = r1; f.heat0 = heat0; f.heat1 = heat1; f.rise = rise || 0;
      f.x = pos.x; f.y = pos.y; f.z = pos.z;
      f.mat.uniforms.uSeed.value = rand() * 50; f.mat.uniforms.uDisp.value = 0.45;
      f.mesh.position.set(pos.x, pos.y, pos.z); f.mesh.scale.setScalar(r0); f.mesh.rotation.set(rand() * 6, rand() * 6, 0);
      f.mesh.visible = false;
    }
    function updateFireballs(dt) {
      for (var i = 0; i < fireballs.length; i++) {
        var f = fireballs[i]; if (!f.active) continue;
        f.age += dt;
        if (f.age < 0) continue;
        var t = f.age / f.life;
        if (t >= 1) { f.active = false; f.mesh.visible = false; continue; }
        f.mesh.visible = true;
        var e = easeOut(t);
        f.mesh.scale.setScalar(f.r0 + (f.r1 - f.r0) * e);
        f.mesh.position.set(f.x, f.y + f.rise * t, f.z);
        var u = f.mat.uniforms;
        u.uHeat.value = f.heat0 + (f.heat1 - f.heat0) * t;
        u.uFade.value = Math.min(1, f.age * 25) * (1 - t * t);
      }
    }

    // Hielo: facetas planas, fresnel cian HDR, brillo interior
    var ICE_VERT = [
      'varying vec3 vN; varying vec3 vV; varying vec3 vWN; varying vec3 vL;',
      'void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vWN = normalize(mat3(modelMatrix) * normal); vL = position;',
      '  gl_Position = projectionMatrix * mv; }'
    ].join('\n');
    var ICE_FRAG = [
      'uniform float uAlpha; uniform float uGlow; uniform vec3 uDeep; uniform vec3 uRim; uniform vec3 uCore;',
      'varying vec3 vN; varying vec3 vV; varying vec3 vWN; varying vec3 vL;',
      'void main(){',
      '  float fr = 1.0 - abs(dot(normalize(vN), normalize(vV)));',
      '  vec3 wn = normalize(vWN);',
      '  float key = max(dot(wn, normalize(vec3(-0.4, 0.8, 0.45))), 0.0);',
      '  float facet = 0.35 + 0.65 * key + 0.25 * max(dot(wn, normalize(vec3(0.6, -0.2, -0.7))), 0.0);',
      '  float spec = pow(max(dot(reflect(-normalize(vV), normalize(vN)), vec3(0.0, 0.0, 1.0)), 0.0), 24.0);',
      '  vec3 col = uDeep * facet + uRim * pow(fr, 2.2) + uCore * uGlow * (1.0 - fr) * 0.6 + vec3(2.5, 3.0, 3.4) * spec * 0.6;',
      '  gl_FragColor = vec4(col, uAlpha * (0.72 + 0.28 * fr));',
      '}'
    ].join('\n');
    var iceMat = track(new THREE.ShaderMaterial({
      uniforms: { uAlpha: { value: 0.92 }, uGlow: { value: 1 }, uDeep: { value: new THREE.Color(0.06, 0.22, 0.42) },
        uRim: { value: new THREE.Color(1.2, 3.2, 5.0) }, uCore: { value: new THREE.Color(0.4, 1.4, 2.4) } },
      vertexShader: ICE_VERT, fragmentShader: ICE_FRAG, transparent: true, depthWrite: true
    }));
    // Cuerpo helado de un enemigo congelado: elipsoide irregular (ruido) con el shader translúcido de hielo (Fresnel, núcleo frío)
    var iceBodyGeo = (function () {
      var g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position, nrm = g.attributes.normal, i;
      for (i = 0; i < p.count; i++) {
        var x = p.getX(i), y = p.getY(i), z = p.getZ(i), dd = 1 + (fbm2(x * 2.2 + y * 1.1, z * 2.2 - y, 21, 3) - 0.5) * 0.45;
        p.setXYZ(i, x * dd, y * dd, z * dd);
      }
      g.computeVertexNormals();
      for (i = 0; i < p.count; i++) { _v1.set(p.getX(i), p.getY(i), p.getZ(i)).normalize(); nrm.setXYZ(i, _v1.x, _v1.y, _v1.z); }
      return track(g);
    })();
    function crystalGeo(len, rad, seg) {
      var pts = [new THREE.Vector2(0, -len * 0.42), new THREE.Vector2(rad * 0.8, -len * 0.3), new THREE.Vector2(rad, -len * 0.05),
        new THREE.Vector2(rad * 0.85, len * 0.22), new THREE.Vector2(0, len * 0.58)];
      var g = new THREE.LatheGeometry(pts, seg).toNonIndexed();
      g.rotateX(Math.PI / 2); g.computeVertexNormals();
      return track(g);
    }
    var lanceGeo = crystalGeo(1.0, 0.11, 6);
    var shardGeo = crystalGeo(1.0, 0.22, 5);
    var addBasic = function (r, g, b) {
      return track(new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, fog: false }));
    };
    var iceCoreMat = addBasic(1.6, 3.6, 5.5);
    var iceBodyMat = track(iceMat.clone()); iceBodyMat.uniforms.uAlpha.value = 0.5; iceBodyMat.uniforms.uGlow.value = 0.6; iceBodyMat.depthWrite = false;

    // Esquirlas de hielo (pool, material propio para el desvanecido)
    var shards = [];
    for (var si = 0; si < 24; si++) {
      var sm = track(iceMat.clone()); sm.depthWrite = false;
      var smesh = new THREE.Mesh(shardGeo, sm); smesh.visible = false; scene.add(smesh);
      shards.push({ mesh: smesh, mat: sm, active: false, vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, age: 0, life: 1, spike: false, s: 1 });
    }
    function updateShards(dt) {
      for (var i = 0; i < shards.length; i++) {
        var s = shards[i]; if (!s.active) continue;
        s.age += dt; var t = s.age / s.life;
        if (t >= 1) { s.active = false; s.mesh.visible = false; continue; }
        var m = s.mesh;
        if (s.spike) { // púa que brota del suelo y se hunde
          var g = t < 0.12 ? easeOut(t / 0.12) : (t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1);
          m.scale.set(s.s * 0.7, s.s * 0.7, s.s * Math.max(0.001, g));
        } else {
          s.vy -= 13 * dt;
          m.position.x += s.vx * dt; m.position.y += s.vy * dt; m.position.z += s.vz * dt;
          if (m.position.y < 0.05) { m.position.y = 0.05; s.vy *= -0.3; s.vx *= 0.5; s.vz *= 0.5; s.wx *= 0.5; s.wy *= 0.5; }
          m.rotation.x += s.wx * dt; m.rotation.y += s.wy * dt;
        }
        s.mat.uniforms.uAlpha.value = 0.9 * (t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1);
        s.mat.uniforms.uGlow.value = 1.5 * (1 - t);
      }
    }
    function getShard() { for (var i = 0; i < shards.length; i++) if (!shards[i].active) return shards[i]; return shards[(rand() * shards.length) | 0]; }

    // Columnas de luz
    var COL_VERT = [
      'varying vec2 vUv; varying vec3 vN; varying vec3 vV;',
      'void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }'
    ].join('\n');
    var COL_FRAG = [
      'uniform sampler2D map; uniform float uTime; uniform float uAlpha; uniform vec3 uColor; uniform float uScroll;',
      'varying vec2 vUv; varying vec3 vN; varying vec3 vV;',
      'void main(){',
      '  float s1 = texture2D(map, vec2(vUv.x * 3.0, vUv.y * 3.0 + uTime * uScroll)).r;',
      '  float s2 = texture2D(map, vec2(vUv.x * 5.0 + 0.37, vUv.y * 1.6 + uTime * uScroll * 0.6)).r;',
      '  float edge = abs(dot(normalize(vN), normalize(vV)));',
      '  float h = vUv.y;',
      '  float vert = smoothstep(0.0, 0.015, h) * pow(1.0 - h, 1.6) * (1.0 + 2.5 * exp(-h * 40.0));',
      '  float b = (0.35 + 1.6 * s1 * s2 + 0.6 * s1) * pow(edge, 1.4) * vert * uAlpha;',
      '  gl_FragColor = vec4(uColor * b, b);',
      '}'
    ].join('\n');
    var colGeo = track(new THREE.CylinderGeometry(1, 1, 1, 32, 1, true)); colGeo.translate(0, 0.5, 0);
    var columns = [];
    for (var ci = 0; ci < 3; ci++) {
      var cm = track(new THREE.ShaderMaterial({
        uniforms: { map: { value: streakTex }, uTime: U_TIME, uAlpha: { value: 0 }, uColor: { value: new THREE.Color(2.6, 1.7, 0.6) }, uScroll: { value: -1.4 } },
        vertexShader: COL_VERT, fragmentShader: COL_FRAG, transparent: true, depthWrite: false,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor
      }));
      var cmesh = new THREE.Mesh(colGeo, cm); cmesh.visible = false; cmesh.renderOrder = 16; cmesh.frustumCulled = false; scene.add(cmesh);
      var cm2 = track(cm.clone()); cm2.uniforms.uTime = U_TIME; cm2.uniforms.map.value = streakTex; cm2.uniforms.uScroll.value = -2.6;
      var cmesh2 = new THREE.Mesh(colGeo, cm2); cmesh2.visible = false; cmesh2.renderOrder = 17; cmesh2.frustumCulled = false; scene.add(cmesh2);
      columns.push({ outer: cmesh, inner: cmesh2, active: false, age: 0, life: 1.6, r: 1 });
    }
    function updateColumns(dt) {
      for (var i = 0; i < columns.length; i++) {
        var c = columns[i]; if (!c.active) continue;
        c.age += dt; var t = c.age / c.life;
        if (t >= 1) { c.active = false; c.outer.visible = c.inner.visible = false; continue; }
        var open = easeOut(Math.min(1, t / 0.12));
        var a = Math.min(1, t / 0.06) * (t > 0.45 ? Math.pow(1 - (t - 0.45) / 0.55, 1.5) : 1);
        var rr0 = c.r * (0.25 + 0.75 * open) * (1 - 0.35 * Math.max(0, t - 0.45));
        c.outer.scale.set(rr0, 26, rr0);
        c.inner.scale.set(rr0 * 0.42, 26, rr0 * 0.42);
        c.outer.material.uniforms.uAlpha.value = a * 0.32;
        c.inner.material.uniforms.uAlpha.value = a * 0.6;
      }
    }

    // ---------------------------------------------------------------- halos (sprites) compartidos
    function haloMat(r, g, b) {
      return track(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(r, g, b), blending: THREE.AdditiveBlending,
        transparent: true, depthWrite: false, fog: false }));
    }
    // sprites con material propio para los núcleos de carga
    var coreSprites = [];
    for (var ks = 0; ks < 4; ks++) {
      var csm = haloMat(1, 1, 1), cs = new THREE.Sprite(csm); cs.visible = false; cs.renderOrder = 22; scene.add(cs);
      coreSprites.push({ sprite: cs, mat: csm, used: false });
    }

    // ---------------------------------------------------------------- proyectiles
    var projMats = {
      fireCore: addBasic(5, 2.4, 0.7),
      fireHalo: haloMat(1.4, 0.36, 0.05),
      fireFlame: (function () { var m = fireMat(); m.uniforms.uHeat.value = 0.75; m.uniforms.uDisp.value = 0.7; return m; })(),
      iceHalo: haloMat(0.5, 1.6, 3.2),
      orbHalo: haloMat(1.6, 0.35, 3.2),
      orbCore: addBasic(5, 2.2, 7),
      orbRing: addBasic(2.2, 0.6, 4.4)
    };
    var ORB_FRAG = NOISE + [
      '\nuniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vL; varying vec3 vWN;',
      'void main(){',
      '  float fr = 1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);',
      '  float n = fbm(vL * 5.0 + vec3(0.0, uTime * 1.5, uTime * 0.7));',
      '  float vein = smoothstep(0.06, 0.0, abs(n - 0.5));',
      '  vec3 col = vec3(0.05, 0.0, 0.09) + vec3(2.0, 0.45, 3.6) * pow(fr, 2.0) + vec3(2.6, 0.9, 4.5) * vein * (0.4 + fr);',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n');
    var orbMat = track(new THREE.ShaderMaterial({ uniforms: { uTime: U_TIME }, vertexShader: ICE_VERT, fragmentShader: ORB_FRAG }));
    var torusGeo = track(new THREE.TorusGeometry(0.34, 0.01, 6, 48));
    var tinySphere = track(new THREE.IcosahedronGeometry(1, 2));

    function projectileMesh(kind) {
      if (kind === 'luz' || kind === 'rayo' || kind === 'tierra' || kind === 'sombra' || kind === 'aire') return elementBody(kind);
      var g = new THREE.Group(), t = rand() * 10;
      if (kind === 'escarcha') {
        var body = new THREE.Group(); g.add(body);
        var lance = new THREE.Mesh(lanceGeo, iceMat); lance.scale.set(1.15, 1.15, 0.85); body.add(lance);
        var core = new THREE.Mesh(lanceGeo, iceCoreMat); core.scale.set(0.45, 0.45, 0.7); body.add(core);
        for (var i = 0; i < 4; i++) { // cristales secundarios en la cola
          var s = new THREE.Mesh(lanceGeo, iceMat), a = i / 4 * TAU;
          s.scale.setScalar(0.42); s.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, -0.22);
          s.rotation.set(-Math.sin(a) * 0.45, Math.cos(a) * 0.45, 0); body.add(s);
        }
        var h = new THREE.Sprite(projMats.iceHalo); h.scale.setScalar(1.0); h.position.z = 0.15; g.add(h);
        g.userData.tick = function (dt) { t += dt; body.rotation.z += dt * 5; h.scale.setScalar(0.95 + Math.sin(t * 30) * 0.05); };
      } else if (kind === 'orbe') {
        var orb = new THREE.Mesh(tinySphere, orbMat); orb.scale.setScalar(0.2); g.add(orb);
        var oc = new THREE.Mesh(tinySphere, projMats.orbCore); oc.scale.setScalar(0.07); g.add(oc);
        var hh = new THREE.Sprite(projMats.orbHalo); hh.scale.setScalar(1.3); g.add(hh);
        var r1 = new THREE.Mesh(torusGeo, projMats.orbRing), r2 = new THREE.Mesh(torusGeo, projMats.orbRing);
        r2.scale.setScalar(0.85); g.add(r1); g.add(r2);
        g.userData.tick = function (dt) {
          t += dt; r1.rotation.x = t * 3.1; r1.rotation.y = t * 1.3; r2.rotation.y = -t * 2.6; r2.rotation.z = t * 1.7;
          orb.rotation.y = t; hh.scale.setScalar(1.25 + Math.sin(t * 9) * 0.12);
        };
      } else {
        var c = new THREE.Mesh(tinySphere, projMats.fireCore); c.scale.setScalar(0.09); g.add(c);
        var fl = new THREE.Mesh(sphereGeo, projMats.fireFlame); fl.scale.setScalar(0.24); g.add(fl);
        var fh = new THREE.Sprite(projMats.fireHalo); fh.scale.setScalar(1.0); g.add(fh);
        g.userData.tick = function (dt) {
          t += dt; fh.scale.setScalar(1.0 + Math.sin(t * 23) * 0.07 + Math.sin(t * 37) * 0.05);
          fl.rotation.y += dt * 4; fl.scale.set(0.24, 0.24, 0.3);
        };
      }
      g.userData.kind = kind;
      return g;
    }

    var _tp = new THREE.Vector3();
    function cnt(rate, dt) { var x = rate * dt; var n = x | 0; return n + (rand() < x - n ? 1 : 0); }
    // la estela se reparte a lo largo del segmento recorrido desde la llamada anterior
    // (se recuerda la última posición por objeto Vector3; solo asigna la primera vez)
    var lastPos = new WeakMap(), _seg = new THREE.Vector3(), _tq = new THREE.Vector3();
    function trail(kind, pos, dt, kind2) {
      if (kind === 'hielo') kind = 'escarcha'; if (kind2 === 'hielo') kind2 = 'escarcha';
      var lp = lastPos.get(pos);
      if (!lp) { lp = new THREE.Vector3().copy(pos); lastPos.set(pos, lp); }
      _seg.subVectors(pos, lp);
      if (_seg.lengthSq() > 4) _seg.set(0, 0, 0);
      if (_seg.lengthSq() > 1e-8) _dir.copy(_seg).normalize();
      lp.copy(pos);
      var steps = Math.max(1, Math.min(8, Math.ceil(_seg.length() / 0.06)));
      for (var k = 0; k < steps; k++) {
        _tq.copy(pos).addScaledVector(_seg, -k / steps);
        trailAt(kind, _tq, dt / steps);
        if (kind2 && kind2 !== kind) trailAt(kind2, _tq, dt / steps);
      }
    }
    function trailAt(kind, pos, dt) {
      if (kind === 'luz' || kind === 'rayo' || kind === 'tierra' || kind === 'sombra' || kind === 'aire') { elTrail(kind, pos, dt); return; }
      if (kind === 'escarcha') {
        emit(pos, cnt(90, dt), 0xbfefff, { spd: 0.5, up: 0.1, life: 0.6, grav: -0.8, spread: 0.12, size: 0.15, tex: 1, hdr: 3, rot: 2 });
        emit(pos, cnt(60, dt), 0x4aa8ff, { spd: 0.2, up: 0, life: 0.3, grav: 0, spread: 0.04, size: 0.3, grow: 0.3, tex: 0, hdr: 1.2 });
        emit(pos, cnt(30, dt), 0xcfe6ff, { blend: 'smoke', spd: 0.25, up: 0.1, life: 1.2, grav: 0, spread: 0.08, size: 0.35, grow: 3, alpha: 0.2, hdr: 0.9 });
      } else if (kind === 'orbe') {
        emit(pos, cnt(60, dt), 0xb04dff, { spd: 0.9, up: 0.2, life: 0.45, grav: -1, spread: 0.12, size: 0.14, tex: 3, hdr: 3 });
        emit(pos, cnt(14, dt), 0x2a0c3a, { blend: 'smoke', spd: 0.2, up: 0.2, life: 0.9, grav: 0, spread: 0.08, size: 0.35, grow: 2.5, alpha: 0.4 });
      } else {
        emit(pos, cnt(170, dt), 0xffc070, { c2: 0xff3a08, spd: 0.5, up: 0.5, life: 0.4, grav: 1, spread: 0.05, size: 0.9, grow: 0.3, tex: 2, hdr: 1.3, rot: 3 });
        emit(pos, cnt(90, dt), 0xff7a20, { c2: 0x5a0a00, spd: 0.4, up: 0.8, life: 0.7, grav: 1.5, spread: 0.08, size: 0.5, grow: 1.8, tex: 0, hdr: 0.8 });
        emit(pos, cnt(25, dt), 0xffa040, { spd: 1.6, up: 0.6, life: 0.7, grav: -3, spread: 0.08, size: 0.06, tex: 3, hdr: 4 });
        emit(pos, cnt(30, dt), 0x2a221c, { blend: 'smoke', spd: 0.3, up: 0.7, life: 1.6, grav: 0.2, spread: 0.1, size: 0.45, grow: 3.2, alpha: 0.5 });
      }
    }

    // ---------------------------------------------------------------- impactos
    function shock(pos, hex, hdr, r, life) {
      quad({ tex: ringTex, color: hex, hdr: hdr, pos: pos, y: 0.04, s0: 0.3, s1: r * 2, life: life, alpha: 1, order: 6 });
    }
    function fireExplosion(pos, s) {
      s = s || 1;
      _tp.set(pos.x, Math.max(pos.y, 0.6 * s), pos.z);
      flash(_tp, 0xff7a2a, 4.2 * Math.min(1, 0.5 + s * 0.5), 0.7);
      fireball(_tp, 0.2 * s, 0.9 * s, 0.4, 0.8, 0.15, 0.3 * s, 0);
      fireball(_tp, 0.35 * s, 1.6 * s, 0.8, 0.6, -0.5, 1.0 * s, 0.03);
      fireball(_tp, 0.3 * s, 1.25 * s, 1.0, 0.45, -0.6, 1.8 * s, 0.1);
      emit(_tp, 90 * s | 0, 0xffb050, { c2: 0xff3000, spd: 9 * s, up: 3, life: 1.4, grav: -9, drag: 1.2, spread: 0.3, size: 0.07, tex: 3, hdr: 4 });
      emit(_tp, 60 * s | 0, 0xffd080, { c2: 0xff2a00, spd: 6 * s, up: 1.5, life: 0.55, grav: 1.5, drag: 4, spread: 0.4, size: 0.9 * s, grow: 1.8, tex: 2, hdr: 1.5, rot: 3 });
      emit(_tp, 40 * s | 0, 0x16120f, { blend: 'smoke', spd: 2.4 * s, up: 1.8, life: 3.2, grav: 0.5, drag: 1.5, spread: 0.6, size: 1.1 * s, grow: 3, alpha: 0.6 });
      emit(pos, 30 * s | 0, 0x2c241e, { blend: 'smoke', spd: 5 * s, up: 0.2, life: 1.6, grav: 0, drag: 3, spread: 0.3, size: 0.6 * s, grow: 2.6, alpha: 0.4, flat: true });
      shock(pos, 0xffa060, 1.6, 4.2 * s, 0.45);
      quad({ tex: glowTex, color: 0xff6018, hdr: 0.7, pos: pos, y: 0.03, s0: 2.5 * s, s1: 4.5 * s, life: 0.6, alpha: 1, order: 4 });
      quad({ tex: scorchTex, color: 0x050302, hdr: 1, additive: false, pos: pos, y: 0.012, s0: 3.6 * s, s1: 3.8 * s, life: 8, hold: 0.55, alpha: 0.95, order: 2, ease: 'lin' });
      quad({ tex: lavaGlowTex, color: 0xff5a10, hdr: 2.4, pos: pos, y: 0.016, s0: 3.0 * s, s1: 3.1 * s, life: 4.5, hold: 0.15, alpha: 1, order: 3, ease: 'lin' });
    }
    function frostImpact(pos) {
      _tp.set(pos.x, Math.max(pos.y, 0.5), pos.z);
      flash(_tp, 0x8fd8ff, 6, 0.5);
      var n = 6 + (rand() * 5 | 0), i, s;
      for (i = 0; i < n; i++) {
        s = getShard(); s.active = true; s.spike = false; s.age = 0; s.life = rr(1.2, 1.9);
        var a = rand() * TAU, sp = rr(2.5, 5.5);
        s.vx = Math.cos(a) * sp; s.vz = Math.sin(a) * sp; s.vy = rr(3, 6.5); s.wx = rr(-12, 12); s.wy = rr(-12, 12);
        s.s = rr(0.14, 0.3); s.mesh.scale.setScalar(s.s); s.mesh.position.copy(_tp); s.mesh.rotation.set(rand() * 6, rand() * 6, 0); s.mesh.visible = true;
      }
      for (i = 0; i < 7; i++) { // púas de hielo que brotan del suelo
        s = getShard(); s.active = true; s.spike = true; s.age = 0; s.life = rr(1.6, 2.2);
        var b = i / 7 * TAU + rr(-0.3, 0.3), d = rr(0.4, 1.1);
        s.s = rr(0.45, 0.85);
        s.mesh.position.set(pos.x + Math.cos(b) * d, 0, pos.z + Math.sin(b) * d);
        _v1.set(Math.cos(b) * 0.7, 1, Math.sin(b) * 0.7).add(s.mesh.position); s.mesh.lookAt(_v1);
        s.mesh.scale.set(s.s * 0.7, s.s * 0.7, 0.001); s.mesh.visible = true;
      }
      emit(_tp, 70, 0xd8f4ff, { spd: 5, up: 1.5, life: 0.8, grav: -4, drag: 2.5, spread: 0.3, size: 0.13, tex: 1, hdr: 3.5, rot: 4 });
      emit(_tp, 30, 0x6fc8ff, { spd: 3, up: 0.5, life: 0.45, grav: 0, drag: 3, spread: 0.3, size: 0.7, grow: 1.6, hdr: 1.6 });
      emit(pos, 34, 0xcfe8ff, { blend: 'smoke', spd: 3.2, up: 0.4, life: 2.4, grav: 0.1, drag: 2.4, spread: 0.4, size: 0.8, grow: 3, alpha: 0.32, hdr: 1, flat: true });
      emit(_tp, 14, 0xe6f4ff, { blend: 'smoke', spd: 1.2, up: 0.6, life: 1.8, grav: 0.2, drag: 1.5, spread: 0.3, size: 0.9, grow: 2.2, alpha: 0.28 });
      shock(pos, 0x9fe0ff, 1.5, 3.4, 0.5);
      quad({ tex: frostTex, color: [0.55, 0.85, 1.2], hdr: 1, pos: pos, y: 0.014, s0: 2.2, s1: 3.4, life: 8, hold: 0.5, alpha: 0.9, order: 3, fadeIn: 0.25 });
      quad({ tex: glowTex, color: 0x5ab8ff, hdr: 0.6, pos: pos, y: 0.03, s0: 2.2, s1: 3.5, life: 0.7, alpha: 1, order: 4 });
    }
    function holyBurst(pos, radius) {
      radius = radius || 2.5;
      _tp.set(pos.x, 1.2, pos.z);
      flash(_tp, 0xffe2a0, 6, 0.9);
      for (var i = 0; i < columns.length; i++) if (!columns[i].active || i === columns.length - 1) {
        var c = columns[i]; c.active = true; c.age = 0; c.life = 1.7; c.r = radius * 0.55;
        c.outer.position.set(pos.x, 0, pos.z); c.inner.position.set(pos.x, 0, pos.z); c.outer.visible = c.inner.visible = true; break;
      }
      var K = KINDS.luz;
      quad({ tex: runeTexture('luz'), color: K.hdr, hdr: 0.9, pos: pos, y: 0.03, s0: radius * 1.4, s1: radius * 2.4, life: 1.9, hold: 0.4, alpha: 1, spin: 0.5, order: 7, fadeIn: 0.08 });
      quad({ tex: runeRingTexture('luz'), color: K.sub, hdr: 0.8, pos: pos, y: 0.035, s0: radius * 1.8, s1: radius * 3.0, life: 1.9, hold: 0.35, alpha: 1, spin: -0.8, order: 7, fadeIn: 0.1 });
      quad({ tex: glowTex, color: 0xffc860, hdr: 0.45, pos: pos, y: 0.025, s0: radius * 1.2, s1: radius * 2.0, life: 1.6, hold: 0.3, alpha: 1, order: 4 });
      shock(pos, 0xffd080, 1.6, radius * 2.2, 0.6);
      for (var k = 0; k < 70; k++) {
        var a = rand() * TAU, d = Math.sqrt(rand()) * radius;
        _v2.set(pos.x + Math.cos(a) * d, 0.1 + rand() * 0.5, pos.z + Math.sin(a) * d);
        emit(_v2, 1, k % 3 ? 0xffd27a : 0xfff2d0, { spd: 0.3, up: rr(1.5, 4), life: rr(1.2, 2.2), grav: 0.6, drag: 0.6, spread: 0.05, size: 0.09, tex: k % 4 ? 3 : 1, hdr: 3.5, rot: 2 });
      }
      emit(_tp, 50, 0xffe7b0, { spd: 6, up: 0.3, life: 0.6, grav: 0, drag: 3, spread: 0.2, size: 0.12, tex: 1, hdr: 3, flat: true });
    }

    // tareas temporales (emisores con duración) — pool fijo
    var tasks = [];
    for (var ti = 0; ti < 8; ti++) tasks.push({ active: false, age: 0, life: 1, x: 0, y: 0, z: 0, kind: 0 });
    function healSparkles(pos) {
      var t = null; for (var i = 0; i < tasks.length; i++) if (!tasks[i].active) { t = tasks[i]; break; }
      if (!t) t = tasks[0];
      t.active = true; t.age = 0; t.life = 1.4; t.x = pos.x; t.y = pos.y; t.z = pos.z; t.kind = 0;
      flash(pos, 0xffd88a, 3, 0.8);
      quad({ tex: glowTex, color: 0xffcc66, hdr: 1.4, pos: pos, y: 0.03, s0: 1.4, s1: 2.6, life: 1.4, hold: 0.3, alpha: 1, order: 4 });
      quad({ tex: ringTex, color: 0xffd27a, hdr: 2.2, pos: pos, y: 0.04, s0: 0.4, s1: 2.6, life: 0.8, alpha: 1, order: 5 });
    }
    function updateTasks(dt) {
      for (var i = 0; i < tasks.length; i++) {
        var t = tasks[i]; if (!t.active) continue;
        t.age += dt; var u = t.age / t.life;
        if (u >= 1) { t.active = false; continue; }
        // dos hélices doradas que suben
        var steps = 3;
        for (var s = 0; s < steps; s++) {
          var uu = u - s / steps * dt / t.life;
          for (var h = 0; h < 2; h++) {
            var ang = uu * 11 + h * Math.PI, r = 0.65 - uu * 0.2;
            _v3.set(t.x + Math.cos(ang) * r, t.y + 0.1 + uu * 2.0, t.z + Math.sin(ang) * r);
            emit(_v3, 1, h ? 0xffe39a : 0xfff4d6, { spd: 0.15, up: 0.3, life: 0.7, grav: 0.4, drag: 2, spread: 0.02, size: 0.13, tex: 3, hdr: 3.2 });
          }
        }
        if (rand() < 0.5) {
          var a = rand() * TAU;
          _v3.set(t.x + Math.cos(a) * 0.5, t.y + rand() * 1.8, t.z + Math.sin(a) * 0.5);
          emit(_v3, 1, 0xffd27a, { spd: 0.2, up: 0.8, life: 0.9, grav: 0.5, spread: 0.05, size: 0.1, tex: 1, hdr: 3, rot: 3 });
        }
      }
    }

    // ---------------------------------------------------------------- carga de hechizos
    var _right = new THREE.Vector3(), _upv = new THREE.Vector3(), _hc = new THREE.Vector3();
    function castStart(kind, o) {
      o = o || {};
      if (kind === 'hielo') kind = 'escarcha';
      if (!KINDS[kind]) kind = 'fuego';
      var K = KINDS[kind], k2 = o.kind2 ? KINDS[o.kind2 === 'hielo' ? 'escarcha' : o.kind2] : null;
      var h = { kind: kind, K: K, K2: k2, I: o.I || 0, t: 0, charge: 0, state: 'charging', ang: 0 };
      h.ground = quad({ tex: runeTexture(kind), color: K.hdr, managed: true, order: 7 });
      h.ring = quad({ tex: runeRingTexture(kind), color: k2 ? k2.sub : K.sub, managed: true, order: 7 });
      h.glow = quad({ tex: glowTex, color: K.hex, managed: true, order: 4 });
      h.hand = quad({ tex: runeTexture(kind), color: K.hdr, managed: true, order: 8 });
      h.handPos = new THREE.Vector3(); h.fwd = new THREE.Vector3(0, 0, 1); h.feet = new THREE.Vector3();
      h.core = null;
      for (var i = 0; i < coreSprites.length; i++) if (!coreSprites[i].used) { h.core = coreSprites[i]; h.core.used = true; break; }
      if (h.core) { h.core.mat.color.setRGB(K.hdr[0], K.hdr[1], K.hdr[2]); h.core.sprite.visible = true; }
      return h;
    }
    function circleSize(ch) { return 0.7 + 0.9 * easeOut(Math.min(1, ch * 1.25)); }
    function castUpdate(h, dt, charge, handPos, fwd, feetPos) {
      if (!h || h.state !== 'charging') return;
      var K = h.K, kind = h.kind;
      h.t += dt; h.charge = charge = clamp01(charge);
      h.handPos.copy(handPos); h.fwd.copy(fwd); h.feet.copy(feetPos);
      var appear = Math.min(1, h.t / 0.25);
      var pulse = 1 + Math.sin(h.t * (5 + charge * 6)) * (0.08 + 0.17 * charge);
      var inten = (0.35 + 0.85 * charge) * pulse * appear * 0.5;
      if (h.I >= 20) inten *= 1 - (h.I < 50 ? 0.3 : 0.55) * Math.max(0, Math.sin(h.t * 37) * Math.sin(h.t * 53 + 1));   // el círculo parpadea si es inestable
      var D = circleSize(charge);
      // círculo de suelo
      var g = h.ground.mesh;
      g.position.set(feetPos.x, feetPos.y + 0.025, feetPos.z);
      g.rotation.set(-Math.PI / 2, 0, h.t * (0.35 + charge * 0.9));
      g.scale.setScalar(D * (0.92 + 0.08 * appear));
      h.ground.mat.color.copy(h.ground.base).multiplyScalar(inten); h.ground.mat.opacity = 1;
      var r = h.ring.mesh;
      r.position.set(feetPos.x, feetPos.y + 0.028, feetPos.z);
      r.rotation.set(-Math.PI / 2, 0, -h.t * (0.6 + charge * 1.4));
      r.scale.setScalar(D * 1.2);
      h.ring.mat.color.copy(h.ring.base).multiplyScalar(inten * (0.4 + 0.6 * charge)); h.ring.mat.opacity = 1;
      var gl = h.glow.mesh;
      gl.position.set(feetPos.x, feetPos.y + 0.02, feetPos.z); gl.rotation.set(-Math.PI / 2, 0, 0);
      gl.scale.setScalar(D * 1.4);
      h.glow.mat.color.copy(h.glow.base).multiplyScalar(0.3 * inten); h.glow.mat.opacity = 1;
      // círculo de mano
      _hc.copy(fwd).multiplyScalar(0.32 + 0.1 * charge).add(handPos);
      var hm = h.hand.mesh;
      hm.position.copy(_hc); _v1.copy(_hc).add(fwd); hm.lookAt(_v1); hm.rotateZ(h.t * (1.5 + 3 * charge));
      hm.scale.setScalar((0.28 + 0.5 * charge) * appear);
      h.hand.mat.color.copy(h.hand.base).multiplyScalar(0.6 + 0.9 * charge); h.hand.mat.opacity = 1;
      if (h.core) {
        h.core.sprite.position.copy(handPos);
        h.core.sprite.scale.setScalar((0.25 + 0.75 * charge) * (0.9 + 0.1 * Math.sin(h.t * 31)));
        h.core.mat.color.setRGB(K.hdr[0], K.hdr[1], K.hdr[2]).multiplyScalar(0.4 + 0.8 * charge);
      }
      // partículas
      emitTo(handPos, cnt(30 + 90 * charge, dt), K.hex, { radius: 0.6 + 0.5 * charge, life: 0.45, size: 0.09, hdr: 3, tex: kind === 'escarcha' ? 1 : 3, grow: 0.3 });
      var pr = D * 0.47, a, n, i;
      if (kind === 'fuego') {
        n = cnt(20 + 60 * charge, dt);
        for (i = 0; i < n; i++) { a = rand() * TAU; _v2.set(feetPos.x + Math.cos(a) * pr * rr(0.88, 0.98), feetPos.y + 0.08, feetPos.z + Math.sin(a) * pr * rr(0.88, 0.98));
          emit(_v2, 1, 0xffb050, { c2: 0xff2200, spd: 0.15, up: rr(0.8, 1.6), life: 0.45, grav: 1, drag: 1, spread: 0.03, size: 0.22 + 0.12 * charge, grow: 0.5, tex: 2, hdr: 1.6, rot: 2 }); }
        n = cnt(10 + 40 * charge, dt);
        for (i = 0; i < n; i++) { a = rand() * TAU; _v2.set(feetPos.x + Math.cos(a) * pr * rr(0.85, 1), feetPos.y + 0.05, feetPos.z + Math.sin(a) * pr * rr(0.85, 1));
          emit(_v2, 1, 0xffa040, { c2: 0xff2a00, spd: 0.4, up: rr(1.2, 2.8), life: 1.1, grav: 1.2, drag: 1, spread: 0.05, size: 0.06, tex: 3, hdr: 3.5 }); }
        emit(handPos, cnt(40 + 70 * charge, dt), 0xffc070, { c2: 0xff3000, spd: 0.35, up: 1.1, life: 0.4, grav: 1.5, spread: 0.07, size: 0.2 + 0.25 * charge, grow: 0.45, tex: 2, hdr: 2.0, rot: 3 });
        n = cnt(4 + 6 * charge, dt);
        for (i = 0; i < n; i++) { a = rand() * TAU; _v2.set(feetPos.x + Math.cos(a) * pr * 0.9, feetPos.y + 0.05, feetPos.z + Math.sin(a) * pr * 0.9);
          emit(_v2, 1, 0x1c1410, { blend: 'smoke', spd: 0.1, up: 0.6, life: 2, grav: 0.2, spread: 0.1, size: 0.5, grow: 2.5, alpha: 0.25 }); }
      } else if (kind === 'escarcha') {
        n = cnt(8 + 30 * charge, dt);
        for (i = 0; i < n; i++) { a = rand() * TAU; _v2.set(feetPos.x + Math.cos(a) * pr * rr(0.3, 1), feetPos.y + rr(0.05, 1.6), feetPos.z + Math.sin(a) * pr * rr(0.3, 1));
          emit(_v2, 1, 0xd6f4ff, { spd: 0.15, up: 0.25, life: 0.8, grav: -0.3, spread: 0.02, size: 0.1, tex: 1, hdr: 3.5, rot: 3 }); }
        n = cnt(6 + 14 * charge, dt);
        for (i = 0; i < n; i++) { a = rand() * TAU; _v2.set(feetPos.x + Math.cos(a) * pr * 0.6, feetPos.y + 0.1, feetPos.z + Math.sin(a) * pr * 0.6);
          emit(_v2, 1, 0xc8e4ff, { blend: 'smoke', spd: 0.9, up: 0.05, life: 2.2, grav: 0, drag: 1.2, spread: 0.1, size: 0.6, grow: 2.6, alpha: 0.2, flat: true }); }
        emit(handPos, cnt(10 + 20 * charge, dt), 0xe0f6ff, { blend: 'smoke', spd: 0.15, up: -0.2, life: 0.9, grav: -0.3, spread: 0.08, size: 0.2, grow: 2.2, alpha: 0.25 });
      } else if (kind !== 'luz') {
        n = cnt(8 + 30 * charge, dt);
        for (i = 0; i < n; i++) { a = rand() * TAU; elemPuff(kind, null, feetPos.x + Math.cos(a) * pr * rr(0.85, 1), feetPos.y + 0.06, feetPos.z + Math.sin(a) * pr * rr(0.85, 1), 0, rr(0.6, 1.6), 0, 0.5); }
        if (kind === 'rayo' && rand() < dt * (6 + 20 * charge)) { _v2.set(feetPos.x + Math.cos(a) * pr, feetPos.y + 0.05, feetPos.z + Math.sin(a) * pr); _v3.set(handPos.x, handPos.y, handPos.z); arc(_v2, _v3, { life: 0.1, amp: 0.3, w: 0.6 }); }
      } else {
        n = cnt(14 + 50 * charge, dt);
        for (i = 0; i < n; i++) { a = rand() * TAU; _v2.set(feetPos.x + Math.cos(a) * pr * Math.sqrt(rand()), feetPos.y + 0.05, feetPos.z + Math.sin(a) * pr * Math.sqrt(rand()));
          emit(_v2, 1, i % 3 ? 0xffd27a : 0xfff4d8, { spd: 0.1, up: rr(0.8, 2.2), life: 1.4, grav: 0.4, drag: 0.8, spread: 0.02, size: 0.08, tex: i % 2 ? 3 : 1, hdr: 3.2, rot: 2 }); }
        emit(handPos, cnt(10 + 30 * charge, dt), 0xfff0c0, { spd: 0.8, up: 0.2, life: 0.4, grav: 0, spread: 0.05, size: 0.12, tex: 1, hdr: 3, rot: 4 });
      }
    }
    function endCast(h, released) {
      if (!h || h.state !== 'charging') return;
      h.state = released ? 'released' : 'cancelled';
      var K = h.K, ch = h.charge;
      var gs = h.ground.mesh.scale.x, rs = h.ring.mesh.scale.x, gls = h.glow.mesh.scale.x;
      var boost = released ? 1.9 : 1;
      var life = released ? 0.55 : 0.3;
      function toFade(q, s, s1, ib, spin) {
        q.managed = false; q.age = 0; q.life = life; q.s0 = s; q.s1 = s1; q.a0 = 1; q.fadeIn = 0.0001; q.hold = released ? 0.15 : 0; q.ease = 'out';
        q.intensity = ib; q.spin = spin;
      }
      var inten = 0.35 + 0.85 * ch;
      toFade(h.ground, gs, released ? gs * 1.35 : gs * 0.9, inten * boost, released ? 2.5 : 0.5);
      toFade(h.ring, rs, released ? rs * 1.6 : rs * 0.9, inten * boost * 0.8, released ? -4 : -0.5);
      toFade(h.glow, gls, released ? gls * 1.25 : gls, 0.55 * inten * boost * 0.8, 0);
      if (released) {
        flash(h.handPos, K.hex, 4 + 6 * ch, 0.35);
        // estallido del círculo de mano en partículas
        _right.crossVectors(h.fwd, UP); if (_right.lengthSq() < 1e-4) _right.set(1, 0, 0); _right.normalize();
        _upv.crossVectors(_right, h.fwd).normalize();
        var hp = h.hand.mesh.position, R0 = h.hand.mesh.scale.x * 0.45;
        for (var i = 0; i < 48; i++) {
          var a = i / 48 * TAU, ca = Math.cos(a), sa = Math.sin(a);
          _v4.set(_right.x * ca + _upv.x * sa, _right.y * ca + _upv.y * sa, _right.z * ca + _upv.z * sa);
          _v2.copy(hp).addScaledVector(_v4, R0);
          var sp = rr(3, 6);
          emit(_v2, 1, K.hex, { vx: _v4.x * sp + h.fwd.x * 3, vy: _v4.y * sp + h.fwd.y * 3, vz: _v4.z * sp + h.fwd.z * 3, spd: 0.3, up: 0, grav: -1,
            drag: 3, life: 0.5, size: 0.11, tex: h.kind === 'escarcha' ? 1 : 3, hdr: 4 });
        }
        emit(hp, 14, K.hex, { spd: 2.5, up: 0, grav: 0, drag: 4, life: 0.25, size: 0.35, grow: 1.8, hdr: 1.4, vx: h.fwd.x * 2, vy: h.fwd.y * 2, vz: h.fwd.z * 2 });
        shock(h.feet, K.hex, 2.2, gs * 0.75, 0.45);
      }
      freeQuad(h.hand);
      if (h.core) { h.core.sprite.visible = false; h.core.used = false; h.core = null; }
    }
    function castRelease(h) { endCast(h, true); }
    function castCancel(h) { endCast(h, false); }

    // ================================================================ MAGIA RÚNICA: 7 elementos, reacciones, zonas, estados
    // Todo con pools fijos; sin asignaciones por frame (solo en eventos puntuales: later()).
    var EL_ALIAS = { hielo: 'escarcha', escarcha: 'escarcha' };
    function elk(el) { return EL_ALIAS[el] || el; }

    // ---------------------------------------------------------------- arcos eléctricos (cintas, 2 draw calls)
    var ARC_N = 28, ARC_P = 17, ARC_V = 3;     // 17 puntos x 3 vértices (borde, centro, borde): bordes a 0 => caída suave
    function ArcLayer(order, wmul, imul) {
      this.wmul = wmul; this.imul = imul;
      var nv = ARC_N * ARC_P * ARC_V, ni = ARC_N * (ARC_P - 1) * 12, i, s, j;
      this.pos = new Float32Array(nv * 3); this.col = new Float32Array(nv * 3);
      var idx = new Uint16Array(ni), k = 0;
      for (s = 0; s < ARC_N; s++) for (j = 0; j < ARC_P - 1; j++) {
        var a = (s * ARC_P + j) * ARC_V, b = a + ARC_V;
        idx[k++] = a; idx[k++] = a + 1; idx[k++] = b; idx[k++] = a + 1; idx[k++] = b + 1; idx[k++] = b;
        idx[k++] = a + 1; idx[k++] = a + 2; idx[k++] = b + 1; idx[k++] = a + 2; idx[k++] = b + 2; idx[k++] = b + 1;
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
      this.geo = track(g);
      this.mat = track(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, fog: false }));
      this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = order; scene.add(this.mesh);
    }
    var arcCore = new ArcLayer(24, 0.04, 1), arcHalo = new ArcLayer(23, 0.15, 1);
    var arcs = [], offU = new Float32Array(ARC_P), offW = new Float32Array(ARC_P), ARC_REGEN = 0.04;
    for (var ai = 0; ai < ARC_N; ai++) arcs.push({ active: false, age: 0, life: 0.2, regen: 0, ax: 0, ay: 0, az: 0, bx: 0, by: 0, bz: 0, amp: 0.2, r: 1, g: 1, b: 1, w: 1, bright: 1,
      px: new Float32Array(ARC_P), py: new Float32Array(ARC_P), pz: new Float32Array(ARC_P) });
    var arcCursor = 0;
    // arco entre a y b (Vector3-like). o: { life, amp (0..1 de la longitud), col:[r,g,b] HDR, w (ancho relativo) }
    function arc(a, b, o) {
      o = o || {};
      var s = arcs[arcCursor]; arcCursor = (arcCursor + 1) % ARC_N;
      s.active = true; s.age = 0; s.life = o.life || 0.2; s.regen = 0; s.amp = o.amp !== undefined ? o.amp : 0.22; s.w = o.w || 1;
      s.ax = a.x; s.ay = a.y; s.az = a.z; s.bx = b.x; s.by = b.y; s.bz = b.z;
      var c = o.col || ARC_COL.rayo; s.r = c[0]; s.g = c[1]; s.b = c[2]; s.bright = 1;
      var hc = o.halo || (c === ARC_COL.rayo ? ARC_COL.rayoHalo : null); s.hr = hc ? hc[0] : c[0] * 0.2; s.hg = hc ? hc[1] : c[1] * 0.2; s.hb = hc ? hc[2] : c[2] * 0.2;
      return s;
    }
    var ARC_COL = { rayo: [5.2, 5.6, 8], rayoHalo: [0.9, 1.4, 3], hielo: [2.2, 5, 8], luz: [6, 4.6, 2.2], fuego: [7, 3, 0.8] };
    function genArc(s) {
      var dx = s.bx - s.ax, dy = s.by - s.ay, dz = s.bz - s.az, len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001, i, L, step, lo, hi;
      var nx = dx / len, ny = dy / len, nz = dz / len;
      // base perpendicular
      var ux, uy, uz;
      if (Math.abs(ny) < 0.9) { ux = -nz; uy = 0; uz = nx; } else { ux = 1; uy = 0; uz = 0; }
      var ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1; ux /= ul; uy /= ul; uz /= ul;
      var wx = ny * uz - nz * uy, wy = nz * ux - nx * uz, wz = nx * uy - ny * ux;
      offU[0] = offW[0] = offU[ARC_P - 1] = offW[ARC_P - 1] = 0;
      for (L = 1; L <= 4; L++) {
        step = 16 >> L;
        for (i = step; i < 16; i += 2 * step) {
          lo = i - step; hi = i + step;
          var k = s.amp * len * 0.5 / (1 << (L - 1));
          offU[i] = (offU[lo] + offU[hi]) * 0.5 + (rand() * 2 - 1) * k;
          offW[i] = (offW[lo] + offW[hi]) * 0.5 + (rand() * 2 - 1) * k;
        }
      }
      for (i = 0; i < ARC_P; i++) {
        var t = i / (ARC_P - 1);
        s.px[i] = s.ax + dx * t + ux * offU[i] + wx * offW[i];
        s.py[i] = s.ay + dy * t + uy * offU[i] + wy * offW[i];
        s.pz[i] = s.az + dz * t + uz * offU[i] + wz * offW[i];
      }
    }
    function writeArcLayer(Ly, s, slot, inten) {
      var cp = camera.position, base = slot * ARC_P * ARC_V, i, o, tx, ty, tz, vx, vy, vz, sx, sy, sz, l, w, f;
      for (i = 0; i < ARC_P; i++) {
        var i0 = i > 0 ? i - 1 : 0, i1 = i < ARC_P - 1 ? i + 1 : i;
        tx = s.px[i1] - s.px[i0]; ty = s.py[i1] - s.py[i0]; tz = s.pz[i1] - s.pz[i0];
        vx = cp.x - s.px[i]; vy = cp.y - s.py[i]; vz = cp.z - s.pz[i];
        sx = ty * vz - tz * vy; sy = tz * vx - tx * vz; sz = tx * vy - ty * vx;
        l = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
        var dist = Math.sqrt(vx * vx + vy * vy + vz * vz);
        w = Ly.wmul * s.w * (0.4 + 0.6 * Math.sin(Math.PI * i / (ARC_P - 1))) * (0.7 + 0.04 * dist);
        sx = sx / l * w; sy = sy / l * w; sz = sz / l * w;
        f = Ly.imul * inten * (0.55 + 0.45 * Math.sin(Math.PI * i / (ARC_P - 1)));
        o = (base + i * ARC_V) * 3;
        Ly.pos[o] = s.px[i] - sx; Ly.pos[o + 1] = s.py[i] - sy; Ly.pos[o + 2] = s.pz[i] - sz;
        Ly.pos[o + 3] = s.px[i]; Ly.pos[o + 4] = s.py[i]; Ly.pos[o + 5] = s.pz[i];
        Ly.pos[o + 6] = s.px[i] + sx; Ly.pos[o + 7] = s.py[i] + sy; Ly.pos[o + 8] = s.pz[i] + sz;
        var cr = Ly === arcCore ? s.r : s.hr, cg = Ly === arcCore ? s.g : s.hg, cb = Ly === arcCore ? s.b : s.hb;
        Ly.col[o] = 0; Ly.col[o + 1] = 0; Ly.col[o + 2] = 0;
        Ly.col[o + 3] = cr * f; Ly.col[o + 4] = cg * f; Ly.col[o + 5] = cb * f;
        Ly.col[o + 6] = 0; Ly.col[o + 7] = 0; Ly.col[o + 8] = 0;
      }
    }
    function clearArcSlot(Ly, slot) {
      var o0 = slot * ARC_P * ARC_V * 3, n = ARC_P * ARC_V * 3;
      for (var i = 0; i < n; i++) { Ly.pos[o0 + i] = 0; Ly.col[o0 + i] = 0; }
    }
    function updateArcs(dt) {
      for (var i = 0; i < ARC_N; i++) {
        var s = arcs[i];
        if (!s.active) continue;
        s.age += dt;
        if (s.age >= s.life) { s.active = false; clearArcSlot(arcCore, i); clearArcSlot(arcHalo, i); continue; }
        s.regen -= dt;
        if (s.regen <= 0) { s.regen = ARC_REGEN; genArc(s); s.bright = rand() < 0.33 ? 1 : rand() < 0.5 ? 0.45 : 0.2; }    // 1 frame fuerte, el resto débil
        var t = s.age / s.life, fade = t < 0.1 ? t / 0.1 : (t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1);
        writeArcLayer(arcCore, s, i, s.bright * fade);
        writeArcLayer(arcHalo, s, i, s.bright * fade);
      }
      arcCore.geo.attributes.position.needsUpdate = arcCore.geo.attributes.color.needsUpdate = true;
      arcHalo.geo.attributes.position.needsUpdate = arcHalo.geo.attributes.color.needsUpdate = true;
    }
    function arcsLive() { var n = 0; for (var i = 0; i < ARC_N; i++) if (arcs[i].active) n++; return n; }

    // ---------------------------------------------------------------- rocas y pinchos (InstancedMesh: 1 draw call cada uno)
    function nz3(x, y, z) { return vn2(x * 2.1 + z * 1.3, y * 2.1 - z * 0.7, 5) - 0.5; }
    var rockGeo = (function () {
      var g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, i;
      for (i = 0; i < p.count; i++) {
        var x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = 1 + nz3(x, y, z) * 1.0 + nz3(x * 2.3, y * 2.3, z * 2.3) * 0.5;
        p.setXYZ(i, x * d * 1.15, y * d * 0.7, z * d * 0.9);
      }
      g.computeVertexNormals();   // caras pequeñas con normales propias: roca fracturada, no esfera
      return track(g);
    })();
    var spikeGeo = (function () {
      var g = new THREE.ConeGeometry(0.5, 1, 6, 3), p = g.attributes.position, i;
      g.translate(0, 0.5, 0);
      for (i = 0; i < p.count; i++) { var x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, x + nz3(x, y, z) * 0.35, y, z + nz3(z, x, y) * 0.35); }
      g = g.toNonIndexed(); g.computeVertexNormals(); return track(g);
    })();
    var rockMat = track(new THREE.MeshStandardMaterial({ color: 0x5b4a38, roughness: 1, metalness: 0, flatShading: true }));
    var ROCK_N = 24, SPIKE_N = 24;
    var rockIM = new THREE.InstancedMesh(rockGeo, rockMat, ROCK_N), spikeIM = new THREE.InstancedMesh(spikeGeo, rockMat, SPIKE_N);
    [rockIM, spikeIM].forEach(function (im) { im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; scene.add(im); });
    var rocks = [], spikes = [], _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s3 = new THREE.Vector3(), _zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (var ri = 0; ri < ROCK_N; ri++) { rocks.push({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, s: 0.2, age: 0, life: 2 }); rockIM.setMatrixAt(ri, _zero); }
    for (var si2 = 0; si2 < SPIKE_N; si2++) { spikes.push({ active: false, x: 0, z: 0, tx: 0, tz: 0, ry: 0, h: 1, w: 0.3, age: 0, life: 2, delay: 0 }); spikeIM.setMatrixAt(si2, _zero); }
    var rockCur = 0, spikeCur = 0;
    function rock(x, y, z, vx, vy, vz, size, life) {
      var r = rocks[rockCur]; rockCur = (rockCur + 1) % ROCK_N;
      r.active = true; r.x = x; r.y = y; r.z = z; r.vx = vx; r.vy = vy; r.vz = vz; r.s = size; r.age = 0; r.life = life || 2.4;
      r.rx = rand() * 6; r.ry = rand() * 6; r.rz = rand() * 6; r.wx = rr(-7, 7); r.wy = rr(-7, 7); r.wz = rr(-7, 7);
    }
    function spike(x, z, h, w, life, delay) {
      var s = spikes[spikeCur]; spikeCur = (spikeCur + 1) % SPIKE_N;
      s.active = true; s.x = x; s.z = z; s.h = h; s.w = w; s.age = 0; s.life = life; s.delay = delay || 0; s.ry = rand() * 6; s.tx = rr(-0.35, 0.35); s.tz = rr(-0.35, 0.35);
    }
    function updateRocks(dt) {
      var i, r, any = false;
      for (i = 0; i < ROCK_N; i++) {
        r = rocks[i]; if (!r.active) continue;
        r.age += dt;
        if (r.age >= r.life) { r.active = false; rockIM.setMatrixAt(i, _zero); any = true; continue; }
        r.vy -= 16 * dt; r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt;
        var fl = r.s * 0.45;
        if (r.y < fl) { r.y = fl; r.vy *= -0.32; r.vx *= 0.55; r.vz *= 0.55; r.wx *= 0.5; r.wy *= 0.5; r.wz *= 0.5; if (Math.abs(r.vy) < 0.6) r.vy = 0; }
        r.rx += r.wx * dt; r.ry += r.wy * dt; r.rz += r.wz * dt;
        var sink = r.age > r.life - 0.7 ? (r.life - r.age) / 0.7 : 1;    // se hunden, no se desvanecen
        _e.set(r.rx, r.ry, r.rz); _q.setFromEuler(_e); _s3.set(r.s * sink, r.s * sink, r.s * sink);
        _m4.compose(_v1.set(r.x, r.y - (1 - sink) * r.s * 0.6, r.z), _q, _s3); rockIM.setMatrixAt(i, _m4); any = true;
      }
      if (any) rockIM.instanceMatrix.needsUpdate = true;
      any = false;
      for (i = 0; i < SPIKE_N; i++) {
        var s = spikes[i]; if (!s.active) continue;
        s.age += dt; var a = s.age - s.delay;
        if (a >= s.life) { s.active = false; spikeIM.setMatrixAt(i, _zero); any = true; continue; }
        if (a < 0) { spikeIM.setMatrixAt(i, _zero); any = true; continue; }
        var u = a < 0.18 ? easeOut(a / 0.18) : (a > s.life - 0.6 ? Math.max(0, (s.life - a) / 0.6) : 1);   // brotan rápido, se hunden
        _e.set(s.tx, s.ry, s.tz); _q.setFromEuler(_e); _s3.set(s.w, s.h * u, s.w);
        _m4.compose(_v1.set(s.x, -0.05, s.z), _q, _s3); spikeIM.setMatrixAt(i, _m4); any = true;
      }
      if (any) spikeIM.instanceMatrix.needsUpdate = true;
    }

    // ---------------------------------------------------------------- cuerpos de proyectil por elemento
    var flareTex = (function () {
      var cv = canvas(128), g = cv.getContext('2d'), i;
      g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128);
      g.globalCompositeOperation = 'lighter';
      for (i = 0; i < 2; i++) {
        var lg = g.createLinearGradient(0, 64, 128, 64);
        lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.9)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        g.save(); g.translate(64, 64); g.rotate(i * Math.PI / 2); g.translate(-64, -64);
        g.fillStyle = lg; g.fillRect(0, 62, 128, 4); g.fillStyle = lg; g.fillRect(8, 63, 112, 2); g.restore();
      }
      var gr = g.createRadialGradient(64, 64, 0, 64, 64, 24); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      var t = ctex(cv); return t;
    })();
    var SHADOW_FRAG = NOISE + [
      '\nuniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vP;',
      'void main(){',
      '  float fr = 1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);',
      '  float n = fbm(vP * 1.7 + vec3(0.0, -uTime * 0.9, uTime * 0.4));',
      '  float a = smoothstep(0.18, 0.62, n + fr * 0.35) * 0.92;',
      '  vec3 col = vec3(0.012, 0.006, 0.02) + vec3(0.7, 0.22, 1.1) * pow(fr, 3.2) * (0.3 + n);',
      '  gl_FragColor = vec4(col * a, a);',
      '}'
    ].join('\n');
    var shadowMat = track(new THREE.ShaderMaterial({ uniforms: { uTime: U_TIME, uSeed: { value: 3 }, uDisp: { value: 0.55 } },
      vertexShader: FIRE_VERT, fragmentShader: SHADOW_FRAG, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }));
    var PLASMA_FRAG = NOISE + [
      '\nuniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vL;',
      'void main(){',
      '  float fr = 1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);',
      '  float n = fbm(vL * 7.0 + vec3(uTime * 6.0, uTime * 3.1, -uTime * 4.0));',
      '  float vein = smoothstep(0.1, 0.0, abs(n - 0.5));',
      '  vec3 col = vec3(0.7, 0.9, 2.4) * pow(fr, 1.6) * 0.9 + vec3(7.0, 7.0, 9.0) * vein * (0.5 + fr) + vec3(2.2, 2.4, 4.0) * (1.0 - fr) * 0.35;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n');
    var plasmaMat = track(new THREE.ShaderMaterial({ uniforms: { uTime: U_TIME }, vertexShader: ICE_VERT, fragmentShader: PLASMA_FRAG }));
    var lightMats = { core: addBasic(7, 5.8, 3.6), halo: haloMat(1.9, 1.35, 0.6), flare: track(new THREE.SpriteMaterial({ map: flareTex, color: new THREE.Color(1.8, 1.5, 0.9), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })),
      airHalo: haloMat(0.5, 0.6, 0.55) };
    var _pw = new THREE.Vector3(), _pa = new THREE.Vector3();
    function elementBody(el) {
      var g = new THREE.Group(), t = rand() * 10, tick;
      if (el === 'luz') {
        var c = new THREE.Mesh(tinySphere, lightMats.core); c.scale.setScalar(0.07); g.add(c);
        var h = new THREE.Sprite(lightMats.halo); h.scale.setScalar(1.2); g.add(h);
        var fl = new THREE.Sprite(lightMats.flare); fl.scale.set(2.4, 2.4, 1); g.add(fl);
        tick = function (dt) { t += dt; h.scale.setScalar(1.15 + Math.sin(t * 17) * 0.08); fl.material.rotation = t * 0.6; };
      } else if (el === 'rayo') {
        var pl = new THREE.Mesh(tinySphere, plasmaMat); pl.scale.setScalar(0.17); g.add(pl);
        var hh = new THREE.Sprite(projMats.orbHalo); hh.scale.setScalar(0.9); g.add(hh);
        var acc = 0;
        tick = function (dt) {
          t += dt; acc -= dt; pl.rotation.y += dt * 9; hh.scale.setScalar(0.85 + Math.sin(t * 41) * 0.12 * rand());
          if (acc <= 0) {   // arcos cortos que saltan alrededor de la esfera
            acc = rr(0.04, 0.1); g.getWorldPosition(_pw);
            var a = rand() * TAU, u = rand() * 2 - 1, s = Math.sqrt(1 - u * u), L = rr(0.22, 0.38);
            _pa.set(_pw.x + s * Math.cos(a) * L, _pw.y + u * L, _pw.z + s * Math.sin(a) * L);
            arc(_pw, _pa, { life: 0.1, amp: 0.4, w: 0.7 });
          }
        };
      } else if (el === 'tierra') {
        var rk = new THREE.Mesh(rockGeo, rockMat); rk.scale.setScalar(0.2); g.add(rk);
        tick = function (dt) { rk.rotation.x += dt * 5; rk.rotation.z += dt * 3.2; };
      } else if (el === 'sombra') {
        var sh = new THREE.Mesh(sphereGeo, shadowMat); sh.scale.setScalar(0.24); sh.renderOrder = 14; g.add(sh);
        tick = function (dt) { sh.rotation.y += dt * 2; sh.rotation.x += dt * 1.3; };
      } else if (el === 'aire') {
        var ah = new THREE.Sprite(lightMats.airHalo); ah.scale.setScalar(0.9); g.add(ah);
        tick = function (dt) { t += dt; ah.scale.setScalar(0.8 + Math.sin(t * 13) * 0.1); };
      } else { var inner = projectileMesh(el); g.add(inner); tick = inner.userData.tick; }
      g.userData.tick = tick; g.userData.el = el;
      return g;
    }
    // Proyectil de hechizo: 1 elemento = su cuerpo; 2 = dos cuerpos orbitando (color mezclado)
    function spellProjectile(elems) {
      var g = new THREE.Group();
      if (elems.length === 1 || elems[0] === elems[1]) {
        var b = elementBody(elk(elems[0])); g.add(b);
        if (elems.length === 2) b.scale.setScalar(1.25);
        g.userData.tick = b.userData.tick;
      } else {
        var b1 = elementBody(elk(elems[0])), b2 = elementBody(elk(elems[1])), t = 0;
        b1.scale.setScalar(0.8); b2.scale.setScalar(0.8); g.add(b1); g.add(b2);
        g.userData.tick = function (dt) {
          t += dt * 9; b1.userData.tick(dt); b2.userData.tick(dt);
          b1.position.set(Math.cos(t) * 0.09, Math.sin(t) * 0.09, 0); b2.position.set(-Math.cos(t) * 0.09, -Math.sin(t) * 0.09, 0);
        };
      }
      return g;
    }

    // ---------------------------------------------------------------- estela y partículas por elemento
    var _dir = new THREE.Vector3(0, 0, 1), _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3(), _helix = 0;
    function elTrail(kind, pos, dt) {
      var n, a;
      if (kind === 'luz') {
        emit(pos, cnt(60, dt), 0xfff0c0, { spd: 0.5, up: 0.1, life: 0.5, grav: 0, spread: 0.06, size: 0.1, tex: 1, hdr: 3.2, rot: 3 });
        emit(pos, cnt(26, dt), 0xffd27a, { spd: 0.15, up: 0.1, life: 1.6, grav: 0.2, spread: 0.12, size: 0.07, tex: 3, hdr: 3 });      // motas que quedan flotando
      } else if (kind === 'rayo') {
        emit(pos, cnt(46, dt), 0xdfe6ff, { spd: 2.2, up: 0.4, life: 0.3, grav: -6, drag: 2, spread: 0.06, size: 0.05, tex: 3, hdr: 5 });
        emit(pos, cnt(8, dt), 0x9a88ff, { blend: 'smoke', spd: 0.1, up: 0.2, life: 0.9, grav: 0.1, spread: 0.1, size: 0.3, grow: 2.2, alpha: 0.1, hdr: 1.2 });  // ozono
      } else if (kind === 'tierra') {
        emit(pos, cnt(40, dt), 0x4a3a2a, { spd: 0.8, up: 0.2, life: 0.8, grav: -9, drag: 1, spread: 0.1, size: 0.05, tex: 3, hdr: 0.6 });
        emit(pos, cnt(34, dt), 0x8a735a, { blend: 'smoke', spd: 0.4, up: 0.3, life: 1.3, grav: -0.2, spread: 0.12, size: 0.4, grow: 3, alpha: 0.4, hdr: 0.9 });
      } else if (kind === 'sombra') {
        emit(pos, cnt(60, dt), 0x0c0612, { blend: 'smoke', spd: 0.5, up: 0.3, life: 1.3, grav: 0.2, spread: 0.12, size: 0.5, grow: 3, alpha: 0.7, hdr: 0.9 });
        emit(pos, cnt(14, dt), 0x9a4cff, { spd: 0.6, up: 0.3, life: 0.5, grav: -0.6, spread: 0.1, size: 0.05, tex: 3, hdr: 2.6 });
      } else if (kind === 'aire') {
        // hélice de polvo y finas estelas alrededor del eje de avance
        _p1.crossVectors(_dir, UP); if (_p1.lengthSq() < 1e-4) _p1.set(1, 0, 0); _p1.normalize(); _p2.crossVectors(_dir, _p1);
        n = cnt(70, dt);
        for (a = 0; a < n; a++) {
          _helix += 0.9; var ca = Math.cos(_helix) * 0.16, sa = Math.sin(_helix) * 0.16;
          _v3.set(pos.x + _p1.x * ca + _p2.x * sa, pos.y + _p1.y * ca + _p2.y * sa, pos.z + _p1.z * ca + _p2.z * sa);
          emit(_v3, 1, 0xe8f2ea, { spd: 0.1, up: 0, life: 0.6, grav: 0, spread: 0.01, size: 0.09, tex: 0, hdr: 1.6, alpha: 0.7 });
        }
        emit(pos, cnt(20, dt), 0xd9dccf, { blend: 'smoke', spd: 0.5, up: 0.2, life: 0.8, grav: -0.3, spread: 0.2, size: 0.22, grow: 2, alpha: 0.12, hdr: 1 });
        emit(pos, cnt(6, dt), 0x7c8a3c, { blend: 'smoke', spd: 1.4, up: 0.4, life: 1, grav: -1.5, spread: 0.2, size: 0.07, grow: 1, alpha: 0.9, hdr: 0.6 });   // briznas
      }
    }

    // ---------------------------------------------------------------- tareas temporales (cono, parpadeo de luz, aura, retardos)
    var later_ = [];
    for (var li = 0; li < 14; li++) later_.push({ active: false, t: 0, fn: null });
    function later(delay, fn) { for (var i = 0; i < later_.length; i++) if (!later_[i].active) { var l = later_[i]; l.active = true; l.t = delay; l.fn = fn; return; } fn(); }
    var fx2 = [];   // tareas con duración: { active, kind, age, life, ... }
    for (var fi2 = 0; fi2 < 12; fi2++) fx2.push({ active: false, kind: 0, age: 0, life: 1, x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0, el: '', el2: '', hex: 0, peak: 1, range: 5, ref: null, stop: false });
    function task() { for (var i = 0; i < fx2.length; i++) if (!fx2[i].active) { fx2[i].stop = false; fx2[i].ref = null; return fx2[i]; } return null; }
    function lightFlicker(pos, hex, peak, dur) {
      var t = task(); if (!t) return; t.active = true; t.kind = 2; t.age = 0; t.life = dur; t.x = pos.x; t.y = pos.y; t.z = pos.z; t.hex = hex; t.peak = peak; t.dx = 0;
    }
    function elemPuff(el, o, x, y, z, vx, vy, vz, scale) {   // una partícula de "chorro" de un elemento
      _v4.set(x, y, z); scale = scale || 1;
      if (el === 'fuego') emit(_v4, 1, 0xffb050, { c2: 0xff3000, vx: vx, vy: vy, vz: vz, spd: 0.2, up: 0, life: 0.5, grav: 1.2, drag: 1.8, spread: 0.05, size: 0.42 * scale, grow: 2.8, tex: 2, hdr: 1.7, alpha: 0.9, rot: 3 });
      else if (el === 'hielo') emit(_v4, 1, rand() < 0.4 ? 0xe6f6ff : 0x9cc8ff, { blend: rand() < 0.6 ? 'smoke' : undefined, vx: vx, vy: vy, vz: vz, spd: 0.2, up: 0, life: 0.8, grav: -1, drag: 1.4, spread: 0.05, size: 0.2 * scale, grow: 2.6, tex: 1, hdr: 2.4, alpha: 0.3 });
      else if (el === 'luz') emit(_v4, 1, 0xffe39a, { vx: vx, vy: vy, vz: vz, spd: 0.2, up: 0, life: 0.7, grav: 0.2, drag: 1.2, spread: 0.05, size: 0.12 * scale, tex: rand() < 0.5 ? 1 : 3, hdr: 3.4, rot: 3 });
      else if (el === 'sombra') emit(_v4, 1, 0x0c0612, { blend: 'smoke', vx: vx, vy: vy, vz: vz, spd: 0.2, up: 0, life: 1.1, grav: 0.2, drag: 1.5, spread: 0.06, size: 0.5 * scale, grow: 2.6, alpha: 0.7, hdr: 0.9 });
      else if (el === 'tierra') emit(_v4, 1, rand() < 0.5 ? 0x5a4630 : 0x8a735a, { vx: vx, vy: vy, vz: vz, spd: 0.4, up: 0.1, life: 0.9, grav: -9, drag: 0.8, spread: 0.05, size: 0.06 * scale, tex: 3, hdr: 0.7 });
      else if (el === 'aire') emit(_v4, 1, 0xe2eee6, { blend: 'smoke', vx: vx, vy: vy, vz: vz, spd: 0.2, up: 0, life: 0.8, grav: 0, drag: 1.2, spread: 0.06, size: 0.3 * scale, grow: 2.6, alpha: 0.14, hdr: 1 });
      else emit(_v4, 1, 0xdfe6ff, { vx: vx, vy: vy, vz: vz, spd: 0.3, up: 0, life: 0.3, grav: -4, size: 0.05, tex: 3, hdr: 5 });
    }
    function updateFx2(dt) {
      var i, t, n, k, a;
      for (i = 0; i < later_.length; i++) {
        var l = later_[i]; if (!l.active) continue;
        l.t -= dt; if (l.t <= 0) { l.active = false; var f = l.fn; l.fn = null; f(); }
      }
      for (i = 0; i < fx2.length; i++) {
        t = fx2[i]; if (!t.active) continue;
        t.age += dt;
        var u = t.age / t.life;
        if (u >= 1 || (t.kind === 3 && t.stop)) { t.active = false; continue; }
        if (t.kind === 1) {      // cono: chorro de partículas del elemento
          var rate = 340 * (1 - u * 0.5);
          n = cnt(rate, dt);
          for (k = 0; k < n; k++) {
            a = rr(-1, 1) * t.peak;      // ángulo lateral (rad)
            var ca = Math.cos(a), sa = Math.sin(a), sp = t.range / 0.55 * rr(0.6, 1.1);
            // dirección base (dx,dz) girada 'a' en horizontal
            var vx = (t.dx * ca - t.dz * sa) * sp, vz = (t.dx * sa + t.dz * ca) * sp;
            elemPuff(t.el, null, t.x, t.y, t.z, vx, rr(-0.4, 0.8), vz, 1);
            if (t.el2 && rand() < 0.5) elemPuff(t.el2, null, t.x, t.y, t.z, vx, rr(-0.4, 0.8), vz, 1);
          }
          if (t.el === 'rayo' && rand() < dt * 30) { _v4.set(t.x + t.dx * t.range * rr(0.5, 1), t.y + rr(-0.4, 0.4), t.z + t.dz * t.range * rr(0.5, 1)); _v3.set(t.x, t.y, t.z); arc(_v3, _v4, { life: 0.1, amp: 0.3 }); }
        } else if (t.kind === 2) {  // parpadeo de luz: ráfagas irregulares
          t.dx -= dt;
          if (t.dx <= 0) { t.dx = rr(0.03, 0.07); _v4.set(t.x, t.y, t.z); flash(_v4, t.hex, t.peak * rand() * (1 - u), 0.06); }
        } else if (t.kind === 3) {  // aura sobre el jugador
          var p = t.ref; if (!p) { t.active = false; continue; }
          auraStep(t, p, dt, u);
        }
      }
    }
    function auraStep(t, p, dt, u) {
      var el = t.el, n, k, a, r;
      var fade = Math.min(1, t.age / 0.6) * (u > 0.88 ? (1 - u) / 0.12 : 1);
      n = cnt(40 * fade, dt);
      for (k = 0; k < n; k++) {
        a = rand() * TAU; r = rr(0.35, 0.65);
        _v4.set(p.x + Math.cos(a) * r, p.y + rr(0.1, 1.9), p.z + Math.sin(a) * r);
        if (el === 'fuego') emit(_v4, 1, 0xffb050, { c2: 0xff2200, spd: 0.1, up: rr(0.5, 1.3), life: 0.8, grav: 0.8, spread: 0.03, size: 0.16, grow: 0.5, tex: rand() < 0.5 ? 2 : 3, hdr: 1.7, rot: 2 });
        else if (el === 'hielo') emit(_v4, 1, 0xdaf3ff, { spd: 0.1, up: -0.1, life: 0.9, grav: -0.2, spread: 0.02, size: 0.07, tex: 1, hdr: 3, rot: 3 });
        else if (el === 'luz') emit(_v4, 1, 0xffd88a, { spd: 0.08, up: rr(0.4, 1.0), life: 1.2, grav: 0.2, spread: 0.02, size: 0.07, tex: rand() < 0.5 ? 1 : 3, hdr: 3, rot: 2 });
        else if (el === 'rayo') { if (rand() < 0.12) { _v3.set(p.x + rr(-0.3, 0.3), p.y + rr(0.2, 1.7), p.z + rr(-0.3, 0.3)); arc(_v4, _v3, { life: 0.09, amp: 0.35, w: 0.6 }); } }
        else if (el === 'tierra') { if (rand() < 0.3) emit(_v4, 1, 0x8a735a, { blend: 'smoke', spd: 0.05, up: 0.1, life: 1, grav: 0, spread: 0.02, size: 0.12, grow: 1.3, alpha: 0.5, hdr: 0.9 }); }
        else if (el === 'sombra') emit(_v4.setY(p.y + rr(0, 0.5)), 1, 0x0c0612, { blend: 'smoke', spd: 0.1, up: 0.2, life: 1.4, grav: 0.1, spread: 0.04, size: 0.4, grow: 2, alpha: 0.5, hdr: 0.9 });
        else if (el === 'aire') emit(_v4, 1, 0xe2eee6, { spd: 0.2, up: 0.1, life: 0.7, grav: 0, spread: 0.02, size: 0.05, tex: 0, hdr: 1.2, alpha: 0.4, vx: -Math.sin(a) * 1.2, vz: Math.cos(a) * 1.2 });
      }
    }
    // Yo: aura durante 'dur' s siguiendo a 'pos' (Vector3 vivo). Devuelve el handle.
    function aura(el, pos, dur) {
      var t = task(); if (!t) return null;
      t.active = true; t.kind = 3; t.age = 0; t.life = dur || 8; t.el = el === 'escarcha' ? 'hielo' : el; t.ref = pos;
      return t;
    }
    function auraStop(h) { if (h) h.stop = true; }

    // Cono instantáneo (0,35 s de chorro) en dirección (dx,dz)
    function cono(el, el2, pos, dx, dz, range, ang) {
      var t = task(); if (!t) return;
      t.active = true; t.kind = 1; t.age = 0; t.life = 0.4; t.x = pos.x; t.y = pos.y; t.z = pos.z; t.dx = dx; t.dz = dz; t.el = el; t.el2 = el2 || ''; t.range = range; t.peak = ang * 0.5;
      if (el === 'fuego' || el2 === 'fuego') flash(_v4.set(pos.x + dx * range * 0.5, pos.y, pos.z + dz * range * 0.5), 0xff7a2e, 3.5, 0.5);
      else if (el === 'rayo' || el2 === 'rayo') lightFlicker(_v4.set(pos.x + dx * range * 0.5, pos.y, pos.z + dz * range * 0.5), 0xb9a8ff, 7, 0.3);
    }

    // ---------------------------------------------------------------- zonas persistentes (suelos): pool fijo de 8
    var ZN = 8, zonas = [];
    var ZSTYLE = {
      fuego: { rate: 70, decal: [[scorchTex, 0x050302, 1, false, 0.9, 1.05], [lavaGlowTex, 0xff5a10, 1.5, true, 1, 1.0]] },
      hielo: { rate: 40, decal: [[frostTex, [0.55, 0.85, 1.2], 1, true, 0.9, 1.05]] },
      luz: { rate: 40, decal: [['rune:luz', [2.0, 1.55, 0.8], 1, true, 0.7, 1.0]] },
      rayo: { rate: 24, decal: [[scorchTex, 0x070510, 1, false, 0.7, 0.9]] },
      tierra: { rate: 40, decal: [['crack:11', 0x0b0805, 1, false, 0.85, 1.05]] },
      sombra: { rate: 80, decal: [[scorchTex, 0x07030c, 1, false, 0.9, 1.1]] },
      aire: { rate: 60, decal: [] },
      vapor: { rate: 150, decal: [] },
      magma: { rate: 60, decal: [[lavaCrustTex, 0x0d0705, 1, false, 1, 1.0], [lavaGlowTex, [3.6, 1.0, 0.16], 1, true, 1, 1.0]] },
      incendio: { rate: 110, decal: [[scorchTex, 0x050302, 1, false, 0.9, 1.05], [lavaGlowTex, 0xff5a10, 1.5, true, 1, 1.0]] },
      escarcha_electrica: { rate: 40, decal: [[frostTex, [0.5, 0.8, 1.2], 1, true, 0.9, 1.05]] },
      juicio: { rate: 40, decal: [['rune:luz', [2.0, 1.55, 0.8], 1, true, 0.7, 1.0]] },
      niebla_negra: { rate: 240, decal: [[scorchTex, 0x07030c, 1, false, 0.9, 1.1]] }
    };
    var crackCache = {};
    function decalTex(t) {
      if (typeof t !== 'string') return t;
      if (t.indexOf('rune:') === 0) return runeTexture(t.slice(5));
      if (!crackCache[t]) crackCache[t] = crackTexture(+t.slice(6), false);
      return crackCache[t];
    }
    for (var zi = 0; zi < ZN; zi++) zonas.push({ active: false, style: 'fuego', x: 0, z: 0, r: 2, r1: 2, age: 0, life: 4, q: [null, null], qn: 0, spin: 0, fade: 1 });
    function zonaDecals(h) {
      var i, d = ZSTYLE[h.style].decal;
      for (i = 0; i < h.qn; i++) if (h.q[i]) { freeQuad(h.q[i]); h.q[i] = null; }
      h.qn = 0;
      for (i = 0; i < d.length && i < 2; i++) {
        var c = d[i], q = quad({ tex: decalTex(c[0]), color: c[1], hdr: c[2], additive: c[3], managed: true, order: c[3] ? 4 : 2 });
        if (q) { q.a0 = c[4]; q.sc = c[5]; q.mesh.rotation.z = rand() * TAU; h.q[h.qn++] = q; }
      }
    }
    // Crea un suelo. Devuelve el handle (reutilizado: comprobar .active por si se recicla).
    function zona(style, pos, r, dur, r1) {
      var h = null, i, old = null;
      for (i = 0; i < ZN; i++) { if (!zonas[i].active) { h = zonas[i]; break; } if (!old || zonas[i].age / zonas[i].life > old.age / old.life) old = zonas[i]; }
      h = h || old;
      for (i = 0; i < h.qn; i++) if (h.q[i]) { freeQuad(h.q[i]); h.q[i] = null; }
      h.active = true; h.style = ZSTYLE[style] ? style : 'fuego'; h.x = pos.x; h.z = pos.z; h.r = r; h.r1 = r1 || r; h.age = 0; h.life = dur; h.qn = 0; h.fade = 0;
      zonaDecals(h);
      return h;
    }
    function zonaStyle(h, style, r1) {
      if (!h || !h.active || !ZSTYLE[style]) return;
      h.style = style; if (r1) h.r1 = r1; zonaDecals(h);
      _v4.set(h.x, 0.5, h.z); flash(_v4, style === 'vapor' ? 0xffc080 : 0xff8a3a, 3, 0.2);
      emit(_v4.set(h.x, 0.4, h.z), 20, 0xffe0b0, { spd: 3, up: 1, life: 0.4, grav: -2, spread: h.r * 0.5, size: 0.1, tex: 3, hdr: 3 });
    }
    function zonaStop(h) { if (h && h.active) { h.life = Math.min(h.life, h.age + 0.9); } }
    function updateZonas(dt) {
      for (var i = 0; i < ZN; i++) {
        var h = zonas[i]; if (!h.active) continue;
        h.age += dt;
        if (h.age >= h.life) { h.active = false; for (var j = 0; j < h.qn; j++) if (h.q[j]) { freeQuad(h.q[j]); h.q[j] = null; } h.qn = 0; continue; }
        var left = h.life - h.age, f = Math.min(1, h.age / 0.5) * Math.min(1, left / 1.2);
        h.fade = f;
        var r = h.r + (h.r1 - h.r) * Math.min(1, h.age / (h.life * 0.5));
        var pulse = 0.85 + 0.15 * Math.sin(h.age * 3.1) + 0.06 * Math.sin(h.age * 11.3);
        for (j = 0; j < h.qn; j++) {
          var q = h.q[j]; if (!q) continue;
          q.mesh.position.set(h.x, 0.012 + j * 0.003, h.z); q.mesh.rotation.x = -Math.PI / 2; q.mesh.scale.setScalar(r * 2 * q.sc);
          q.mat.color.copy(q.base).multiplyScalar(q.additive ? f * pulse : 1); q.mat.opacity = q.additive ? 1 : q.a0 * f;
        }
        zonaEmit(h, r, f, dt);
      }
    }
    function zonaEmit(h, r, f, dt) {
      var st = h.style, S = ZSTYLE[st], n = cnt(S.rate * f * Math.min(2.5, (r * r) / 9), dt), k, a, d, x, z;
      for (k = 0; k < n; k++) {
        a = rand() * TAU; d = Math.sqrt(rand()) * r; x = h.x + Math.cos(a) * d; z = h.z + Math.sin(a) * d;
        if (st === 'fuego' || st === 'incendio') {
          var inc = st === 'incendio';
          _v4.set(x, 0.05, z);
          emit(_v4, 1, 0xffc070, { c2: 0xff3000, spd: 0.1, up: rr(0.7, 1.5) * (inc ? 1.8 : 1), vx: inc ? 1.2 : 0, life: 0.55, grav: 1, drag: 1, spread: 0.03, size: 0.45 * (inc ? 1.3 : 1), grow: 0.7, tex: 2, hdr: 1.7, rot: 2 });
          if (rand() < 0.12) emit(_v4, 1, 0xffa040, { spd: 0.5, up: rr(1.2, 2.6) * (inc ? 2 : 1), vx: inc ? 1.8 : 0, life: 1.4, grav: 0.4, size: 0.05, tex: 3, hdr: 3.5 });
          if (rand() < 0.08) emit(_v4.setY(0.5), 1, 0x2a221c, { blend: 'smoke', spd: 0.2, up: 0.8, life: 1.8, grav: 0.2, spread: 0.1, size: 0.5, grow: 3, alpha: 0.4 });
        } else if (st === 'hielo' || st === 'escarcha_electrica') {
          if (rand() < 0.6) emit(_v4.set(x, 0.12, z), 1, 0xcfe8ff, { blend: 'smoke', spd: 0.4, up: 0.04, life: 2.2, grav: 0, drag: 1.2, spread: 0.02, size: 0.7, grow: 2.2, alpha: 0.22, flat: true });
          if (rand() < 0.5) emit(_v4.set(x, rr(0.05, 0.5), z), 1, 0xe6f6ff, { spd: 0.05, up: 0.1, life: 0.6, grav: 0, size: 0.07, tex: 1, hdr: 3.6, rot: 3 });
          if (st === 'escarcha_electrica' && rand() < 0.06) { _v3.set(x + rr(-0.6, 0.6), 0.05, z + rr(-0.6, 0.6)); arc(_v4.set(x, 0.05, z), _v3, { life: 0.1, amp: 0.4, col: ARC_COL.hielo, w: 0.8 }); }
        } else if (st === 'luz' || st === 'juicio') {
          emit(_v4.set(x, 0.05, z), 1, rand() < 0.3 ? 0xfff4d8 : 0xffd27a, { spd: 0.08, up: rr(0.5, 1.6), life: rr(1.4, 2.4), grav: 0.3, drag: 0.5, spread: 0.02, size: 0.07, tex: rand() < 0.5 ? 3 : 1, hdr: 3.2, rot: 2 });
        } else if (st === 'rayo') {
          if (rand() < 0.1) { _v3.set(x + rr(-0.7, 0.7), 0.04, z + rr(-0.7, 0.7)); arc(_v4.set(x, 0.04, z), _v3, { life: 0.12, amp: 0.4, w: 0.8 }); }
          if (rand() < 0.5) emit(_v4.set(x, 0.1, z), 1, 0xcdd2ff, { spd: 1, up: rr(0.3, 1), life: 0.25, grav: -4, size: 0.04, tex: 3, hdr: 4.5 });
        } else if (st === 'tierra') {
          if (rand() < 0.05) spike(x, z, rr(0.5, 1.0), rr(0.14, 0.24), 1.6, 0);
          if (rand() < 0.5) emit(_v4.set(x, 0.1, z), 1, 0x8a735a, { blend: 'smoke', spd: 0.3, up: 0.3, life: 1.6, grav: -0.1, spread: 0.05, size: 0.4, grow: 2.2, alpha: 0.28, hdr: 0.9 });
        } else if (st === 'sombra' || st === 'niebla_negra') {
          emit(_v4.set(x, rr(0.1, 0.9), z), 1, st === 'niebla_negra' ? 0x1c1624 : 0x0b0510, { blend: 'smoke', spd: 0.4, up: 0.1, life: 2.6, grav: 0, drag: 1, spread: 0.1, size: st === 'niebla_negra' ? 1.5 : 0.9, grow: 2.0, alpha: st === 'niebla_negra' ? 0.8 : 0.5, hdr: 1.0 });
          if (rand() < 0.2) emit(_v4.set(x, rr(0.4, 1.6), z), 1, 0x9a4cff, { spd: 0.05, up: -0.3, life: 1.2, grav: -0.2, size: 0.04, tex: 3, hdr: 2.2 });
        } else if (st === 'aire') {
          var ang = Math.atan2(z - h.z, x - h.x);
          emit(_v4.set(x, rr(0.1, 1.2), z), 1, 0xe8f2ea, { spd: 0.05, up: 0.2, life: 0.9, grav: 0, size: 0.05, tex: 0, hdr: 1.2, alpha: 0.45, vx: -Math.sin(ang) * 3, vz: Math.cos(ang) * 3 });
          if (rand() < 0.1) emit(_v4.set(x, 0.1, z), 1, 0xcfc4a0, { blend: 'smoke', spd: 0.2, up: 0.4, life: 1.5, grav: 0, size: 0.35, grow: 2.2, alpha: 0.2, vx: -Math.sin(ang) * 2, vz: Math.cos(ang) * 2 });
        } else if (st === 'vapor') {
          emit(_v4.set(x, rr(0.1, 1.6), z), 1, 0xd8dde2, { blend: 'smoke', spd: 0.3, up: 0.6, life: 3, grav: 0.15, drag: 1, spread: 0.1, size: 1.7, grow: 2.2, alpha: 0.6, hdr: 1.0 });
        } else if (st === 'magma') {
          if (rand() < 0.25) emit(_v4.set(x, 0.05, z), 1, 0xffa040, { c2: 0xff2000, spd: 1.2, up: rr(1.5, 3.5), life: 0.9, grav: -9, size: 0.05, tex: 3, hdr: 4 });
          if (rand() < 0.3) emit(_v4.set(x, 0.1, z), 1, 0xff7020, { c2: 0x501000, spd: 0.1, up: 0.6, life: 0.6, grav: 0.8, size: 0.3, grow: 0.6, tex: 2, hdr: 1.4 });
          if (rand() < 0.15) emit(_v4.set(x, 0.3, z), 1, 0x1c1612, { blend: 'smoke', spd: 0.2, up: 0.7, life: 2, grav: 0.2, size: 0.55, grow: 2.6, alpha: 0.4 });
        }
      }
    }
    function zonasActivas() { var n = 0; for (var i = 0; i < ZN; i++) if (zonas[i].active) n++; return n; }

    // ---------------------------------------------------------------- impactos por elemento
    function senal(pos, r, dur, el) {   // círculo de aviso en el suelo (Área, rayo de Juicio)
      var K = kindOf(elk(el || 'fuego'));
      quad({ tex: ringTex, color: K.hdr, hdr: 0.3, pos: pos, y: 0.03, s0: r * 2, s1: r * 2, life: dur, alpha: 1, ease: 'lin', fadeIn: 0.12, hold: 0.7, order: 6 });
      quad({ tex: runeTexture(elk(el || 'fuego')), color: K.hdr, hdr: 0.22, pos: pos, y: 0.028, s0: r * 1.9, s1: r * 1.9, life: dur, alpha: 1, ease: 'lin', fadeIn: 0.15, hold: 0.7, spin: 0.5, order: 6 });
    }
    function skyBolt(pos, big) {
      _v1.set(pos.x + rr(-0.6, 0.6), 17, pos.z + rr(-0.6, 0.6)); _v2.set(pos.x, 0.05, pos.z);
      arc(_v1, _v2, { life: 0.28, amp: 0.14, w: big ? 1.4 : 1.0, col: ARC_COL.rayo });
      for (var i = 0; i < 3; i++) { _v3.set(pos.x + rr(-0.6, 0.6), rr(2, 9), pos.z + rr(-0.6, 0.6)); _v4.set(_v3.x + rr(-2.4, 2.4), _v3.y - rr(1.5, 4), _v3.z + rr(-2.4, 2.4)); arc(_v3, _v4, { life: 0.2, amp: 0.3, w: 0.8 }); }
      _v4.set(pos.x, 1.5, pos.z); lightFlicker(_v4, 0xd8ccff, 4.5, 0.3);
      flash(_v4, 0xe6e0ff, 4, 0.12);
      emit(_v2, 40, 0xdfe6ff, { spd: 5, up: 3, life: 0.5, grav: -9, drag: 1.5, spread: 0.2, size: 0.05, tex: 3, hdr: 5 });
      emit(_v2, 8, 0x9a88ff, { blend: 'smoke', spd: 1, up: 1, life: 1.4, grav: 0.2, size: 0.5, grow: 2.4, alpha: 0.12, hdr: 1.3 });
      quad({ tex: scorchTex, color: 0x060410, hdr: 1, additive: false, pos: pos, y: 0.013, s0: 1.2, s1: 1.25, life: 9, hold: 0.4, alpha: 0.8, order: 2, ease: 'lin' });
      quad({ tex: glowTex, color: [0.9, 0.9, 1.6], hdr: 1, pos: pos, y: 0.03, s0: 1.2, s1: 2.4, life: 0.25, alpha: 1, order: 4 });
    }
    function lightningImpact(pos, R) {
      skyBolt(pos, R > 2);
      for (var i = 0; i < 5; i++) {
        var a = i / 5 * TAU + rr(-0.3, 0.3), L = R * rr(0.55, 1);
        _v3.set(pos.x, 0.12, pos.z); _v4.set(pos.x + Math.cos(a) * L, 0.1, pos.z + Math.sin(a) * L);
        arc(_v3, _v4, { life: 0.18, amp: 0.3, w: 0.9 });
      }
    }
    function earthImpact(pos, R) {
      var n = 7 + (R * 2 | 0), i;
      for (i = 0; i < n; i++) { var a = rand() * TAU, sp = rr(2.5, 5.5); rock(pos.x + Math.cos(a) * 0.3, 0.3, pos.z + Math.sin(a) * 0.3, Math.cos(a) * sp, rr(4, 7.5), Math.sin(a) * sp, rr(0.1, 0.34), rr(2, 3)); }
      for (i = 0; i < 6; i++) { var b = i / 6 * TAU + rr(-0.3, 0.3), d = rr(0.4, R * 0.6); spike(pos.x + Math.cos(b) * d, pos.z + Math.sin(b) * d, rr(0.5, 1.1), rr(0.16, 0.28), 2.2, rr(0, 0.12)); }
      _v1.set(pos.x, 0.3, pos.z);
      emit(_v1, 34, 0x8a735a, { blend: 'smoke', spd: 3.2, up: 1.2, life: 3, grav: -0.3, drag: 2, spread: 0.4, size: 0.9, grow: 3, alpha: 0.5, hdr: 1 });
      emit(_v1, 14, 0x8a735a, { blend: 'smoke', spd: 4, up: 0.1, life: 2, grav: 0, drag: 2.6, spread: 0.2, size: 0.8, grow: 3.4, alpha: 0.35, hdr: 1, flat: true });
      emit(_v1, 40, 0x4a3a2a, { spd: 6, up: 3, life: 0.9, grav: -12, drag: 1, spread: 0.3, size: 0.05, tex: 3, hdr: 0.7 });
      flash(_v1, 0xc89a60, 2.2, 0.3);
      quad({ tex: decalTex('crack:44'), color: 0x0a0705, hdr: 1, additive: false, pos: pos, y: 0.013, s0: R * 2.2, s1: R * 2.3, life: 14, hold: 0.7, alpha: 0.9, order: 2, ease: 'lin' });
    }
    function shadowImpact(pos, R) {
      _v1.set(pos.x, 0.9, pos.z);
      var i, a;
      for (i = 0; i < 26; i++) {   // succión: parte del borde hacia dentro (0,15 s)
        a = rand() * TAU; _v2.set(pos.x + Math.cos(a) * R * 0.9, rr(0.1, 1.2), pos.z + Math.sin(a) * R * 0.9);
        emit(_v2, 1, 0x0b0510, { blend: 'smoke', vx: -Math.cos(a) * R * 5, vz: -Math.sin(a) * R * 5, spd: 0.1, up: 0, life: 0.3, grav: 0, drag: 2, size: 0.5, grow: 0.7, alpha: 0.7 });
      }
      later(0.15, function () {
        _v1.set(pos.x, 0.7, pos.z);
        emit(_v1, 80, 0x0a0610, { blend: 'smoke', spd: 3.6, up: 0.8, life: 2.6, grav: 0, drag: 2, spread: 0.4, size: 1.5, grow: 2.8, alpha: 0.9, hdr: 0.9 });
        emit(_v1, 28, 0x9a4cff, { spd: 4, up: 1, life: 0.7, grav: -1, drag: 2, spread: 0.2, size: 0.06, tex: 3, hdr: 2.6 });
        emit(_v1, 10, 0x2b2230, { blend: 'smoke', spd: 2, up: 0.2, life: 2.6, grav: -0.2, spread: 0.3, size: 0.12, grow: 1, alpha: 0.9, hdr: 0.7 });   // ceniza
      });
      quad({ tex: scorchTex, color: 0x0a0414, hdr: 1, additive: false, pos: pos, y: 0.013, s0: R * 1.8, s1: R * 2.0, life: 12, hold: 0.6, alpha: 0.85, order: 2, ease: 'lin' });
    }
    function airImpact(pos, R) {
      _v1.set(pos.x, 0.5, pos.z);
      quad({ tex: ringTex, color: [0.5, 0.54, 0.5], hdr: 1, pos: pos, y: 0.04, s0: 0.4, s1: R * 3.0, life: 0.5, alpha: 0.16, order: 6 });
      emit(_v1, 26, 0xcdbf9a, { blend: 'smoke', spd: 5, up: 0.5, life: 1.6, grav: 0, drag: 2.4, spread: 0.2, size: 0.8, grow: 3, alpha: 0.26, hdr: 1, flat: true });
      emit(_v1, 24, 0xe8f2ea, { spd: 6, up: 0.4, life: 0.7, grav: 0, drag: 2, spread: 0.2, size: 0.07, tex: 0, hdr: 1.4, alpha: 0.5 });
      for (var i = 0; i < 10; i++) { var a = rand() * TAU, sp = rr(3, 6); emit(_v1, 1, rand() < 0.5 ? 0x7c8a3c : 0x8a7236, { blend: 'smoke', vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, spd: 0.1, up: rr(1, 3), life: 1.6, grav: -2, drag: 1.2, size: 0.08, alpha: 0.95, hdr: 0.7 }); }   // hojas y briznas
    }
    function lightPop(pos) {   // impacto pequeño de Luz (proyectil)
      _v1.set(pos.x, Math.max(pos.y, 0.6), pos.z);
      flash(_v1, 0xffe2a0, 3.5, 0.5);
      emit(_v1, 34, 0xffe7b0, { spd: 5, up: 1, life: 0.8, grav: 0.3, drag: 2, spread: 0.15, size: 0.09, tex: 1, hdr: 3.6, rot: 3 });
      emit(_v1, 20, 0xffd27a, { spd: 0.8, up: 1.5, life: 1.6, grav: 0.5, spread: 0.3, size: 0.07, tex: 3, hdr: 3 });
      quad({ tex: flareTex, color: [2.4, 1.9, 1.0], hdr: 1, pos: pos, y: _v1.y, s0: 0.3, s1: 2.0, life: 0.3, alpha: 1, order: 6 });
      quad({ tex: ringTex, color: [2.2, 1.7, 0.8], hdr: 1, pos: pos, y: 0.04, s0: 0.3, s1: 3.2, life: 0.5, alpha: 1, order: 6 });
    }
    // Impacto de un elemento: R = radio; o.pequeno = impacto de proyectil sin área propia
    function impacto(el, pos, R, o) {
      o = o || {}; el = el === 'escarcha' ? 'hielo' : el; R = R || 2;
      if (el === 'fuego') fireExplosion(pos, Math.max(0.5, Math.min(1.3, R / 2.5)));
      else if (el === 'hielo') frostImpact(pos);
      else if (el === 'luz') { if (o.pequeno) lightPop(pos); else holyBurst(pos, R); }
      else if (el === 'rayo') lightningImpact(pos, R);
      else if (el === 'tierra') earthImpact(pos, R);
      else if (el === 'sombra') shadowImpact(pos, R);
      else if (el === 'aire') airImpact(pos, R);
    }

    // ---------------------------------------------------------------- reacciones de fusión (más brillantes y breves que cada elemento)
    function reaccion(id, pos, grande) {
      var i, a;
      _v1.set(pos.x, Math.max(pos.y, 1.0), pos.z);
      if (id === 'vapor') {
        flash(_v1, 0xffc890, 3.2, 0.25);
        emit(_v1, 90, 0xd8dde2, { blend: 'smoke', spd: 3.6, up: 1.4, life: 3.6, grav: 0.2, drag: 1.4, spread: 0.5, size: 2.0, grow: 3, alpha: 0.6, hdr: 1.0 });
        emit(_v1, 22, 0xffffff, { blend: 'smoke', spd: 1, up: 4.5, life: 1.2, grav: 0.4, drag: 1, spread: 0.1, size: 0.5, grow: 2.4, alpha: 0.5, hdr: 1.1 });   // chorro de vapor
        emit(_v1, 26, 0xffd8a0, { spd: 5, up: 1.5, life: 0.5, grav: -3, drag: 2, spread: 0.2, size: 0.06, tex: 3, hdr: 4 });
        shock(pos, 0xffd0a0, 1.4, 2.4, 0.4);
        if (grande) {
          for (i = 0; i < 12; i++) { var s = getShard(); s.active = true; s.spike = false; s.age = 0; s.life = rr(0.6, 1.0); a = rand() * TAU; var sp = rr(2, 5); s.vx = Math.cos(a) * sp; s.vz = Math.sin(a) * sp; s.vy = rr(3, 6); s.wx = rr(-12, 12); s.wy = rr(-12, 12); s.s = rr(0.1, 0.22); s.mesh.scale.setScalar(s.s); s.mesh.position.copy(_v1); s.mesh.rotation.set(rand() * 6, rand() * 6, 0); s.mesh.visible = true; }
          emit(_v1, 40, 0xf4f8fa, { blend: 'smoke', spd: 4, up: 2, life: 3.4, grav: 0.3, spread: 0.5, size: 1.4, grow: 3, alpha: 0.4, hdr: 1.1 });
        }
      } else if (id === 'magma') {
        flash(_v1, 0xff7a2a, 2.6, 0.3);
        emit(_v1, 44, 0xffa040, { c2: 0xff2000, spd: 5, up: 4, life: 1.1, grav: -10, drag: 0.8, spread: 0.3, size: 0.06, tex: 3, hdr: 4.5 });
        emit(_v1, 14, 0xff7020, { c2: 0x501000, spd: 2.5, up: 1, life: 0.6, grav: 0.5, spread: 0.3, size: 0.5, grow: 1.6, tex: 2, hdr: 1.8 });
        emit(_v1.set(pos.x, 0.4, pos.z), 34, 0x0b0907, { blend: 'smoke', spd: 1.8, up: 1.0, life: 2.8, grav: 0.1, spread: 0.5, size: 1.0, grow: 2.6, alpha: 0.75, hdr: 0.8 });
        shock(pos, 0xff8a30, 1.4, 2.2, 0.4);
      } else if (id === 'incendio') {
        flash(_v1, 0xff7a2e, 3, 0.5);
        emit(_v1, 50, 0xffc070, { c2: 0xff2a00, vx: 2.2, spd: 3, up: 3.5, life: 0.8, grav: 1.2, drag: 1.2, spread: 0.3, size: 0.75, grow: 1.4, tex: 2, hdr: 2.2, rot: 3 });
        emit(_v1, 46, 0xffa040, { c2: 0xff2000, vx: 3, spd: 2.5, up: 2.5, life: 2.4, grav: 0.6, drag: 0.5, spread: 0.3, size: 0.05, tex: 3, hdr: 4 });
        emit(_v1, 16, 0x2a221c, { blend: 'smoke', vx: 1.6, spd: 1.5, up: 2.5, life: 2.4, grav: 0.2, spread: 0.3, size: 0.8, grow: 2.6, alpha: 0.4 });
      } else if (id === 'escarcha_electrica') {
        lightFlicker(_v1, 0xa8d8ff, 4, 0.3);
        for (i = 0; i < 8; i++) { a = rand() * TAU; _v2.set(pos.x + Math.cos(a) * 2.2, 0.4 + rand() * 1.4, pos.z + Math.sin(a) * 2.2); arc(_v1, _v2, { life: 0.35, amp: 0.3, col: ARC_COL.hielo, w: 1.7 }); }
        emit(_v1, 40, 0xd6f4ff, { spd: 4, up: 1.5, life: 0.8, grav: -3, drag: 2, spread: 0.3, size: 0.09, tex: 1, hdr: 4, rot: 3 });
      } else if (id === 'juicio') {
        skyBolt(pos, true);
        flash(_v1, 0xfff0c0, 3.5, 0.4);
        emit(_v1, 40, 0xffe7b0, { spd: 5, up: 3, life: 1.2, grav: 0.2, drag: 1.5, spread: 0.3, size: 0.09, tex: 1, hdr: 3.6, rot: 3 });
        shock(pos, 0xffd890, 1.6, 2.6, 0.5);
      } else if (id === 'niebla_negra') {
        emit(_v1, 50, 0x14101a, { blend: 'smoke', spd: 2.4, up: 0.8, life: 3, grav: 0, drag: 1.6, spread: 0.4, size: 1.2, grow: 2.6, alpha: 0.6, hdr: 0.9 });
        emit(_v1, 20, 0x9a4cff, { spd: 3, up: 0.5, life: 0.8, grav: -1, spread: 0.3, size: 0.05, tex: 3, hdr: 2.4 });
      }
    }

    // ---------------------------------------------------------------- estados sobre enemigos (una emisión por llamada; el juego limita la frecuencia)
    function estadoFX(nombre, x, y, z, h, tx, tz) {
      _v4.set(x, y, z);
      switch (nombre) {
        case 'ardiendo':
          emit(_v4.set(x + rr(-0.2, 0.2), y + rr(0.1, h * 0.8), z + rr(-0.2, 0.2)), 1, 0xffb050, { c2: 0xff2200, spd: 0.1, up: rr(0.6, 1.4), life: 0.6, grav: 1, spread: 0.03, size: 0.28, grow: 0.7, tex: 2, hdr: 1.7, rot: 2 });
          if (rand() < 0.2) emit(_v4.set(x, y + h * 0.9, z), 1, 0x14100c, { blend: 'smoke', spd: 0.2, up: 0.9, life: 1.5, grav: 0.2, spread: 0.1, size: 0.4, grow: 2.4, alpha: 0.4 });
          if (rand() < 0.15) emit(_v4.set(x, y + h * 0.5, z), 1, 0xffa040, { spd: 0.5, up: 1.4, life: 1, grav: -1, size: 0.04, tex: 3, hdr: 4 });
          break;
        case 'escarcha': case 'congelado':
          emit(_v4.set(x + rr(-0.25, 0.25), y + rr(0.1, h * 0.9), z + rr(-0.25, 0.25)), 1, 0xe6f6ff, { spd: 0.05, up: 0, life: 0.7, grav: 0, size: 0.07, tex: 1, hdr: 3.4, rot: 3 });
          if (nombre === 'congelado' && rand() < 0.3) emit(_v4.set(x, y + 0.1, z), 1, 0xcfe8ff, { blend: 'smoke', spd: 0.3, up: 0.05, life: 1.6, grav: 0, size: 0.5, grow: 2, alpha: 0.2, flat: true });
          break;
        case 'iluminado':
          emit(_v4.set(x + rr(-0.3, 0.3), y + rr(0.1, h), z + rr(-0.3, 0.3)), 1, 0xffd88a, { spd: 0.05, up: 0.5, life: 1.2, grav: 0.2, size: 0.06, tex: rand() < 0.5 ? 1 : 3, hdr: 3, rot: 2 });
          break;
        case 'cargado': case 'aturdido':
          if (rand() < 0.5) { _v3.set(x + rr(-0.3, 0.3), y + rr(0.1, h), z + rr(-0.3, 0.3)); _v4.set(x + rr(-0.3, 0.3), y + rr(0.1, h), z + rr(-0.3, 0.3)); arc(_v3, _v4, { life: 0.08, amp: 0.4, w: 0.6 }); }
          break;
        case 'lastrado': case 'derribado': case 'costra':
          emit(_v4.set(x + rr(-0.3, 0.3), y + 0.05, z + rr(-0.3, 0.3)), 1, 0x8a735a, { blend: 'smoke', spd: 0.2, up: 0.3, life: 1.1, grav: -0.1, size: 0.25, grow: 2, alpha: 0.35, hdr: 0.9 });
          if (nombre === 'costra' && rand() < 0.4) emit(_v4.set(x, y + 0.3, z), 1, 0xff6a20, { spd: 0.2, up: 0.5, life: 0.7, grav: 0.2, size: 0.05, tex: 3, hdr: 3 });
          break;
        case 'maldito':   // hilos oscuros que derivan hacia el lanzador
          emit(_v4.set(x + rr(-0.2, 0.2), y + rr(0.2, h), z + rr(-0.2, 0.2)), 1, 0x0b0510, { blend: 'smoke', vx: (tx - x) * 0.5, vz: (tz - z) * 0.5, spd: 0.05, up: 0.3, life: 1.6, grav: 0, drag: 0.4, size: 0.22, grow: 1.6, alpha: 0.6, hdr: 0.9 });
          if (rand() < 0.3) emit(_v4.set(x, y + h * 0.6, z), 1, 0x9a4cff, { vx: (tx - x) * 0.4, vz: (tz - z) * 0.4, spd: 0.05, up: 0.2, life: 1, grav: 0, drag: 0.4, size: 0.04, tex: 3, hdr: 2.4 });
          break;
        case 'desequilibrado':
          emit(_v4.set(x + rr(-0.3, 0.3), y + rr(0.1, 0.9), z + rr(-0.3, 0.3)), 1, 0xe2eee6, { spd: 0.2, up: 0.1, life: 0.6, grav: 0, size: 0.05, tex: 0, hdr: 1.2, alpha: 0.5, vx: rr(-1.5, 1.5), vz: rr(-1.5, 1.5) });
          break;
        case 'cegado':
          emit(_v4.set(x, y + h + 0.1, z), 1, 0xb0b4b8, { blend: 'smoke', spd: 0.15, up: 0.3, life: 1, grav: 0, size: 0.2, grow: 2, alpha: 0.3, hdr: 1 });
          break;
      }
    }

    // ---------------------------------------------------------------- bucle
    var time = 0;
    function update(dt) {
      if (!(dt > 0)) return;
      if (dt > 0.1) dt = 0.1;
      time += dt; U_TIME.value = time;
      updateTasks(dt);
      updateQuads(dt);
      updateFireballs(dt);
      updateShards(dt);
      updateColumns(dt);
      updateFx2(dt); updateArcs(dt); updateRocks(dt); updateZonas(dt);
      psAdd.update(dt); psSmoke.update(dt);
    }
    function resize(pixelHeight) {
      psAdd.mat.uniforms.uScale.value = pixelHeight / 2;
      psSmoke.mat.uniforms.uScale.value = pixelHeight / 2;
    }
    function dispose() {
      scene.remove(psAdd.points); scene.remove(psSmoke.points);
      quads.forEach(function (q) { scene.remove(q.mesh); });
      fireballs.forEach(function (f) { scene.remove(f.mesh); });
      shards.forEach(function (s) { scene.remove(s.mesh); });
      scene.remove(arcCore.mesh); scene.remove(arcHalo.mesh); scene.remove(rockIM); scene.remove(spikeIM);
      columns.forEach(function (c) { scene.remove(c.outer); scene.remove(c.inner); });
      coreSprites.forEach(function (c) { scene.remove(c.sprite); });
      disposables.forEach(function (d) { d.dispose(); });
      disposables.length = 0;
    }
    function stats() { var q = 0; for (var i = 0; i < quads.length; i++) if (quads[i].active) q++; return { additive: psAdd.alive, smoke: psSmoke.alive, particulas: psAdd.alive + psSmoke.alive, arcos: arcsLive(), zonas: zonasActivas(), quads: q }; }

    return {
      emit: emit, emitTo: emitTo, runeTexture: runeTexture, runeRingTexture: runeRingTexture,
      castStart: castStart, castUpdate: castUpdate, castRelease: castRelease, castCancel: castCancel,
      projectileMesh: projectileMesh, trail: trail,
      fireExplosion: fireExplosion, frostImpact: frostImpact, holyBurst: holyBurst, healSparkles: healSparkles,
      iceGeometry: iceBodyGeo, iceMaterial: iceBodyMat,
      spellProjectile: spellProjectile, impacto: impacto, reaccion: reaccion, estadoFX: estadoFX, senal: senal, skyBolt: skyBolt, arc: arc,
      zona: zona, zonaStyle: zonaStyle, zonaStop: zonaStop, cono: cono, aura: aura, auraStop: auraStop, lightFlicker: lightFlicker, later: later, elemPuff: elemPuff,
      update: update, resize: resize, dispose: dispose, stats: stats
    };
  };
})();
