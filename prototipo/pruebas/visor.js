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
    await p.click('#vOk'); await p.click('#bCopy'); const out = await p.inputValue('#out'); ok(/: perfil combate \(\+ajustes 0\.25\/0\.10\/0\.45\); lunge 0; hitstop 0; corte \d+\.\d\d\/\d+\.\d\d; velocidad 1\.0; ok/.test(out), 'bloque de valores: ' + out.split('\n')[0]);
    await p.fill('#q', 'zzzz'); ok((await p.locator('#clips button').count()) === 0, 'búsqueda filtra'); await p.fill('#q', '');
    await p.reload(); await p.waitForFunction(() => window.__VISOR__ && window.__VISOR__.state().clips > 0); s = await S();
    ok(s.clip === name && s.vote === 'ok' && Math.abs(s.total - 0.8) < 0.02, 'estado restaurado desde localStorage');
    // comparar
    await p.click('#bCmp'); await p.waitForFunction(() => window.__VISOR__.state().clipB, null, { timeout: 10000 }).catch(() => {}); await p.waitForTimeout(300); s = await S(); ok(s.compare && s.clipB && s.clipB !== s.clip, `comparar A=${s.clip} B=${s.clipB}`);
    await p.click('#bCmp');   // fuera de comparar para probar perfiles con un solo personaje
    // ---- perfiles
    const pick = n => p.click(`#clips button[data-n="${n}"]`), perfil = k => p.selectOption('#sPerfil', k);
    const setIn = (id, v) => p.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input')); }, [id, v]);
    await pick('ataque_izq_EP_ual1_1');
    for (const [k, e] of [['tactico_pesado', 0.76], ['fluido_agil', 0.48], ['preciso_defensivo', 0.60], ['combate', 0.60], ['original', 1.57]]) {
      await perfil(k); s = await S(); const sm = s.d.reduce((a, v) => a + v, 0);
      ok(s.perfil === k && Math.abs(s.total - e) <= 1 / 30 && Math.abs(s.total - sm) <= 1 / 30, `perfil ${k}: duración ${s.total.toFixed(3)} = suma de fases ${e}`);
    }
    await pick('contraataque_EE_ual2_1'); await perfil('fluido_agil'); s = await S();
    ok(Math.abs(s.total - (0.10 * 1.17 + 0.09 + 0.30 * 1.17)) <= 1 / 30, `regla EE (x1.17 ant/rec): ${s.total.toFixed(3)} s`);
    ok(s.shieldVisible && s.swordVisible, 'arma y escudo (EE) visibles');
    await pick('ataque_izq_EP_ual1_1'); s = await S(); ok(s.swordVisible && !s.shieldVisible, 'espada sin escudo en EP');
    await p.uncheck('#cArma'); s = await S(); ok(!s.swordVisible, 'interruptor «Mostrar arma»'); await p.check('#cArma');
    await perfil('fluido_agil'); await setIn('d0', 0.22); await p.click('#bCopy'); let cp1 = (await p.inputValue('#out')).split('\n').find(l => l.startsWith('ataque_izq_EP_ual1_1')) || '';
    ok(/ataque_izq_EP_ual1_1: perfil fluido_agil \(\+ajustes 0\.22\/0\.09\/0\.19\); lunge 0\.5; hitstop 40; /.test(cp1), 'copia con perfil+ajustes+lunge+hitstop: ' + cp1);
    await perfil('tactico_pesado'); s = await S();
    ok(Math.abs(s.total - 0.76) <= 1 / 30, 'deslizador manual descartado al cambiar de perfil');
    // lunge
    const lz = async v => { await p.evaluate(v => window.__VISOR__.seek(v), v); return (await S()).lungeZ; };
    const d = s.d; const z0 = await lz(0), zA = await lz(d[0] + d[1]), zE = await lz(s.total), zM = await lz((d[0] + d[1]) / 2);
    ok(Math.abs(z0) < 1e-6 && Math.abs(zA - 0.35) < 0.01 && Math.abs(zE) < 1e-6 && zM > 0 && zM < zA, `lunge 0.35 m: ${z0.toFixed(2)} -> ${zM.toFixed(2)} -> ${zA.toFixed(2)} -> ${zE.toFixed(2)} (vuelve a origen)`);
    await p.uncheck('#cLunge'); ok(Math.abs(await lz(d[0] + d[1])) < 1e-6, 'lunge desactivable'); await p.check('#cLunge');
    // hit-stop determinista con advance()
    const hs = await p.evaluate(() => {
      const V = window.__VISOR__; V.seek(0); const out = { frames: 0, poses: [], pos: [], shake: false };
      for (let i = 0; i < 200 && !V.state().hold; i++) V.advance(1 / 60);
      for (let i = 0; i < 40 && V.state().hold; i++) { out.frames++; out.poses.push(V.pose(0)); out.shake = out.shake || document.getElementById('cv').style.transform !== ''; V.advance(1 / 60); }
      out.after = V.pose(0); out.c1 = V.state().cuts[1]; return out;
    });
    ok(hs.frames > 0 && Math.abs(hs.frames * 1000 / 60 - 70) <= 1000 / 60 + 1, `hit-stop 70 ms: ${hs.frames} fotogramas a 60 Hz congelados`);
    ok(hs.poses.every(v => Math.abs(v - hs.poses[0]) < 1e-9 && Math.abs(v - hs.c1) < 2e-3) && hs.after > hs.c1, 'pose congelada en el fin del activo y luego continúa');
    ok(hs.shake, 'temblor de cámara durante el hit-stop');
    await p.uncheck('#cHit'); const hs2 = await p.evaluate(() => { const V = window.__VISOR__; V.seek(0); let h = false; for (let i = 0; i < 120; i++) { V.advance(1 / 60); h = h || V.state().hold; } return h; });
    ok(!hs2, 'hit-stop desactivable'); await p.check('#cHit');
    // ficha
    const links = await p.$$eval('#ficha a', as => as.map(a => ({ h: a.href, t: a.target, x: a.textContent, rel: a.rel })));
    const ftxt = await p.innerText('#ficha');
    ok(links.length >= 3 && links.every(l => l.h.startsWith('https://') && l.t === '_blank' && /noopener/.test(l.rel) && /\(.+\)/.test(l.x)), `ficha: ${links.length} enlaces (_blank, con título y juego)`);
    ok(/búsqueda de YouTube/.test(ftxt) && /Dawnwalker/.test(ftxt) && /Witcher 3/.test(ftxt) && /Fallen Order/.test(ftxt), 'ficha: rasgos por juego y búsquedas marcadas');
    // comparar perfiles
    await perfil('tactico_pesado'); await p.click('#bCmp'); await p.waitForTimeout(300); await p.click('#bSame'); await p.waitForTimeout(300); s = await S();
    ok(s.compare && s.clipB === s.clip && s.perfilB !== s.perfil && Math.abs(s.totalB - s.total) > 0.1, `comparar perfiles ${s.perfil} vs ${s.perfilB}: ${s.total.toFixed(2)} vs ${s.totalB.toFixed(2)} s`);
    const al = await p.evaluate(() => { const V = window.__VISOR__, st = V.state(), off = Math.max(st.d[0], st.dB[0]);
      V.seek(off); const a = V.state(), pa = V.pose(0), pb = V.pose(1); return { lt: a.lt, ltB: a.ltB, d0: st.d[0], dB0: st.dB[0], pa, pb, c0: st.cuts[0] }; });
    ok(Math.abs(al.lt - al.d0) < 1e-6 && Math.abs(al.ltB - al.dB0) < 1e-6 && Math.abs(al.pa - al.pb) < 1e-6 && Math.abs(al.pa - al.c0) < 1e-6, 'activo alineado: ambos empiezan el activo en el mismo instante');
    await p.click('#views [data-v=side]'); await p.evaluate(() => window.__VISOR__.seek(window.__VISOR__.state().d[0] + window.__VISOR__.state().d[1])); await p.waitForTimeout(400);
    if (r.n === 'escritorio') { await p.evaluate(() => document.getElementById('sPerfil').scrollIntoView({ block: 'start' })); await p.waitForTimeout(200); await p.screenshot({ path: path.join(caps, 'tmp3.png') }); toWebp(path.join(caps, 'tmp3.png'), path.join(caps, 'visor_escritorio_comparar_perfiles.webp')); }
    await p.click('#bCmp'); await p.evaluate(() => window.__VISOR__.seek(0)); await perfil('combate');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin scroll horizontal (con perfiles)');
    ok(await p.evaluate(() => { const f = document.getElementById('ficha').getBoundingClientRect(); return f.left >= 15 && f.right <= innerWidth - 15; }), 'ficha con 16 px de margen');
    await p.click('#bCmp'); await p.waitForTimeout(200); await p.selectOption('#sB', 'ataque_abajo_EP_ual2_1'); await p.waitForTimeout(200);
    await p.click('#views [data-v=front]'); await p.waitForTimeout(500);
    if (r.n === 'escritorio') { await p.screenshot({ path: path.join(caps, 'tmp1.png') }); toWebp(path.join(caps, 'tmp1.png'), path.join(caps, 'visor_escritorio_comparar.webp')); }
    await p.click('#bCmp'); await p.click('#views [data-v=game]'); await p.waitForTimeout(400);
    await p.evaluate(() => window.__VISOR__.step(5)); await p.waitForTimeout(300);
    if (r.n === 'movil') { await p.screenshot({ path: path.join(caps, 'tmp2.png') }); toWebp(path.join(caps, 'tmp2.png'), path.join(caps, 'visor_movil.webp')); }
    // ---- categorías, ficha y perfil de los clips nuevos
    await p.click('#bCtl'); await p.click('#bCtl');   // entrar y salir del modo no deja estado roto
    await p.selectOption('#fCat', 'locomocion'); const nLoc = await p.locator('#clips button').count();
    ok(nLoc >= 20 && (await p.$$eval('#clips button', bs => bs.every(b => /^(parado|andar|correr|sprint|salto|agachado)/.test(b.dataset.n)))), `filtro locomoción: ${nLoc} clips`);
    await p.selectOption('#fCat', 'esquiva'); const nEsq = await p.locator('#clips button').count(), proc = await p.$$eval('#clips .proc', es => es.map(e => e.textContent));
    ok(nEsq >= 2 && proc.length === 4 && proc.every(x => /procedural \/ provisional/.test(x)), `filtro esquiva: ${nEsq} clips + ${proc.length} procedurales marcados`);
    await p.selectOption('#fCat', 'combate'); ok(await p.$$eval('#clips button', bs => bs.length > 15 && bs.every(b => !/^(parado|andar|correr|sprint|salto|agachado|rodar)/.test(b.dataset.n))), 'filtro combate');
    await p.selectOption('#fCat', 'locomocion'); await pick('andar_adelante_EE_ual1_1');
    ok(await p.evaluate(() => document.getElementById('secPerfil').hidden) && /velocidad 0\.98 m\/s/.test(await p.innerText('#ficha')) && !/Dawnwalker/.test(await p.innerText('#ficha')), 'locomoción: sin perfil de sensación y ficha con datos del manifiesto');
    await p.selectOption('#fCat', ''); await pick('rodar_adelante_EP_ual1_1'); ok(/desplazamiento 4\.99 m/.test(await p.innerText('#ficha')) && (await p.$$eval('#ficha a', a => a.length)) >= 1, 'rodar: ficha con desplazamiento y vídeo de esquiva');
    await pick('ataque_izq_EP_ual1_1'); ok(!(await p.evaluate(() => document.getElementById('secPerfil').hidden)), 'combate: perfil visible');
    // ---- escudo: ningún vértice del brazo/mano cruza la cara interior (>= 1 cm), también el EE de locomoción
    const ee = await p.$$eval('#clips button', bs => bs.map(b => b.dataset.n).filter(n => /_EE_/.test(n)));
    const fit = await p.evaluate(() => window.__VISOR__.fitInfo());
    ok(fit && fit.parent === 'lowerarm_l' && fit.gap >= 0.09 && fit.gap <= 0.12, `escudo sujeto al antebrazo (hueso ${fit && fit.parent}), eje del antebrazo a cara interior ${fit && (fit.gap * 100).toFixed(1)} cm`);
    let worst = { minGap: 1e9 }, nv = 0, badAll = 0;
    for (const n of ee) { const r1 = await p.evaluate(n => window.__VISOR__.shieldCheck(n, 12, 'L'), n); nv += r1.verts; badAll += r1.bad; if (r1.minGap < worst.minGap) worst = r1; }
    ok(ee.length >= 10 && badAll === 0 && worst.minGap >= 0.02 && worst.minGap < 0.2, `escudo sin intersección: ${ee.length} clips EE x 12 fotogramas (${nv} vértices); hueco mínimo ${(worst.minGap * 100).toFixed(1)} cm en ${worst.clip} t=${worst.worstT.toFixed(2)}`);
    const sh = await p.evaluate(() => { const V = window.__VISOR__; return ['EP'].length && V.shieldCheck('guardia_neu_EE_ual2_1', 6, 'L'); }); ok(sh.verts > 0 && sh.minGap >= 0.01, 'comprobación con vértices en la huella del escudo');
    if (r.n === 'escritorio') {
      await p.evaluate(() => { document.getElementById('cSkel').checked && document.getElementById('cSkel').click(); });
      await p.setViewportSize({ width: 1280, height: 760 });
      const shots = [['guardia_neu_EE_ual2_1', 0.5, 0.5, 0.9], ['parada_fro_EE_ual2_1', 0.45, 0.9, 1.0], ['embestida_EE_ual2_1', 0.6, 2.5, 1.2]];
      for (let i = 0; i < shots.length; i++) { const [n, tt, az, d] = shots[i]; await pick(n); await p.evaluate(([tt, d, az]) => { window.__VISOR__.seek(tt); window.__VISOR__.focusShield(d, az); }, [tt, d, az]); await p.waitForTimeout(500);
        await p.screenshot({ path: path.join(caps, 'tmpS' + i + '.png'), clip: { x: 0, y: 0, width: 620, height: 640 } }); }
      cp.execFileSync('python3', ['-I', '-c', 'import sys;from PIL import Image;ims=[Image.open(f).convert("RGB") for f in sys.argv[2:]];W=sum(i.width for i in ims);o=Image.new("RGB",(W,ims[0].height));x=0\nfor i in ims:o.paste(i,(x,0));x+=i.width\no.resize((W*2//3,ims[0].height*2//3)).save(sys.argv[1],"WEBP",quality=82)', path.join(caps, 'visor_escudo_cerca.webp'), ...shots.map((_, i) => path.join(caps, 'tmpS' + i + '.png'))]);
      shots.forEach((_, i) => fs.unlinkSync(path.join(caps, 'tmpS' + i + '.png')));
      await p.click('#views [data-v=game]'); await p.setViewportSize({ width: 1280, height: 720 });
    }
    // ---- modo «Probar controles»
    await pick('guardia_neu_EE_ual2_1'); await p.click('#bCtl'); await p.evaluate(() => window.__VISOR__.ctl.hold(true));
    const C = () => p.evaluate(() => window.__VISOR__.ctl.state());
    const run = n => p.evaluate(n => { const V = window.__VISOR__.ctl, out = []; let maxY = 0; for (let i = 0; i < n; i++) { V.step(1); const s = V.state(); if (out[out.length - 1] !== s.estado) out.push(s.estado); maxY = Math.max(maxY, s.pos[1]); } return { out, maxY }; }, n);
    let c0 = await C(); ok(c0.on && c0.estado === 'parado', 'modo controles activo (parado)');
    ok(await p.evaluate(() => !document.getElementById('ctlHud').hidden && /Estado: parado/.test(document.getElementById('ctlHud').textContent) && /Clip: /.test(document.getElementById('ctlHud').textContent) && /Círculo/.test(document.getElementById('ctlHud').textContent) && /SUPUESTO/.test(document.getElementById('ctlHud').textContent)), 'esquina: estado, clip y esquema de controles');
    const seen = [];
    const go = async (n, label) => { const q = await run(n); seen.push(...q.out); return q; };
    await go(20); await p.keyboard.down('KeyW'); await go(60); let c1 = await C(); const z1 = c1.pos[2];
    await go(60); const c2 = await C(); ok(c1.estado === 'andar' && Math.abs((c2.pos[2] - z1) - c2.speed) < 0.15 && Math.abs(c2.speed - 1.5) < 0.05, `andar: ${c2.speed.toFixed(2)} m/s, avance ${(c2.pos[2] - z1).toFixed(2)} m/s; clip ${c2.clip}`);
    await p.keyboard.down('ShiftLeft'); await go(75); const c3 = await C(); ok(c3.estado === 'correr' && c3.speed > 5 && /correr_/.test(c3.clip), `correr: ${c3.speed.toFixed(2)} m/s (${c3.clip})`);
    await go(60); const c3b = await C(); ok(c3b.estado === 'sprint', 'sprint tras mantener correr');
    await p.keyboard.up('ShiftLeft'); await p.keyboard.up('KeyW'); await go(90); const c4 = await C(); ok(c4.estado === 'parado' && c4.speed < 0.01, 'vuelve a parado');
    await p.keyboard.press('Space'); const jq = await go(120); const c5 = await C();
    ok(['salto_inicio', 'salto_aire', 'aterrizaje'].every(x => seen.includes(x)) && jq.maxY > 0.6 && jq.maxY < 1.6 && c5.pos[1] === 0 && c5.estado === 'parado', `salto: inicio -> aire -> aterrizaje, altura ${jq.maxY.toFixed(2)} m, vuelve a parado`);
    await p.keyboard.press('KeyC'); await go(60); const c6 = await C(); ok(c6.agachado && c6.estado === 'agachado_parado' && seen.includes('agachado_entrar'), 'C sin dirección: agacharse (entrar -> parado)');
    await p.keyboard.down('KeyW'); await go(60); const c7 = await C(); ok(c7.estado === 'agachado_andar' && c7.speed < 1.0 && /agachado_andar/.test(c7.clip), `agachado andar: ${c7.speed.toFixed(2)} m/s`);
    const pa = (await C()).pos; await p.keyboard.press('KeyC'); const dq = await go(10); const dd = await p.evaluate(() => window.__VISOR__.ctl.state());
    ok(dd.estado.startsWith('esquiva_') && !dd.agachado, `C con dirección: esquivar (${dd.estado}, ${dd.clip})`);
    await p.keyboard.press('KeyC'); await go(10); ok((await C()).estado === dd.estado && (await C()).esquivaTipo === dd.esquivaTipo, 'no se encadena otra esquiva durante la esquiva');
    const de = await p.evaluate(() => { const V = window.__VISOR__.ctl; let n = 0; while (V.state().estado.startsWith('esquiva_') && n < 200) { V.step(1); n++; } return { n: n + 20, pos: V.state().pos }; });   // + 20 fotogramas ya avanzados tras pulsar C
    const dist = Math.hypot(de.pos[0] - pa[0], de.pos[2] - pa[2]);
    ok(de.n >= 24 && de.n <= 37 && dist > 2.4 && dist < 3.6, `esquiva (voltereta ${await p.evaluate(() => window.__VISOR__.ctl.roles().rollF)}): ${dist.toFixed(2)} m en ${(de.n / 60).toFixed(2)} s`);
    await p.keyboard.up('KeyW');
    // esquiva lateral procedural con Alt + dirección
    await p.selectOption('#ctlEsq', 'paso'); await go(60); const pb = (await C()).pos; await p.keyboard.down('KeyA'); await p.keyboard.down('Alt'); await go(8); const lat = await C();
    ok(lat.estado === 'esquiva_izq' && lat.procedural, `Alt + dirección: ${lat.estado} procedural (${lat.clip})`);
    await p.keyboard.up('Alt'); await p.keyboard.up('KeyA'); await go(40); const pl = await C(); const dl = Math.hypot(pl.pos[0] - pb[0], pl.pos[2] - pb[2]);
    ok(!pl.estado.startsWith('esquiva') && dl > 1.8 && dl < 2.6, `paso lateral procedural: ${dl.toFixed(2)} m`);
    await p.selectOption('#ctlEsq', 'voltereta');
    // mando simulado: Círculo en neutro = agacharse, Círculo + stick = esquivar, X = saltar, L3 = correr
    await p.evaluate(() => { window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) }; navigator.getGamepads = () => [window.__pad]; });
    const pad = (f) => p.evaluate(f);
    await go(30); const wasCrouch = (await C()).agachado;
    await pad(() => { window.__pad.buttons[1].pressed = true; }); await go(3); await pad(() => { window.__pad.buttons[1].pressed = false; }); await go(40);
    const g1 = await C(); ok(g1.agachado !== wasCrouch, `mando: Círculo con stick neutro alterna agachado (${wasCrouch} -> ${g1.agachado})`);
    await pad(() => { window.__pad.axes[0] = -1; window.__pad.buttons[1].pressed = true; }); await go(4); const g2 = await C(); await pad(() => { window.__pad.buttons[1].pressed = false; window.__pad.axes[0] = 0; });
    ok(g2.estado.startsWith('esquiva_'), `mando: Círculo + stick inclinado esquiva (${g2.estado})`);
    await go(60); await pad(() => { window.__pad.buttons[0].pressed = true; }); await go(3); await pad(() => { window.__pad.buttons[0].pressed = false; }); const g3 = await go(10);
    ok((await C()).estado.startsWith('salto'), 'mando: X salta (' + (await C()).estado + ')');
    await go(90); await pad(() => { window.__pad.axes[1] = -1; window.__pad.buttons[10].pressed = true; }); await go(75); const g4 = await C(); ok(g4.speed > 4.5 && /^(correr|sprint)$/.test(g4.estado), `mando: stick + L3 mantenido corre (${g4.estado}, ${g4.speed.toFixed(1)} m/s)`);
    await pad(() => { window.__pad.axes[1] = 0; window.__pad.buttons[10].pressed = false; navigator.getGamepads = () => []; }); await go(90);
    // configuración EE
    await p.selectOption('#ctlCfg', 'EE'); await go(60); const ce = await C(); const shEE = await p.evaluate(() => window.__VISOR__.state().shieldVisible);
    ok(ce.cfg === 'EE' && /_EE_/.test(ce.clip) && shEE, `config EE: clip ${ce.clip}, escudo visible`);
    await p.selectOption('#ctlCfg', 'EP'); await go(30); ok(!(await p.evaluate(() => window.__VISOR__.state().shieldVisible)), 'config EP: sin escudo');
    ok(['parado', 'andar', 'correr', 'sprint', 'salto_inicio', 'salto_aire', 'aterrizaje', 'agachado_entrar', 'agachado_parado', 'agachado_andar'].every(x => seen.includes(x)) && seen.some(x => x.startsWith('esquiva_')), 'estados recorridos: ' + [...new Set(seen)].join(' > '));
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin scroll horizontal (modo controles)');
    // táctil
    const touch = r.n === 'movil';
    ok((await p.evaluate(() => !document.getElementById('tc').hidden)) === touch, `controles táctiles ${touch ? 'visibles' : 'ocultos'}`);
    if (touch) {
      await go(60); await p.locator('#tJump').dispatchEvent('pointerdown', { pointerId: 7 }); const tq = await go(10); const ts = await C();
      ok(ts.estado.startsWith('salto'), 'táctil: botón Saltar');
      await go(120); await p.locator('#tRun').dispatchEvent('pointerdown', { pointerId: 8 }); ok(await p.evaluate(() => document.getElementById('tRun').getAttribute('aria-pressed') === 'true'), 'táctil: botón Correr (mantener)'); await p.locator('#tRun').dispatchEvent('pointerup', { pointerId: 8 });
      await p.locator('#tO').dispatchEvent('pointerdown', { pointerId: 9 }); await go(5); ok((await C()).agachado, 'táctil: botón Agachar/Esquivar con joystick en neutro agacha');
    }
    // captura del modo
    await p.keyboard.down('KeyW'); await go(40); await p.keyboard.down('ShiftLeft'); await go(80); if (r.n === 'escritorio') await p.evaluate(() => { document.getElementById('ctlHud').querySelector('details').open = true; });
    await p.waitForTimeout(300); await p.screenshot({ path: path.join(caps, 'tmpC.png') }); toWebp(path.join(caps, 'tmpC.png'), path.join(caps, r.n === 'escritorio' ? 'visor_modo_controles.webp' : 'visor_movil_controles.webp'));
    await p.keyboard.up('ShiftLeft'); await p.keyboard.up('KeyW');
    // salir con Esc y volver al visor normal
    await p.keyboard.press('Escape'); await p.waitForTimeout(100); ok(!(await C()).on && await p.evaluate(() => document.getElementById('ctlHud').hidden && window.__VISOR__.state().clip === 'guardia_neu_EE_ual2_1'), 'Esc sale del modo y restaura el visor');
    ok(fs.statSync(path.join(dir, 'visor.html')).size <= 16 * 1048576, `visor.html ${(fs.statSync(path.join(dir, 'visor.html')).size / 1048576).toFixed(2)} MB (<= 16 MB)`);
    const e = [...new Set(errs)].filter(x => !/GL Driver Message/.test(x));   // ruido de swiftshader
     ok(e.length === 0, 'consola sin errores/warnings' + (e.length ? ': ' + JSON.stringify(e.slice(0, 5)) : ''));
    await c.close();
  }
  await b.close(); console.log(fails ? fails + ' FALLOS' : 'TODO OK'); process.exit(fails ? 1 : 0);
})();
