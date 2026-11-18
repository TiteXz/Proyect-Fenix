"""Genera el Caballero del Fénix: humano MakeHuman (CC0) + esqueleto game_engine + armadura ajustada.

Uso:
  blender -b -P juego/tools/blender/caballero.py -- <salida.glb> <dir_texturas_polyhaven> [preview.png]

- Cuerpo, piel y ropa interior: MakeHuman system assets (CC0) vía MPFB.
- Armadura: "conchas" derivadas de la malla del cuerpo (siguen su forma y sus pesos de esqueleto),
  con textura metal_plate de Poly Haven (CC0). Yelmo, faldón y capa hechos a medida.
- Deterministas: mismos parámetros → mismo resultado.
"""
import math
import os
import sys

import addon_utils
import bmesh
import bpy
from mathutils import Vector

addon_utils.enable("bl_ext.user_default.mpfb", default_set=True)

from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.locationservice import LocationService

ARGS = sys.argv[sys.argv.index("--") + 1:]
OUT_GLB = os.path.abspath(ARGS[0])
TEX = os.path.abspath(ARGS[1])
PREVIEW = os.path.abspath(ARGS[2]) if len(ARGS) > 2 and ARGS[2] != "-" else None
ANIMS = os.path.abspath(ARGS[3]) if len(ARGS) > 3 else None   # UAL1_Standard.glb de Quaternius (CC0)
U = LocationService.get_user_data()

# ---------------------------------------------------------------- escena limpia
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

# ---------------------------------------------------------------- humano
MACRO = {
    "gender": 1.0, "age": 0.5, "muscle": 0.75, "weight": 0.55, "proportions": 0.8,
    "height": 0.62, "cupsize": 0.5, "firmness": 0.5,
    "race": {"asian": 0.1, "caucasian": 0.8, "african": 0.1},
}
basemesh = HumanService.create_human(macro_detail_dict=MACRO)
rig = HumanService.add_builtin_rig(basemesh, "game_engine", import_weights=True)
HumanService.set_character_skin(os.path.join(U, "skins/young_caucasian_male/young_caucasian_male.mhmat"),
                                basemesh, skin_type="GAMEENGINE")
suit = HumanService.add_mhclo_asset(os.path.join(U, "clothes/male_worksuit01/male_worksuit01.mhclo"),
                                    basemesh, asset_type="Clothes", subdiv_levels=0, material_type="GAMEENGINE")
rig.name = "Caballero"
BONES = {b.name for b in rig.data.bones}


def bake(obj, name, full=False):
    """Copia evaluada (helpers ocultos y formas aplicadas) con los mismos grupos de vértices.
    full=True ignora las máscaras que MPFB pone bajo la ropa (cuerpo completo, para derivar la armadura)."""
    for m in obj.modifiers:
        if m.type in ("ARMATURE", "SUBSURF"):
            m.show_viewport = False
        if m.type == "MASK" and m.name != "Hide helpers":
            m.show_viewport = not full
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    new = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(new)
    new.matrix_world = obj.matrix_world.copy()
    for vg in obj.vertex_groups:
        new.vertex_groups.new(name=vg.name)
    return new


def bind(obj):
    obj.parent = rig
    obj.matrix_parent_inverse = rig.matrix_world.inverted()
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = rig
    # solo grupos de huesos: el resto (helpers de MakeHuman) no hace falta en el juego
    for vg in list(obj.vertex_groups):
        if vg.name not in BONES:
            obj.vertex_groups.remove(vg)


body_full = bake(basemesh, "cuerpo_completo", full=True)
body = bake(basemesh, "cuerpo")
under = bake(suit, "gambeson")
bpy.data.objects.remove(suit, do_unlink=True)
for o in list(bpy.data.objects):
    if o.type == "MESH" and o not in (body, under, body_full):
        bpy.data.objects.remove(o, do_unlink=True)

