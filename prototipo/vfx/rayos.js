/* FenixRayos: arcos electricos rojos y zarcillos de humo negro para hojas (three.js r147, script global).
 * window.FenixRayos(THREE, scene, { pixelHeight, random }) -> api
 *   api.attach(obj3D, { length=1, axis=(0,1,0), intensity=1, offsetStart=0 }) -> indice de la hoja (max 4)
 *   api.setIntensity(x)  0 apagado, 1 normal, >1 tormenta (0..1.5), se atenua suavemente
 *   api.burst(n=1)       relampago grande y breve
 *   api.update(dt, time) avanza la simulacion (dt se limita a 1/20 s)
 *   api.resize(pixelHeight), api.dispose(), api.stats()
 * Coste fijo: 4 draw calls (arco nucleo HDR, arco halo, zarcillos negros, chispas).
 *   24 arcos x 33 puntos (rebuild a 25 Hz), 4 hojas x 8 zarcillos x 20 puntos, 200 chispas.
 * Los colores son lineales HDR (>1 brilla con bloom). Sin asignaciones por frame: pools y buffers fijos.
 * Los arcos son cintas que miran a camara en el vertex shader (usa el uniform cameraPosition).
 */
(function () {
  'use strict';

  window.FenixRayos = function (THREE, scene, opts) {
    opts = opts || {};
    var rand = opts.random || Math.random;
    var TAU = Math.PI * 2;
    var pixelH = opts.pixelHeight || 1080;
    function rr(a, b) { return a + (b - a) * rand(); }
    function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

    var ARC_N = 24, ARC_P = 33;
    var MAX_ATT = 4, TEND_PER = 8, TEND_N = MAX_ATT * TEND_PER, TEND_P = 20;
    var SPARK_N = 200;
    var REBUILD_DT = 1 / 25;

    // scratch (nada se asigna dentro del bucle)
    var _s = new THREE.Vector3(), _e = new THREE.Vector3(), _b = new THREE.Vector3();
    var _d = new THREE.Vector3(), _p = new THREE.Vector3(), _ax = new THREE.Vector3();
    var _e1 = new THREE.Vector3(), _e2 = new THREE.Vector3();
    var arcZ = new Float32Array(ARC_P * 3), tendZ = new Float32Array(TEND_P * 3);

    // m (matrixWorld) * punto local -> out (mundo)
    function lw(m, x, y, z, out) {
      var e = m.elements;
      out.set(e[0] * x + e[4] * y + e[8] * z + e[12],
              e[1] * x + e[5] * y + e[9] * z + e[13],
              e[2] * x + e[6] * y + e[10] * z + e[14]);
      return out;
    }
    // m * direccion local -> out (mundo, normalizada)
    function dw(m, x, y, z, out) {
      var e = m.elements;
      out.set(e[0] * x + e[4] * y + e[8] * z, e[1] * x + e[5] * y + e[9] * z, e[2] * x + e[6] * y + e[10] * z);
      return out.normalize();
    }

    // ------------------------------------------------------------ geometria de cintas
    // Cada ranura = P puntos, 2 vertices por punto (lado -1 / +1). El vertex shader aleja cada vertice
    // perpendicular a la direccion de la cinta y a la camara, asi que la cinta siempre mira a camara.
    function makeRibbon(nSlots, P) {
      var V = P * 2, n = nSlots * V, i, k, s;
      var g = new THREE.BufferGeometry();
      var pos = new Float32Array(n * 3), dir = new Float32Array(n * 3);
      var side = new Float32Array(n), along = new Float32Array(n);
      var width = new Float32Array(n), fade = new Float32Array(n);
      var idx = new Uint16Array(nSlots * (P - 1) * 6), q = 0;
      for (s = 0; s < nSlots; s++) {
        for (i = 0; i < P; i++) {
          for (k = 0; k < 2; k++) {
            var v = s * V + i * 2 + k;
            side[v] = k ? 1 : -1;
            along[v] = i / (P - 1);
          }
        }
        for (i = 0; i < P - 1; i++) {
          var a = s * V + i * 2, b = a + 1, c = a + 2, d = a + 3;
          idx[q++] = a; idx[q++] = b; idx[q++] = c;
          idx[q++] = b; idx[q++] = d; idx[q++] = c;
        }
      }
      function at(arr, n1) { var A = new THREE.BufferAttribute(arr, n1); A.setUsage(THREE.DynamicDrawUsage); return A; }
      g.setAttribute('position', at(pos, 3));
      g.setAttribute('aDir', at(dir, 3));
      g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
      g.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
      g.setAttribute('aWidth', at(width, 1));
      g.setAttribute('aFade', at(fade, 1));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      return { geo: g, V: V, P: P, pos: pos, dir: dir, width: width, fade: fade };
    }

    // Escribe la polilinea zs (P puntos xyz) en la ranura: posicion y direccion tangente por vertice.
    function writeRibbon(R, slot, P, zs) {
      var base = slot * R.V, i, k;
      for (i = 0; i < P; i++) {
        var a = i > 0 ? i - 1 : 0, b = i < P - 1 ? i + 1 : P - 1;
        var dx = zs[b * 3] - zs[a * 3], dy = zs[b * 3 + 1] - zs[a * 3 + 1], dz = zs[b * 3 + 2] - zs[a * 3 + 2];
        var l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        dx /= l; dy /= l; dz /= l;
        for (k = 0; k < 2; k++) {
          var v = (base + i * 2 + k) * 3;
          R.pos[v] = zs[i * 3]; R.pos[v + 1] = zs[i * 3 + 1]; R.pos[v + 2] = zs[i * 3 + 2];
          R.dir[v] = dx; R.dir[v + 1] = dy; R.dir[v + 2] = dz;
        }
      }
    }

    // ------------------------------------------------------------ materiales
    var VS_RIBBON = [
      'attribute vec3 aDir; attribute float aSide; attribute float aWidth;',
      'attribute float aFade; attribute float aAlong; uniform float uWScale;',
      'varying float vSide; varying float vFade; varying float vAlong;',
      'void main() {',
      '  vec3 toCam = normalize(cameraPosition - position);',
      '  vec3 sd = cross(aDir, toCam);',
      '  float l = length(sd);',
      '  sd = (l > 1e-5) ? sd / l : vec3(0.0, 1.0, 0.0);',
      '  vec3 p = position + sd * (aSide * aWidth * uWScale);',
      '  vSide = aSide; vFade = aFade; vAlong = aAlong;',
      '  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);',
      '}'
    ].join('\n');

    var FS_ARC = [
      'uniform vec3 uColor; uniform float uGain; uniform float uAlpha; uniform float uSoft;',
      'varying float vSide; varying float vFade; varying float vAlong;',
      'void main() {',
      '  float e = 1.0 - abs(vSide);',
      '  float a = pow(e, uSoft) * vFade * uAlpha;',
      '  if (a < 0.002) discard;',
      '  gl_FragColor = vec4(uColor * uGain, a);',
      '}'
    ].join('\n');

    // Zarcillo: cuerpo oscuro (premultiplicado, mezcla normal) + punta que brilla en rojo (aditiva).
    var FS_TEND = [
      'uniform vec3 uDark; uniform vec3 uGlow; uniform float uAlpha; uniform float uGlowAmt;',
      'varying float vSide; varying float vFade; varying float vAlong;',
      'void main() {',
      '  float e = 1.0 - abs(vSide);',
      '  float prof = smoothstep(0.0, 0.8, e);',
      '  float a = prof * vFade * uAlpha;',
      '  float rim = pow(1.0 - e, 3.0) * vFade * (1.0 - vAlong) * 0.5;',
      '  float tip = pow(vAlong, 6.0) * pow(e, 2.0) * vFade * uGlowAmt;',
      '  if (a + tip < 0.002) discard;',
      '  gl_FragColor = vec4(uDark * a + vec3(0.5, 0.03, 0.06) * rim + uGlow * tip, a);',
      '}'
    ].join('\n');

    var VS_SPARK = [
      'attribute float aSize; attribute float aAlpha; attribute float aHot; uniform float uPixelH;',
      'varying float vAlpha; varying float vHot;',
      'void main() {',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  gl_PointSize = aSize * projectionMatrix[1][1] * uPixelH * 0.5 / max(-mv.z, 0.05);',
      '  gl_Position = projectionMatrix * mv;',
      '  vAlpha = aAlpha; vHot = aHot;',
      '}'
    ].join('\n');

    var FS_SPARK = [
      'uniform vec3 uRed; varying float vAlpha; varying float vHot;',
      'void main() {',
      '  vec2 d = gl_PointCoord - vec2(0.5);',
      '  float r = length(d) * 2.0;',
      '  float a = (exp(-r * r * 14.0) + max(0.0, 1.0 - r) * 0.25) * vAlpha;',
      '  if (a < 0.003) discard;',
      '  vec3 col = mix(uRed, vec3(2.6, 2.0, 1.8), vHot * exp(-r * r * 10.0));',
      '  gl_FragColor = vec4(col, a);',
      '}'
    ].join('\n');

    function arcMat(rgb, wScale, alpha, soft) {
      return new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(rgb[0], rgb[1], rgb[2]) }, uGain: { value: 1 },
          uAlpha: { value: alpha }, uSoft: { value: soft }, uWScale: { value: wScale }
        },
        vertexShader: VS_RIBBON, fragmentShader: FS_ARC,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
      });
    }

    var AR = makeRibbon(ARC_N, ARC_P);
    var TR = makeRibbon(TEND_N, TEND_P);

    var arcCoreMat = arcMat([3.0, 0.16, 0.07], 1.0, 1.0, 3.0);
    var arcHaloMat = arcMat([0.9, 0.05, 0.03], 4.0, 0.22, 1.4);
    var tendMat = new THREE.ShaderMaterial({
      uniforms: {
        uDark: { value: new THREE.Color(0.012, 0.0, 0.02) }, uGlow: { value: new THREE.Color(2.2, 0.1, 0.05) },
        uAlpha: { value: 0.8 }, uGlowAmt: { value: 1 }, uWScale: { value: 1 }
      },
      vertexShader: VS_RIBBON, fragmentShader: FS_TEND,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor
    });

    var SP = {
      geo: new THREE.BufferGeometry(),
      pos: new Float32Array(SPARK_N * 3), vel: new Float32Array(SPARK_N * 3),
      life: new Float32Array(SPARK_N), max: new Float32Array(SPARK_N),
      size: new Float32Array(SPARK_N), hot: new Float32Array(SPARK_N), alpha: new Float32Array(SPARK_N)
    };
    SP.geo.setAttribute('position', new THREE.BufferAttribute(SP.pos, 3).setUsage(THREE.DynamicDrawUsage));
    SP.geo.setAttribute('aSize', new THREE.BufferAttribute(SP.size, 1).setUsage(THREE.DynamicDrawUsage));
    SP.geo.setAttribute('aAlpha', new THREE.BufferAttribute(SP.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    SP.geo.setAttribute('aHot', new THREE.BufferAttribute(SP.hot, 1).setUsage(THREE.DynamicDrawUsage));
    var sparkMat = new THREE.ShaderMaterial({
      uniforms: { uPixelH: { value: pixelH }, uRed: { value: new THREE.Color(2.5, 0.3, 0.12) } },
      vertexShader: VS_SPARK, fragmentShader: FS_SPARK,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });

    // ------------------------------------------------------------ escena
    var root = new THREE.Group();
    root.frustumCulled = false;
    scene.add(root);
    var meshes = [
      new THREE.Mesh(AR.geo, arcHaloMat), new THREE.Mesh(AR.geo, arcCoreMat),
      new THREE.Mesh(TR.geo, tendMat), new THREE.Points(SP.geo, sparkMat)
    ];
    meshes.forEach(function (m, k) { m.frustumCulled = false; m.renderOrder = k; root.add(m); });

    // ------------------------------------------------------------ estado
    var atts = [];
    var tends = [];
    for (var q = 0; q < TEND_N; q++) {
      tends.push({ age: 0, dur: 1, t0: 0, th: 0, reach: 0.4, amp: 0.08, freq: 1, ph: 0, sp: 4, w: 0.015 });
    }
    var arcs = [];
    for (q = 0; q < ARC_N; q++) {
      arcs.push({ live: false, att: 0, big: false, t0: 0, age: 0, life: 0.1, w: 0.01,
                  sL: new THREE.Vector3(), eL: new THREE.Vector3() });
    }
    var gainT = 0, gain = 0, flash = 0, tNow = 0, arcAcc = 0, dirty = false, sparkCur = 0;

    function respawnTend(T) {
      T.age = 0; T.dur = rr(0.8, 1.8); T.t0 = rand(); T.th = rr(0, TAU);
      T.reach = rr(0.25, 0.6); T.amp = rr(0.05, 0.12); T.freq = rr(0.8, 1.6);
      T.ph = rr(0, TAU); T.sp = rr(3, 7); T.w = rr(0.009, 0.015);
    }

    // ------------------------------------------------------------ arcos
    // Punto de la hoja en local: axis * (offsetStart + t * length)
    function buildArc(slot) {
      var A = arcs[slot], att = atts[A.att], m = att.obj.matrixWorld, P = ARC_P, i;
      lw(m, A.sL.x, A.sL.y, A.sL.z, _s);
      lw(m, A.eL.x, A.eL.y, A.eL.z, _e);
      var z = arcZ, last = (P - 1) * 3;
      z[0] = _s.x; z[1] = _s.y; z[2] = _s.z;
      z[last] = _e.x; z[last + 1] = _e.y; z[last + 2] = _e.z;
      // zigzag fractal: punto medio con desplazamiento que se reduce por nivel (5 niveles)
      var amp = _s.distanceTo(_e) * (A.big ? 0.22 : 0.13);
      for (var step = P - 1, lvl = 0; step > 1; step >>= 1, lvl++) {
        var h = step >> 1, am = amp * Math.pow(0.55, lvl);
        for (var j = h; j < P - 1; j += step) {
          var p0 = (j - h) * 3, p1 = (j + h) * 3, c = j * 3;
          z[c] = 0.5 * (z[p0] + z[p1]) + rr(-1, 1) * am;
          z[c + 1] = 0.5 * (z[p0 + 1] + z[p1 + 1]) + rr(-1, 1) * am;
          z[c + 2] = 0.5 * (z[p0 + 2] + z[p1 + 2]) + rr(-1, 1) * am;
        }
      }
      writeRibbon(AR, slot, P, z);
      // grosor con afilado en los extremos
      var base = slot * AR.V;
      for (i = 0; i < P; i++) {
        var tp = Math.sqrt(Math.sin(Math.PI * i / (P - 1)));
        AR.width[base + i * 2] = A.w * tp;
        AR.width[base + i * 2 + 1] = A.w * tp;
      }
    }

    function spawnArc(att, big) {
      var slot = -1, worst = -1, q2, A;
      for (q2 = 0; q2 < ARC_N; q2++) {
        A = arcs[q2];
        if (!A.live) { slot = q2; break; }
        if (A.age / A.life > worst) { worst = A.age / A.life; slot = q2; }
      }
      A = arcs[slot];
      var L = att.len, ax = att.ax;
      A.live = true; A.att = att.idx; A.big = big; A.age = 0;
      A.life = big ? rr(0.2, 0.38) : rr(0.06, 0.14);
      A.w = big ? rr(0.02, 0.03) : rr(0.009, 0.014) * L;
      A.t0 = rand();
      var bl = att.off + A.t0 * L;
      A.sL.set(ax.x * bl, ax.y * bl, ax.z * bl);
      var t1 = clamp(A.t0 + rr(-0.3, 0.3), 0, 1), bl1 = att.off + t1 * L;
      var zz = rr(-1, 1), th = TAU * rand(), r = Math.sqrt(1 - zz * zz);
      var reach = (big ? rr(0.5, 1.0) : rr(0.07, 0.3)) * L;
      A.eL.set(ax.x * bl1 + r * Math.cos(th) * reach, ax.y * bl1 + zz * reach, ax.z * bl1 + r * Math.sin(th) * reach);
      buildArc(slot);
      if (rand() < 0.5) emitSpark(att, A.t0, 0.6);
      dirty = true;
    }

    // ------------------------------------------------------------ chispas
    function emitSpark(att, t, power) {
      var k = sparkCur;
      sparkCur = (sparkCur + 1) % SPARK_N;
      var bl = att.off + t * att.len, ax = att.ax, L = att.len;
      lw(att.obj.matrixWorld, ax.x * bl, ax.y * bl, ax.z * bl, _b);
      var zz = rr(-1, 1), th = TAU * rand(), r = Math.sqrt(1 - zz * zz);
      var sp = rr(0.5, 2.0) * L * power, j = k * 3;
      SP.pos[j] = _b.x; SP.pos[j + 1] = _b.y; SP.pos[j + 2] = _b.z;
      SP.vel[j] = r * Math.cos(th) * sp;
      SP.vel[j + 1] = zz * sp + 0.6 * L * power;
      SP.vel[j + 2] = r * Math.sin(th) * sp;
      SP.life[k] = rr(0.25, 0.7); SP.max[k] = SP.life[k];
      SP.size[k] = L * rr(0.006, 0.013);
      SP.hot[k] = rand() < 0.5 ? 1 : 0;
    }

    function updateSparks(dt) {
      var g = clamp(gain, 0, 1), k, j;
      for (k = 0; k < SPARK_N; k++) {
        if (SP.life[k] <= 0) { SP.alpha[k] = 0; continue; }
        SP.life[k] -= dt;
        j = k * 3;
        SP.vel[j + 1] -= 1.6 * dt;
        var drag = Math.exp(-1.2 * dt);
        SP.vel[j] *= drag; SP.vel[j + 1] *= drag; SP.vel[j + 2] *= drag;
        SP.pos[j] += SP.vel[j] * dt; SP.pos[j + 1] += SP.vel[j + 1] * dt; SP.pos[j + 2] += SP.vel[j + 2] * dt;
        SP.alpha[k] = SP.life[k] > 0 ? Math.pow(SP.life[k] / SP.max[k], 0.6) * g : 0;
      }
      SP.geo.attributes.position.needsUpdate = true;
      SP.geo.attributes.aAlpha.needsUpdate = true;
      SP.geo.attributes.aSize.needsUpdate = true;
    }

    // ------------------------------------------------------------ zarcillos
    function updateTendrils(dt) {
      var g = clamp(gain, 0, 1.5), a, k, i, slot, T, u, vis, base;
      for (a = 0; a < atts.length; a++) {
        var att = atts[a], m = att.obj.matrixWorld, ax = att.ax, L = att.len;
        dw(m, ax.x, ax.y, ax.z, _ax);
        dw(m, att.e1.x, att.e1.y, att.e1.z, _e1);
        dw(m, att.e2.x, att.e2.y, att.e2.z, _e2);
        var I = g * att.intensity;
        for (k = 0; k < TEND_PER; k++) {
          slot = a * TEND_PER + k; T = tends[slot];
          T.age += dt;
          if (T.age >= T.dur) respawnTend(T);
          vis = Math.pow(Math.sin(Math.PI * T.age / T.dur), 0.6) * I;
          base = slot * TR.V;
          if (vis < 0.003) {
            for (i = 0; i < TR.V; i++) TR.fade[base + i] = 0;
            continue;
          }
          var bl = att.off + T.t0 * L;
          lw(m, ax.x * bl, ax.y * bl, ax.z * bl, _b);
          var c = Math.cos(T.th), sn = Math.sin(T.th);
          _d.set(_e1.x * c + _e2.x * sn, _e1.y * c + _e2.y * sn, _e1.z * c + _e2.z * sn).normalize();
          _p.crossVectors(_d, _ax).normalize();
          for (i = 0; i < TEND_P; i++) {
            u = i / (TEND_P - 1);
            var R = T.reach * L * u;
            var wob = T.amp * L * u * Math.sin(TAU * T.freq * u + T.ph + tNow * T.sp);
            var curl = T.amp * L * 0.8 * u * Math.cos(TAU * T.freq * 0.6 * u - T.ph * 1.3 - tNow * T.sp * 0.8);
            var droop = 0.12 * L * u * u;
            tendZ[i * 3] = _b.x + _d.x * R + _p.x * wob + _ax.x * curl;
            tendZ[i * 3 + 1] = _b.y + _d.y * R + _p.y * wob + _ax.y * curl - droop;
            tendZ[i * 3 + 2] = _b.z + _d.z * R + _p.z * wob + _ax.z * curl;
          }
          writeRibbon(TR, slot, TEND_P, tendZ);
          for (i = 0; i < TEND_P; i++) {
            u = i / (TEND_P - 1);
            var wv = T.w * L * clamp(u * 6, 0, 1) * (1 - 0.85 * u);
            TR.width[base + i * 2] = wv; TR.width[base + i * 2 + 1] = wv;
            TR.fade[base + i * 2] = vis; TR.fade[base + i * 2 + 1] = vis;
          }
        }
      }
      TR.geo.attributes.position.needsUpdate = true;
      TR.geo.attributes.aDir.needsUpdate = true;
      TR.geo.attributes.aWidth.needsUpdate = true;
      TR.geo.attributes.aFade.needsUpdate = true;
    }

    // ------------------------------------------------------------ API
    var api = {};

    api.attach = function (obj3D, o) {
      o = o || {};
      if (atts.length >= MAX_ATT) return -1;
      var ax = (o.axis || new THREE.Vector3(0, 1, 0)).clone().normalize();
      var ref = Math.abs(ax.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      var e1 = new THREE.Vector3().crossVectors(ax, ref).normalize();
      var e2 = new THREE.Vector3().crossVectors(ax, e1).normalize();
      var att = {
        idx: atts.length, obj: obj3D, ax: ax, e1: e1, e2: e2,
        len: o.length || 1, intensity: o.intensity == null ? 1 : o.intensity, off: o.offsetStart || 0,
        spawnAcc: 0
      };
      atts.push(att);
      for (var k = 0; k < TEND_PER; k++) {
        var T = tends[att.idx * TEND_PER + k];
        respawnTend(T);
        T.age = rand() * T.dur;
      }
      return att.idx;
    };

    api.setIntensity = function (x) { gainT = clamp(+x || 0, 0, 1.5); };

    api.burst = function (n) {
      if (!atts.length) return;
      n = n || 1;
      flash = 1;
      for (var k = 0; k < n; k++) {
        var att = atts[Math.floor(rand() * atts.length) % atts.length];
        spawnArc(att, true);
        for (var j = 0; j < 12; j++) emitSpark(att, rand(), 2.2);
      }
    };

    api.update = function (dt, time) {
      dt = Math.min(Math.max(dt || 0, 0), 1 / 20);
      tNow = (typeof time === 'number') ? time : tNow + dt;
      gain += (gainT - gain) * (1 - Math.exp(-dt * 3));
      flash *= Math.exp(-dt * 5);
      var g = clamp(gain, 0, 1.5), a, att, r, k;

      for (a = 0; a < atts.length; a++) {
        att = atts[a];
        att.obj.updateWorldMatrix(true, false);
      }

      // nacimiento de arcos y chispas (Poisson por frame); tormenta anade arcos extra
      for (a = 0; a < atts.length; a++) {
        att = atts[a];
        if (g < 0.02 || att.intensity <= 0) continue;
        var arcRate = (6 + 14 * g + (g > 1 ? (g - 1) * 40 : 0)) * att.intensity;
        r = arcRate * dt;
        while (r > 0) { if (rand() < r) spawnArc(att, false); r -= 1; }
        var sparkRate = (6 + 30 * g) * att.intensity;
        r = sparkRate * dt;
        while (r > 0) { if (rand() < r) emitSpark(att, rand(), 1); r -= 1; }
      }

      // arcos: vida y fundido
      for (k = 0; k < ARC_N; k++) {
        var A = arcs[k], f = 0;
        if (A.live) {
          A.age += dt;
          if (A.age >= A.life) A.live = false;
          else {
            var I = atts[A.att].intensity;
            f = Math.min(1, A.age / 0.012) * Math.pow(1 - A.age / A.life, 1.1) * I * g;
          }
        }
        var base = k * AR.V;
        for (var i = 0; i < AR.V; i++) AR.fade[base + i] = f;
      }

      // rebuild de arcos a ~25 Hz (cada rebuild re-randomiza el zigzag)
      arcAcc += dt;
      if (arcAcc >= REBUILD_DT) {
        arcAcc -= REBUILD_DT;
        for (k = 0; k < ARC_N; k++) if (arcs[k].live) buildArc(k);
        dirty = true;
      }
      if (dirty) {
        AR.geo.attributes.position.needsUpdate = true;
        AR.geo.attributes.aDir.needsUpdate = true;
        AR.geo.attributes.aWidth.needsUpdate = true;
        dirty = false;
      }
      AR.geo.attributes.aFade.needsUpdate = true;

      updateTendrils(dt);
      updateSparks(dt);

      arcCoreMat.uniforms.uGain.value = 1 + flash * 2.5;
      arcHaloMat.uniforms.uGain.value = 1 + flash * 1.5;
      tendMat.uniforms.uGlowAmt.value = 1 + flash * 3;
    };

    api.resize = function (px) {
      pixelH = px;
      sparkMat.uniforms.uPixelH.value = px;
    };

    api.stats = function () {
      var live = 0, sparks = 0;
      for (var k = 0; k < ARC_N; k++) if (arcs[k].live) live++;
      for (var j = 0; j < SPARK_N; j++) if (SP.life[j] > 0) sparks++;
      return { arcsLive: live, arcsMax: ARC_N, sparksAlive: sparks, sparksMax: SPARK_N, tendrils: atts.length * TEND_PER, drawCalls: meshes.length };
    };

    api.dispose = function () {
      scene.remove(root);
      [AR.geo, TR.geo, SP.geo].forEach(function (g) { g.dispose(); });
      [arcCoreMat, arcHaloMat, tendMat, sparkMat].forEach(function (m) { m.dispose(); });
    };

    return api;
  };
})();
