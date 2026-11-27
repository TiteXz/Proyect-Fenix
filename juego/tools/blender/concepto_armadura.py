"""Concepto de armadura ligera del héroe (imagen de referencia, no asset del juego).

Mezcla de sensaciones: cazador medieval curtido (gambesón acolchado, cuero endurecido, correas y hebillas) con un
toque de ciencia ficción sobria (cuello envolvente, bandolera con cápsulas metálicas, espada híbrida). Diseño propio:
no reproduce piezas, personajes ni logotipos de ningún juego.

Uso:
  blender -b -P juego/tools/blender/concepto_armadura.py -- <dir texturas Poly Haven> <dir salida> [muestras]
Salida: <dir>/armadura_ligera_frente.png, _espalda.png, _detalle.png

Todo CC0 (MakeHuman vía MPFB; texturas Poly Haven) o propio.
"""
import math
import os
import sys

import addon_utils
import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

addon_utils.enable("bl_ext.user_default.mpfb", default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService  # noqa: E402
from bl_ext.user_default.mpfb.services.locationservice import LocationService  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import heroe_equipo as HE  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:]
TEX = os.path.abspath(ARGS[0])
OUT = os.path.abspath(ARGS[1])
SAMPLES = int(ARGS[2]) if len(ARGS) > 2 else 64
SOLO = ARGS[3] if len(ARGS) > 3 else None     # "pelo" = solo prueba de pelo
HE.TEX = TEX
U = LocationService.get_user_data()
os.makedirs(OUT, exist_ok=True)

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

# ---------------------------------------------------------------- humano
MACRO = {"gender": 1.0, "age": 0.6, "muscle": 0.8, "weight": 0.55, "proportions": 0.95, "height": 0.65,
         "cupsize": 0.5, "firmness": 0.5, "race": {"asian": 0.05, "caucasian": 0.85, "african": 0.1}}
basemesh = HumanService.create_human(macro_detail_dict=MACRO)
rig = HumanService.add_builtin_rig(basemesh, "game_engine", import_weights=True)
HumanService.set_character_skin(os.path.join(U, "skins/young_caucasian_male/young_caucasian_male.mhmat"), basemesh, skin_type="GAMEENGINE")
added = {}
for rel, kind, key in [("eyes/low-poly/low-poly.mhclo", "Eyes", "ojos"), ("eyebrows/eyebrow001/eyebrow001.mhclo", "Eyebrows", "cejas"),
                       ("eyelashes/eyelashes01/eyelashes01.mhclo", "Eyelashes", "pestanas"), ("hair/long01/long01.mhclo", "Hair", "pelo")]:
    added[key] = HumanService.add_mhclo_asset(os.path.join(U, rel), basemesh, asset_type=kind, subdiv_levels=0, material_type="GAMEENGINE")
BONES = {b.name for b in rig.data.bones}


def bake(obj, name):
    for m in obj.modifiers:
        if m.type in ("ARMATURE", "SUBSURF"):
            m.show_viewport = False
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    new = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(new)
    new.matrix_world = obj.matrix_world.copy()
    for vg in obj.vertex_groups:
        new.vertex_groups.new(name=vg.name)
    for vg in list(new.vertex_groups):
        if vg.name not in BONES:
            new.vertex_groups.remove(vg)
    for p in new.data.polygons:
        p.use_smooth = True
    return new


body = bake(basemesh, "cuerpo")
parts = {k: bake(o, k) for k, o in added.items()}
for o in list(bpy.data.objects):
    if o.type == "MESH" and o not in [body] + list(parts.values()):
        bpy.data.objects.remove(o, do_unlink=True)


def bone_world(n):
    b = rig.data.bones[n]
    return rig.matrix_world @ b.head_local, rig.matrix_world @ b.tail_local


# ---------------------------------------------------------------- pelo largo y liso, peinado hacia atrás
# El pelo long01 cae a los lados y por delante de los hombros: los mechones que quedan por delante del plano de las
# orejas y por debajo de la sien se llevan hacia atrás (giro alrededor del eje de los hombros), como peinado con agua.
pelo = parts["pelo"]
head_c = (bone_world("head")[0] + bone_world("head")[1]) / 2
ear_y = head_c.y + 0.01
for v in pelo.data.vertices:
    c = v.co
    if c.z < head_c.z - 0.06:   # solo por debajo de la línea de las orejas: el casco de pelo no se toca
        below = min(1.0, (head_c.z - 0.06 - c.z) / 0.30)
        front = max(0.0, ear_y - c.y)
        # empuja hacia atrás (+Y) lo que está delante y baja, y lo pega un poco a la espalda
        c.y += front * (0.9 + 0.6 * below) + 0.06 * below
        # estrecha la caída para que no se abra sobre los hombros
        c.x *= 1.0 - 0.35 * below
        # deja las puntas algo más cortas que el original (por la mitad de la espalda)
        if c.z < head_c.z - 0.55:
            c.z = head_c.z - 0.55 - (head_c.z - 0.55 - c.z) * 0.3