# ---------------------------------------------------------------- materiales PBR
def img(path, srgb=True, max_size=1024):
    im = bpy.data.images.load(path, check_existing=True)
    if not srgb:
        im.colorspace_settings.name = "Non-Color"
    if max(im.size) > max_size:
        im.scale(max_size, max_size)
    return im


def pbr(name, base, tint=(1, 1, 1, 1), metal_scale=1.0, rough_scale=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    col = nt.nodes.new("ShaderNodeTexImage"); col.image = img(os.path.join(TEX, base + "_Diffuse.jpg"))
    nor = nt.nodes.new("ShaderNodeTexImage"); nor.image = img(os.path.join(TEX, base + "_nor_gl.jpg"), False)
    arm = nt.nodes.new("ShaderNodeTexImage"); arm.image = img(os.path.join(TEX, base + "_arm.jpg"), False)
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nmap = nt.nodes.new("ShaderNodeNormalMap")
    if tint != (1, 1, 1, 1):
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0
        nt.links.new(col.outputs["Color"], mix.inputs[6]); mix.inputs[7].default_value = tint
        nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    else:
        nt.links.new(col.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(arm.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    nt.links.new(nor.outputs["Color"], nmap.inputs["Color"])
    nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def flat(name, rgb, rough=0.9, metal=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return mat


STEEL = pbr("acero", "armadura_gris")
STEEL_DARK = pbr("acero_oscuro", "armadura_gris", tint=(0.36, 0.37, 0.4, 1))
GAMBESON = flat("gambeson", (0.05, 0.04, 0.03), 0.95)
TABARD = flat("tabardo", (0.05, 0.006, 0.01), 0.93)
CAPE = flat("capa", (0.035, 0.03, 0.03), 0.95)
LEATHER = flat("cuero", (0.09, 0.05, 0.03), 0.65)
BLACK = flat("ranura", (0.005, 0.005, 0.006), 0.6)

def box_uv(obj, size):
    """Proyección en cubo de UVs (sin necesitar una vista 3D)."""
    me = obj.data
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
    bm = bmesh.new(); bm.from_mesh(me)
    uvl = bm.loops.layers.uv.active
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co
            u, v = ((c.y, c.z), (c.x, c.z), (c.x, c.y))[ax]
            lp[uvl].uv = (u / size, v / size)
    bm.to_mesh(me); bm.free()


# ---------------------------------------------------------------- conchas de armadura
def bone_world(name):
    b = rig.data.bones[name]
    return rig.matrix_world @ b.head_local, rig.matrix_world @ b.tail_local


def shell(name, groups, offset, thick, mat, *, zmin=None, zmax=None, uv_scale=3.0, smooth=6, keep_fn=None):
    src = body_full
    me = src.data.copy()
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    obj.matrix_world = src.matrix_world.copy()
    for vg in src.vertex_groups:
        obj.vertex_groups.new(name=vg.name)
    names = {vg.index: vg.name for vg in src.vertex_groups}
    bm = bmesh.new(); bm.from_mesh(me)
    dl = bm.verts.layers.deform.active
    drop = []
    for v in bm.verts:
        d = v[dl]
        best = max(((names[k], w) for k, w in d.items() if names[k] in BONES), key=lambda t: t[1], default=(None, 0))[0]
        ok = best in groups and (zmin is None or v.co.z >= zmin) and (zmax is None or v.co.z <= zmax)
        if ok and keep_fn is not None:
            ok = keep_fn(v.co)
        if not ok:
            drop.append(v)
    bmesh.ops.delete(bm, geom=drop, context="VERTS")
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * offset
    uvl = bm.loops.layers.uv.active
    if uvl:
        for f in bm.faces:
            for lp in f.loops:
                lp[uvl].uv *= uv_scale
    bm.to_mesh(me); bm.free()
    me.materials.clear(); me.materials.append(mat)
    for poly in me.polygons:
        poly.material_index = 0
    sm = obj.modifiers.new("Suavizar", "SMOOTH"); sm.factor = 0.6; sm.iterations = smooth
    so = obj.modifiers.new("Grosor", "SOLIDIFY"); so.thickness = thick; so.offset = 1.0
    bpy.context.view_layer.objects.active = obj
    for m in list(obj.modifiers):
        with bpy.context.temp_override(object=obj):
            bpy.ops.object.modifier_apply(modifier=m.name)
    # seguridad: quitar aristas anómalas (pinchos) que pueda generar el grosor
    bm = bmesh.new(); bm.from_mesh(me)
    bad = {v for e in bm.edges if e.calc_length() > 0.12 for v in e.verts}
    bmesh.ops.delete(bm, geom=list(bad), context="VERTS")
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return obj


k_l, _ = bone_world("calf_l")          # rodilla
knee_z = k_l.z
sh_l, _ = bone_world("upperarm_l")     # hombro
el_l, _ = bone_world("lowerarm_l")     # codo
hip_z = bone_world("pelvis")[0].z

pieces = [
    shell("peto", {"spine_02", "spine_03", "clavicle_l", "clavicle_r"}, 0.034, 0.006, STEEL, uv_scale=2),
    shell("faltar", {"spine_01"}, 0.04, 0.005, STEEL_DARK, uv_scale=4),
    shell("gorjal", {"neck_01"}, 0.026, 0.005, STEEL, uv_scale=4),
    shell("hombreras", {"upperarm_l", "upperarm_r", "clavicle_l", "clavicle_r"}, 0.05, 0.007, STEEL,
          zmin=sh_l.z - 0.11, uv_scale=4, keep_fn=lambda c: abs(c.x) > 0.13),
    shell("brazales", {"lowerarm_l", "lowerarm_r"}, 0.022, 0.005, STEEL, uv_scale=5),
    shell("avambrazos", {"upperarm_l", "upperarm_r"}, 0.03, 0.005, STEEL_DARK, zmax=sh_l.z - 0.07, uv_scale=5),
    shell("codales", {"upperarm_l", "upperarm_r", "lowerarm_l", "lowerarm_r"}, 0.032, 0.005, STEEL_DARK,
          zmin=el_l.z - 0.05, zmax=el_l.z + 0.05, uv_scale=5),
    shell("guanteletes", {"hand_l", "hand_r"} | {b for b in BONES if b.split("_")[0] in ("index", "middle", "ring", "pinky", "thumb")},
          0.012, 0.004, STEEL_DARK, uv_scale=6, smooth=10),
    shell("grebas", {"calf_l", "calf_r"}, 0.026, 0.005, STEEL, uv_scale=5),
    shell("rodilleras", {"thigh_l", "thigh_r", "calf_l", "calf_r"}, 0.036, 0.005, STEEL,
          zmin=knee_z - 0.06, zmax=knee_z + 0.07, uv_scale=5),
    shell("escarpes", {"foot_l", "foot_r", "ball_l", "ball_r"}, 0.03, 0.005, STEEL_DARK, uv_scale=6, smooth=30),
]

# ---------------------------------------------------------------- faldón (falda de verdad, con pesos transferidos del cuerpo)
def skirt():
    vs = [body_full.matrix_world @ Vector(v.co) for v in body_full.data.vertices]
    top, bot = hip_z + 0.07, knee_z + 0.03
    rings, SEG, NR = [], 40, 8
    b = bmesh.new()
    uvl = b.loops.layers.uv.new()
    for j in range(NR + 1):
        t = j / NR
        z = top + (bot - top) * t
        sl = [v for v in vs if abs(v.z - z) < 0.03 and abs(v.x) < 0.3]
        cx = sum(v.x for v in sl) / len(sl); cy = sum(v.y for v in sl) / len(sl)
        rx = (max(v.x for v in sl) - min(v.x for v in sl)) / 2 + 0.035 + 0.06 * t
        ry = (max(v.y for v in sl) - min(v.y for v in sl)) / 2 + 0.04 + 0.05 * t
        ring = []
        for i in range(SEG):
            a = 2 * math.pi * i / SEG
            wob = 0.008 * math.sin(a * 7 + j) * t
            ring.append(b.verts.new((cx + math.cos(a) * (rx + wob), cy + math.sin(a) * (ry + wob), z)))
        rings.append(ring)
    for j in range(NR):
        for i in range(SEG):
            i2 = (i + 1) % SEG
            f = b.faces.new((rings[j][i], rings[j][i2], rings[j + 1][i2], rings[j + 1][i]))
            for lp, uv in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                lp[uvl].uv = (uv[0] / SEG * 4, 1 - uv[1] / NR)
    me = bpy.data.meshes.new("faldon"); b.to_mesh(me); b.free(); me.materials.append(TABARD)
    o = bpy.data.objects.new("faldon", me); bpy.context.scene.collection.objects.link(o)
    for vg in body_full.vertex_groups:
        o.vertex_groups.new(name=vg.name)
    dt = o.modifiers.new("pesos", "DATA_TRANSFER"); dt.object = body_full
    dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}; dt.vert_mapping = "POLYINTERP_NEAREST"
    dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
    so = o.modifiers.new("Grosor", "SOLIDIFY"); so.thickness = 0.005
    for m in list(o.modifiers):
        with bpy.context.temp_override(object=o):
            bpy.ops.object.modifier_apply(modifier=m.name)
    for p in me.polygons:
        p.use_smooth = True
    return o


pieces.append(skirt())

# ---------------------------------------------------------------- yelmo cerrado (rígido al hueso de la cabeza)
head_vs = [body_full.matrix_world @ Vector(v.co) for v in body_full.data.vertices
           if any(body_full.vertex_groups[g.group].name == "head" and g.weight > 0.6 for g in v.groups)]
hmin = Vector((min(v.x for v in head_vs), min(v.y for v in head_vs), min(v.z for v in head_vs)))
hmax = Vector((max(v.x for v in head_vs), max(v.y for v in head_vs), max(v.z for v in head_vs)))
hc = (hmin + hmax) / 2
hr = max(hmax.x - hmin.x, hmax.y - hmin.y) / 2 + 0.016
bm = bmesh.new()
h_bot, h_top = hmin.z - 0.025, hmax.z - 0.035
bmesh.ops.create_cone(bm, cap_ends=False, segments=40, radius1=hr * 1.05, radius2=hr, depth=h_top - h_bot)
dome = bmesh.new()
bmesh.ops.create_uvsphere(dome, u_segments=40, v_segments=20, radius=hr)
bmesh.ops.delete(dome, geom=[v for v in dome.verts if v.co.z < -1e-4], context="VERTS")
for v in dome.verts:
    v.co.z = v.co.z * 1.05 + (h_top - h_bot) / 2   # cúpula apuntada ("pan de azúcar")
tmpme = bpy.data.meshes.new("tmp"); dome.to_mesh(tmpme); bm.from_mesh(tmpme); bpy.data.meshes.remove(tmpme); dome.free()
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.002)
for v in bm.verts:
    v.co += Vector((hc.x, hc.y, (h_bot + h_top) / 2))
helm_me = bpy.data.meshes.new("yelmo"); bm.to_mesh(helm_me); bm.free()
helm = bpy.data.objects.new("yelmo", helm_me); bpy.context.scene.collection.objects.link(helm)
helm_me.materials.append(STEEL)
for p in helm_me.polygons:
    p.use_smooth = True
so = helm.modifiers.new("Grosor", "SOLIDIFY"); so.thickness = 0.006
bv = helm.modifiers.new("Bisel", "BEVEL"); bv.width = 0.003; bv.segments = 2
with bpy.context.temp_override(object=helm):
    bpy.ops.object.modifier_apply(modifier="Grosor")
    bpy.ops.object.modifier_apply(modifier="Bisel")
box_uv(helm, 0.25)
front_y = hmin.y - 0.03   # MakeHuman mira hacia -Y


def boxpart(name, size, loc, mat, parent_list):
    b = bmesh.new(); bmesh.ops.create_cube(b, size=1.0)
    for v in b.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])) + loc
    me = bpy.data.meshes.new(name); b.to_mesh(me); b.free(); me.materials.append(mat)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); parent_list.append(o); return o


