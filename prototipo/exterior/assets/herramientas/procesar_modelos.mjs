// Reduce y empaqueta modelos Poly Haven (CC0) a GLB sin compresion de malla, texturas WebP.
// Uso: node procesar_modelos.mjs <dir_cache> <dir_salida> [slug_salida ...]   (config abajo)
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {flatten, prune, dedup, simplifyPrimitive, compactPrimitive, weld, textureCompress, getBounds} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs'; import path from 'path';

const [cache, outDir, ...only] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

// Reduce una primitiva de "tarjetas" (hojas) quedandose con una fraccion de componentes conexas, agrandandolas.
function cullCards(prim, keepFrac, maxScale, seed){
  const pos = prim.getAttribute('POSITION'); const idxA = prim.getIndices();
  const n = pos.getCount(); const idx = idxA ? idxA.getArray() : Uint32Array.from({length:n},(_, i)=>i);
  const parent = new Int32Array(n).map((_, i)=>i);
  const find = x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
  for(let i=0;i<idx.length;i+=3){const a=find(idx[i]),b=find(idx[i+1]),c=find(idx[i+2]);parent[b]=a;parent[find(c)]=a;}
  const comp = new Map(); // root -> triangulos
  for(let i=0;i<idx.length;i+=3){const r=find(idx[i]);let l=comp.get(r);if(!l)comp.set(r,l=[]);l.push(i);}
  const roots=[...comp.keys()]; const R=rng(seed);
  const keepN = Math.max(1, Math.round(roots.length*keepFrac));
  for(let i=roots.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[roots[i],roots[j]]=[roots[j],roots[i]];}
  const sel=roots.slice(0,keepN); const s=Math.min(maxScale, 1/Math.sqrt(keepFrac));
  const attrs=prim.listSemantics(); const src={}; for(const a of attrs) src[a]=prim.getAttribute(a);
  const verts=[]; const map=new Map(); const outIdx=[];
  const centroid=new Map();
  for(const r of sel){
    let cx=0,cy=0,cz=0,cn=0; const seen=new Set();
    for(const t of comp.get(r)) for(let k=0;k<3;k++){const v=idx[t+k]; if(!seen.has(v)){seen.add(v);cx+=pos.getElement(v,[])[0];}}
    // centroide real
    const tmp=[0,0,0]; cx=cy=cz=0; for(const v of seen){pos.getElement(v,tmp);cx+=tmp[0];cy+=tmp[1];cz+=tmp[2];cn++;}
    centroid.set(r,[cx/cn,cy/cn,cz/cn]);
  }
  const out={}; for(const a of attrs) out[a]=[];
  const tmp=[0,0,0,0];
  for(const r of sel){
    const c=centroid.get(r);
    for(const t of comp.get(r)) for(let k=0;k<3;k++){
      const v=idx[t+k]; const key=r*4294967296*0+v; let nv=map.get(v);
      if(nv===undefined){
        nv=verts.length; verts.push(v); map.set(v,nv);
        for(const a of attrs){const el=src[a].getElement(v,[]); 
          if(a==='POSITION'){for(let q=0;q<3;q++)el[q]=c[q]+(el[q]-c[q])*s;}
          out[a].push(el);}
      }
      outIdx.push(nv);
    }
  }
  const doc=prim.getGraph?null:null;
  for(const a of attrs){const acc=src[a]; const Arr=acc.getArray().constructor; const sz=acc.getElementSize();
    const arr=new Arr(out[a].length*sz); out[a].forEach((e,i)=>{for(let q=0;q<sz;q++)arr[i*sz+q]=e[q];});
    acc.setArray(arr);}
  const ia = idxA || null;
  if(ia){ia.setArray(n>65535||verts.length>65535?Uint32Array.from(outIdx):Uint16Array.from(outIdx));}
  return {components: roots.length, kept: keepN, scale: s};
}