pelo.data.update()
sm = pelo.modifiers.new("Suavizar", "SMOOTH"); sm.factor = 0.5; sm.iterations = 4
with bpy.context.temp_override(object=pelo):
    bpy.ops.object.modifier_apply(modifier="Suavizar")

# ---------------------------------------------------------------- materiales
names = {vg.index: vg.name for vg in body.vertex_groups}
# casco de pelo bajo los mechones (evita que se vea el cuero cabelludo entre ellos): la parte alta y trasera de la
# cabeza, desplazada 4 mm, con el color del pelo
hair_img = next((nd.image for sl in pelo.material_slots if sl.material and sl.material.use_nodes
                 for nd in sl.material.node_tree.nodes if nd.type == "TEX_IMAGE" and nd.image), None)
CASCO = bpy.data.materials.new("casco_pelo"); CASCO.use_nodes = True
_b = CASCO.node_tree.nodes["Principled BSDF"]; _b.inputs["Base Color"].default_value = (0.045, 0.028, 0.018, 1); _b.inputs["Roughness"].default_value = 0.5
_b.inputs["Coat Weight"].default_value = 0.0
brow_z = head_c.z + 0.035


def quilt_maps(name, color, cell=48, size=1024):
    """Textura de acolchado en rombos (color + normal) generada con numpy."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    u = (x + y) / cell; v = (x - y) / cell
    du = np.abs(u - np.round(u)); dv = np.abs(v - np.round(v))
    d = np.minimum(du, dv)                          # distancia a la costura más cercana
    h = np.sqrt(np.clip(d * 2, 0, 1))               # almohadilla
    gy, gx = np.gradient(h * 6.0)
    n = np.stack([-gx, gy, np.ones_like(h)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
    seam = (d < 0.05).astype(np.float32)
    rng = np.random.default_rng(7)
    noise = rng.normal(0, 0.035, (size, size)).astype(np.float32)
    col = np.array(color, np.float32)[None, None, :] * (0.78 + 0.25 * h[..., None] + noise[..., None]) * (1 - 0.45 * seam[..., None])
    imgs = []
    for nm, arr, lin in ((name + "_color", col, False), (name + "_normal", n * 0.5 + 0.5, True)):
        im = bpy.data.images.new(nm, size, size)
        if lin:
            im.colorspace_settings.name = "Non-Color"
        px = np.concatenate([np.clip(arr, 0, 1), np.ones((size, size, 1), np.float32)], -1)
        im.pixels.foreach_set(px[::-1].ravel()); im.pack(); imgs.append(im)
    return imgs


def mat_maps(name, col_img, nor_img, rough=0.85, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    c = nt.nodes.new("ShaderNodeTexImage"); c.image = col_img
    nimg = nt.nodes.new("ShaderNodeTexImage"); nimg.image = nor_img
    nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 1.0
    nt.links.new(c.outputs["Color"], b.inputs["Base Color"]); nt.links.new(nimg.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    return m


GAMBESON = mat_maps("gambeson", *quilt_maps("gambeson", (0.085, 0.08, 0.075)), rough=0.9)
CUERO = HE.pbr("cuero_peto", "brown_leather", (0.17, 0.10, 0.06, 1))
CUERO_OSC = HE.pbr("cuero_osc", "brown_leather", (0.075, 0.055, 0.045, 1))
ABRIGO = HE.pbr("abrigo", "caban", (0.16, 0.15, 0.14, 1))
BUFANDA = HE.pbr("bufanda", "hessian_230", (0.20, 0.19, 0.15, 1))
PANO = HE.pbr("pantalon", "caban", (0.22, 0.19, 0.16, 1))
METAL = HE.flat("metal", (0.55, 0.56, 0.58), rough=0.35, metal=1.0)
METAL_OSC = HE.flat("metal_osc", (0.09, 0.09, 0.1), rough=0.4, metal=1.0)
LACA = HE.flat("laca", (0.018, 0.02, 0.026), rough=0.22)
EMISOR = HE.flat("emisor", (0.3, 0.7, 1.0), rough=0.3, emit=(0.35, 0.75, 1.0), strength=8.0)
for o, rough in ((body, 0.5), (parts["pelo"], 0.45), (parts["ojos"], 0.1)):
    for sl in o.material_slots:
        if sl.material and sl.material.use_nodes:
            for nd in sl.material.node_tree.nodes:
                if nd.type == "BSDF_PRINCIPLED":
                    nd.inputs["Roughness"].default_value = rough
                    if o is body:   # piel: algo de dispersión subsuperficial para que no parezca plástico
                        nd.inputs["Subsurface Weight"].default_value = 0.15
                        nd.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
                        nd.inputs["Subsurface Scale"].default_value = 0.01

def _casco():
    bm = bmesh.new(); bm.from_mesh(body.data); dl = bm.verts.layers.deform.active
    hidx = body.vertex_groups["head"].index
    front_y = min(v.co.y for v in bm.verts if v[dl].get(hidx, 0) > 0.5)
    drop = [v for v in bm.verts if not (v[dl].get(hidx, 0) > 0.3 and (v.co.z > brow_z + 0.03 - 0.12 * max(0.0, (v.co.y - front_y - 0.06) / 0.1))
                                         and not (v.co.y < front_y + 0.05 and v.co.z < brow_z + 0.04))]
    bmesh.ops.delete(bm, geom=drop, context="VERTS")
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * 0.004
    me = bpy.data.meshes.new("casco"); bm.to_mesh(me); bm.free(); me.materials.append(CASCO)
    o = bpy.data.objects.new("casco", me); bpy.context.scene.collection.objects.link(o)
    for vg in body.vertex_groups:
        o.vertex_groups.new(name=vg.name)
    for p_ in me.polygons:
        p_.use_smooth = True
    return o


casco = _casco()
knee_z = bone_world("calf_l")[0].z
hip_z = bone_world("pelvis")[0].z
ankle_z = bone_world("foot_l")[0].z
neck_z = bone_world("neck_01")[0].z
sh = bone_world("upperarm_l")[0]


def dominant(v, dl):
    d = v[dl]
    return max(((names[k], w) for k, w in d.items() if names.get(k) in BONES), key=lambda t: t[1], default=(None, 0))[0]


def shell(name, groups, offset, thick, mat, *, zmin=None, zmax=None, keep=None, uv_scale=3.0, smooth=6, subdiv=1):
    me = body.data.copy(); obj = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(obj)
    obj.matrix_world = body.matrix_world.copy()
    for vg in body.vertex_groups:
        obj.vertex_groups.new(name=vg.name)
    bm = bmesh.new(); bm.from_mesh(me); dl = bm.verts.layers.deform.active
    drop = []
    for v in bm.verts:
        b = dominant(v, dl)
        ok = b in groups and (zmin is None or v.co.z >= zmin) and (zmax is None or v.co.z <= zmax)
        if ok and keep is not None:
            ok = keep(v.co, b)
        if not ok:
            drop.append(v)
    bmesh.ops.delete(bm, geom=drop, context="VERTS")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    for _ in range(14):
        new = {}
        for v in bm.verts:
            if v.is_boundary:
                nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
                if len(nb) == 2:
                    new[v] = v.co * 0.4 + (nb[0].co + nb[1].co) * 0.3
        for v, c in new.items():
            v.co = c
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
    for p in me.polygons:
        p.material_index = 0; p.use_smooth = True
    sm = obj.modifiers.new("Suavizar", "SMOOTH"); sm.factor = 0.6; sm.iterations = smooth
    if thick > 0:
        so = obj.modifiers.new("Grosor", "SOLIDIFY"); so.thickness = thick; so.offset = 1.0
        bv = obj.modifiers.new("Bisel", "BEVEL"); bv.width = min(0.002, thick * 0.4); bv.segments = 2; bv.limit_method = "ANGLE"
    if subdiv:
        sd = obj.modifiers.new("Subdiv", "SUBSURF"); sd.levels = subdiv; sd.render_levels = subdiv
    return obj


# la piel que queda bajo ropa opaca se oculta (evita que asome con la subdivisión)
hidden = {"spine_01", "spine_02", "spine_03", "pelvis", "thigh_l", "thigh_r", "calf_l", "calf_r", "upperarm_l", "upperarm_r",
          "foot_l", "foot_r", "ball_l", "ball_r", "clavicle_l", "clavicle_r"}

arms = {"upperarm_l", "upperarm_r", "lowerarm_l", "lowerarm_r"}
torso = {"spine_01", "spine_02", "spine_03", "clavicle_l", "clavicle_r", "pelvis"}
legs = {"thigh_l", "thigh_r", "calf_l", "calf_r"}
cx_front = lambda c: c.y < bone_world("spine_02")[0].y + 0.02          # mitad delantera del tronco (−Y)

P = []
# capa base: gambesón acolchado de manga larga hasta la cadera
P.append(shell("gambeson", torso | arms, 0.014, 0.004, GAMBESON, zmin=hip_z - 0.08, uv_scale=6))
P.append(shell("pantalon", legs | {"pelvis"}, 0.009, 0.0, PANO, zmax=hip_z + 0.02, keep=lambda c, b: c.z > ankle_z + 0.15, uv_scale=4))
# botas altas con caña ancha y vuelta en la rodilla
P.append(shell("botas", {"calf_l", "calf_r"}, 0.024, 0.004, CUERO_OSC, zmax=knee_z - 0.03, uv_scale=5, smooth=10))
for sd in ("l", "r"):
    bmf = bmesh.new(); bmf.from_mesh(body.data); dlf = bmf.verts.layers.deform.active
    pts = [Vector(v.co) for v in bmf.verts if dominant(v, dlf) in ("foot_" + sd, "ball_" + sd)
           or (dominant(v, dlf) == "calf_" + sd and v.co.z < ankle_z + 0.10)]
    bmf.free()
    hb = bmesh.new()
    for p_ in pts:
        hb.verts.new(p_)
    bmesh.ops.convex_hull(hb, input=hb.verts)
    bmesh.ops.delete(hb, geom=[v for v in hb.verts if not v.link_faces], context="VERTS")
    cen = sum((v.co for v in hb.verts), Vector()) / len(hb.verts)
    for v in hb.verts:
        v.co = v.co + (v.co - cen).normalized() * 0.016
        v.co.z = max(v.co.z, 0.0)
    bmesh.ops.subdivide_edges(hb, edges=list(hb.edges), cuts=1, use_grid_fill=True)
    mm = bpy.data.meshes.new("bota_pie_" + sd); hb.to_mesh(mm); hb.free(); mm.materials.append(CUERO_OSC)
    ob = bpy.data.objects.new("bota_pie_" + sd, mm); bpy.context.scene.collection.objects.link(ob)
    ob.matrix_world = body.matrix_world.copy()
    for vg in body.vertex_groups:
        ob.vertex_groups.new(name=vg.name)
    dt = ob.modifiers.new("pesos", "DATA_TRANSFER"); dt.object = body
    dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}; dt.vert_mapping = "NEAREST"
    dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
    with bpy.context.temp_override(object=ob):
        bpy.ops.object.modifier_apply(modifier="pesos")
    sm_ = ob.modifiers.new("Suavizar", "SMOOTH"); sm_.factor = 0.5; sm_.iterations = 6
    sd_ = ob.modifiers.new("Subdiv", "SUBSURF"); sd_.levels = 1; sd_.render_levels = 2
    for p_ in mm.polygons:
        p_.use_smooth = True
    uvb = mm.uv_layers.new(name="UVMap")
    for lp in mm.loops:
        c = mm.vertices[lp.vertex_index].co
        uvb.data[lp.index].uv = (c.x * 8 + c.z * 8, c.y * 8)
    P.append(ob)
P.append(shell("botas_vuelta", {"calf_l", "calf_r", "thigh_l", "thigh_r"}, 0.034, 0.005, CUERO_OSC, zmin=knee_z - 0.08, zmax=knee_z - 0.02, uv_scale=5, smooth=10))
# peto de cuero endurecido (delante y detrás) con cintura marcada
P.append(shell("peto", {"spine_02", "spine_03"}, 0.03, 0.006, CUERO, zmin=hip_z + 0.17, keep=lambda c, b: abs(c.x) < 0.15, uv_scale=3, smooth=10))
P.append(shell("peto_bajo", {"spine_01", "spine_02"}, 0.034, 0.006, CUERO_OSC, zmin=hip_z + 0.10, zmax=hip_z + 0.19, uv_scale=3, smooth=10))
# hombreras de láminas solapadas (tres bandas por hombro, la izquierda con borde metálico)
for sd in ("l", "r"):
    s = 1 if sd == "l" else -1
    for k, (z0, off) in enumerate(((0.00, 0.042), (-0.06, 0.05))):
        P.append(shell("hombrera_%s%d" % (sd, k), {"upperarm_" + sd, "clavicle_" + sd}, off, 0.005, CUERO if k % 2 == 0 else CUERO_OSC,
                       zmin=sh.z - 0.10 + z0 - 0.035, zmax=sh.z + 0.09 + z0, keep=lambda c, b, s=s: c.x * s > 0.13, uv_scale=4, smooth=10))
    if sd == "l":
        P.append(shell("hombrera_borde", {"upperarm_l"}, 0.058, 0.004, METAL, zmin=sh.z - 0.235, zmax=sh.z - 0.205,
                       keep=lambda c, b: c.x > 0.15, uv_scale=6, smooth=10))
# brazales con placa metálica encima
P.append(shell("brazales", {"lowerarm_l", "lowerarm_r"}, 0.022, 0.005, CUERO_OSC, uv_scale=5, smooth=10))
# cuello envolvente (bufanda gruesa) sobre cuello y clavículas
P.append(shell("bufanda", {"neck_01", "spine_03", "clavicle_l", "clavicle_r"}, 0.032, 0.006, BUFANDA, zmin=neck_z - 0.11, zmax=neck_z + 0.07,
               keep=lambda c, b: not (b == "spine_03" and abs(c.x) > 0.11), uv_scale=4, smooth=16))
# cinturón ancho y fajín
P.append(shell("cinturon", torso, 0.046, 0.006, CUERO, zmin=hip_z + 0.06, zmax=hip_z + 0.11, uv_scale=6, smooth=10))
# guantes sin dedos: palma y dorso de la mano
P.append(shell("guantes", {"hand_l", "hand_r"}, 0.006, 0.002, CUERO_OSC, uv_scale=8, smooth=6))

# abrigo: faldones largos abiertos delante y detrás, hasta media pantorrilla
vs = [body.matrix_world @ Vector(v.co) for v in body.data.vertices]
bmt = bmesh.new(); bmt.from_mesh(body.data); dlt = bmt.verts.layers.deform.active
tronco = [Vector(v.co) for v in bmt.verts if dominant(v, dlt) in ("spine_01", "spine_02", "pelvis", "thigh_l", "thigh_r")]
tronco_alto = [Vector(v.co) for v in bmt.verts if dominant(v, dlt) in ("spine_01", "spine_02", "spine_03", "pelvis", "clavicle_l", "clavicle_r")]
bmt.free()


def faldon(name, top, bot, a0, a1, mat):
    SEG, NR = 28, 10
    b = bmesh.new(); uvl = b.loops.layers.uv.new(); rings = []
    for j in range(NR + 1):
        t = j / NR; z = top + (bot - top) * t
        sl = [v for v in tronco if abs(v.z - z) < 0.04] or [v for v in vs if abs(v.z - z) < 0.04 and abs(v.x) < 0.3]
        cx = sum(v.x for v in sl) / len(sl); cy = sum(v.y for v in sl) / len(sl)
        rx = (max(v.x for v in sl) - min(v.x for v in sl)) / 2 + 0.055 + 0.05 * t
        ry = (max(v.y for v in sl) - min(v.y for v in sl)) / 2 + 0.055 + 0.045 * t
        ring = []
        for i in range(SEG + 1):
            a = math.radians(a0 + (a1 - a0) * i / SEG)
            wob = 0.012 * math.sin(a * 11 + j * 0.7) * t
            ring.append(b.verts.new((cx + math.cos(a) * (rx + wob), cy + math.sin(a) * (ry + wob), z)))
        rings.append(ring)
    for j in range(NR):
        for i in range(SEG):
            f = b.faces.new((rings[j][i], rings[j][i + 1], rings[j + 1][i + 1], rings[j + 1][i]))
            for lp, uv in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                lp[uvl].uv = (uv[0] / SEG * 3, 1 - uv[1] / NR * 3)
    me = bpy.data.meshes.new(name); b.to_mesh(me); b.free(); me.materials.append(mat)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    for vg in body.vertex_groups:
        o.vertex_groups.new(name=vg.name)
    dt = o.modifiers.new("pesos", "DATA_TRANSFER"); dt.object = body
    dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}; dt.vert_mapping = "POLYINTERP_NEAREST"
    dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
    with bpy.context.temp_override(object=o):
        bpy.ops.object.modifier_apply(modifier="pesos")
    so = o.modifiers.new("Grosor", "SOLIDIFY"); so.thickness = 0.006
    sd = o.modifiers.new("Subdiv", "SUBSURF"); sd.levels = 1; sd.render_levels = 1
    for p in me.polygons:
        p.use_smooth = True
    return o


# MakeHuman mira a −Y: −90° es el frente; dos faldones laterales dejan abiertos delante (±18°) y detrás (±14°)
P.append(faldon("faldon_izq", hip_z + 0.12, knee_z - 0.16, -79, 87, ABRIGO))
P.append(faldon("faldon_der", hip_z + 0.12, knee_z - 0.16, 93, 259, ABRIGO))

# ocultar piel bajo la ropa
bm = bmesh.new(); bm.from_mesh(body.data); dl = bm.verts.layers.deform.active
kill = [f for f in bm.faces if all(dominant(v, dl) in hidden for v in f.verts)]
bmesh.ops.delete(bm, geom=kill, context="FACES"); bm.to_mesh(body.data); bm.free()

# ---------------------------------------------------------------- piezas rígidas: bandolera, hebillas, cápsulas, espada
rigid = []


def tube(name, pts, radii, mat, segs=16, ell=1.0, cap=True):
    bb = bmesh.new(); rings = []; up = Vector((0, 0, 1))
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        n1 = up.cross(t)
        if n1.length < 1e-4:
            n1 = Vector((1, 0, 0)).cross(t)
        n1.normalize(); n2 = t.cross(n1).normalized(); r = radii[i]
        rings.append([bb.verts.new(p + n1 * math.cos(2 * math.pi * k / segs) * r + n2 * math.sin(2 * math.pi * k / segs) * r * ell) for k in range(segs)])
    for i in range(len(rings) - 1):
        for k in range(segs):
            bb.faces.new((rings[i][k], rings[i][(k + 1) % segs], rings[i + 1][(k + 1) % segs], rings[i + 1][k]))
    if cap:
        bb.faces.new(rings[0][::-1]); bb.faces.new(rings[-1])
    mm = bpy.data.meshes.new(name); bb.to_mesh(mm); bb.free(); mm.materials.append(mat)
    for p in mm.polygons:
        p.use_smooth = True
    o = bpy.data.objects.new(name, mm); bpy.context.scene.collection.objects.link(o); rigid.append(o); return o


def box(name, size, loc, mat, rot=Matrix.Identity(3), bevel=0.003):
    bb = bmesh.new(); bmesh.ops.create_cube(bb, size=1.0)
    for v in bb.verts:
        v.co = rot @ Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])) + loc
    bmesh.ops.bevel(bb, geom=list(bb.edges), offset=bevel, segments=2, affect="EDGES")
    mm = bpy.data.meshes.new(name); bb.to_mesh(mm); bb.free(); mm.materials.append(mat)
    for p in mm.polygons:
        p.use_smooth = True
    o = bpy.data.objects.new(name, mm); bpy.context.scene.collection.objects.link(o); rigid.append(o); return o


def surface_point(x, z, side):
    """Punto de la piel del tronco en (x, z), delante (side=-1) o detrás (+1)."""
    cand = [v for v in tronco_alto if abs(v.x - x) < 0.025 and abs(v.z - z) < 0.025]
    if not cand:
        return None
    return min(cand, key=lambda v: v.y) if side < 0 else max(cand, key=lambda v: v.y)


# bandolera: del hombro derecho a la cadera izquierda, por delante (sobre el peto), con cápsulas metálicas
band = []
sh_r = bone_world("upperarm_r")[0]
for i in range(15):
    t = i / 14
    x = -0.12 + (0.24) * t; z = sh_r.z + 0.02 - (sh_r.z + 0.02 - (hip_z + 0.06)) * t
    p = surface_point(x, z, -1)
    if p is not None:
        band.append(p + Vector((0, -0.05, 0)))
# suaviza la bandolera (media móvil) para que no se quiebre
for _ in range(6):
    band = [band[0]] + [(band[i - 1] + band[i] * 2 + band[i + 1]) / 4 for i in range(1, len(band) - 1)] + [band[-1]]
lo = min(b_.y for b_ in band)
band = [Vector((b_.x, min(b_.y, lo + 0.06 * (1 - abs(i / (len(band) - 1) - 0.5) * 2)), b_.z)) for i, b_ in enumerate(band)]
tube("bandolera", band, [0.022] * len(band), CUERO_OSC, segs=4, ell=0.18)
for k in range(1, 5):
    i = int(len(band) * (0.25 + 0.12 * k))
    if i < len(band) - 1:
        d = (band[i + 1] - band[i]).normalized()
        a, b2 = band[i] + Vector((0, -0.012, 0)) - d * 0.012, band[i] + Vector((0, -0.012, 0)) + d * 0.012
        tube("capsula_%d" % k, [a, b2], [0.008, 0.008], METAL, segs=12)
        tube("capsula_luz_%d" % k, [b2, b2 + d * 0.004], [0.0055, 0.0055], EMISOR, segs=10)
# hebilla de cinturón y bolsas
belt_z = hip_z + 0.085
fy = min(v.y for v in tronco if abs(v.z - belt_z) < 0.02) - 0.06
box("hebilla", (0.07, 0.012, 0.05), Vector((0.0, fy, belt_z)), METAL)
box("hebilla_c", (0.036, 0.008, 0.022), Vector((0.0, fy - 0.008, belt_z)), METAL_OSC)
for k, x in enumerate((-0.12, -0.17)):
    p = surface_point(x, belt_z - 0.02, -1)
    if p is not None:
        box("bolsa_%d" % k, (0.055, 0.04, 0.075), p + Vector((0, -0.07, -0.01)), CUERO_OSC, bevel=0.008)

# ---------------------------------------------------------------- espada híbrida enfundada a la izquierda (como en heroe_equipo)
sw = []
L, SAG = 0.74, 0.022
pts = [Vector((L * u, 0, SAG * 4 * u * (1 - u) - SAG * u * 0.6)) for u in [i / 24 for i in range(25)]]
rr = [0.020 * (1 - 0.18 * u) for u in [i / 24 for i in range(25)]]
sw.append(tube("saya", pts, rr, LACA, segs=18, ell=1.35))
sw.append(tube("contera", pts[22:], [r * 1.07 for r in rr[22:]], METAL_OSC, segs=18, ell=1.35))
for i0 in (0, 4, 12):
    sw.append(tube("anillo_%d" % i0, pts[i0:i0 + 2], [rr[i0] * 1.12] * 2, METAL, segs=18, ell=1.3))
sw.append(tube("ranura", [p + Vector((0, 0, rr[i] * 1.33)) for i, p in enumerate(pts[2:21], 2)], [0.0024] * 19, EMISOR, segs=8))
sw.append(tube("emisor", [Vector((-0.004, 0, 0)), Vector((-0.016, 0, 0))], [0.021, 0.021], EMISOR, segs=24, ell=1.25))
sw.append(tube("tsuba", [Vector((-0.018, 0, 0)), Vector((-0.026, 0, 0))], [0.04, 0.04], METAL_OSC, segs=32, ell=1.1))
xs = [-0.026 - 0.27 * u for u in [i / 40 for i in range(41)]]
tp = [Vector((x, 0, 0.012 * ((x + 0.026) / -0.27))) for x in xs]
sw.append(tube("tsuka", tp, [(0.0165 + 0.002 * math.sin(math.pi * i / 40)) * (0.93 if (i % 3 == 0 and 4 < i < 34) else 1) for i in range(41)], METAL, segs=20, ell=1.15))
sw.append(tube("ito", tp[10:31], [0.0175] * 21, CUERO_OSC, segs=12, ell=1.15))
sw.append(tube("boton", [tp[6] + Vector((0, 0, 0.016)), tp[6] + Vector((0, 0, 0.021))], [0.004, 0.004], EMISOR, segs=10))
sw.append(tube("kashira", [tp[-1], tp[-1] + Vector((-0.02, 0, 0.001))], [0.019, 0.015], METAL_OSC, segs=20, ell=1.15))
side_x = max(v.x for v in tronco if abs(v.z - belt_z) < 0.03 and v.x > 0) + 0.06
by = max(v.y for v in tronco if abs(v.z - belt_z) < 0.02) + 0.05
mouth = Vector((side_x, (fy + by) / 2 - 0.05, belt_z - 0.02))
d = Vector((0.10, 1.0, -0.52)).normalized(); zax = Vector((0, 0, 1)) - d * d.z; zax.normalize(); yax = zax.cross(d).normalized()
M = Matrix((d, yax, zax)).transposed().to_4x4(); M.translation = mouth
for o in sw:
    o.data.transform(M)

# todo lo rígido va pesado a la pelvis salvo la bandolera (al pecho)
for o in rigid:
    g = "spine_03" if o.name.startswith(("bandolera", "capsula")) else "pelvis"
    vg = o.vertex_groups.new(name=g); vg.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")

# ---------------------------------------------------------------- unir todo al esqueleto
for o in [body, casco] + list(parts.values()) + P + rigid:
    o.parent = rig; o.matrix_parent_inverse = rig.matrix_world.inverted()
    m = o.modifiers.new("Armature", "ARMATURE"); m.object = rig
    # el armature va antes que la subdivisión
    while o.modifiers.find("Armature") > 0:
        with bpy.context.temp_override(object=o):
            bpy.ops.object.modifier_move_up(modifier="Armature")

# ---------------------------------------------------------------- pose: de pie, erguido, pies juntos, mirada al frente
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="POSE")
for pb in rig.pose.bones:
    pb.rotation_mode = "XYZ"


def rot(bone, x=0, y=0, z=0):
    rig.pose.bones[bone].rotation_euler = (math.radians(x), math.radians(y), math.radians(z))


# brazos relajados a los costados (la pose de reposo de MakeHuman es una A abierta)
for sd, s in (("l", 1), ("r", -1)):
    rot("upperarm_" + sd, 0, 0, 0)
bpy.ops.object.mode_set(mode="OBJECT")


def pose_arms():
    """Baja los brazos de la A de reposo a los costados con un leve doblez del codo, en espacio mundo."""
    for sd, s in (("l", 1), ("r", -1)):
        for bn, target in (("upperarm_" + sd, Vector((s * 0.10, 0.02, -1))), ("lowerarm_" + sd, Vector((s * 0.02, -0.18, -1)))):
            pb = rig.pose.bones[bn]
            bpy.context.view_layer.update()
            cur = (rig.matrix_world @ pb.tail - rig.matrix_world @ pb.head).normalized()
            q = cur.rotation_difference(target.normalized())
            mw = rig.matrix_world @ pb.matrix
            loc = mw.to_translation()
            new = Matrix.Translation(loc) @ q.to_matrix().to_4x4() @ Matrix.Translation(-loc) @ mw
            pb.matrix = rig.matrix_world.inverted() @ new
            bpy.context.view_layer.update()
        # mano relajada, dedos algo curvados
        for f in ("index", "middle", "ring", "pinky"):
            for j, a in ((1, 14), (2, 22), (3, 14)):
                pb = rig.pose.bones["%s_0%d_%s" % (f, j, sd)]
                pb.rotation_mode = "XYZ"
                pb.rotation_euler = (0, 0, math.radians(-a * s))
    bpy.context.view_layer.update()


pose_arms()
if SOLO == "pelo":
    pass

# ---------------------------------------------------------------- escena y render
sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 1100, 1500
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"; sc.view_settings.exposure = -0.35
world = bpy.data.worlds.new("cielo"); world.use_nodes = True; sc.world = world
wn = world.node_tree.nodes; sky = wn.new("ShaderNodeTexSky"); sky.sky_type = "NISHITA"
sky.sun_elevation = math.radians(18); sky.sun_rotation = math.radians(210); sky.air_density = 1.2; sky.dust_density = 1.5
world.node_tree.links.new(sky.outputs["Color"], wn["Background"].inputs["Color"]); wn["Background"].inputs["Strength"].default_value = 0.35
sun = bpy.data.objects.new("sol", bpy.data.lights.new("sol", "SUN")); sun.data.energy = 2.4; sun.data.angle = math.radians(1.2)
sun.data.color = (1.0, 0.86, 0.68); sun.rotation_euler = (math.radians(62), 0, math.radians(-35)); sc.collection.objects.link(sun)
rim = bpy.data.objects.new("contra", bpy.data.lights.new("contra", "AREA")); rim.data.energy = 260; rim.data.size = 1.6
rim.data.color = (0.75, 0.85, 1.0); rim.location = (-1.4, 2.2, 2.1); sc.collection.objects.link(rim)
rim.rotation_euler = (Vector((0, 0, 1.1)) - rim.location).to_track_quat("-Z", "Y").to_euler()
fill = bpy.data.objects.new("relleno", bpy.data.lights.new("relleno", "AREA")); fill.data.energy = 35; fill.data.size = 2.5
fill.data.color = (1.0, 0.92, 0.82); fill.location = (1.8, -2.4, 1.2); sc.collection.objects.link(fill)
fill.rotation_euler = (Vector((0, 0, 1.0)) - fill.location).to_track_quat("-Z", "Y").to_euler()
# suelo de tierra con hierba seca (degradado al horizonte)
gr = bpy.data.objects.new("suelo", bpy.data.meshes.new("suelo"))
gb = bmesh.new(); bmesh.ops.create_grid(gb, x_segments=1, y_segments=1, size=30); gb.to_mesh(gr.data); gb.free()
gm = bpy.data.materials.new("suelo"); gm.use_nodes = True; gnt = gm.node_tree
gnoise = gnt.nodes.new("ShaderNodeTexNoise"); gnoise.inputs["Scale"].default_value = 3.0; gnoise.inputs["Detail"].default_value = 8
gramp = gnt.nodes.new("ShaderNodeValToRGB"); gramp.color_ramp.elements[0].color = (0.06, 0.05, 0.035, 1); gramp.color_ramp.elements[1].color = (0.16, 0.14, 0.08, 1)
gnt.links.new(gnoise.outputs["Fac"], gramp.inputs["Fac"]); gnt.links.new(gramp.outputs["Color"], gnt.nodes["Principled BSDF"].inputs["Base Color"])
gnt.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.95
gr.data.materials.append(gm); sc.collection.objects.link(gr)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.dof.use_dof = True; cam.data.dof.aperture_fstop = 4.0


def shot(name, pos, target, lens):
    cam.location = Vector(pos); cam.data.lens = lens
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.dof.focus_distance = (Vector(target) - cam.location).length
    sc.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)
    print("RENDER:", sc.render.filepath)


H = bone_world("head")[0].z
if SOLO == "pelo":
    sc.render.resolution_x, sc.render.resolution_y = 700, 700; sc.cycles.samples = 16
    shot("prueba_pelo_lado", (1.2, -0.3, H + 0.05), (0, 0, H - 0.1), 85)
    shot("prueba_pelo_frente", (0.3, -1.3, H + 0.05), (0, 0, H - 0.1), 85)
else:
    shot("armadura_ligera_frente", (1.25, -3.6, 1.15), (0, 0, 0.95), 55)
    shot("armadura_ligera_espalda", (-1.6, 3.4, 1.25), (0, 0, 0.95), 55)
    shot("armadura_ligera_detalle", (0.75, -1.45, H - 0.12), (0.03, 0, H - 0.32), 70)
