// Genera hierba_mechones.glb y flores_matas.glb (tarjetas cruzadas con atlas alfa) a partir de atlas/*.png
// Uso: node crear_cartas.mjs <dirAtlas> <dirSalida>
import {Document, NodeIO} from '@gltf-transform/core';
import {textureCompress} from '@gltf-transform/functions';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions'; import sharp from 'sharp'; import fs from 'fs'; import path from 'path';
const [atlasDir, outDir] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
function build(name, atlas, variants, mk){
  const doc = new Document(); const buf = doc.createBuffer(); const sc = doc.createScene(name);
  const tex = doc.createTexture(name+'_atlas').setMimeType('image/png').setImage(fs.readFileSync(path.join(atlasDir, atlas)));
  const mat = doc.createMaterial(name).setBaseColorTexture(tex).setAlphaMode('MASK').setAlphaCutoff(0.45).setDoubleSided(true).setRoughnessFactor(0.75).setMetallicFactor(0);
  let tris = 0;
  for (const v of variants){
    const {P,N,U,I} = mk(v); tris += I.length/3;
    const f=(a,T)=>new T(a.flat());
    const prim = doc.createPrimitive().setMaterial(mat)
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(f(P,Float32Array)).setBuffer(buf))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(f(N,Float32Array)).setBuffer(buf))
      .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(f(U,Float32Array)).setBuffer(buf))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(Uint16Array.from(I)).setBuffer(buf));
    const mesh = doc.createMesh(v.name).addPrimitive(prim); sc.addChild(doc.createNode(v.name).setMesh(mesh));
  }
  return {doc, tris};
}
// n quads verticales cruzados (angulos repartidos en 180 deg), w x h m, 'seg' segmentos en altura (para el viento), tile del atlas (cols x rows)
function cross(v){
  const P=[],N=[],U=[],I=[]; const {nq,w,h,seg,tile,cols,rows,up}=v;
  const tu=(tile%cols)/cols, tv=Math.floor(tile/cols)/rows, du=1/cols, dv=1/rows;
  for(let q=0;q<nq;q++){
    const a=Math.PI*q/nq+(v.rot||0), cx=Math.cos(a)*w/2, cz=Math.sin(a)*w/2; const b=P.length;
    for(let s=0;s<=seg;s++){ const t=s/seg, y=t*h;
      for(const sx of [-1,1]){ P.push([sx*cx,y,sx*cz]); const nn=[-Math.sin(a),0,Math.cos(a)];
        const m=up; N.push([nn[0]*(1-m),m+ (1-m)*0.0,nn[2]*(1-m)]);  // normales hacia arriba (mezcla con el suelo)
        U.push([tu+(sx<0?0.003:du-0.003), tv+(1-t)*dv*0.995+0.002]); } }
    for(let s=0;s<seg;s++){ const i=b+s*2; I.push(i,i+1,i+3,i,i+3,i+2); }
  }
  return {P,N,U,I};
}
const out=[];
// Hierba: 8 mechones (tiles 256x512 en atlas 4x2), 3 quads x 2 segmentos = 12 tris; version _lod con 2 quads x 1 seg = 4 tris
const grass=[]; for(let i=0;i<8;i++){ grass.push({name:'mechon_'+i,nq:3,w:0.34,h:0.55,seg:2,tile:i,cols:4,rows:2,up:0.75,rot:i*0.4}); }
for(let i=0;i<8;i++){ grass.push({name:'mechon_lod_'+i,nq:2,w:0.34,h:0.55,seg:1,tile:i,cols:4,rows:2,up:0.75,rot:i*0.4}); }
let g=build('hierba_mechones','hierba_atlas.png',grass,cross);
// Flores: 4 colores x 4 variantes (tiles 256x256, atlas 4x4), 3 quads x 2 seg = 12 tris
const cols=['morada','naranja','blanca','amarilla']; const fl=[];
cols.forEach((c,r)=>{for(let k=0;k<4;k++) fl.push({name:`flor_${c}_${k}`,nq:3,w:0.32,h:0.32,seg:2,tile:r*4+k,cols:4,rows:4,up:0.6,rot:k*0.5});});
let f=build('flores_matas','flores_atlas.png',fl,cross);
for(const [n,x] of [['hierba_mechones',g],['flores_matas',f]]){
  await x.doc.transform(textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:82,effort:60}));
  const p=path.join(outDir,n+'.glb'); await io.write(p,x.doc); console.log(n,x.tris,'tris',(fs.statSync(p).size/1024).toFixed(0),'KB');
}