// Copa de arbol: sustituye las hojas fotogrametricas (cientos de miles de tris) por tarjetas con ramillos del atlas,
// colocadas en una muestra de las posiciones reales de las hojas originales (conserva la forma de la copa).
function buildCrown(prim, r, seed, doc, atlasPath){
  const pos=prim.getAttribute('POSITION'); const idxA=prim.getIndices(); const n=pos.getCount();
  const idx=idxA.getArray(); const parent=new Int32Array(n).map((_,i)=>i);
  const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
  for(let i=0;i<idx.length;i+=3){const a=find(idx[i]),b=find(idx[i+1]),c=find(idx[i+2]);parent[b]=a;parent[find(c)]=a;}
  const acc=new Map(); const tmp=[0,0,0];
  for(let v=0;v<n;v++){const k=find(v);pos.getElement(v,tmp);let e=acc.get(k);if(!e)acc.set(k,e=[0,0,0,0]);e[0]+=tmp[0];e[1]+=tmp[1];e[2]+=tmp[2];e[3]++;}
  const pts=[...acc.values()].filter(e=>e[3]>2).map(e=>[e[0]/e[3],e[1]/e[3],e[2]/e[3]]);
  const R=rng(seed); for(let i=pts.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[pts[i],pts[j]]=[pts[j],pts[i]];}
  const sel=pts.slice(0,r.K);
  let cx=0,cz=0,ymin=1e9,ymax=-1e9; for(const p of pts){cx+=p[0];cz+=p[2];ymin=Math.min(ymin,p[1]);ymax=Math.max(ymax,p[1]);}
  cx/=pts.length;cz/=pts.length; const cy=ymin+(ymax-ymin)*0.5;
  const P=[],N=[],U=[],I=[];
  const norm=v=>{const l=Math.hypot(v[0],v[1],v[2])||1;return[v[0]/l,v[1]/l,v[2]/l];};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  for(const c of sel){
    const out=norm([c[0]-cx,(c[1]-cy)*0.6,c[2]-cz]);
    const nn=norm([out[0]*0.5+(R()-.5)*1.2,out[1]*0.5+(R()-.5)*1.2+0.25,out[2]*0.5+(R()-.5)*1.2]);
    let up=[(R()-.5)*0.8,1,(R()-.5)*0.8]; const d=up[0]*nn[0]+up[1]*nn[1]+up[2]*nn[2]; up=norm([up[0]-nn[0]*d,up[1]-nn[1]*d,up[2]-nn[2]*d]);
    const rt=norm(cross(up,nn)); const h=r.size*(0.75+R()*0.5)/2;
    const tile=Math.floor(R()*16), tu=(tile%4)/4, tv=Math.floor(tile/4)/4;  // glTF: v=0 arriba
    const base=P.length;
    for(const [sx,sy,u,v] of [[-1,-1,0,0],[1,-1,1,0],[1,1,1,1],[-1,1,0,1]]){
      P.push([c[0]+rt[0]*h*sx+up[0]*h*sy,c[1]+rt[1]*h*sx+up[1]*h*sy,c[2]+rt[2]*h*sx+up[2]*h*sy]);
      const sn=norm([c[0]-cx,(c[1]-cy)*0.7+0.4*(c[1]-cy>0?1:0),c[2]-cz]); // normal esferica de copa (sombreado suave)
      N.push(norm([sn[0]*0.7+nn[0]*0.3,sn[1]*0.7+nn[1]*0.3,sn[2]*0.7+nn[2]*0.3]));
      U.push([tu+u*0.25*0.98+0.0025,tv+(1-v)*0.25*0.98+0.0025]);
    }
    I.push(base,base+1,base+2,base,base+2,base+3);
  }
  const f=(arr,sz,T)=>{const a=new T(arr.length*sz);arr.forEach((e,i)=>{for(let q=0;q<sz;q++)a[i*sz+q]=e[q];});return a;};
  for(const sem of prim.listSemantics()) if(!['POSITION','NORMAL','TEXCOORD_0'].includes(sem)) prim.setAttribute(sem,null);
  prim.getAttribute('POSITION').setArray(f(P,3,Float32Array));
  prim.getAttribute('NORMAL').setArray(f(N,3,Float32Array));
  prim.getAttribute('TEXCOORD_0').setArray(f(U,2,Float32Array));
  idxA.setArray(Uint32Array.from(I));
  // material: atlas de ramillos
  const mat=prim.getMaterial(); const tex=doc.createTexture('ramillos').setMimeType('image/png').setImage(fs.readFileSync(atlasPath));
  mat.setBaseColorTexture(tex).setNormalTexture(null).setMetallicRoughnessTexture(null).setRoughnessFactor(0.7).setMetallicFactor(0).setDoubleSided(true).setBaseColorFactor([1,1,1,1]);
  return sel.length;
}

const triCount = p=> (p.getIndices()?p.getIndices().getCount():p.getAttribute('POSITION').getCount())/3;

// config: salida -> {src, mats: {regex: {mode:'cards'|'simplify', tris}}, tex: maxpx, q}
const CFG = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname),'modelos.json'),'utf8'));

