// Prueba del modelo de terreno de la aldea (Node, sin navegador): pendiente del camino, alturas y determinismo.
const T = require('../exterior/src/terreno.js');
const t = T.crear(1337), t2 = T.crear(1337);
let maxG = 0, bad = 0;
for (let i = 1; i < t.M; i += 5) { const j = Math.min(t.M - 1, i + 5), dh = t.height(t.cx[j], t.cz[j]) - t.height(t.cx[i], t.cz[i]), ds = t.cs[j] - t.cs[i]; maxG = Math.max(maxG, Math.abs(dh / ds)); }
let ms = 0; for (let x = -58; x <= 58; x += 1) for (let z = -58; z <= 58; z += 1) ms = Math.max(ms, t.slopeAt(x, z));
const ok = (c, m) => { if (!c) { bad++; console.log('FALLA', m); } };
ok(t.height(10, -20) === t2.height(10, -20), 'determinista');
ok(maxG < 0.15, 'pendiente máxima del camino ' + maxG.toFixed(3));
ok(Math.abs(t.height(0, 58)) < 1.5, 'entrada a nivel del valle');
ok(t.height(0, -50) > 13, 'meseta de la aldea ' + t.height(0, -50).toFixed(2));
ok(t.roadDist(t.cx[100], t.cz[100]) < 0.5, 'distancia al eje');
console.log('pendiente máx camino', (maxG * 100).toFixed(1) + '%', 'pendiente máx terreno', (Math.atan(ms) * 180 / Math.PI).toFixed(0) + '°', 'altura meseta', t.height(0, -50).toFixed(1), 'largo camino', t.sGate.toFixed(0));
process.exit(bad ? 1 : 0);
