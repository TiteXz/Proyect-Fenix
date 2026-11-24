// Hoja de contacto de un GLB de animaciones: una fila por clip, N poses por fila (tiempos equiespaciados), con espada
// dibujada en hand_r (eje +Y del hueso), suelo con cuadricula de 1 m y la huella de la pelvis (rastro en el suelo).
// Uso: NODE_PATH=$(npm root -g) node hoja_contacto.js <glb> <salida.png> [regex_clips] [poses=7] [tile=200] [vista=3q|lado|frente|arriba]
// Sin comprimir malla; usa three r147 de prototipo/.three (mismo que el visor). Solo para revisar movimiento (no es un entregable de juego).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [glb, out, re = '.', nP = '7', tile = '200', vista = '3q'] = process.argv.slice(2);
const T = path.resolve(__dirname, '../../.three/package');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1000, height: 600 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await pg.setContent('<body style="margin:0"><canvas id=c></canvas></body>');
  await pg.addScriptTag({ path: T + '/build/three.min.js' });
  await pg.addScriptTag({ path: T + '/examples/js/loaders/GLTFLoader.js' });
  const b64 = fs.readFileSync(glb).toString('base64');
  const res = await pg.evaluate(async ([b64, re, nP, tile, vista]) => {
    nP = +nP; tile = +tile;
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
    const g = await new Promise((ok, no) => new THREE.GLTFLoader().parse(bin, '', ok, no));
    const rx = new RegExp(re), clips = g.animations.filter(a => rx.test(a.name)).sort((a, b) => a.name.localeCompare(b.name));
    const W = tile * nP, H = tile * clips.length;
    const cv = document.getElementById('c'); cv.width = W; cv.height = H;
    const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); R.setSize(W, H, false); R.setPixelRatio(1);
    R.setScissorTest(true);
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0xb5c4d2);
    sc.add(new THREE.HemisphereLight(0xdfeaff, 0x6b5a3a, 1.2)); const d = new THREE.DirectionalLight(0xffe8c0, 2.4); d.position.set(-3, 5, 4); sc.add(d);
    const grid = new THREE.GridHelper(60, 60, 0x445566, 0x8899aa); sc.add(grid);
    const o = g.scene; sc.add(o);
    o.traverse(m => { if (m.isSkinnedMesh) m.frustumCulled = false; });
    let hand = null, pel = null; o.traverse(n => { if (n.isBone && /^hand_r$/i.test(n.name)) hand = n; if (n.isBone && /^pelvis$/i.test(n.name)) pel = n; });
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.9, 0.012), new THREE.MeshStandardMaterial({ color: 0xe8eef5, metalness: .8, roughness: .25 }));
    bl.position.y = 0.55; const sw = new THREE.Group(); sw.add(bl);
    const gd = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.03), new THREE.MeshStandardMaterial({ color: 0xc8a050 })); gd.position.y = 0.1; sw.add(gd);
    hand.add(sw);
    const mixer = new THREE.AnimationMixer(o), v = new THREE.Vector3();
    const lab = document.createElement('canvas'); lab.width = W; lab.height = H;
    const info = [];
    clips.forEach((clip, ci) => {
      const act = mixer.clipAction(clip); act.play(); act.paused = true;
      // trayectoria de la pelvis para centrar y para la huella
      const pts = []; for (let k = 0; k < nP; k++) { act.time = clip.duration * k / (nP - 1) * 0.999; mixer.update(0); o.updateMatrixWorld(true); pel.getWorldPosition(v); pts.push(v.clone()); }
      const dx = pts[nP - 1].x - pts[0].x, dz = pts[nP - 1].z - pts[0].z;
      info.push({ clip: clip.name, dur: +clip.duration.toFixed(2), desp: +Math.hypot(dx, dz).toFixed(2) });
      const span = Math.max(1.0, ...pts.map(p => Math.hypot(p.x - pts[0].x, p.z - pts[0].z)));
      // marcas en el suelo: posicion inicial (cuadro) y huella de pelvis
      const trail = new THREE.Group(); sc.add(trail);
      pts.forEach((p, k) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), new THREE.MeshBasicMaterial({ color: k === 0 ? 0x00aa00 : k === nP - 1 ? 0xaa0000 : 0x333333 })); m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.01, p.z); trail.add(m); });
      for (let k = 0; k < nP; k++) {
        act.time = clip.duration * k / (nP - 1) * 0.999; mixer.update(0); o.updateMatrixWorld(true); pel.getWorldPosition(v);
        const cx = v.x, cz = v.z, F = 2.3;
        const cam = new THREE.OrthographicCamera(-F / 2, F / 2, F / 2, -F / 2, 0.1, 100);
        const dir = vista === 'lado' ? [1, 0.25, 0] : vista === 'frente' ? [0, 0.25, 1] : vista === 'arriba' ? [0.001, 1, 0.001] : [0.8, 0.35, 0.8];
        const tg = vista === 'arriba' ? new THREE.Vector3(pts[0].x + (pts[nP - 1].x - pts[0].x) / 2, 0, pts[0].z + (pts[nP - 1].z - pts[0].z) / 2) : new THREE.Vector3(cx, 0.9, cz);
        if (vista === 'arriba') { const s2 = Math.max(F, span * 2 + 1.5); cam.left = -s2 / 2; cam.right = s2 / 2; cam.top = s2 / 2; cam.bottom = -s2 / 2; cam.updateProjectionMatrix(); cam.up.set(0, 0, -1); }
        cam.position.set(tg.x + dir[0] * 20, tg.y + dir[1] * 20, tg.z + dir[2] * 20); cam.lookAt(tg);
        const x = k * tile, y = H - (ci + 1) * tile; R.setViewport(x, y, tile, tile); R.setScissor(x, y, tile, tile); R.render(sc, cam);
      }
      sc.remove(trail); act.stop();
    });
    // etiquetas: se devuelven los datos; el texto se compone aparte en 2D
    return { info, W, H, png: cv.toDataURL('image/png') };
  }, [b64, re, nP, tile, vista]);
  if (errs.length) console.log('ERRORES', errs.slice(0, 5));
  // etiquetas con una pagina 2D
  const pg2 = await b.newPage();
  const lab = await pg2.evaluate(async ([png, info, W, H, tile]) => {
    const im = new Image(); await new Promise(r => { im.onload = r; im.src = png; });
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    x.font = 'bold 13px sans-serif'; info.forEach((r, i) => { const t = `${r.clip}  ${r.dur}s  desp ${r.desp}m`; x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(2, i * tile + 2, x.measureText(t).width + 8, 18); x.fillStyle = '#fff'; x.fillText(t, 6, i * tile + 15); });
    return c.toDataURL('image/png');
  }, [res.png, res.info, res.W, res.H, +tile]);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(lab.split(',')[1], 'base64'));
  console.log(JSON.stringify(res.info));
  await b.close();
})();