for (const [name, c] of Object.entries(CFG)) {
  if (only.length && !only.includes(name)) continue;
  const doc = await io.read(path.join(cache, c.src, c.src + '_1k.gltf'));
  await doc.transform(flatten());
  if (!c.sinWeld) await doc.transform(weld());
  const root = doc.getRoot();
  // total de tris por regla para repartir el presupuesto proporcionalmente
  const prims = root.listMeshes().flatMap(m=>m.listPrimitives());
  const rule = p=>{const mn=p.getMaterial()?.getName()||''; for(const [re,r] of Object.entries(c.mats)) if(new RegExp(re).test(mn)) return r; return c.mats['.*']||null;};
  // modelos con varias mallas (variantes): el presupuesto 'tris' es por regla y por variante (se divide por nº de prims de esa regla)
  const groups = new Map(); for(const p of prims){const r=rule(p); if(!r) continue; (groups.get(r)||groups.set(r,[]).get(r)).push(p);}
  for(const [r, ps] of groups){
    const total = ps.reduce((a,p)=>a+triCount(p),0);
    for(const p of ps){
      const target = r.tris * (r.perPrim ? 1 : triCount(p)/total);
      if(r.mode==='crown'){ buildCrown(p, r, 99, doc, r.atlas); }
      else if(r.mode==='cards'){
        const keep=Math.min(1, target/triCount(p));
        if(keep<1) cullCards(p, keep, r.maxScale||3, 1234);
      } else {
        const ratio=Math.min(1, target/triCount(p));
        if(ratio<1){ simplifyPrimitive(p,{simplifier:MeshoptSimplifier, ratio, error: r.error||0.05, lockBorder:false});
          if(triCount(p) > target*1.5){ // la malla no colapsa por topologia (islas): reduccion "sloppy" que ignora la conectividad
            const ia=p.getIndices(); const pa=p.getAttribute('POSITION').getArray();
            const [ni]=MeshoptSimplifier.simplifySloppy(Uint32Array.from(ia.getArray()), pa, 3, null, Math.floor(target)*3, 0.5);
            ia.setArray(pa.length/3>65535?Uint32Array.from(ni):Uint16Array.from(ni)); compactPrimitive(p); } }
      }
    }
  }
  for (const p of prims) { try{compactPrimitive(p);}catch(e){} }
  if (c.altura) { const bb0=getBounds(root.listScenes()[0]); const k=c.altura/(bb0.max[1]-bb0.min[1]);
    for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { const a=p.getAttribute('POSITION'); const arr=a.getArray(); for(let i=0;i<arr.length;i++)arr[i]*=k; a.setArray(arr); }
    for (const nd of root.listNodes()) { const t=nd.getTranslation(); nd.setTranslation([t[0]*k,t[1]*k,t[2]*k]); } }
  if (c.centrar) { root.listNodes().forEach((nd,i)=>{ const bb=getBounds(nd); const t=nd.getTranslation(); nd.setTranslation([t[0]-(bb.min[0]+bb.max[0])/2, t[1]-bb.min[1], t[2]-(bb.min[2]+bb.max[2])/2]); nd.setName(name+'_v'+i); }); }
  else { const bb=getBounds(root.listScenes()[0]); for (const nd of root.listNodes()) { const t=nd.getTranslation(); nd.setTranslation([t[0]-(bb.min[0]+bb.max[0])/2, t[1]-bb.min[1], t[2]-(bb.min[2]+bb.max[2])/2]); } }
  // alfa: BLEND -> MASK (sin ordenar, sin halos)
  for (const m of root.listMaterials()) { if (m.getAlphaMode()==='BLEND' && !/glass/.test(m.getName())) { m.setAlphaMode('MASK'); m.setAlphaCutoff(c.cutoff||0.5);} }
  await doc.transform(prune(), dedup());
  await doc.transform(textureCompress({encoder: sharp, targetFormat:'webp', resize:[c.tex,c.tex], quality: c.q||80, effort: 60}));
  const outp = path.join(outDir, name + '.glb');
  await io.write(outp, doc);
  let tris=0; for(const m of root.listMeshes()) for(const p of m.listPrimitives()) tris+=triCount(p);
  // tamano de bbox
  const bb=getBounds(doc.getRoot().listScenes()[0]);
  console.log(name.padEnd(22), String(tris).padStart(7),'tris', (fs.statSync(outp).size/1024).toFixed(0).padStart(6),'KB', 'bbox', bb.min.map(v=>v.toFixed(2)).join(','),'->',bb.max.map(v=>v.toFixed(2)).join(','));
}
