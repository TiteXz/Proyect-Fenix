// node sheet_ronda2.js <dirAssets> <out.png>  -- hoja de contacto de la ronda 2 (parche 4x4 m de hierba+flores, rocas y cielo) con three r147
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const [dir, out] = process.argv.slice(2); const T = '/home/user/Proyect-Fenix/prototipo/.three/package';
const html = `<body style="margin:0;background:#111"><canvas id=c></canvas>
<script src="/three/build/three.min.js"></script><script src="/three/examples/js/loaders/GLTFLoader.js"></script><script src="/three/examples/js/loaders/RGBELoader.js"></script><script>
(async()=>{
const PW=960,PH=540,COLS=2,ROWS=3; const c=document.getElementById('c'); const R=new THREE.WebGLRenderer({canvas:c,antialias:true,preserveDrawingBuffer:true}); R.setSize(PW*COLS,PH*ROWS); R.setPixelRatio(1);
R.outputEncoding=THREE.sRGBEncoding; R.toneMapping=THREE.ACESFilmicToneMapping; R.toneMappingExposure=0.85; R.shadowMap.enabled=true; R.shadowMap.type=THREE.PCFSoftShadowMap; R.setScissorTest(true);
const sc=new THREE.Scene(); const L=new THREE.GLTFLoader(); const gl=u=>new Promise((o,n)=>L.load(u,o,undefined,n));
const tl=new THREE.TextureLoader(); const lt=u=>new Promise(o=>tl.load(u,o));
const pm=new THREE.PMREMGenerator(R); const hdr=await new Promise(o=>new THREE.RGBELoader().load('/a/cielo_kloofendal_1k.hdr',o)); sc.environment=pm.fromEquirectangular(hdr).texture; sc.environmentIntensity=0.6;
const sky=await lt('/a/cielo_4k.webp'); sky.mapping=THREE.EquirectangularReflectionMapping; sky.encoding=THREE.sRGBEncoding; sc.background=sky;
const sunEl=28*Math.PI/180, sunAz=215*Math.PI/180; const sun=new THREE.DirectionalLight(0xffd9a8,1.25); sun.position.set(Math.sin(sunAz)*Math.cos(sunEl),Math.sin(sunEl),Math.cos(sunAz)*Math.cos(sunEl)).multiplyScalar(30); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); const sh=sun.shadow.camera; sh.left=-8;sh.right=8;sh.top=8;sh.bottom=-8;sh.far=80; sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.04; sc.add(sun);
sc.add(new THREE.HemisphereLight(0x9fc4ff,0x6b5a3a,0.3)); sc.fog=new THREE.FogExp2(0xbcd0e6,0.0025);
// suelo
const gd=await lt('/a/hierba_Diffuse.webp'), gn=await lt('/a/hierba_nor_gl.webp'); for(const t of [gd,gn]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(200,200);t.anisotropy=8;} gd.encoding=THREE.sRGBEncoding;
const ground=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({map:gd,normalMap:gn,roughness:0.95,color:0x5c6a3c})); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; sc.add(ground);
// hierba y flores
let seed=7; const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const gG=await gl('/a/hierba_briznas.glb'), gF=await gl('/a/flores_prado.glb'); const info={tris:0,inst:0};
function variants(g){const o=[];g.scene.traverse(m=>{if(m.isMesh)o.push(m);});return o;}
const gv=variants(gG), fv=variants(gF); const col=new THREE.Color(), M=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler(), p=new THREE.Vector3(), s=new THREE.Vector3();
const S=4; // parche de 4x4 m
function scatter(vs,weights,count,fn){const buckets=vs.map(()=>[]);const tot=weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<count;i++){let r=rnd()*tot,k=0;while(r>weights[k]){r-=weights[k];k++;}const pos=fn(i);buckets[k].push(pos);}
  vs.forEach((v,k)=>{const b=buckets[k];if(!b.length)return;const im=new THREE.InstancedMesh(v.geometry,v.material,b.length);
    b.forEach((o,i)=>{e.set(0,rnd()*6.283,0);q.setFromEuler(e);const sc_=o.s;s.set(sc_*(0.9+0.2*rnd()),sc_,sc_*(0.9+0.2*rnd()));p.set(o.x,0,o.z);M.compose(p,q,s);im.setMatrixAt(i,M);
      const t=o.t; col.setRGB(o.cr*(0.92+0.16*rnd()),o.cg*(0.92+0.16*rnd()),o.cb*(0.92+0.16*rnd()));im.setColorAt(i,col);});
    im.receiveShadow=true; im.castShadow=false; sc.add(im); info.inst+=b.length; info.tris+=b.length*(v.geometry.index.count/3);});}
const tint=(x,z)=>{const n=0.5+0.5*Math.sin(x*0.9+Math.sin(z*0.7)*1.5)*Math.cos(z*0.6);return {cr:0.95+0.1*n,cg:1.0,cb:0.92-0.1*n};};
// hierba: 36/m2 (16 m2 -> 576) mas relleno fuera del parche para no ver el borde
const area=14; 
scatter(gv,[3,3,3,3,1.2,1,0.7,0.5,0.25,2,0.8,0.5,0.6,0.4,0.4,0.3],36*area*area/1.0*0.5,i=>({x:(rnd()-.5)*area,z:(rnd()-.5)*area,s:0.85+0.45*rnd(),...tint(0,0)}));
// flores en grupos: 14 grupos de 3-5 matas dentro del parche, mas dispersas fuera
const cl=[];for(let g=0;g<26;g++){const cx=(rnd()-.5)*area*0.8,cz=(rnd()-.5)*area*0.8;const k=Math.floor(rnd()*4);for(let j=0;j<3+Math.floor(rnd()*3);j++)cl.push({x:cx+(rnd()-.5)*0.7,z:cz+(rnd()-.5)*0.7,s:0.8+0.4*rnd(),k});}
// k: morada(0,1,8) blanca(2,3,9) amarilla(4,5,10) naranja(6,7,11)
const fw=fv.map((_,i)=>0);const byK=[[0,1,8],[2,3,9],[4,5,10],[6,7,11]];
const buckets=fv.map(()=>[]);for(const f of cl){const arr=byK[f.k];const idx=arr[Math.floor(rnd()*arr.length)];buckets[idx].push({...f,cr:0.95+0.1*rnd(),cg:0.95+0.1*rnd(),cb:0.95+0.1*rnd()});}
fv.forEach((v,k)=>{const b=buckets[k];if(!b.length)return;const im=new THREE.InstancedMesh(v.geometry,v.material,b.length);b.forEach((o,i)=>{e.set(0,rnd()*6.283,0);q.setFromEuler(e);s.setScalar(o.s);p.set(o.x,0,o.z);M.compose(p,q,s);im.setMatrixAt(i,M);col.setRGB(o.cr,o.cg,o.cb);im.setColorAt(i,col);});im.receiveShadow=true;sc.add(im);info.inst+=b.length;info.tris+=b.length*(v.geometry.index.count/3);});
// rocas
const rocks=[];for(let i=1;i<=4;i++){const g=await gl('/a/acantilado_0'+i+'.glb');const o=g.scene;o.traverse(m=>{if(m.isMesh){m.castShadow=m.receiveShadow=true;}});o.position.set(40+(i-1)*7,0,-10);sc.add(o);rocks.push(o);}
const ground2=ground.clone();
function view(ix,pos,look,fov){const x=(ix%COLS)*PW,y=(ROWS-1-Math.floor(ix/COLS))*PH;R.setViewport(x,y,PW,PH);R.setScissor(x,y,PW,PH);const cam=new THREE.PerspectiveCamera(fov,PW/PH,0.05,500);cam.position.set(...pos);cam.lookAt(...look);R.render(sc,cam);}
view(0,[-3.2,1.6,3.5],[0,0.1,-0.5],38);       // altura de jinete
view(1,[-1.4,0.55,1.6],[0,0.15,0],40);       // plano medio
view(2,[-2.2,0.5,2.0],[0.4,0.15,0.0],32);     // cerca, rasante, contraluz
view(3,[0.9,0.35,0.9],[0,0.12,0],30);         // detalle flores/hierba
view(4,[43,2.2,2.5],[43,1.6,-10],50);         // rocas
// cielo: mira al sol y a las nubes
view(5,[0,1.7,0],[Math.sin(sunAz)*5,1.7+3.2,Math.cos(sunAz)*5],70);
window.INFO=info; document.title='done';
})();
</script></body>`;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') { r.setHeader('content-type', 'text/html'); return r.end(html); }
  const p = u.startsWith('/three/') ? path.join(T, u.slice(7)) : u.startsWith('/a/') ? path.join(dir, u.slice(3)) : null;
  if (!p) { r.statusCode = 404; return r.end(); } fs.readFile(p, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1920, height: 1620 } }); const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); }); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(`http://localhost:${srv.address().port}/`); await pg.waitForFunction(() => document.title === 'done', null, { timeout: 280000 });
  console.log(await pg.evaluate(() => JSON.stringify(window.INFO))); await pg.screenshot({ path: out }); console.log('errors', [...new Set(errs)]); await b.close(); srv.close(); });