helm_parts = [helm]
eye_z = hmin.z + 0.62 * (hmax.z - hmin.z)
FRONT = -math.pi / 2   # MakeHuman mira hacia -Y


def r_at(z):
    return hr * 1.05 + (hr - hr * 1.05) * (z - h_bot) / (h_top - h_bot)


def arc_band(name, z0, z1, a0, a1, mat, out=0.003, thick=0.005, segs=24):
    b = bmesh.new(); cols = []
    for i in range(segs + 1):
        a = a0 + (a1 - a0) * i / segs
        col = []
        for z in (z0, z1):
            r = r_at(z) + out
            col.append(b.verts.new((hc.x + math.cos(a) * r, hc.y + math.sin(a) * r, z)))
        cols.append(col)
    for i in range(segs):
        b.faces.new((cols[i][0], cols[i + 1][0], cols[i + 1][1], cols[i][1]))
    me = bpy.data.meshes.new(name); b.to_mesh(me); b.free(); me.materials.append(mat)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    so = o.modifiers.new("Grosor", "SOLIDIFY"); so.thickness = thick; so.offset = 1.0
    with bpy.context.temp_override(object=o):
        bpy.ops.object.modifier_apply(modifier="Grosor")
    for p in me.polygons:
        p.use_smooth = True
    box_uv(o, 0.2)
    helm_parts.append(o)
    return o


