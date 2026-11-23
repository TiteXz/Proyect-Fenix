// Ronda 2: hierba_briznas.glb, hierba_lod.glb y flores_prado.glb (tarjetas cruzadas con atlas alfa).
// Uso: node crear_cartas_ronda2.mjs <dirAtlas2> <dirSalida>
import {Document, NodeIO} from '@gltf-transform/core';
import {textureCompress} from '@gltf-transform/functions';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions'; import sharp from 'sharp'; import fs from 'fs'; import path from 'path';
const [atlasDir, outDir] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
function build(name, atlas, variants, maxpx){
  const doc = new Document(); const buf = doc.createBuffer(); const sc = doc.createScene(name);
  const tex = doc.createTexture(name+'_atlas').setMimeType('image/png').setImage(fs.readFileSync(path.join(atlasDir, atlas)));
  const mat = doc.createMaterial(name).setBaseColorTexture(tex).setAlphaMode('MASK').setAlphaCutoff(0.4).setDoubleSided(false).setRoughnessFactor(0.8).setMetallicFactor(0);
  let tris = 0;
  for (const v of variants){
    const {P,N,U,I} = cross(v); tris += I.length/3; const f=(a,T)=>new T(a.flat());
    const prim = doc.createPrimitive().setMaterial(mat)
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(f(P,Float32Array)).setBuffer(buf))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(f(N,Float32Array)).setBuffer(buf))
      .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(f(U,Float32Array)).setBuffer(buf))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(Uint16Array.from(I)).setBuffer(buf));
    sc.addChild(doc.createNode(v.name).setMesh(doc.createMesh(v.name).addPrimitive(prim)));
  }
  return {doc, tris, maxpx};
}
// (cada tarjeta lleva cara delantera y trasera como geometria separada; material de una sola cara)
// nq quads verticales cruzados, ancho w x alto h, 'seg' segmentos en altura (viento: v del UV = altura), tile (cols x rows), normales mezcladas hacia arriba
function cross(v){
  const P=[],N=[],U=[],I=[]; const {nq,w,h,seg,tile,cols,rows,up}=v;
  const tu=(tile%cols)/cols, tv=Math.floor(tile/cols)/rows, du=1/cols, dv=1/rows;
  for(let q=0;q<nq;q++){
    const a=Math.PI*q/nq+(v.rot||0), cx=Math.cos(a)*w/2, cz=Math.sin(a)*w/2; const b=P.length;
    for(let s=0;s<=seg;s++){ const t=s/seg, y=t*h;
      for(const sx of [-1,1]){ P.push([sx*cx,y,sx*cz]); const nn=[-Math.sin(a),0,Math.cos(a)];
        N.push([nn[0]*(1-up),up,nn[2]*(1-up)]); U.push([tu+(sx<0?0.002:du-0.002), tv+(1-t)*dv*0.996+0.001]); } }
    for(let s=0;s<seg;s++){ const i=b+s*2; I.push(i,i+1,i+3,i,i+3,i+2); }
  }
  // cara trasera real (indices invertidos, mismas normales 'hacia arriba'): con DoubleSide three.js voltea la normal y la cara de atras se ve negra
  const n0=P.length, i0=I.length; for(let i=0;i<n0;i++){P.push(P[i]);N.push(N[i]);U.push(U[i]);} for(let i=0;i<i0;i+=3) I.push(I[i]+n0,I[i+2]+n0,I[i+1]+n0);
  return {P,N,U,I};
}
const H=[0.45,0.38,0.5,0.34,0.55,0.42,0.5,0.45,0.45,0.25,0.6,0.5, 0.16,0.22,0.26,0.22];
const names=['verde_a','verde_b','verde_c','verde_d','espiga_a','espiga_b','mixta_seca_a','mixta_seca_b','seca','cesped_bajo','alta_arqueada','palida','trebol','trebol_flor','hojas_diente_leon','hojas_diente_leon_b'];
const gr=[], lod=[];
H.forEach((h,i)=>{ const w=h*0.8; // lienzo virtual 410x512 px = 0,8:1
  gr.push({name:'briznas_'+i+'_'+names[i],nq:3,w,h,seg:2,tile:i,cols:8,rows:2,up:0.85,rot:i*0.37});
  lod.push({name:'lod_'+i+'_'+names[i],nq:1,w:w*1.15,h,seg:1,tile:i,cols:8,rows:2,up:0.85,rot:0}); });
const kinds=['morada','morada','blanca','blanca','amarilla','amarilla','naranja','naranja','morada','blanca','amarilla','naranja'];
const cnt={}; const fl=kinds.map((k,i)=>{cnt[k]=(cnt[k]||0); return {name:`flor_${k}_${cnt[k]++}`,nq:3,w:0.31,h:0.31,seg:2,tile:i,cols:4,rows:3,up:0.7,rot:i*0.5};});
for(const [n,x] of [['hierba_briznas',build('hierba_briznas','hierba_briznas_atlas.png',gr)],['hierba_lod',build('hierba_lod','hierba_briznas_atlas.png',lod)],['flores_prado',build('flores_prado','flores_prado_atlas.png',fl)]]){
  await x.doc.transform(textureCompress({encoder:sharp,targetFormat:'webp',quality:n==='hierba_lod'?80:86,effort:80,...(n==='hierba_lod'?{resize:[1024,1024]}:{})}));
  const p=path.join(outDir,n+'.glb'); await io.write(p,x.doc); console.log(n,x.tris,'tris',(fs.statSync(p).size/1024).toFixed(0),'KB');
}
