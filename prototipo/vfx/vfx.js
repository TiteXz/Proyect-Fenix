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
      // 2: lengua de llama: varias manchas suaves irregulares
      var R = rng(77);
      g.save(); g.beginPath(); g.rect(0, S, S, S); g.clip();
      for (i = 0; i < 22; i++) {
        var a = R() * TAU, d = Math.pow(R(), 1.5) * 30, x = 64 + Math.cos(a) * d, y = S + 70 + Math.sin(a) * d * 1.2 - R() * 18;
        var r = 14 + R() * 22;
        gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,0.32)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, S, S, S);
      }
      g.restore();
      // 3: ascua (núcleo duro + halo corto)
      gr = g.createRadialGradient(S + 64, S + 64, 0, S + 64, S + 64, 60);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.1, 'rgba(255,255,255,1)');
      gr.addColorStop(0.2, 'rgba(255,255,255,0.35)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.06)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(S, S, S, S);
      return ctex(cv);
    })();

    // Atlas 2x2 de humo algodonoso
    var smokeAtlas = (function () {
      var S = 128, cv = canvas(S * 2), g = cv.getContext('2d'), R = rng(1234);
      for (var cell = 0; cell < 4; cell++) {
        var ox = (cell % 2) * S, oy = (cell >> 1) * S;
        g.save(); g.beginPath(); g.rect(ox, oy, S, S); g.clip();
        for (var i = 0; i < 70; i++) {
          var a = R() * TAU, d = Math.pow(R(), 0.8) * 34, x = ox + 64 + Math.cos(a) * d, y = oy + 64 + Math.sin(a) * d;
          var r = 6 + R() * 20 * (1 - d / 50);
          var gr = g.createRadialGradient(x, y, 0, x, y, r);
          var al = 0.10 + R() * 0.16;
          gr.addColorStop(0, 'rgba(255,255,255,' + al + ')'); gr.addColorStop(0.6, 'rgba(255,255,255,' + al * 0.5 + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        }
        // atenuación radial para bordes suaves
        g.globalCompositeOperation = 'destination-in';
        var m = g.createRadialGradient(ox + 64, oy + 64, 10, ox + 64, oy + 64, 63);
        m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.6, 'rgba(0,0,0,0.8)'); m.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = m; g.fillRect(ox, oy, S, S);
        g.restore();
      }
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
      fuego: { seed: 1101, glyphs: 22, hex: 0xff6a1a, hdr: [4.2, 1.35, 0.32], sub: [3.2, 0.7, 0.12] },
      escarcha: { seed: 2203, glyphs: 26, hex: 0x8fdcff, hdr: [0.9, 2.6, 4.6], sub: [0.5, 1.6, 3.6] },
      luz: { seed: 3307, glyphs: 30, hex: 0xffd27a, hdr: [4.4, 3.3, 1.5], sub: [3.2, 2.2, 0.8] }
    };
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

    function drawRuneCircle(g, kind) {
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
    var PS_FRAG_SMOKE = PS_FRAG_COMMON + '\nvoid main(){ vec4 t = sampleCell(); float a = t.a * vA; if (a < 0.004) discard; gl_FragColor = vec4(mix(vC, uFogColor, vFog), a); }';

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
    for (var qi = 0; qi < 28; qi++) quads.push(new Quad());
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
      '  vP = position * 2.6 + vec3(uSeed, -uTime * 2.4, -uSeed);',
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
      '  float heat = clamp(n * 1.3 + fr * 0.45 - 0.7 + uHeat * 0.55, 0.0, 1.1);',
      '  vec3 col = heat < 0.5 ? mix(uC1, uC2, heat * 2.0) : mix(uC2, uC3, min((heat - 0.5) * 2.0, 1.4));',
      '  float a = smoothstep(0.0, 0.55, fr) * smoothstep(0.08, 0.45, heat) * uFade;',
      '  gl_FragColor = vec4(col * a, a);',
      '}'
    ].join('\n');
    var fireMatBase = track(new THREE.ShaderMaterial({
      uniforms: { uTime: U_TIME, uSeed: { value: 0 }, uDisp: { value: 0.35 }, uFade: { value: 1 }, uHeat: { value: 1 },
        uC1: { value: new THREE.Color(0.35, 0.03, 0.0) }, uC2: { value: new THREE.Color(2.2, 0.42, 0.04) }, uC3: { value: new THREE.Color(3.6, 1.45, 0.28) } },
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
        c.outer.material.uniforms.uAlpha.value = a * 0.6;
        c.inner.material.uniforms.uAlpha.value = a * 1.1;
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
    function trail(kind, pos, dt) {
      var lp = lastPos.get(pos);
      if (!lp) { lp = new THREE.Vector3().copy(pos); lastPos.set(pos, lp); }
      _seg.subVectors(pos, lp);
      if (_seg.lengthSq() > 4) _seg.set(0, 0, 0);
      lp.copy(pos);
      var steps = Math.max(1, Math.min(8, Math.ceil(_seg.length() / 0.06)));
      for (var k = 0; k < steps; k++) {
        _tq.copy(pos).addScaledVector(_seg, -k / steps);
        trailAt(kind, _tq, dt / steps);
      }
    }
    function trailAt(kind, pos, dt) {
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
    function fireExplosion(pos) {
      _tp.set(pos.x, Math.max(pos.y, 0.6), pos.z);
      flash(_tp, 0xff7a2a, 6, 0.7);
      fireball(_tp, 0.2, 0.9, 0.4, 1.0, 0.2, 0.3, 0);
      fireball(_tp, 0.35, 1.6, 0.8, 0.75, -0.5, 1.0, 0.03);
      fireball(_tp, 0.3, 1.25, 1.0, 0.6, -0.6, 1.8, 0.1);
      emit(_tp, 90, 0xffb050, { c2: 0xff3000, spd: 9, up: 3, life: 1.4, grav: -9, drag: 1.2, spread: 0.3, size: 0.07, tex: 3, hdr: 4 });
      emit(_tp, 60, 0xffd080, { c2: 0xff2a00, spd: 6, up: 1.5, life: 0.55, grav: 1.5, drag: 4, spread: 0.4, size: 0.9, grow: 1.8, tex: 2, hdr: 2.4, rot: 3 });
      emit(_tp, 40, 0x16120f, { blend: 'smoke', spd: 2.4, up: 1.8, life: 3.2, grav: 0.5, drag: 1.5, spread: 0.6, size: 1.1, grow: 3, alpha: 0.6 });
      emit(pos, 30, 0x2c241e, { blend: 'smoke', spd: 5, up: 0.2, life: 1.6, grav: 0, drag: 3, spread: 0.3, size: 0.6, grow: 2.6, alpha: 0.4, flat: true });
      shock(pos, 0xffa060, 1.6, 4.2, 0.45);
      quad({ tex: glowTex, color: 0xff6018, hdr: 0.7, pos: pos, y: 0.03, s0: 2.5, s1: 4.5, life: 0.6, alpha: 1, order: 4 });
      quad({ tex: scorchTex, color: 0x050302, hdr: 1, additive: false, pos: pos, y: 0.012, s0: 3.6, s1: 3.8, life: 8, hold: 0.55, alpha: 0.95, order: 2, ease: 'lin' });
      quad({ tex: fireCrackTex, color: 0xff5a10, hdr: 3, pos: pos, y: 0.016, s0: 2.6, s1: 2.7, life: 3.5, hold: 0.15, alpha: 1, order: 3, ease: 'lin' });
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
    function castStart(kind) {
      if (!KINDS[kind]) kind = 'fuego';
      var K = KINDS[kind];
      var h = { kind: kind, K: K, t: 0, charge: 0, state: 'charging', ang: 0 };
      h.ground = quad({ tex: runeTexture(kind), color: K.hdr, managed: true, order: 7 });
      h.ring = quad({ tex: runeRingTexture(kind), color: K.sub, managed: true, order: 7 });
      h.glow = quad({ tex: glowTex, color: K.hex, managed: true, order: 4 });
      h.hand = quad({ tex: runeTexture(kind), color: K.hdr, managed: true, order: 8 });
      h.handPos = new THREE.Vector3(); h.fwd = new THREE.Vector3(0, 0, 1); h.feet = new THREE.Vector3();
      h.core = null;
      for (var i = 0; i < coreSprites.length; i++) if (!coreSprites[i].used) { h.core = coreSprites[i]; h.core.used = true; break; }
      if (h.core) { h.core.mat.color.setRGB(K.hdr[0], K.hdr[1], K.hdr[2]); h.core.sprite.visible = true; }
      return h;
    }
    function circleSize(ch) { return 0.9 + 1.9 * easeOut(Math.min(1, ch * 1.25)); }
    function castUpdate(h, dt, charge, handPos, fwd, feetPos) {
      if (!h || h.state !== 'charging') return;
      var K = h.K, kind = h.kind;
      h.t += dt; h.charge = charge = clamp01(charge);
      h.handPos.copy(handPos); h.fwd.copy(fwd); h.feet.copy(feetPos);
      var appear = Math.min(1, h.t / 0.25);
      var pulse = 1 + Math.sin(h.t * (5 + charge * 6)) * (0.08 + 0.17 * charge);
      var inten = (0.35 + 0.85 * charge) * pulse * appear;
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
      r.scale.setScalar(D * 1.32);
      h.ring.mat.color.copy(h.ring.base).multiplyScalar(inten * (0.4 + 0.6 * charge)); h.ring.mat.opacity = 1;
      var gl = h.glow.mesh;
      gl.position.set(feetPos.x, feetPos.y + 0.02, feetPos.z); gl.rotation.set(-Math.PI / 2, 0, 0);
      gl.scale.setScalar(D * 2.0);
      h.glow.mat.color.copy(h.glow.base).multiplyScalar(0.55 * inten); h.glow.mat.opacity = 1;
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
      toFade(h.glow, gls, released ? gls * 1.5 : gls, 0.55 * inten * boost * 1.4, 0);
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
      columns.forEach(function (c) { scene.remove(c.outer); scene.remove(c.inner); });
      coreSprites.forEach(function (c) { scene.remove(c.sprite); });
      disposables.forEach(function (d) { d.dispose(); });
      disposables.length = 0;
    }
    function stats() { return { additive: psAdd.alive, smoke: psSmoke.alive }; }

    return {
      emit: emit, emitTo: emitTo, runeTexture: runeTexture, runeRingTexture: runeRingTexture,
      castStart: castStart, castUpdate: castUpdate, castRelease: castRelease, castCancel: castCancel,
      projectileMesh: projectileMesh, trail: trail,
      fireExplosion: fireExplosion, frostImpact: frostImpact, holyBurst: holyBurst, healSparkles: healSparkles,
      update: update, resize: resize, dispose: dispose, stats: stats
    };
  };
})();