helm_parts = [helm]
arc_band("ranura", eye_z - 0.008, eye_z + 0.008, FRONT - 0.85, FRONT + 0.85, BLACK, out=0.0015, thick=0.004)
arc_band("banda_ojos", eye_z + 0.014, eye_z + 0.04, 0, 2 * math.pi, STEEL_DARK, segs=60)
arc_band("banda_borde", h_bot, h_bot + 0.022, 0, 2 * math.pi, STEEL_DARK, segs=60)
arc_band("refuerzo_v", h_bot, h_top, FRONT - 0.07, FRONT + 0.07, STEEL_DARK, segs=4)
for i in range(5):
    a = FRONT + 0.25 + i * 0.09
    arc_band("respiro%d" % i, eye_z - 0.1, eye_z - 0.06, a - 0.018, a + 0.018, BLACK, out=0.0015, thick=0.004, segs=2)

# ---------------------------------------------------------------- capa (rígida a spine_03, con caída)
s3h, s3t = bone_world("spine_03")
cape_top = s3t.z + 0.02
cbm = bmesh.new()
W, H, NX, NY = 0.56, 1.25, 8, 14
grid = []
for j in range(NY + 1):
    row = []
    for i in range(NX + 1):
        x = -W / 2 + W * i / NX
        t = j / NY
        y = s3t.y + 0.16 + t * 0.12 + 0.03 * math.cos(x / W * math.pi) * (1 - t)
        z = cape_top - H * t
        if j == NY:
            z += 0.04 * math.sin(i * 1.7)
        row.append(cbm.verts.new((x * (1 + t * 0.45), y, z)))
    grid.append(row)
