/* Prueba de la escena exterior «Camino de la Aldea del Vado» (Playwright + Chromium, sin instalar navegadores).
   Uso: node prototipo/pruebas/exterior.js [dir con maqueta.html] [ruta three] [dir de capturas]
   Por defecto: prototipo/dist, prototipo/.three/package, prototipo/exterior/capturas.
   1) carga ?escena=aldea&test=1, exige 0 errores de consola, mide renderer.info (draw calls, triángulos) por preset de calidad
   2) captura C1/C2/C3 del brief (1280x720, deviceScaleFactor 1, sin HUD) + caballero a caballo en el camino → .webp (calidad 80), borra los png
   3) comprueba el dispose(): patio → aldea → patio devuelve geometries/textures al valor inicial
   4) edificios de Sketchfab (CC-BY): 8 modelos, medidas finales y apartado «Créditos» del menú de pausa con las 8 atribuciones */
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const dir = path.resolve(process.argv[2] || path.join(root, 'dist')), pkg = path.resolve(process.argv[3] || path.join(root, '.three/package')), cap = path.resolve(process.argv[4] || path.join(root, 'exterior/capturas'));
fs.mkdirSync(cap, { recursive: true });
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK     ' : 'FALLA  ') + m); if (!c) fails++; };
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + fs.readFileSync(path.join(dir, 'maqueta.html'), 'utf8') + '</body></html>';
async function abrir(b, query) {
  const errs = [], p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 240)); });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await p.route('**/npm/three@0.147.0/**', (r) => { const rel = r.request().url().split('three@0.147.0/')[1]; r.fulfill({ path: pkg + '/' + rel, contentType: 'application/javascript' }); });
  await p.route('**fonts.g**', (r) => r.abort());
  await p.route('http://local.test/**', (r) => r.fulfill({ body: html, contentType: 'text/html' }));
  await p.goto('http://local.test/' + query);
  return { p, errs };
}
const realErrs = (e) => [...new Set(e)].filter((x) => !x.includes('ERR_FAILED') && !x.includes('GPU stall'));   // ERR_FAILED = tipografías de la CDN bloqueadas; GPU stall = aviso de swiftshader al leer píxeles
const info = (p, soloEscena) => p.evaluate((solo) => {   // renderer.info de un render completo (incluye las dos pasadas de sombra); solo: sin jugador/caballo/efectos del patio (el presupuesto del brief no los cuenta)
  const G = window.__GAME__, r = G.renderer, hid = [];
  if (solo) for (const c of G.scene.children) if (c.name !== 'escenaAldea' && !c.isLight && c.visible) { c.visible = false; hid.push(c); }
  r.info.autoReset = false; r.info.reset(); G.render(); r.render(G.scene, G.camera);
  const i = r.info, o = { calls: i.render.calls, tris: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures };
  r.info.autoReset = true; hid.forEach((c) => { c.visible = true; }); return o;
}, !!soloEscena);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  // ---------- 1) carga + medidas ----------
  let { p, errs } = await abrir(b, '?escena=aldea&test=1');
  await p.evaluate(() => window.__GAME__.escenaListo);
  const est = await p.evaluate(() => window.__GAME__.escena);
  ok(est.id === 'aldea' && est.stats && est.stats.arboles >= 18 && est.stats.arboles <= 32, 'escena aldea cargada: ' + JSON.stringify(est.stats));
  ok(await p.evaluate(() => !!document.querySelector('#scn') && document.querySelector('#scn').textContent === 'Escena: Aldea'), 'botón «Escena: Aldea» visible en el HUD');
  await p.addStyleTag({ content: '#hud,#dmg,#toast,#mountPrompt{display:none!important}' });
  const C = {   // encuadres del brief (alturas relativas al terreno, que sube hacia la aldea)
    C1: { x: -3.2, y: 1.7, z: 46, lx: 2, ly: 3, lz: -30, fov: 42, rel: true },
    C2: { rs: 26, rside: 1.9, ry: 1.2, ls: 35, lside: 3.5, ly: 0.7, fov: 35 },          // plano medio del muro (tramo con muro, hierba y flores en primer plano)
    C3: { x: 0, y: 3, z: -10, lx: 0, ly: 4, lz: -45, fov: 50, rel: true },
    C5: { x: -20, y: 7, z: -30, lx: -2, ly: 4, lz: -54, fov: 50, rel: true },        // aldea desde la loma, más alta que C3 (para ver el afloramiento y las casas de lado)
    C6: { x: 5.5, y: 2, z: -40, lx: -9, ly: 3.5, lz: -53, fov: 50, rel: true }         // fachadas de cerca (casa grande, pozo y casa rústica)
  };
  const poner = (c, mount) => p.evaluate(({ c, mount }) => {
    const G = window.__GAME__, A = G.aldea; let o = Object.assign({}, c);
    if (c.rs !== undefined) { const a = A.spawnAt(c.rs, c.rside), l = A.spawnAt(c.ls, c.lside); o = { x: a.x, y: a.y + c.ry, z: a.z, lx: l.x, ly: l.y + c.ly, lz: l.z, fov: c.fov }; }
    else if (c.rel) { o.y = A.heightAt(c.x, c.z) + c.y; o.ly = A.heightAt(c.lx, c.lz) + c.ly; }
    G.camara(o); G.step(3); G.render();
  }, { c, mount });
  const presets = {};
  for (const q of ['alta', 'media', 'baja']) {   // el botón cicla alta → baja → media → alta
    const name = { alta: 'Alta', media: 'Media', baja: 'Baja' }[q];
    for (let i = 0; i < 3 && (await p.evaluate(() => document.querySelector('#qual').textContent)) !== 'Calidad: ' + name; i++) await p.evaluate(() => document.querySelector('#qual').click());
    await poner(C.C1); await p.waitForTimeout(1500);
    presets[q] = await info(p, true); const tot = await info(p, false); presets[q].total = tot; console.log('renderer.info C1 ' + q + ' (solo escena | con jugador y caballo):', JSON.stringify(presets[q]));
  }
  ok(presets.alta.calls <= 160 && presets.alta.tris <= 2.0e6, 'Alta dentro del presupuesto de escena (≤ 160 draw calls, ≤ 2 M tris): ' + presets.alta.calls + ' / ' + (presets.alta.tris / 1e6).toFixed(2) + ' M');
  ok(presets.alta.tris >= 0.9e6, 'la escena sigue completa (≥ 0,9 M tris en Alta: terreno, hierba, árboles y edificios)');
  ok(presets.baja.tris < presets.media.tris && presets.media.tris < presets.alta.tris, 'los presets reducen la densidad de hierba (tris baja < media < alta)');
  for (let i = 0; i < 3 && (await p.evaluate(() => document.querySelector('#qual').textContent)) !== 'Calidad: Alta'; i++) await p.evaluate(() => document.querySelector('#qual').click());
  // ---------- 2) capturas ----------
  const shot = async (n) => { await p.waitForTimeout(2500); const png = path.join(cap, n + '.png'); await p.screenshot({ path: png }); execFileSync('python3', ['-I', '-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2],"WEBP",quality=80)', png, path.join(cap, n + '.webp')]); fs.unlinkSync(png); console.log('captura', path.join(cap, n + '.webp')); };
  await poner(C.C1); await shot('C1_entrada');
  await poner(C.C2); await shot('C2_muro');
  await poner(C.C3); await shot('C3_aldea');
  await poner(C.C5); await shot('C5_aldea_alta');
  await poner(C.C6); await shot('C6_fachadas');
  // caballero a caballo en el camino (cámara tras el jinete, ligeramente a la derecha)
  await p.evaluate(() => { const G = window.__GAME__; G.camara(null); G.setMode('control'); G.colocar(16, 0.2); G.step(2); G.toggleMount(); G.step(90); });
  await p.evaluate(() => { const G = window.__GAME__, P = G.P, A = G.aldea, h = A.heightAt(P.pos.x + 2.6, P.pos.z + 5.6); G.camara({ x: P.pos.x + 2.6, y: h + 1.9, z: P.pos.z + 5.6, lx: P.pos.x - 0.2, ly: P.pos.y + 1.5, lz: P.pos.z - 4, fov: 42 }); G.step(2); G.render(); });
  await shot('C4_jinete');
  const jin = await p.evaluate(() => { const G = window.__GAME__; return { montado: G.P.mounted, y: G.P.pos.y, h: G.aldea.heightAt(G.P.pos.x, G.P.pos.z) }; });
  ok(jin.montado && Math.abs(jin.y - jin.h) < 0.05, 'jinete a caballo sobre el terreno (y = altura del terreno)');
  // galope por el camino con teclado: avanza hacia la aldea sin atravesar muros y subiendo la loma
  const g0 = await p.evaluate(() => { const G = window.__GAME__; G.camara(null); G.colocar(6, 0.2); G.step(2); G.toggleMount(); G.step(90); return { x: G.P.pos.x, y: G.P.pos.y, z: G.P.pos.z }; });
  await p.keyboard.down('KeyW'); await p.keyboard.down('ShiftLeft');
  const g1 = await p.evaluate(() => { const G = window.__GAME__; G.step(600); return { x: G.P.pos.x, y: G.P.pos.y, z: G.P.pos.z, v: G.HZ.speed }; });
  await p.keyboard.up('KeyW'); await p.keyboard.up('ShiftLeft');
  ok(g1.z < g0.z - 20 && g1.y > g0.y + 0.5, 'galope: avanza ' + (g0.z - g1.z).toFixed(0) + ' m hacia la aldea y sube ' + (g1.y - g0.y).toFixed(1) + ' m (v=' + g1.v.toFixed(1) + ' m/s)');
  ok(Math.abs(g1.x) < 58 && g1.z > -58, 'el jinete no sale del mapa');
  // edificios de Sketchfab: 8 modelos en escena, escala con puerta ≈ 2-2,2 m, apoyados en el terreno y con el parche de tierra pisada
  const mod = await p.evaluate(() => { const A = window.__GAME__.aldea; return { proc: A.procedural, m: A.modelos, atlas: A.S.atlas, h: Object.fromEntries(Object.entries(A.modelos).map(([k, v]) => [k, A.heightAt(v.x, v.z)])) }; });
  const ESCALA = { casa_entramado_c: 1.16, casa_tudor: 1.03, casa_piedra: 1.04, casa_rustica: 0.95, granero: 0.92, torre_piedra: 0.88, pozo_piedra: 1.0, carro: 0.9 };
  ok(!mod.proc && Object.keys(mod.m).length === 8 && Object.keys(ESCALA).every((k) => mod.m[k] && mod.m[k].s === ESCALA[k]), 'edificios: 8 modelos GLB (casa_entramado_c, tudor, piedra, rustica, granero, torre, pozo, carro) con las escalas fijadas: ' + JSON.stringify(Object.fromEntries(Object.entries(mod.m).map(([k, v]) => [k, v.s + ' x ' + v.alto + ' m']))));
  ok(Object.values(mod.m).every((v) => v.y0 <= v.hMax + 1e-6 && v.y0 - v.falda <= v.hMin + 0.45), 'edificios asentados: la base nunca queda por encima del punto más alto del terreno bajo la huella y la falda (o ≤ 0,45 m de holgura bajo ruedas) llega al más bajo: no flotan');
  ok(mod.atlas && mod.atlas.tiles >= 20 && mod.atlas.h <= 4096, 'atlas de edificios: ' + JSON.stringify(mod.atlas));
  await p.keyboard.press('KeyP'); await p.waitForTimeout(400);
  const cr = await p.evaluate(() => { const b = document.querySelector('#pmCred'); if (!b || b.closest('li').hidden) return null; b.click(); const l = document.querySelector('#pmCredList'); return { n: l.querySelectorAll('a[href*="sketchfab.com"]').length, lic: l.querySelectorAll('a[href*="creativecommons.org/licenses/by/4.0"]').length, txt: l.textContent, vis: !document.querySelector('#pmCredV').hidden }; });
  ok(cr && cr.vis && cr.n === 8 && cr.lic === 8 && /local\.yany/.test(cr.txt) && /Mutasim_/.test(cr.txt) && /Lyskilde/.test(cr.txt) && /CC BY 4\.0/.test(cr.txt), 'Créditos en el menú de pausa: 8 modelos con título, autor, licencia CC BY 4.0 y enlace');
  if (cr && cr.vis) { await p.waitForTimeout(500); const png = path.join(cap, 'creditos.png'); await p.screenshot({ path: png }); execFileSync('python3', ['-I', '-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2],"WEBP",quality=80)', png, path.join(cap, 'creditos.webp')]); fs.unlinkSync(png); }
  ok(realErrs(errs).length === 0, 'sin errores ni avisos de consola: ' + JSON.stringify(realErrs(errs)));
  await p.close();
  // ---------- 3) dispose: patio → aldea → patio ----------
  ({ p, errs } = await abrir(b, '?test=1'));
  await p.waitForTimeout(3000);
  // en el patio se normaliza el estado (sin enemigos ni proyectiles) para medir lo mismo antes y después
  const mem = () => p.evaluate(() => { const G = window.__GAME__, r = G.renderer; if (!G.aldea) G.MAGIA.limpiar(); G.step(2); return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res({ g: r.info.memory.geometries, t: r.info.memory.textures })))); });
  const ir = async () => { await p.click('#scn'); await p.evaluate(() => window.__GAME__.escenaListo); await p.evaluate(() => { window.__GAME__.step(3); window.__GAME__.render(); }); await p.waitForTimeout(2500); return mem(); };
  const volver = async () => { await p.click('#scn'); await p.evaluate(() => window.__GAME__.escenaListo); await p.waitForTimeout(1500); return mem(); };
  // ciclo de calentamiento: la primera entrada crea los sistemas de partículas compartidos de vfx.js (humo de las chimeneas), que no son de la aldea y se quedan en el patio
  await ir(); await volver();
  const m0 = await mem(), m1 = await ir(), m2 = await volver(), m3 = await ir(), m4 = await volver();
  console.log('memoria (geometries/textures) patio | aldea | patio | aldea | patio:', JSON.stringify([m0, m1, m2, m3, m4]));
  ok(m1.g > m0.g + 20 && m1.t > m0.t + 50, 'la aldea añade geometrías y texturas a la GPU (+' + (m1.g - m0.g) + ' / +' + (m1.t - m0.t) + ')');
  ok(m2.g === m0.g && m2.t === m0.t && m4.g === m0.g && m4.t === m0.t, 'dispose(): patio → aldea → patio (×2) devuelve geometries y textures al valor inicial (' + m0.g + '/' + m0.t + ' → ' + m2.g + '/' + m2.t + ' → ' + m4.g + '/' + m4.t + ')');
  ok(await p.evaluate(() => window.__GAME__.escena.id === 'patio' && !window.__GAME__.aldea), 'vuelve al patio');
  ok(realErrs(errs).length === 0, 'sin errores de consola al cambiar de escena: ' + JSON.stringify(realErrs(errs)));
  await b.close();
  console.log(fails ? 'FALLOS: ' + fails : 'TODO OK');
  process.exit(fails ? 1 : 0);
})();
