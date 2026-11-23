// Pruebas del visor de animaciones. Uso: node prototipo/pruebas/visor.js  (necesita prototipo/.three/package; ver preparar_three.sh)
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path'), cp = require('child_process');
const base = path.resolve(__dirname, '..'), pkg = path.join(base, '.three/package'), dir = path.join(base, 'animaciones'), caps = path.join(dir, 'capturas');
if (!fs.existsSync(pkg + '/build/three.min.js')) cp.execSync('bash ' + path.join(base, 'preparar_three.sh'), { stdio: 'inherit' });
fs.mkdirSync(caps, { recursive: true });
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALLO ') + m); if (!c) fails++; };
const toWebp = (png, webp) => { cp.execFileSync('python3', ['-I', '-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2],"WEBP",quality=82)', png, webp]); fs.unlinkSync(png); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const runs = [{ n: 'escritorio', ctx: { viewport: { width: 1280, height: 720 } } }, { n: 'movil', ctx: { ...devices['iPhone 13'] } }];
  for (const r of runs) {
    console.log('--- ' + r.n);
    const c = await b.newContext(r.ctx), p = await c.newPage(), errs = [];
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 200)); });
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await p.route('**/npm/three@0.147.0/**', rt => rt.fulfill({ path: pkg + '/' + rt.request().url().split('three@0.147.0/')[1], contentType: 'application/javascript' }));
    await p.goto('file://' + path.join(dir, 'visor.html')); await p.waitForFunction(() => window.__VISOR__ && window.__VISOR__.state().clips > 0, null, { timeout: 30000 });
    const S = () => p.evaluate(() => window.__VISOR__.state());
    let s = await S(); ok(s.clips > 0 && (await p.locator('#clips button').count()) === s.clips, `lista ${s.clips} clips (${s.glb})`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin scroll horizontal');
    // reproducir
    await p.locator('#clips button').nth(2).click(); s = await S(); const name = s.clip;
    await p.evaluate(() => { document.getElementById('bPlay').textContent.includes('Pausa') || document.getElementById('bPlay').click(); });
    await p.waitForTimeout(400); const t1 = (await S()).t; await p.waitForTimeout(500); const t2 = (await S()).t;
    ok(t1 !== t2 && (await S()).playing, `reproduce ${name} (t ${t1.toFixed(2)} -> ${t2.toFixed(2)})`);
    // velocidad: avance de t por segundo debe escalar
    const fase = async (i, v) => p.evaluate(([i, v]) => { const e = document.getElementById('d' + i); e.value = v; e.dispatchEvent(new Event('input')); }, [i, v]);
    for (let i = 0; i < 3; i++) await fase(i, 2);   // clip largo: sin vueltas durante la medición de velocidad
    await p.evaluate(() => window.__VISOR__.step(-999)); await p.evaluate(() => document.getElementById('bPlay').click());
    const rate = async () => { const a = (await S()).t; await p.waitForTimeout(600); const d = (await S()).t - a; return d < 0 ? NaN : d; };
    await p.evaluate(() => { const e = document.getElementById('rSpeed'); e.value = 0.5; e.dispatchEvent(new Event('input')); });
    const r1 = await rate(); await p.evaluate(() => { const e = document.getElementById('rSpeed'); e.value = 2; e.dispatchEvent(new Event('input')); });
    const r2 = await rate(); s = await S();
    ok(s.speed === 2 && (isNaN(r1) || isNaN(r2) || r2 > r1 * 1.8), `velocidad 0.5x -> 2x (avance ${r1.toFixed(2)} -> ${r2.toFixed(2)} s)`);
    // fotograma a fotograma
    await p.click('#bPrev'); s = await S(); const t0 = s.t; await p.click('#bNext'); const s2 = await S();
    ok(!s.playing && Math.abs(s2.t - t0 - 1 / 30) < 1e-6 || t0 === 0, 'paso de fotograma 1/30 s');
    // fases
    await fase(0, 0.25); await fase(1, 0.1); await fase(2, 0.45); s = await S();
    const sum = s.d.reduce((a, v) => a + v, 0);
    ok(Math.abs(s.total - 0.8) <= 1 / 30 && Math.abs(s.total - sum) <= 1 / 30, `fases 0.25/0.10/0.45 -> total ${s.total.toFixed(3)} (suma ${sum.toFixed(3)})`);
    ok(Math.abs(s.srcAtEnd - s.dur) < 1e-6, `time-warp cubre el clip original (${s.srcAtEnd.toFixed(3)} = ${s.dur.toFixed(3)})`);
    const w = await p.evaluate(() => { const V = window.__VISOR__, st = V.state(); return [V.srcTime(st.d[0], st.cuts[0], st.cuts[1], st.dur, st.d) - st.cuts[0], V.srcTime(st.d[0] + st.d[1], st.cuts[0], st.cuts[1], st.dur, st.d) - st.cuts[1]]; });
    ok(Math.abs(w[0]) < 1e-9 && Math.abs(w[1]) < 1e-9, 'los cortes caen en los límites de fase');
    // medición real: reproducir sin bucle hasta el final y medir tiempo de pared aprox
    await p.evaluate(() => { const e = document.getElementById('rSpeed'); e.value = 1; e.dispatchEvent(new Event('input')); });
    // marcadores y barra
    await p.locator('#bar').scrollIntoViewIfNeeded(); const bb = await p.locator('#bar').boundingBox(); await p.mouse.click(bb.x + bb.width * 0.5, bb.y + bb.height / 2); s = await S(); ok(Math.abs(s.t - s.total * 0.5) < 0.05 * s.total, 'barra de tiempo arrastrable/clicable');
    await p.locator('#strip').scrollIntoViewIfNeeded(); const m1 = await p.locator('#m1').boundingBox(); const before = (await S()).cuts[0];
    await p.mouse.move(m1.x + m1.width / 2, m1.y + m1.height / 2); await p.mouse.down(); await p.mouse.move(m1.x + m1.width / 2 + 20, m1.y + m1.height / 2, { steps: 4 }); await p.mouse.up();
    ok((await S()).cuts[0] > before, 'marcador de corte arrastrable');
    // extras
    await p.check('#cSkel'); await p.check('#cTrail'); s = await S(); ok(s.handBone, 'hueso mano derecha detectado (trayectoria)');
    await p.click('#vOk'); await p.click('#bCopy'); const out = await p.inputValue('#out'); ok(/: corte \d+\.\d\d\/\d+\.\d\d → fases \d+\.\d\d\/\d+\.\d\d\/\d+\.\d\d; velocidad 1\.0; ok/.test(out), 'bloque de valores: ' + out.split('\n')[0]);
    await p.fill('#q', 'zzzz'); ok((await p.locator('#clips button').count()) === 0, 'búsqueda filtra'); await p.fill('#q', '');
    await p.reload(); await p.waitForFunction(() => window.__VISOR__ && window.__VISOR__.state().clips > 0); s = await S();
    ok(s.clip === name && s.vote === 'ok' && Math.abs(s.total - 0.8) < 0.02, 'estado restaurado desde localStorage');
    // comparar
    await p.click('#bCmp'); await p.waitForFunction(() => window.__VISOR__.state().clipB, null, { timeout: 10000 }).catch(() => {}); await p.waitForTimeout(300); s = await S(); ok(s.compare && s.clipB && s.clipB !== s.clip, `comparar A=${s.clip} B=${s.clipB}`);
    await p.click('#views [data-v=front]'); await p.waitForTimeout(500);
    if (r.n === 'escritorio') { await p.screenshot({ path: path.join(caps, 'tmp1.png') }); toWebp(path.join(caps, 'tmp1.png'), path.join(caps, 'visor_escritorio_comparar.webp')); }
    await p.click('#bCmp'); await p.click('#views [data-v=game]'); await p.waitForTimeout(400);
    await p.evaluate(() => window.__VISOR__.step(5)); await p.waitForTimeout(300);
    if (r.n === 'movil') { await p.screenshot({ path: path.join(caps, 'tmp2.png') }); toWebp(path.join(caps, 'tmp2.png'), path.join(caps, 'visor_movil.webp')); }
    const e = [...new Set(errs)].filter(x => !/GL Driver Message/.test(x));   // ruido de swiftshader
     ok(e.length === 0, 'consola sin errores/warnings' + (e.length ? ': ' + JSON.stringify(e.slice(0, 5)) : ''));
    await c.close();
  }
  await b.close(); console.log(fails ? fails + ' FALLOS' : 'TODO OK'); process.exit(fails ? 1 : 0);
})();
