// Pruebas y capturas del visor del grimorio. Uso: node prototipo/pruebas/grimorio.js [salida_capturas]
// Necesita prototipo/.three/package (ver preparar_three.sh). Las fuentes de Google se cargan si hay red; si no, se usa la de respaldo.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), cp = require('child_process');
const base = path.resolve(__dirname, '..'), pkg = path.join(base, '.three/package'), html = path.join(base, 'grimorio/grimorio.html');
const out = process.argv[2] || path.join(base, 'grimorio/capturas');
if (!fs.existsSync(pkg + '/build/three.min.js')) cp.execSync('bash ' + path.join(base, 'preparar_three.sh'), { stdio: 'inherit' });
fs.mkdirSync(out, { recursive: true });
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALLO ') + m); if (!c) fails++; };
const shots = (process.env.SHOTS || '').split(',').filter(Boolean);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const c = await b.newContext({ viewport: { width: 1280, height: 720 } }), p = await c.newPage(), errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.route('**/npm/three@0.147.0/**', rt => rt.fulfill({ path: pkg + '/' + rt.request().url().split('three@0.147.0/')[1], contentType: 'application/javascript' }));
  await p.goto('file://' + html + '?test=1'); await p.waitForFunction(() => window.__GRIMORIO__ && window.__GRIMORIO__.ready, null, { timeout: 60000 });
  const snap = async (name) => { await p.evaluate(() => document.getElementById('panel').style.visibility = 'hidden'); await p.screenshot({ path: path.join(out, name + '.png') }); await p.evaluate(() => document.getElementById('panel').style.visibility = ''); };
  const at = async (t) => p.evaluate(t => window.__GRIMORIO__.setT(t), t);
  const plan = [['abrir', null, [0.2, 1.0, 1.7, 2.1, 4.0]], ['nuevo', 'asharvel', [1.2, 2.4, 3.3, 3.6, 5.2, 6.6, 7.9, 8.9]]];
  for (const [n, key, ts] of plan) {
    await p.evaluate(([n, key]) => window.__GRIMORIO__.play(n, key), [n, key]);
    for (const t of ts) { await at(t); if (!shots.length || shots.includes(n)) await snap(`${n}_${String(t).replace('.', '_')}`); }
  }
  await p.evaluate(() => window.__GRIMORIO__.turn('hechizos', 'mapa')); await at(0.45); if (!shots.length || shots.includes('mapa')) await snap('pasar_0_45');
  await at(0.85); if (!shots.length || shots.includes('mapa')) await snap('mapa');
  const s = await p.evaluate(() => window.__GRIMORIO__.state());
  ok(s.spread === 'mapa', 'pasar a Mapa (' + s.spread + ', ' + s.calls + ' draw calls)');
  ok(errs.length === 0, 'sin errores de consola' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); process.exit(fails ? 1 : 0);
})();
