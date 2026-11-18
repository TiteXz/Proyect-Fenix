const { chromium } = require('playwright'); const fs = require('fs');
const [dir, pkg, vps] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  for (const vp of JSON.parse(vps)) {
    const errs = [];
    const p = await b.newPage({ viewport: { width: vp.w, height: vp.h } });
    p.on('console', m => { if (m.type()==='error' || m.type()==='warning') errs.push(m.text().slice(0,200)); });
    p.on('pageerror', e => errs.push('pageerror: '+e.message));
    await p.route('**/npm/three@0.147.0/**', r => { const rel = r.request().url().split('three@0.147.0/')[1]; r.fulfill({ path: pkg + '/' + rel, contentType: 'application/javascript' }); });
    await p.route('**fonts.g**', r => r.abort());
    const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + fs.readFileSync(dir + '/maqueta.html', 'utf8') + '</body></html>';
    await p.route('http://local.test/', r => r.fulfill({ body: html, contentType: 'text/html' }));
    await p.goto('http://local.test/');
    await p.waitForTimeout(vp.t);
    await p.screenshot({ path: dir + '/' + vp.n + '.png' });
    console.log(vp.n, 'overflow', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), await p.evaluate(() => document.querySelector('#wave').textContent));
    console.log('ERRORS', JSON.stringify([...new Set(errs)].filter(e => !e.includes('ERR_FAILED')).slice(0, 8)));
    await p.close();
  }
  await b.close();
})();
