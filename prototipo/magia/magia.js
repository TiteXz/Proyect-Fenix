/* FenixMagia: reglas puras del sistema de magia rúnica (sin three.js, sin DOM).
 * Fuente de verdad de la mecánica: prototipo/magia/DISENO.md (valores [MAQUETA]).
 * window.FenixMagia = { compilar, validar, PRECOMPUESTOS, tirada, resolverGolpe, tickEstados, nuevoEstados, ... }
 * Receta: { forma: 'proyectil'|'area'|'zona'|'cono'|'yo', nucleo: [elemento, elemento?], mods: ['potencia'|'multiplicar'|'persistencia'] }
 */
(function (root) {
  'use strict';

  var FORMAS = {
    proyectil: { nombre: 'Proyectil', mana: 10, lanz: 0.4, rec: 1.0, factor: 1.0 },
    area: { nombre: 'Área', mana: 18, lanz: 0.8, rec: 4.0, factor: 1.2 },
    zona: { nombre: 'Zona', mana: 16, lanz: 0.8, rec: 6.0, factor: 0.3 },     // 0,3 por segundo
    cono: { nombre: 'Cono', mana: 12, lanz: 0.3, rec: 2.0, factor: 0.8 },
    yo: { nombre: 'Yo', mana: 12, lanz: 0.5, rec: 8.0, factor: 0 }
  };
  var ELEMS = {
    fuego: { nombre: 'Fuego', hex: 0xff7a2e, css: '#ff8a3a', estado: 'ardiendo' },
    hielo: { nombre: 'Hielo', hex: 0x7fe3ff, css: '#7fe3ff', estado: 'escarcha' },
    luz: { nombre: 'Luz', hex: 0xffd36a, css: '#ffd36a', estado: 'iluminado' },
    rayo: { nombre: 'Rayo', hex: 0xb9a8ff, css: '#b9a8ff', estado: 'cargado' },
    tierra: { nombre: 'Tierra', hex: 0xb0884e, css: '#b8935a', estado: 'lastrado' },
    sombra: { nombre: 'Sombra', hex: 0x8a4fd0, css: '#9a62e0', estado: 'maldito' },
    aire: { nombre: 'Aire', hex: 0xcfeee2, css: '#cfeee2', estado: 'desequilibrado' }
  };
  var MODS = {
    potencia: { nombre: 'Potencia', mult: 1.3, plano: 0, pot: 1.25, inest: 10, validas: ['proyectil', 'area', 'zona', 'cono', 'yo'] },
    multiplicar: { nombre: 'Multiplicar', mult: 1.5, plano: 0, pot: 1, inest: 10, validas: ['proyectil'] },
    persistencia: { nombre: 'Persistencia', mult: 1, plano: 6, pot: 1, inest: 0, validas: ['proyectil', 'area'] }
  };
  var TIPOS = ['esqueleto', 'goblin', 'cultista', 'jefe'];
  // Fusiones (par sin orden). 'estados': lo que aplica el hechizo fusionado (en vez de los de cada elemento).
  var FUSIONES = {
    vapor: { id: 'vapor', nombre: 'Vapor', par: ['fuego', 'hielo'], opuesto: true, estados: [['cegado', 2]] },
    magma: { id: 'magma', nombre: 'Magma', par: ['fuego', 'tierra'], estados: [['ardiendo', 4], ['lastrado', 5]] },
    incendio: { id: 'incendio', nombre: 'Incendio', par: ['aire', 'fuego'], estados: [['ardiendo', 6]] },
    escarcha_electrica: { id: 'escarcha_electrica', nombre: 'Escarcha eléctrica', par: ['hielo', 'rayo'], estados: [['escarcha', 5], ['cargado', 5]] },
    juicio: { id: 'juicio', nombre: 'Juicio', par: ['luz', 'rayo'], estados: [['aturdido', 1]] },
    niebla_negra: { id: 'niebla_negra', nombre: 'Niebla negra', par: ['aire', 'sombra'], estados: [['cegado', 3]] }
  };
  var OPUESTOS = [['fuego', 'hielo'], ['luz', 'sombra']];      // +30 de inestabilidad (+15 el par ya descubierto)

  function parKey(a, b) { return a < b ? a + '+' + b : b + '+' + a; }
  var FUS_POR_PAR = {};
  Object.keys(FUSIONES).forEach(function (k) { var f = FUSIONES[k]; FUS_POR_PAR[parKey(f.par[0], f.par[1])] = f; });
  function fusionDe(a, b) { return a && b && a !== b ? (FUS_POR_PAR[parKey(a, b)] || null) : null; }
  function esOpuesto(a, b) { for (var i = 0; i < OPUESTOS.length; i++) if (parKey(a, b) === parKey(OPUESTOS[i][0], OPUESTOS[i][1])) return true; return false; }

  // Redondeo "mitad hacia abajo": 22,5 -> 22; 47,52 -> 48
  function rhd(x) { return Math.ceil(x - 0.5 - 1e-9); }
  function r1(x) { return Math.round(x * 10) / 10; }

  function validar(r) {
    if (!r || typeof r !== 'object') return { ok: false, error: 'Receta vacía' };
    var f = FORMAS[r.forma];
    if (!f) return { ok: false, error: 'Falta la forma' };
    var n = r.nucleo || [], mods = r.mods || [], i;
    if (!Array.isArray(n) || n.length < 1) return { ok: false, error: 'Falta un núcleo (1 o 2 elementos)' };
    if (n.length > 2) return { ok: false, error: 'Máximo 2 piezas de núcleo' };
    for (i = 0; i < n.length; i++) if (!ELEMS[n[i]]) return { ok: false, error: 'Elemento desconocido' };
    if (r.forma === 'yo' && n.length !== 1) return { ok: false, error: 'Yo admite solo 1 elemento' };
    var vistos = {};
    for (i = 0; i < mods.length; i++) {
      var m = MODS[mods[i]];
      if (!m) return { ok: false, error: 'Modificador desconocido' };
      if (vistos[mods[i]]) return { ok: false, error: m.nombre + ' repetido' };
      vistos[mods[i]] = 1;
      if (m.validas.indexOf(r.forma) < 0) return { ok: false, error: m.nombre + ' no vale en ' + f.nombre };
    }
    if (mods.length > 3) return { ok: false, error: 'Máximo 3 modificadores' };
    return { ok: true, error: '' };
  }
  // por qué una runa concreta no se puede añadir a la receta actual (para apagarla en el grimorio)
  function motivoMod(r, mod) {
    var m = MODS[mod];
    if (m.validas.indexOf(r.forma) < 0) return r.forma ? m.nombre + ' no vale en ' + FORMAS[r.forma].nombre : 'Elige primero una forma';
    return '';
  }

  function recetaKey(r) { return r.forma + ':' + (r.nucleo || []).slice().sort().join('+') + ':' + (r.mods || []).slice().sort().join(','); }
  function strHash(s) { var h = 2166136261 >>> 0; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function hash2(a, b) {
    var h = (a ^ Math.imul((b | 0) + 0x9e3779b9, 0x85ebca6b)) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x846ca68b) >>> 0; h ^= h >>> 16;
    return h >>> 0;
  }
  // Tirada de inestabilidad: determinista en (semillaReceta, nº de lanzamiento)
  function tirada(I, semillaReceta, n) {
    I = Math.max(0, Math.min(100, I || 0));
    if (I <= 0) return 'normal';
    var u = hash2(semillaReceta >>> 0, n | 0) / 4294967296;
    var pc = 0.005 * I, ps = 0.0025 * I;
    if (u < pc) return 'contragolpe';
    if (u < pc + ps) return 'sobrecarga';
    return 'normal';
  }

  function multTipo(elems, tipo) {
    var undead = tipo === 'esqueleto' || tipo === 'jefe', m = 1;
    for (var i = 0; i < elems.length; i++) {
      var e = elems[i];
      if (e === 'luz' && undead) m *= 1.5;
      else if (e === 'tierra' && tipo === 'esqueleto') m *= 1.25;
      else if (e === 'sombra' && undead) m *= 0.5;
      else if (e === 'aire' && tipo === 'goblin') m *= 1.25;
    }
    return m;
  }

  function nombreDe(r, fus) {
    var f = FORMAS[r.forma].nombre, n = r.nucleo, base;
    if (fus) base = fus.nombre;
    else if (n.length === 2 && n[0] === n[1]) base = ELEMS[n[0]].nombre + ' concentrado';
    else if (n.length === 2) base = ELEMS[n[0]].nombre + ' y ' + ELEMS[n[1]].nombre;
    else base = ELEMS[n[0]].nombre;
    var s = f + ' de ' + base, m = r.mods || [];
    if (m.indexOf('potencia') >= 0) s += ' potente';
    if (m.indexOf('multiplicar') >= 0) s += ' múltiple';
    if (m.indexOf('persistencia') >= 0) s += ' persistente';
    return s;
  }

  // codice: array de ids de fusión descubiertos
  function compilar(r, codice) {
    var v = validar(r);
    if (!v.ok) return { ok: false, error: v.error };
    var F = FORMAS[r.forma], n = r.nucleo.slice(), mods = (r.mods || []).slice(), piezas = n.length, i;
    var fus = piezas === 2 ? fusionDe(n[0], n[1]) : null;
    var plano = 0, mult = 1, pot = 1, inest = 0;
    for (i = 0; i < mods.length; i++) { var M = MODS[mods[i]]; plano += M.plano; mult *= M.mult; pot *= M.pot; inest += M.inest; }
    var mana = Math.ceil((F.mana + 8 * piezas + plano) * mult - 1e-9);
    var lanz = r1(F.lanz + 0.1 * (piezas - 1) + 1e-9), rec = Math.round(F.rec * (1 + 0.25 * (piezas - 1)) * 100) / 100;
    var conc = piezas === 2 && n[0] === n[1] ? 1.15 : 1;
    var potencia = 12 * piezas * (1 + 0.10 * (piezas - 1)) * F.factor * pot * 1.5 * conc;
    var tiros = mods.indexOf('multiplicar') >= 0 ? 3 : 1, frac = tiros > 1 ? 0.6 : 1;
    var porTiro = potencia * frac;
    var dano = r.forma === 'yo' ? 0 : (r.forma === 'zona' ? r1(porTiro) : rhd(porTiro));
    var danoTipo = {}, uniq = n.filter(function (x, k) { return n.indexOf(x) === k; });
    for (i = 0; i < TIPOS.length; i++) {
      var d = porTiro * multTipo(uniq, TIPOS[i]);
      danoTipo[TIPOS[i]] = r.forma === 'yo' ? 0 : (r.forma === 'zona' ? r1(d) : rhd(d));
    }
    // inestabilidad: par opuesto (+30, +15 descubierto) + mods agresivos
    var I = inest;
    if (piezas === 2 && esOpuesto(n[0], n[1])) {
      var desc = fus && codice && codice.indexOf(fus.id) >= 0;
      I += desc ? 15 : 30;
    }
    I = Math.max(0, Math.min(100, I));
    var estados = [], el;
    if (r.forma === 'yo') estados = [];
    else if (fus) estados = fus.estados.map(function (e) { return e[0]; });
    else { for (i = 0; i < piezas; i++) { el = ELEMS[n[i]].estado; if (estados.indexOf(el) < 0) estados.push(el); } }
    return {
      ok: true, error: '', forma: r.forma, elems: n, mods: mods, piezas: piezas, fusion: fus ? fus.id : null,
      mana: mana, lanz: lanz, rec: rec, potencia: potencia, dano: dano, danoTipo: danoTipo, tiros: tiros, frac: frac,
      cura: r.forma === 'yo' && n[0] === 'luz' ? 30 : 0, estados: estados, I: I, nombre: nombreDe(r, fus), key: recetaKey(r),
      semilla: strHash(recetaKey(r)), color: n.map(function (e) { return ELEMS[e].hex; })
    };
  }

  var PRECOMPUESTOS = [
    { id: 1, nombre: 'Ascua', receta: { forma: 'proyectil', nucleo: ['fuego'], mods: [] } },
    { id: 2, nombre: 'Lanza gélida', receta: { forma: 'proyectil', nucleo: ['hielo'], mods: ['multiplicar'] } },
    { id: 3, nombre: 'Destello sagrado', receta: { forma: 'yo', nucleo: ['luz'], mods: [] } },
    { id: 4, nombre: 'Estallido de vapor', receta: { forma: 'area', nucleo: ['fuego', 'hielo'], mods: [] } },
    { id: 5, nombre: 'Cadena helada', receta: { forma: 'proyectil', nucleo: ['hielo', 'rayo'], mods: [] } },
    { id: 6, nombre: 'Juicio', receta: { forma: 'area', nucleo: ['luz', 'rayo'], mods: ['potencia'] } },
    { id: 7, nombre: 'Charco de magma', receta: { forma: 'zona', nucleo: ['fuego', 'tierra'], mods: [] } },
    { id: 8, nombre: 'Aliento de incendio', receta: { forma: 'cono', nucleo: ['aire', 'fuego'], mods: [] } },
    { id: 9, nombre: 'Niebla negra', receta: { forma: 'zona', nucleo: ['aire', 'sombra'], mods: [] } },
    { id: 10, nombre: 'Pedrada', receta: { forma: 'proyectil', nucleo: ['tierra'], mods: ['persistencia'] } }
  ];

  /* ---------- estados sobre enemigos ---------- */
  function nuevoEstados() {
    return { ardiendo: 0, escarcha: 0, escStk: 0, congelado: 0, iluminado: 0, cargado: 0, carStk: 0, lastrado: 0, lasStk: 0,
      maldito: 0, desequilibrado: 0, cegado: 0, aturdido: 0, derribado: 0, costra: 0,
      reacCd: 0, lockCong: 0, lockAtur: 0, lockDerr: 0, cancelaAtaque: false, zlento: 0, penumbra: 0, lastReac: '' };
  }
  function tickEstados(s, dt) {
    var k = ['ardiendo', 'escarcha', 'congelado', 'iluminado', 'cargado', 'lastrado', 'maldito', 'desequilibrado', 'cegado', 'aturdido', 'derribado', 'costra',
      'reacCd', 'lockCong', 'lockAtur', 'lockDerr', 'zlento', 'penumbra'];
    for (var i = 0; i < k.length; i++) if (s[k[i]] > 0) s[k[i]] = Math.max(0, s[k[i]] - dt);
    if (s.escarcha <= 0) s.escStk = 0;
    if (s.cargado <= 0) s.carStk = 0;
    if (s.lastrado <= 0) s.lasStk = 0;
  }
  function activo(s, estadoOElem) {      // el estado de ese elemento está activo
    switch (estadoOElem) {
      case 'fuego': return s.ardiendo > 0;
      case 'hielo': return s.escarcha > 0 || s.congelado > 0;
      case 'luz': return s.iluminado > 0;
      case 'rayo': return s.cargado > 0;
      case 'tierra': return s.lastrado > 0;
      case 'sombra': return s.maldito > 0;
      case 'aire': return s.desequilibrado > 0;
    }
    return false;
  }
  function consumir(s, el) {
    switch (el) {
      case 'fuego': s.ardiendo = 0; break;
      case 'hielo': s.escarcha = 0; s.escStk = 0; s.congelado = 0; break;
      case 'luz': s.iluminado = 0; break;
      case 'rayo': s.cargado = 0; s.carStk = 0; break;
      case 'tierra': s.lastrado = 0; s.lasStk = 0; break;
      case 'sombra': s.maldito = 0; break;
      case 'aire': s.desequilibrado = 0; break;
    }
  }
  // Aplica un estado. Devuelve el nombre del estado "fuerte" provocado (congelado/aturdido/derribado) o ''.
  function aplicarEstado(s, tipo, nombre, dur) {
    var jefe = tipo === 'jefe', fuerte = '';
    switch (nombre) {
      case 'ardiendo': s.ardiendo = Math.max(s.ardiendo, dur || 4); break;
      case 'escarcha':
        s.escStk = Math.min(3, s.escStk + 1); s.escarcha = dur || 5;
        if (s.escStk >= 3 && s.congelado <= 0 && !(jefe && s.lockCong > 0)) {
          s.congelado = jefe ? 1 : 2; if (jefe) s.lockCong = 6; s.escStk = 0; s.escarcha = 0; fuerte = 'congelado';
        }
        break;
      case 'iluminado': s.iluminado = dur || 6; break;
      case 'cargado':
        s.carStk = Math.min(3, s.carStk + 1); s.cargado = dur || 5;
        if (s.carStk >= 3 && !(jefe && s.lockAtur > 0)) { s.aturdido = jefe ? 0.5 : 1; if (jefe) s.lockAtur = 6; s.carStk = 0; s.cargado = 0; fuerte = 'aturdido'; }
        break;
      case 'lastrado':
        s.lasStk = Math.min(3, s.lasStk + 1); s.lastrado = dur || 5;
        if (s.lasStk >= 3 && !(jefe && s.lockDerr > 0)) { s.derribado = jefe ? 0.75 : 1.5; if (jefe) s.lockDerr = 6; s.lasStk = 0; s.lastrado = 0; fuerte = 'derribado'; }
        break;
      case 'maldito': s.maldito = dur || 6; break;
      case 'desequilibrado': s.desequilibrado = Math.max(s.desequilibrado, dur || 1.5); s.cancelaAtaque = true; break;
      case 'cegado': s.cegado = Math.max(s.cegado, dur || 2); break;
      case 'aturdido': if (!(jefe && s.lockAtur > 0)) { s.aturdido = Math.max(s.aturdido, (dur || 1) * (jefe ? 0.5 : 1)); if (jefe) s.lockAtur = 6; fuerte = 'aturdido'; } break;
      case 'costra': s.costra = Math.max(s.costra, dur || 1.5); break;
    }
    return fuerte;
  }
  function velMult(s) {
    var m = 1;
    if (s.escarcha > 0) m *= 1 - 0.15 * s.escStk;
    if (s.lastrado > 0) m *= 1 - 0.10 * s.lasStk;
    if (s.zlento > 0) m *= 0.6;
    return Math.max(0.1, m);
  }

  /* Resuelve un golpe de 'elems' (1-2 elementos) con 'dmg' de potencia sobre un enemigo de 'tipo'.
   * opts: { estados: [[nombre,dur]] (pisa los de los elementos: fusiones), reac: false (sin reacción: ticks de zona),
   *         sinEstados: true }
   * Devuelve { base, extra, total, reaccion (id|null), fuertes:[...], mult } y MODIFICA s. */
  function resolverGolpe(s, tipo, elems, dmg, opts) {
    opts = opts || {};
    var mult = multTipo(elems, tipo), base = Math.max(1, rhd(dmg * mult)), extra = 0, reaccion = null, i, j, f, A, B;
    var res = { base: base, extra: 0, total: base, reaccion: null, fuertes: [], mult: mult, congeladoPrevio: s.congelado > 0 };
    if (opts.reac !== false && s.reacCd <= 0) {
      var ids = Object.keys(FUSIONES);
      for (i = 0; i < ids.length && !reaccion; i++) {
        f = FUSIONES[ids[i]];
        for (j = 0; j < 2 && !reaccion; j++) {
          B = f.par[j]; A = f.par[1 - j];
          if (elems.indexOf(B) < 0 || elems.indexOf(A) >= 0) continue;
          if (activo(s, A)) { reaccion = f; res.gatillo = B; res.consumido = A; }
        }
      }
      if (reaccion) {
        var cong = s.congelado > 0 && reaccion.id === 'vapor' && res.gatillo === 'fuego';
        extra = Math.max(1, rhd(base * (cong ? 1.0 : 0.5)));
        consumir(s, res.consumido);
        s.reacCd = 1.5; s.lastReac = reaccion.id;
        res.reaccion = reaccion.id; res.extra = extra; res.total = base + extra; res.cong = cong;
      }
    }
    if (!opts.sinEstados) {
      var lista = opts.estados;
      if (!lista) { lista = []; for (i = 0; i < elems.length; i++) lista.push([ELEMS[elems[i]].estado, 0]); }
      for (i = 0; i < lista.length; i++) { var fu = aplicarEstado(s, tipo, lista[i][0], lista[i][1]); if (fu) res.fuertes.push(fu); }
    }
    return res;
  }

  root.FenixMagia = {
    FORMAS: FORMAS, ELEMS: ELEMS, MODS: MODS, FUSIONES: FUSIONES, TIPOS: TIPOS, PRECOMPUESTOS: PRECOMPUESTOS,
    validar: validar, motivoMod: motivoMod, compilar: compilar, tirada: tirada, hash2: hash2, strHash: strHash, recetaKey: recetaKey,
    fusionDe: fusionDe, esOpuesto: esOpuesto, multTipo: multTipo, nuevoEstados: nuevoEstados, tickEstados: tickEstados, activo: activo,
    aplicarEstado: aplicarEstado, velMult: velMult, resolverGolpe: resolverGolpe, rhd: rhd
  };
})(typeof window !== 'undefined' ? window : globalThis);
