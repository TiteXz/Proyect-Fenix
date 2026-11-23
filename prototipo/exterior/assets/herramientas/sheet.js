// node sheet.js <dirGLB> <out.png> [cols] [tile]  -- mosaico de GLB renderizados con three r147 + GLTFLoader clasico
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const [dir, out, cols = 6, tile = 300] = process.argv.slice(2);
const T = '/home/user/Proyect-Fenix/prototipo/.three/package';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.glb')).sort();
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  let p = u === '/' ? null : u.startsWith('/three/') ? path.join(T, u.slice(7)) : path.join(dir, u);
  if (!p) { r.setHeader('content-type', 'text/html'); return r.end(`<body style="margin:0;background:#222"><canvas id=c></canvas><script src="/three/build/three.min.js"></script><script src="/three/examples/js/loaders/GLTFLoader.js"></script><script src="/three/examples/js/loaders/RGBELoader.js"></script><script>window.FILES=${JSON.stringify(files)};</script></body>`); }
  fs.readFile(p, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.end(d); });
}).listen(0, async () => {
  const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const rows = Math.ceil(files.length / cols), W = cols * tile, H = rows * tile;
  const pg = await b.newPage({ viewport: { width: W, height: H } });
  const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); }); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(`http://localhost:${port}/`);
  const info = await pg.evaluate(async ([W, H, cols, tile]) => {
    const c = document.getElementById('c'); const R = new THREE.WebGLRenderer({ canvas: c, antialias: true, preserveDrawingBuffer: true }); R.setSize(W, H); R.setPixelRatio(1);
    R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.setScissorTest(true);
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0x9fb4c8);
    sc.add(new THREE.HemisphereLight(0xbfd8ff, 0x6b5a3a, 1.1)); const d = new THREE.DirectionalLight(0xffe0b0, 2.6); d.position.set(-3, 4, 5); sc.add(d);
    const L = new THREE.GLTFLoader(); const res = [];
    for (let i = 0; i < FILES.length; i++) {
      const g = await new Promise((ok, no) => L.load('/' + FILES[i], ok, undefined, no)).catch(e => null);
      const x = (i % cols) * tile, y = H - (Math.floor(i / cols) + 1) * tile;
      R.setViewport(x, y, tile, tile); R.setScissor(x, y, tile, tile);
      if (!g) { res.push(FILES[i] + ' FAIL'); R.setClearColor(0x880000); R.clear(); continue; }
      const o = g.scene; sc.add(o); const bb = new THREE.Box3().setFromObject(o); const cn = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
      const r = Math.max(sz.x, sz.y, sz.z) * 0.62 + 1e-3; const cam = new THREE.PerspectiveCamera(30, 1, r * 0.1, r * 20);
      cam.position.set(cn.x + r * 1.5, cn.y + r * 0.35, cn.z + r * 3.0); cam.lookAt(cn);
      let tr = 0; o.traverse(m => { if (m.isMesh) tr += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
      R.render(sc, cam); sc.remove(o); res.push(FILES[i] + ' ' + tr + ' ' + sz.toArray().map(v => v.toFixed(2)).join('x'));
    }
    return res;
  }, [W, H, +cols, +tile]);
  // etiquetas con sharp? se pinta en DOM
  await pg.evaluate(([cols, tile]) => { FILES.forEach((f, i) => { const d = document.createElement('div'); d.textContent = f; d.style.cssText = `position:absolute;left:${(i % cols) * tile + 4}px;top:${Math.floor(i / cols) * tile + 2}px;font:11px monospace;color:#fff;background:#0008;padding:1px 3px`; document.body.appendChild(d); }); }, [+cols, +tile]);
  await pg.screenshot({ path: out });
  console.log(info.join('\n')); console.log('errors', [...new Set(errs)]);
  await b.close(); srv.close();
});
