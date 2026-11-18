const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const VFX = __dirname, THREE = path.join(__dirname, '..', '.three', 'package');
const scenes = (process.argv[2] || 'chargeFire,chargeFrost,chargeLight,projFire,fireExplosion,frostImpact,holyBurst').split(',');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errs = [];
  fs.mkdirSync(path.join(VFX, 'shots'), { recursive: true });
  for (const s of scenes) {
    const p = await b.newPage({ viewport: { width: 960, height: 540 } });
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(s + ': ' + m.text()); });
    p.on('pageerror', e => errs.push(s + ' pageerror: ' + e.message));
    await p.route('http://local/**', r => {
      const u = new URL(r.request().url()).pathname;
      let f = u.startsWith('/three/') ? path.join(THREE, u.slice(7)) : path.join(VFX, u.slice(1));
      if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: 'nf' });
      r.fulfill({ path: f, contentType: f.endsWith('.html') ? 'text/html' : 'application/javascript' });
    });
    const t0 = Date.now();
    await p.goto('http://local/test.html?s=' + s);
    await p.waitForFunction(() => window.__done, null, { timeout: 120000 });
    console.log(s, JSON.stringify(await p.evaluate(() => window.__stats)), (Date.now() - t0) + 'ms');
    await p.screenshot({ path: path.join(VFX, 'shots', s + '.png') });
    await p.close();
  }
  console.log('ERRORS', JSON.stringify(errs.slice(0, 20)));
  await b.close();
})();