uvl = cbm.loops.layers.uv.new()
for j in range(NY):
    for i in range(NX):
        f = cbm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
        for lp, uv in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
            lp[uvl].uv = (uv[0] / NX, 1 - uv[1] / NY)
cape_me = bpy.data.meshes.new("capa"); cbm.to_mesh(cape_me); cbm.free(); cape_me.materials.append(CAPE)
cape = bpy.data.objects.new("capa", cape_me); bpy.context.scene.collection.objects.link(cape)
so = cape.modifiers.new("Grosor", "SOLIDIFY"); so.thickness = 0.008
with bpy.context.temp_override(object=cape):
    bpy.ops.object.modifier_apply(modifier="Grosor")
for p in cape_me.polygons:
    p.use_smooth = True

# huesos propios de la capa: cadena capa_1..capa_4 por el centro, siguiendo su inclinación hacia atrás
def cape_pt(t):
    return Vector((0.0, s3t.y + 0.16 + 0.12 * t + 0.03 * (1 - t), cape_top - H * t))


bpy.context.view_layer.objects.active = rig
with bpy.context.temp_override(active_object=rig, object=rig, selected_objects=[rig], selected_editable_objects=[rig]):
    bpy.ops.object.mode_set(mode="EDIT")
    eb = rig.data.edit_bones
    inv = rig.matrix_world.inverted()
    prev = eb["spine_03"]
    for k in range(4):
        e = eb.new("capa_%d" % (k + 1))
        e.head = inv @ cape_pt(k / 4)
        e.tail = inv @ cape_pt((k + 1) / 4)
        e.parent = prev
        e.use_connect = False
        prev = e
    bpy.ops.object.mode_set(mode="OBJECT")
