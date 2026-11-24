// Velocidad de la punta de la espada (hand_r + 0.9 m en +Y local) por clip: ventanas de golpe. Uso: node velocidad_mano.js <glb> [regex]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const T = path.resolve(__dirname, '../../.three/package');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage(); await pg.setContent('<body></body>');
  await pg.addScriptTag({ path: T + '/build/three.min.js' }); await pg.addScriptTag({ path: T + '/examples/js/loaders/GLTFLoader.js' });
  const r = await pg.evaluate(async ([b64, re, TH]) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
    const g = await new Promise((ok, no) => new THREE.GLTFLoader().parse(bin, '', ok, no)); const o = g.scene; let hand, pel;
    o.traverse(n => { if (n.isBone && n.name === 'hand_r') hand = n; if (n.isBone && n.name === 'pelvis') pel = n; });
    const mx = new RegExp(re), mixer = new THREE.AnimationMixer(o), out = [], v = new THREE.Vector3(), tip = new THREE.Vector3(0, 0.9, 0);
    for (const clip of g.animations.filter(a => mx.test(a.name))) {
      const act = mixer.clipAction(clip); act.play(); act.paused = true; const n = Math.round(clip.duration * 30), P = [], H = [];
      for (let i = 0; i <= n; i++) { act.time = Math.min(i / 30, clip.duration); mixer.update(0); o.updateMatrixWorld(true); P.push(tip.clone().applyMatrix4(hand.matrixWorld)); pel.getWorldPosition(v); H.push(v.y); }
      const sp = P.map((p, i) => i ? p.distanceTo(P[i - 1]) * 30 : 0), m = Math.max(...sp);
      let wins = [], s = -1; sp.forEach((x, i) => { if (x > m * TH && s < 0) s = i; if ((x <= m * TH || i === sp.length - 1) && s >= 0) { wins.push([+(s / 30).toFixed(2), +(i / 30).toFixed(2), +Math.max(...sp.slice(s, i + 1)).toFixed(1)]); s = -1; } });
      out.push(clip.name + ' dur ' + clip.duration.toFixed(2) + ' vmax ' + m.toFixed(1) + ' golpes[ini,fin,v] ' + JSON.stringify(wins) + ' pelvisY ' + Math.min(...H).toFixed(2) + '-' + Math.max(...H).toFixed(2));
    } return out;
  }, [fs.readFileSync(process.argv[2]).toString('base64'), process.argv[3] || '.', +process.argv[4] || 0.45]);
  console.log(r.join('\n')); await b.close();
})();
