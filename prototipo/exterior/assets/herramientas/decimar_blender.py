# blender -b -P bl_dec.py -- in.glb out.glb tris_solid [flower_tris]
import bpy,sys,re
a=sys.argv[sys.argv.index('--')+1:]; inp,out,tg=a[0],a[1],int(a[2]); fT=int(a[3]) if len(a)>3 else 0
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=inp)
FL=re.compile(r'flowe|plant|leaf|leaves|grass|ivy|vine|moss',re.I)
objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
def mname(o): return o.active_material.name if o.active_material else ''
def tri(o): return sum(len(p.vertices)-2 for p in o.data.polygons)
solid=[o for o in objs if not FL.search(mname(o))]; fl=[o for o in objs if FL.search(mname(o))]
def dec(group,t):
    tot=sum(tri(o) for o in group)
    if tot<=t: return
    for o in group:
        r=min(1.0,t/tot)
        if tri(o)<60: continue
        bpy.context.view_layer.objects.active=o
        m=o.modifiers.new('d','DECIMATE'); m.decimate_type='COLLAPSE'; m.ratio=r; m.use_collapse_triangulate=True
        bpy.ops.object.modifier_apply(modifier=m.name)
dec(solid,tg)
if fl:
    if fT>0: dec(fl,fT)
    else:
        for o in fl: bpy.data.objects.remove(o)
print('TRIS',sum(tri(o) for o in bpy.context.scene.objects if o.type=='MESH'))
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_image_format='AUTO')