BONES = {b.name for b in rig.data.bones}

# ---------------------------------------------------------------- unir al esqueleto
def bone_parent(obj, bone):
    mw = obj.matrix_world.copy()
    obj.parent = rig; obj.parent_type = "BONE"; obj.parent_bone = bone
    obj.matrix_world = mw


bpy.data.objects.remove(body_full, do_unlink=True)
under.data.materials.clear(); under.data.materials.append(GAMBESON)
bind(body); bind(under)
for p in pieces:
    bind(p)
for p in helm_parts:
    bone_parent(p, "head")
# capa: Armature + pesos por altura (fila superior 100 % capa_1, mezcla lineal entre huesos consecutivos)
for k in range(4):
    cape.vertex_groups.new(name="capa_%d" % (k + 1))
for v in cape_me.vertices:
    u = max(0.0, min(1.0, (cape_top - v.co.z) / H)) * 3.0     # 0..3 entre capa_1 y capa_4
    i = min(2, int(u)); f = u - i
    cape.vertex_groups["capa_%d" % (i + 1)].add([v.index], 1.0 - f, "REPLACE")
    if f > 1e-6:
        cape.vertex_groups["capa_%d" % (i + 2)].add([v.index], f, "REPLACE")
bind(cape)

# bajo la armadura no hace falta la cabeza del cuerpo (va dentro del yelmo): se borra para evitar que asome
bm = bmesh.new(); bm.from_mesh(body.data)
dl = bm.verts.layers.deform.active
hidx = body.vertex_groups["head"].index
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v[dl].get(hidx, 0) > 0.5 and v.co.z > hmin.z + 0.04], context="VERTS")
bm.to_mesh(body.data); bm.free()

# reducir polígonos de la ropa interior (casi no se ve)
dec = under.modifiers.new("Reducir", "DECIMATE"); dec.ratio = 0.5
for m in list(under.modifiers):
    if m.type == "DECIMATE":
        with bpy.context.temp_override(object=under):
            bpy.ops.object.modifier_apply(modifier=m.name)
under.modifiers.move(len(under.modifiers) - 1, 0) if len(under.modifiers) > 1 else None

# ---------------------------------------------------------------- informe
tris = 0
for o in rig.children_recursive:
    if o.type == "MESH":
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
print("CABALLERO: objetos=%d triángulos=%d altura=%.2f m" % (len(rig.children_recursive), tris, max(v.z for v in head_vs) + 0.03))

# ---------------------------------------------------------------- animaciones (Quaternius UAL, CC0)
if ANIMS:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from retarget import retarget  # noqa: E402
    retarget(ANIMS, rig)
    from poses import author_all  # noqa: E402
    author_all(rig)

# ---------------------------------------------------------------- exportar GLB
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
for o in rig.children_recursive:
    o.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format="GLB", use_selection=True, export_skins=True,
                          export_animations=bool(ANIMS), export_animation_mode="ACTIONS", export_apply=False, export_image_format="WEBP",
                          export_yup=True, export_materials="EXPORT")
