// Captura las escenas de rayos_test.html con Playwright (three desde disco, sin CDN).
// Uso: THREE_PKG=/ruta/al/package node rayos_shoot.js [reposo,tormenta]
// THREE_PKG por defecto: prototipo/.three/package (lo crea prototipo/preparar_three.sh).
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = __dirname;
const THREE_PKG = process.env.THREE_PKG || path.join(DIR, '..', '.three', 'package');
const scenes = (process.argv[2] || 'reposo,tormenta').split(',');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errs = [];
  fs.mkdirSync(path.join(DIR, 'shots'), { recursive: true });
  for (const s of scenes) {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(s + ': ' + m.text()); });
    p.on('pageerror', e => errs.push(s + ' pageerror: ' + e.message));
    await p.route('http://local/**', r => {
      const u = decodeURIComponent(new URL(r.request().url()).pathname);
      const f = u.startsWith('/three/') ? path.join(THREE_PKG, u.slice(7)) : path.join(DIR, u.slice(1));
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: 'nf' });
      r.fulfill({ path: f, contentType: f.endsWith('.html') ? 'text/html' : 'application/javascript' });
    });
    await p.goto('http://local/rayos_test.html?s=' + s);
    await p.waitForFunction(() => window.__done, null, { timeout: 180000 });
    console.log(s, JSON.stringify(await p.evaluate(() => window.__stats)));
    await p.screenshot({ path: path.join(DIR, 'shots', 'rayos_' + s + '.png') });
    await p.close();
  }
  console.log('ERRORS', JSON.stringify(errs.slice(0, 20)));
  await b.close();
})();
