/* Pruebas de la magia rúnica (criterios MQ-01..MQ-14 de prototipo/magia/DISENO.md) + capturas.
   Uso: node prototipo/pruebas/magia.js <dir con maqueta.html> <ruta a three/package> [dirCapturas]
   La maqueta se abre con ?test=1: la simulación solo avanza con __GAME__.step(n) (determinista). */
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [dir, pkg, capDir0] = process.argv.slice(2);
const capDir = capDir0 || path.join(__dirname, '..', 'vfx', 'capturas');
fs.mkdirSync(capDir, { recursive: true });
const res = []; const errs = [];
const ok = (id, cond, info) => { res.push({ id, cond: !!cond, info }); console.log((cond ? 'PASA  ' : 'FALLA ') + id + (info ? '  ' + info : '')); };

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 200)); });
  // mando falso (para MQ-13) y Math.random con semilla (para MQ-14)
  await p.addInitScript(() => {
    window.__pad = { connected: true, index: 0, id: 'DualSense 054c-0ce6', axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) };
    navigator.getGamepads = () => [window.__pad];
    let s = 1234567; Math.random = () => { s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0; s ^= s >>> 13; return (s >>> 0) / 4294967296; };
  });
  await p.route('**/npm/three@0.147.0/**', (r) => { const rel = r.request().url().split('three@0.147.0/')[1]; r.fulfill({ path: pkg + '/' + rel, contentType: 'application/javascript' }); });
  await p.route('**fonts.g**', (r) => r.abort());
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + fs.readFileSync(dir + '/maqueta.html', 'utf8') + '</body></html>';
  await p.route('http://local.test/**', (r) => r.fulfill({ body: html, contentType: 'text/html' }));
  await p.goto('http://local.test/?test=1');
  await p.waitForFunction(() => window.__GAME__ && window.__GAME__.MAGIA, null, { timeout: 60000 });
  await p.waitForTimeout(2500);
  const G = (fn, arg) => p.evaluate(fn, arg);
  const click = (sel, o) => p.click(sel, Object.assign({ noWaitAfter: true }, o));
  await G(() => { __GAME__.setMode('control'); __GAME__.MAGIA.limpiar(); });
  const shot = async (n) => { await p.waitForTimeout(150); await p.screenshot({ path: path.join(capDir, 'magia_' + n + '.png') }); };

  const modo = process.argv[5] || 'todo';
  async function mq() {
  /* ---- MQ-01: compilar de los 10 precompuestos ---- */
  const tabla = { 1: [18, 0.4, 1, 18], 2: [27, 0.4, 1, 11], 3: [20, 0.5, 8, 0], 4: [34, 0.9, 5, 48], 5: [26, 0.5, 1.25, 40], 6: [45, 0.9, 5, 59], 7: [32, 0.9, 7.5, 11.9], 8: [28, 0.4, 2.5, 32], 9: [32, 0.9, 7.5, 11.9], 10: [24, 0.4, 1, 18] };
  const comp = await G(() => __GAME__.MAGIA.precompuestos.map((x) => { const c = __GAME__.MAGIA.compilar(x.receta); return { id: x.id, mana: c.mana, lanz: c.lanz, rec: c.rec, dano: c.dano, cura: c.cura, esq: c.danoTipo.esqueleto }; }));
  const bad1 = comp.filter((c) => { const t = tabla[c.id]; return c.mana !== t[0] || Math.abs(c.lanz - t[1]) > 1e-6 || Math.abs(c.rec - t[2]) > 1e-6 || Math.abs(c.dano - t[3]) > 1e-6; });
  ok('MQ-01', bad1.length === 0 && comp[2].cura === 30 && comp[5].esq === 89 && comp[9].esq === 22, JSON.stringify(bad1));

  /* ---- MQ-02: recetas inválidas ---- */
  const inval = await G(() => {
    const v = __GAME__.MAGIA.validar; const P_ = (r) => v(r).ok;
    return [P_({ forma: null, nucleo: ['fuego'], mods: [] }), P_({ forma: 'proyectil', nucleo: [], mods: [] }), P_({ forma: 'proyectil', nucleo: ['fuego', 'hielo', 'luz'], mods: [] }),
      P_({ forma: 'area', nucleo: ['fuego'], mods: ['multiplicar'] }), P_({ forma: 'yo', nucleo: ['fuego', 'hielo'], mods: [] }), P_({ forma: 'proyectil', nucleo: ['fuego'], mods: ['potencia', 'potencia'] }),
      P_({ forma: 'cono', nucleo: ['fuego'], mods: ['persistencia'] }), P_({ forma: 'proyectil', nucleo: ['fuego'], mods: ['multiplicar', 'persistencia', 'potencia'] })];
  });
  ok('MQ-02', inval.slice(0, 7).every((x) => !x) && inval[7] === true, JSON.stringify(inval));

  /* ---- MQ-03: lanzar resta maná y fija recarga; sin maná / en recarga: false y nada cambia ---- */
  const mq3 = await G(() => {
    const M = __GAME__.MAGIA, P = __GAME__.P; M.limpiar();
    const mp0 = P.mp, r1 = M.lanzar(0), mp1 = P.mp, cd = P.cds.m0; __GAME__.step(60);
    P.cast = null; const mpA = P.mp, r2 = M.lanzar(0), mpB = P.mp;   // en recarga (1 s: aún > 0 si no ha pasado)
    P.cds.m0 = 0.5; P.cast = null; const mpC = P.mp; const r3 = M.lanzar(0); const mpD = P.mp, cdD = P.cds.m0;
    P.cds.m0 = 0; P.mp = 5; const r4 = M.lanzar(0), cd4 = P.cds.m0; P.mp = 100;
    return { r1, d: mp0 - mp1, cd, r2, r3, same3: mpC === mpD && cdD === 0.5, r4, cd4 };
  });
  ok('MQ-03', mq3.r1 === true && mq3.d === 18 && Math.abs(mq3.cd - 1) < 1e-6 && mq3.r3 === false && mq3.same3 && mq3.r4 === false && mq3.cd4 === 0, JSON.stringify(mq3));

  /* ---- MQ-04: hielo x3 congela al esqueleto; al jefe nunca 2 veces en 6 s ---- */
  const mq4 = await G(() => {
    const M = __GAME__.MAGIA; M.limpiar(); const hielo = { forma: 'proyectil', nucleo: ['hielo'], mods: [] };
    const e = M.spawn('esqueleto', 6, 0); for (let i = 0; i < 3; i++) M.golpear(e, hielo);
    const cong = M.estados(e).congelado;
    const j = M.spawn('jefe', -6, 0); for (let i = 0; i < 3; i++) M.golpear(j, hielo); const c1 = M.estados(j).congelado;
    __GAME__.step(150); const c2 = M.estados(j).congelado;   // 2,5 s: sigue el bloqueo
    for (let i = 0; i < 3; i++) M.golpear(j, hielo); const c3 = M.estados(j).congelado;
    return { cong, c1, c2, c3 };
  });
  ok('MQ-04', mq4.cong > 0 && mq4.c1 > 0 && mq4.c1 <= 1 && mq4.c3 === 0, JSON.stringify(mq4));

  /* ---- MQ-05 / MQ-06: reacción Ascua sobre congelado = x2 y consume; recarga de reacción ---- */
  const mq5 = await G(() => {
    const M = __GAME__.MAGIA; M.limpiar(); __GAME__.P.bonus = 1;
    const e = M.spawn('esqueleto', 6, 0); M.estados(e).congelado = 2;
    const hp0 = e.hp, r = M.golpear(e, M.precompuestos[0].receta);
    const dmg = hp0 - e.hp, cong = M.estados(e).congelado;
    // MQ-06: dos reacciones al mismo objetivo en < 1,5 s: solo cuenta la 1.ª
    const e2 = M.spawn('esqueleto', -6, 0); e2.hp = e2.max = 9999; const fuego = M.precompuestos[0].receta, hielo = { forma: 'proyectil', nucleo: ['hielo'], mods: [] };
    M.estados(e2).escarcha = 5; M.estados(e2).escStk = 1;
    const a = M.golpear(e2, fuego);       // fuego sobre escarcha: Vapor
    M.estados(e2).ardiendo = 0; M.golpear(e2, hielo);   // aplica escarcha
    const b = M.golpear(e2, fuego);       // fuego sobre escarcha de nuevo, < 1,5 s: sin reacción
    __GAME__.step(100);                   // > 1,5 s
    M.estados(e2).ardiendo = 0; M.golpear(e2, hielo); const c = M.golpear(e2, fuego);
    return { dmg, cong, reac: r.reaccion, a: a.reaccion, b: b.reaccion, c: c.reaccion };
  });
  ok('MQ-05', mq5.dmg === 36 && mq5.cong === 0 && mq5.reac === 'vapor', JSON.stringify(mq5));
  ok('MQ-06', mq5.a === 'vapor' && mq5.b === null && mq5.c === 'vapor', JSON.stringify(mq5));

  /* ---- MQ-07: cada fusión lanzada como hechizo aplica su estado y entra una sola vez en el códice ---- */
  const fus = [['vapor', { forma: 'proyectil', nucleo: ['fuego', 'hielo'], mods: [] }, 'cegado'], ['magma', { forma: 'proyectil', nucleo: ['fuego', 'tierra'], mods: [] }, 'lastrado'],
    ['incendio', { forma: 'proyectil', nucleo: ['aire', 'fuego'], mods: [] }, 'ardiendo'], ['escarcha_electrica', { forma: 'proyectil', nucleo: ['hielo', 'rayo'], mods: [] }, 'cargado'],
    ['juicio', { forma: 'area', nucleo: ['luz', 'rayo'], mods: [] }, 'aturdido'], ['niebla_negra', { forma: 'area', nucleo: ['aire', 'sombra'], mods: [] }, 'cegado']];
  const mq7 = [];
  for (const [id, receta, estado] of fus) {
    const r = await G(({ id, receta, estado }) => {
      const M = __GAME__.MAGIA, P = __GAME__.P; M.limpiar(); P.yaw = 0;
      const e = M.spawn('esqueleto', 0, 6); e.hp = e.max = 9999; __GAME__.LOCK.t = e;
      M.equipar(0, receta); M.pagina = 0; P.castN = 3;
      const lanzo = M.lanzar(0); let visto = false, t = 0;
      for (let i = 0; i < 240 && !visto; i++) { __GAME__.step(3); t += 3; if (M.estados(e)[estado] > 0) visto = true; }
      const n = M.codice.filter((x) => x === id).length;
      // segunda vez: el códice no duplica
      for (const k in P.cds) P.cds[k] = 0; P.cast = null; P.mp = 100; M.lanzar(0); __GAME__.step(80);
      __GAME__.LOCK.t = null;
      return { lanzo, visto, n, n2: M.codice.filter((x) => x === id).length, frames: t };
    }, { id, receta, estado });
    mq7.push({ id, ...r });
    if (id === 'vapor') await shot('reaccion_vapor_hechizo');
  }
  ok('MQ-07', mq7.every((x) => x.lanzo && x.visto && x.n === 1 && x.n2 === 1), JSON.stringify(mq7.map((x) => [x.id, x.visto, x.n, x.n2])));

  /* ---- MQ-08: reacción en suelo ---- */
  const mq8 = await G(() => {
    const M = __GAME__.MAGIA; M.limpiar(); const fuego = M.precompuestos[0].receta;
    const a = M.suelo('hielo', 3, 3, 2, 4); M.impacto(fuego, 3, 3.5); const sA = a.estilo;
    const b = M.suelo('tierra', -3, 3, 2, 4); M.impacto(fuego, -3, 3.2); const sB = b.estilo;
    const c = M.suelo('aire', 0, -4, 2, 4), r0 = c.r; M.impacto(fuego, 0, -4); const sC = c.estilo, r1 = c.r;
    return { sA, sB, sC, ratio: r1 / r0 };
  });
  ok('MQ-08', mq8.sA === 'vapor' && mq8.sB === 'magma' && mq8.sC === 'incendio', JSON.stringify(mq8));
  await G(() => { __GAME__.MAGIA.limpiar(); });

  /* ---- MQ-09: inestabilidad ---- */
  const mq9 = await G(() => {
    const M = __GAME__.MAGIA, est = M.precompuestos[3].receta, ju = M.precompuestos[5].receta, i0 = M.compilar(est).I, j = M.compilar(ju).I;
    M.codice.length = 0; const a = M.compilar(est).I; M.codice.push('vapor'); const d = M.compilar(est).I; M.codice.length = 0;
    return { i0, a, d, j };
  });
  ok('MQ-09', mq9.a === 30 && mq9.d === 15 && mq9.j === 10, JSON.stringify(mq9));

  /* ---- MQ-10: tirada determinista y tasas ---- */
  const mq10 = await G(() => {
    const M = __GAME__.MAGIA, sem = M.strHash('prueba'); let s = 0, c = 0, igual = true;
    for (let n = 0; n < 10000; n++) { const t = M.tirada(50, sem, n); if (t === 'sobrecarga') s++; if (t === 'contragolpe') c++; if (t !== M.tirada(50, sem, n)) igual = false; }
    return { s: s / 100, c: c / 100, igual, i0: M.tirada(0, sem, 5) };
  });
  ok('MQ-10', mq10.igual && Math.abs(mq10.s - 12.5) <= 1 && Math.abs(mq10.c - 25) <= 1 && mq10.i0 === 'normal', JSON.stringify(mq10));

  /* ---- MQ-11: máx. 2 zonas ---- */
  const mq11 = await G(() => {
    const M = __GAME__.MAGIA; M.limpiar(); const z = M.precompuestos[6].receta;
    const z1 = M.zona(z, 4, 0), z2 = M.zona(z, -4, 0), z3 = M.zona(z, 0, 5);
    return { activas: M.suelos.filter((s) => s.tipo === 'zona').length, primeraApagada: !M.suelos.some((s) => s.x === 4), resto: M.suelos.some((s) => s.x === -4) && M.suelos.some((s) => s.x === 0) };
  });
  ok('MQ-11', mq11.activas === 2 && mq11.primeraApagada && mq11.resto, JSON.stringify(mq11));
  await G(() => { __GAME__.MAGIA.limpiar(); });

  /* ---- MQ-12: grimorio: B abre y pausa; equipar en ranura 4, cambiar de página, Q lo lanza ---- */
  await G(() => { const M = __GAME__.MAGIA; M.limpiar(); M.pagina = 0; M.cargar({ forma: 'zona', nucleo: ['aire', 'sombra'], mods: [] }); });
  await p.keyboard.press('KeyB'); await p.waitForTimeout(300);
  const ab = await G(() => ({ abierto: __GAME__.MAGIA.abierto, paused: __GAME__.paused }));
  await shot('grimorio');
  await p.keyboard.press('Digit4'); await p.waitForTimeout(100);
  const slot4 = await G(() => __GAME__.MAGIA.ranuras[3] && __GAME__.MAGIA.ranuras[3].receta.nucleo.join());
  await p.keyboard.press('KeyB'); await p.waitForTimeout(200);
  const cerr = await G(() => ({ abierto: __GAME__.MAGIA.abierto, paused: __GAME__.paused }));
  await p.keyboard.press('Tab'); await p.waitForTimeout(100);
  const mp0 = await G(() => __GAME__.P.mp);
  await p.keyboard.press('KeyQ'); await G(() => __GAME__.step(4));
  const q = await G(() => ({ pag: __GAME__.MAGIA.pagina, cast: __GAME__.P.cast, mp: __GAME__.P.mp, cd: __GAME__.P.cds.m3 }));
  ok('MQ-12', ab.abierto && ab.paused && slot4 === 'aire,sombra' && !cerr.paused && q.pag === 1 && q.cast === 'm3' && q.mp < mp0 && q.cd > 0, JSON.stringify({ ab, slot4, cerr, q }));
  await G(() => { __GAME__.step(120); });

  /* ---- MQ-12b/c: grimorio con ratón y con mando ---- */
  await G(() => { const M = __GAME__.MAGIA; M.limpiar(); M.cargar({ forma: null, nucleo: [], mods: [] }); M.editor.forma = null; });
  await p.keyboard.press('KeyB'); await p.waitForTimeout(300);
  await click('#grClear'); await click('[data-k="forma"][data-v="cono"]'); await click('[data-k="nucleo"][data-v="hielo"]'); await click('[data-k="nucleo"][data-v="hielo"]');
  const ed1 = await G(() => JSON.stringify(__GAME__.MAGIA.editor));
  await click('[data-k="mod"][data-v="multiplicar"]', { force: true });   // inválido en Cono: no se añade
  await click('[data-k="pre"][data-v="7"]', { noWaitAfter: true });
  const ed2 = await G(() => JSON.stringify(__GAME__.MAGIA.editor));
  await click('#grEquip', { noWaitAfter: true }); await click('[data-k="slot"][data-v="5"]', { noWaitAfter: true });
  const sl = await G(() => __GAME__.MAGIA.ranuras[5].receta.forma);
  ok('MQ-12b', ed1 === '{"forma":"cono","nucleo":["hielo","hielo"],"mods":[]}' && JSON.parse(ed2).forma === 'zona' && sl === 'zona', ed1 + ' ' + ed2 + ' ' + sl);
  const nav = await G(() => { const pad = window.__pad, r = []; const press = (i) => { pad.buttons[i] = { pressed: true, value: 1 }; __GAME__.step(2); pad.buttons[i] = { pressed: false, value: 0 }; __GAME__.step(2); };
    r.push(__GAME__.MAGIA.grimNav.col); press(5); r.push(__GAME__.MAGIA.grimNav.col); press(15); r.push(__GAME__.MAGIA.grimNav.col); press(13); r.push(__GAME__.MAGIA.grimNav.row); press(1); r.push(__GAME__.MAGIA.abierto); return r; });
  ok('MQ-12c', nav[1] === nav[0] + 1 && nav[2] === nav[1] + 1 && nav[3] >= 1 && nav[4] === false, JSON.stringify(nav));
  await G(() => { __GAME__.step(5); });

  /* ---- MQ-13: L2 + X sigue disparando la habilidad del arma ---- */
  const mq13 = await G(() => {
    const P = __GAME__.P, pad = window.__pad; P.cast = null; P.act = null; P.skillCd = 0; P.st = 100;
    pad.buttons[6] = { pressed: true, value: 1 }; __GAME__.step(2); pad.buttons[0] = { pressed: true, value: 1 }; __GAME__.step(3);
    const r = { skillCd: P.skillCd, act: P.act, skill: P.skill };
    pad.buttons[0] = { pressed: false, value: 0 }; pad.buttons[6] = { pressed: false, value: 0 }; __GAME__.step(60); return r;
  });
  ok('MQ-13', mq13.skillCd > 0 && !!mq13.skill, JSON.stringify(mq13));

  /* ---- MQ-14: demo automática, 90 s: >= 6 hechizos distintos y >= 2 reacciones distintas ---- */
  await G(() => { const M = __GAME__.MAGIA; M.limpiar(); __GAME__.setMode('demo'); M.stats.lanzados = {}; M.stats.reacciones = {}; M.stats.nombres = {}; M.oleadas(); });
  const demo = await G(() => {
    const M = __GAME__.MAGIA; let w = 0; for (let i = 0; i < 5400; i += 60) { __GAME__.step(60); if (__GAME__.P.down) w++; }
    return { lanz: M.stats.nombres, reac: M.stats.reacciones, caidas: w };
  });
  const reacIds = [...new Set(Object.keys(demo.reac).map((k) => k.replace('suelo:', '')))];
  ok('MQ-14', Object.keys(demo.lanz).length >= 6 && reacIds.length >= 2, JSON.stringify(demo));

  }

  /* ================= capturas ================= */
  async function escena(spec, seq) {
    if (process.env.SOLO && !seq.some(([, n]) => n && process.env.SOLO.split(',').some((k) => n.includes(k)))) return;   // SOLO=texto: repite solo las escenas cuyo nombre lo contiene
    await G(() => { __GAME__.MAGIA.limpiar(); __GAME__.step(220); document.querySelectorAll('.num').forEach((n) => n.remove()); document.getElementById('toast').classList.remove('on'); });   // sin restos del efecto anterior
    await G((sp) => {
      const M = __GAME__.MAGIA, P = __GAME__.P; M.limpiar(); __GAME__.setMode('control'); document.getElementById('hint').style.display = 'none'; P.pos.set(0, 0, 0); P.yaw = 0; P.hp = 60; P.hpMax = 100;
      M.codice.length = 0; (sp.codice || []).forEach((c) => M.codice.push(c));
      const es = sp.enemies.map(([t, x, z, est]) => { const e = M.spawn(t, x, z); e.hp = e.max = 9999; if (est) Object.assign(M.estados(e), est); return e; });
      __GAME__.LOCK.t = es[0] || null; __GAME__.step(60);
      (sp.suelos || []).forEach(([estilo, x, z, r, d]) => M.suelo(estilo, x, z, r, d));
      if (sp.receta) { M.equipar(0, sp.receta); M.pagina = 0; P.castN = 1; if (sp.roll !== undefined) P.castN = sp.roll; M.lanzar(0); }
    }, spec);
    for (const [n, name] of seq) { if (n) await G((n) => __GAME__.step(n), n); if (name) await shot(name); }
  }
  async function capturas() {
    await G(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyH' })); });   // dispositivo = teclado (etiquetas de las ranuras)
    const R = (forma, el, mods = []) => ({ forma, nucleo: el, mods });
    const E = (t = 'esqueleto', x = 0, z = 8, est) => [t, x, z, est];
    const por = {
      fuego: R('proyectil', ['fuego']), hielo: R('proyectil', ['hielo']), luz: R('proyectil', ['luz']), rayo: R('proyectil', ['rayo']),
      tierra: R('proyectil', ['tierra']), sombra: R('proyectil', ['sombra']), aire: R('proyectil', ['aire'])
    };
    for (const el of Object.keys(por)) {
      await escena({ enemies: [E()], receta: por[el] }, [[14, el + '_carga'], [20, el + '_proyectil'], [16, el + '_impacto'], [14, el + '_impacto2']]);
    }
    // áreas / zonas / cono / yo
    await escena({ enemies: [E('esqueleto', 0, 8), E('goblin', 2, 9), E('goblin', -2, 9)], receta: R('area', ['fuego', 'hielo']) }, [[20, 'area_vapor_aviso'], [10, 'area_vapor_1'], [30, 'area_vapor_2']]);
    await escena({ enemies: [E('esqueleto', 0, 8), E('goblin', 2, 9)], receta: R('area', ['luz', 'rayo'], ['potencia']) }, [[24, 'area_juicio_aviso'], [50, 'area_juicio_rayo'], [20, 'area_juicio_post']]);
    await escena({ enemies: [E('esqueleto', 0, 8), E('esqueleto', 1.5, 9)], receta: R('zona', ['fuego', 'tierra']) }, [[60, 'zona_magma_1'], [120, 'zona_magma_2']]);
    await escena({ enemies: [E('goblin', 0, 8), E('cultista', 2, 9)], receta: R('zona', ['aire', 'sombra']) }, [[90, 'zona_niebla']]);
    await escena({ enemies: [E('esqueleto', 0, 4), E('goblin', 1.5, 4.5)], receta: R('cono', ['aire', 'fuego']) }, [[29, 'cono_incendio_0'], [8, 'cono_incendio_1']]);
    await escena({ enemies: [E('esqueleto', 0, 4)], receta: R('cono', ['hielo']) }, [[40, 'cono_hielo']]);
    await escena({ enemies: [E('esqueleto', 0, 8)], receta: R('yo', ['luz']) }, [[24, 'yo_luz_0'], [40, 'yo_luz_1']]);
    await escena({ enemies: [E('esqueleto', 0, 8)], receta: R('yo', ['fuego']) }, [[24, 'yo_fuego'], [50, 'yo_fuego_1']]);
    await escena({ enemies: [E('esqueleto', 0, 8)], receta: R('yo', ['aire']) }, [[60, 'yo_aire']]);
    await escena({ enemies: [E('esqueleto', 0, 8)], receta: R('zona', ['rayo']) }, [[70, 'zona_rayo']]);
    await escena({ enemies: [E('esqueleto', 0, 8)], receta: R('zona', ['hielo']) }, [[70, 'zona_hielo']]);
    await escena({ enemies: [E('esqueleto', 0, 8)], receta: R('zona', ['tierra']) }, [[70, 'zona_tierra']]);
    await escena({ enemies: [E('esqueleto', 0, 8)], receta: R('zona', ['luz']) }, [[70, 'zona_luz']]);
    await escena({ enemies: [E('esqueleto', 0, 8)], receta: R('zona', ['fuego']) }, [[70, 'zona_fuego']]);
    // reacciones sobre el enemigo
    const reac = async (nombre, est, receta, extra = []) => escena({ enemies: [E('esqueleto', 0, 7, est), ...extra], receta, codice: [] }, [[20, nombre + '_a'], [14, nombre + '_b'], [26, nombre + '_c']]);
    await reac('reac_vapor_congelado', { congelado: 3 }, R('proyectil', ['fuego']));
    await reac('reac_magma', { lastrado: 5, lasStk: 1 }, R('proyectil', ['fuego']));
    await reac('reac_incendio', { desequilibrado: 1.4 }, R('proyectil', ['fuego']), [E('goblin', 2, 8)]);
    await reac('reac_escarcha_electrica', { escarcha: 4, escStk: 2 }, R('proyectil', ['rayo']), [E('goblin', 3, 8, { escarcha: 4, escStk: 1 })]);
    await reac('reac_juicio', { iluminado: 5 }, R('proyectil', ['rayo']));
    await reac('reac_niebla', { desequilibrado: 1.4 }, R('proyectil', ['sombra']));
    // estados sobre enemigos
    await escena({ enemies: [E('esqueleto', -1.5, 6, { ardiendo: 6 }), E('esqueleto', 1.5, 6, { congelado: 6 }), E('goblin', 0, 8, { cargado: 6, carStk: 2 }), E('cultista', 3, 7, { maldito: 6 })] }, [[10, 'estados_1'], [20, 'estados_2']]);
    // grimorio abierto con una fusión inestable
    await G(() => { const M = __GAME__.MAGIA; M.limpiar(); M.codice.length = 0; M.cargar({ forma: 'area', nucleo: ['fuego', 'hielo'], mods: ['potencia'] }); __GAME__.setMode('control'); });
    await p.keyboard.press('KeyB'); await p.waitForTimeout(500); await shot('grimorio_vapor');
    await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(200); await shot('grimorio_nav');
    await p.keyboard.press('KeyB');
  }
  /* medidas con renderer.info en la escena más cargada: 2 zonas + área + proyectiles + estados + 4 enemigos */
  async function medidas() {
    const frame1 = () => p.evaluate(() => new Promise((res) => requestAnimationFrame(() => { const r = __GAME__.renderer; r.info.autoReset = false; r.info.reset(); requestAnimationFrame(() => { const i = r.info; res({ calls: i.render.calls, triangles: i.render.triangles }); r.info.autoReset = true; }); })));
    await escena({ enemies: [E_(0, 7), E_(2, 8), E_(-2, 8), E_(1, 10)], receta: null }, [[30, null]]);
    await G(() => { __GAME__.MAGIA.limpiar(); document.getElementById('hint').style.display = 'none'; });
    await G(() => { const M = __GAME__.MAGIA; M.limpiar(); for (const [t, x, z] of [['esqueleto', 0, 7], ['esqueleto', 2, 8], ['goblin', -2, 8], ['cultista', 1, 10]]) { const e = M.spawn(t, x, z); e.hp = e.max = 9999; } __GAME__.LOCK.t = __GAME__.enemies[0]; __GAME__.step(40); });
    const base = await frame1();
    const m = await G(() => {
      const M = __GAME__.MAGIA, P = __GAME__.P, V = __GAME__.VFX, es = __GAME__.enemies;
      const casts = [['area', ['fuego', 'hielo']], ['zona', ['fuego', 'tierra']], ['zona', ['aire', 'sombra']]];
      casts.forEach(([f, n], i) => M.equipar(i % 3, { forma: f, nucleo: n, mods: [] }));
      for (const k of ['m0', 'm1', 'm2']) P.cds[k] = 0;
      let maxP = 0, maxArcs = 0, maxQ = 0;
      for (let k = 0; k < 3; k++) { for (const key in P.cds) P.cds[key] = 0; P.mp = 100; P.cast = null; P.act = null; M.lanzar(k); __GAME__.step(60); }
      es.forEach((e, i) => { const s = M.estados(e); s.ardiendo = 5; s.congelado = i === 1 ? 4 : 0; s.cargado = 5; s.maldito = 5; });
      M.golpear(es[0], { forma: 'proyectil', nucleo: ['fuego', 'hielo'], mods: [] });
      for (let i = 0; i < 90; i++) { __GAME__.step(1); const s = V.stats(); if (s.particulas > maxP) maxP = s.particulas; maxArcs = Math.max(maxArcs, s.arcos); maxQ = Math.max(maxQ, s.quads); if (i === 40) { M.golpear(es[1], { forma: 'proyectil', nucleo: ['rayo'], mods: [] }); } }
      return { maxParticulas: maxP, maxArcos: maxArcs, maxQuads: maxQ, suelos: M.suelos.length };
    });
    await shot('escena_cargada');
    const con = await frame1();
    const tex = await G(() => { const r = __GAME__.renderer.info; return { texturas: r.memory.textures, geometrias: r.memory.geometries, luces: __GAME__.MAGIA.lights }; });
    console.log('MEDIDAS', JSON.stringify({ base, con, drawCallsVFX: con.calls - base.calls, ...m, ...tex }));
  }
  const E_ = (x, z) => ['esqueleto', x, z];

  if (modo !== 'cap') await mq();
  if (modo !== 'mq') { await capturas(); if (!process.env.SOLO) await medidas(); }
  console.log('ERRS', JSON.stringify([...new Set(errs)].filter((e) => !e.includes('ERR_FAILED') && !e.includes('GPU stall')).slice(0, 10)));
  fs.writeFileSync(path.join(dir, 'magia_resultados.json'), JSON.stringify({ res, errs: [...new Set(errs)] }, null, 1));
  await b.close();
  process.exit(res.every((r) => r.cond) ? 0 : 1);
})();