print("GLB:", OUT_GLB, os.path.getsize(OUT_GLB) // 1024, "KB")
bpy.ops.wm.save_as_mainfile(filepath=OUT_GLB.replace(".glb", ".blend"))

# ---------------------------------------------------------------- render de muestra
if PREVIEW:
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 48; sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 900, 1200
    sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
    world = bpy.data.worlds.new("noche"); world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.006, 0.007, 0.012, 1)
    sc.world = world
    floor = bpy.data.objects.new("suelo", bpy.data.meshes.new("suelo"))
    fb = bmesh.new(); bmesh.ops.create_grid(fb, x_segments=1, y_segments=1, size=6); fb.to_mesh(floor.data); fb.free()
    floor.data.materials.append(pbr("suelo", "suelo")); sc.collection.objects.link(floor)
    box_uv(floor, 1.2)

    def light(name, kind, loc, energy, color, size=1.0, rot=None):
        ld = bpy.data.lights.new(name, kind); ld.energy = energy; ld.color = color
        if kind == "AREA":
            ld.size = size
        lo = bpy.data.objects.new(name, ld); lo.location = loc; sc.collection.objects.link(lo)
        tgt = Vector((0, 0, 1.2)); lo.rotation_euler = (tgt - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        return lo
    light("antorcha", "AREA", (-1.6, -1.8, 2.0), 260, (1.0, 0.55, 0.25), 0.6)
    light("luna", "AREA", (1.8, 1.6, 3.0), 340, (0.55, 0.65, 1.0), 1.5)
    light("relleno", "AREA", (1.5, -2.5, 1.3), 40, (0.6, 0.65, 0.8), 2.0)
    cam_d = bpy.data.cameras.new("cam"); cam_d.lens = 55
    cam = bpy.data.objects.new("cam", cam_d); sc.collection.objects.link(cam)
    cam.location = (1.3, -3.4, 1.35)
    cam.rotation_euler = (Vector((0, 0, 1.0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam
    sc.render.filepath = PREVIEW
    if not os.environ.get("SOLO_POSES"):
        bpy.ops.render.render(write_still=True)
    print("PREVIEW:", PREVIEW)
    # depuración: SOLO_POSES="clip:fotograma,clip:fotograma" renderiza de frente y de lado
    if os.environ.get("SOLO_POSES") and ANIMS:
        sc.cycles.samples = 8
        sc.render.resolution_x, sc.render.resolution_y = 450, 600
        for item in os.environ["SOLO_POSES"].split(","):
            nm, fr = item.split(":")
            rig.animation_data.action = bpy.data.actions[nm]
            sc.frame_set(int(fr))
            for vname, loc in (("f", (0.0, -3.6, 1.3)), ("l", (-3.6, 0.0, 1.3))):
                cam.location = loc
                cam.rotation_euler = (Vector((0, 0, 1.0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
                sc.render.filepath = PREVIEW.replace(".png", "_dbg_%s_%s_%s.png" % (nm, fr, vname))
                bpy.ops.render.render(write_still=True)
        ANIMS = None
    if ANIMS:   # una imagen por pose para comprobar el reasignado
        sc.cycles.samples = 16
        sc.render.resolution_x, sc.render.resolution_y = 450, 600
        for act_name, frac in (("guardia", 0.3), ("andar", 0.25), ("tajo", 0.45), ("hechizo", 0.6), ("rodar", 0.4),
                               ("conjurar", 0.5), ("invocar", 0.5), ("invocar", 0.55), ("martillazo", 0.3),
                               ("martillazo", 0.47), ("disparo_arco", 0.47)):
            act = bpy.data.actions.get(act_name)
            if not act:
                continue
            rig.animation_data.action = act
            sc.frame_set(int(act.frame_range[0] + (act.frame_range[1] - act.frame_range[0]) * frac))
            sc.render.filepath = PREVIEW.replace(".png", "_%s_%d.png" % (act_name, int(frac * 100)))
            bpy.ops.render.render(write_still=True)
        rig.animation_data.action = None
