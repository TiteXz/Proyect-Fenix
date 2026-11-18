const { chromium } = require('playwright'); const fs = require('fs');
const [dir, pkg] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='warning'||m.type()==='error') errs.push(m.text().slice(0,160)); });
  await p.route('**/npm/three@0.147.0/**', r => { const rel = r.request().url().split('three@0.147.0/')[1]; r.fulfill({ path: pkg + '/' + rel, contentType: 'application/javascript' }); });
  await p.route('**fonts.g**', r => r.abort());
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + fs.readFileSync(dir + '/maqueta.html', 'utf8') + '</body></html>';
  await p.route('http://local.test/', r => r.fulfill({ body: html, contentType: 'text/html' }));
  await p.goto('http://local.test/');
  await p.waitForTimeout(6000);
  await p.click('#qual'); // baja: más rápido en CPU
  await p.click('#mode');
  await p.mouse.move(200, 300); await p.mouse.down(); await p.mouse.move(724, 300, { steps: 12 }); await p.mouse.move(724, 220, { steps: 4 }); await p.mouse.up();
  await p.waitForTimeout(5000);
  await p.screenshot({ path: dir + '/front-idle.png' });
  await p.keyboard.press('KeyJ'); await p.waitForTimeout(350);
  await p.screenshot({ path: dir + '/front-attack.png' });
  await p.waitForTimeout(1500); await p.keyboard.press('Digit2'); await p.waitForTimeout(600); await p.keyboard.press('KeyJ'); await p.waitForTimeout(400);
  await p.screenshot({ path: dir + '/front-hammer.png' });
  console.log('ERRS', JSON.stringify(errs.filter(e=>!e.includes('ERR_FAILED')&&!e.includes('GPU stall')).slice(0,6)));
  await b.close();
})();
