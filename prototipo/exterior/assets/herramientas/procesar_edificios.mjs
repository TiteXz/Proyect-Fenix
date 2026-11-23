// Optimiza un GLB de Sketchfab para la maqueta: simplifica (meshoptimizer), escala a metros, origen en el suelo y centrado, texturas WebP.
// Uso: node opt.mjs <in.glb> <out.glb> <tris_objetivo> <altura_m> <tex_max> [calidad]
import {NodeIO} from '@gltf-transform/core'; import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {compactPrimitive,flatten, prune, dedup, weld, simplifyPrimitive, textureCompress, getBounds, unpartition} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer'; import sharp from 'sharp'; import fs from 'fs';
const [inp,out,tris,alt,tex,q]=process.argv.slice(2); await MeshoptSimplifier.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS); const doc=await io.read(inp); const root=doc.getRoot();
await doc.transform(flatten(), dedup());
for(const m of root.listMaterials()){const u=m.getExtension('KHR_materials_unlit'); if(u) u.dispose(); }
await doc.transform(weld());
const FL=/flowe|plant|leaf|leaves|grass|ivy|vine|moss/i;
const prims=(f)=>{const r=[];for(const me of root.listMeshes())for(const p of me.listPrimitives()) if(f(p)) r.push(p);return r;};
const cnt=(ps)=>ps.reduce((t,p)=>t+(p.getIndices()?.getCount()??0)/3,0);
const count=()=>cnt(prims(()=>true));
const t0=count(); const target=+tris;
const flowers=prims(p=>FL.test(p.getMaterial()?.getName()||'')), solid=prims(p=>!FL.test(p.getMaterial()?.getName()||''));
function sloppy(ps,tg){const c=cnt(ps); for(const p of ps){const sh=tg*((p.getIndices().getCount()/3)/c); if(p.getIndices().getCount()<9||sh>=p.getIndices().getCount()/3) continue; const ia=p.getIndices(); const pa=p.getAttribute('POSITION').getArray();
  const [ni]=MeshoptSimplifier.simplifySloppy(Uint32Array.from(ia.getArray()),pa,3,null,Math.max(3,Math.floor(sh))*3,0.5); ia.setArray(pa.length/3>65535?Uint32Array.from(ni):Uint16Array.from(ni)); compactPrimitive(p);} }
function reduce(ps,tg,allowSloppy){ for(let it=0;it<12;it++){ const c=cnt(ps); if(c<=tg*1.05) break; const ratio=Math.max(0.03,Math.min(0.9,tg/c));
  for(const p of ps) simplifyPrimitive(p,{simplifier:MeshoptSimplifier,ratio,error:0.3,lockBorder:false}); if(cnt(ps)>c*0.97) break; }
  if(cnt(ps)>tg*(allowSloppy?1.1:1.35)) sloppy(ps,tg); }
function reduce_old(ps,tg){ for(let it=0;it<12;it++){ const c=cnt(ps); if(c<=tg*1.05) break; const ratio=Math.max(0.03,Math.min(0.9,tg/c));
  for(const p of ps) simplifyPrimitive(p,{simplifier:MeshoptSimplifier,ratio,error:0.3,lockBorder:false}); if(cnt(ps)>c*0.97) break; } }
const fl=cnt(flowers); const fT=fl>0? Math.min(fl, target*0.12):0;
reduce(solid,target-fT,false); if(fl) reduce(flowers,fT,true);
for(const p of prims(()=>true)) if((p.getIndices()?.getCount()??0)===0) p.dispose();
// escala y centrado
const bb=getBounds(root.listScenes()[0]); const s=(+alt)/(bb.max[1]-bb.min[1]); const cx=(bb.min[0]+bb.max[0])/2, cz=(bb.min[2]+bb.max[2])/2;
for(const nd of root.listScenes()[0].listChildren()){const t=nd.getTranslation(),sc=nd.getScale(); nd.setTranslation([(t[0]-cx)*s,(t[1]-bb.min[1])*s,(t[2]-cz)*s]); nd.setScale([sc[0]*s,sc[1]*s,sc[2]*s]);}
await doc.transform(prune(),
  textureCompress({encoder:sharp,targetFormat:'webp',slots:/baseColor|emissive/,resize:[+tex,+tex],quality:+(q||78),effort:60}),
  textureCompress({encoder:sharp,targetFormat:'webp',slots:/normal|metallicRoughness|occlusion|specular/,resize:[+tex/2,+tex/2],quality:+(q||78)-8,effort:60}));
await io.write(out,doc);
const b2=getBounds(root.listScenes()[0]);
console.log(out.split('/').pop(),'tris',t0,'->',Math.round(count()),'KB',Math.round(fs.statSync(out).size/1024),'size',b2.max.map((v,i)=>(v-b2.min[i]).toFixed(2)).join('x'),'min',b2.min.map(v=>v.toFixed(2)).join(','));
