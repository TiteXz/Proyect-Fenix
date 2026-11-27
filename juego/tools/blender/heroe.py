"""Genera el héroe realista: humano MakeHuman (CC0) con esqueleto game_engine (dedos de 3 falanges), piel 2K,
ojos, cejas, pestañas y pelo largo recogido hacia atrás; ropa propia de mezcla medieval / ciencia ficción y espada
híbrida katana + sable de luz enfundada a la izquierda (heroe_equipo.py). Copia los clips del caballero con retarget.py.

Uso:
  blender -b -P juego/tools/blender/heroe.py -- <salida.glb> <caballero.glb con clips> <dir texturas Poly Haven> [preview_dir]
  (texturas: rough_linen, hessian_230, caban, brown_leather en 1K: <id>_Diffuse.jpg, <id>_nor_gl.jpg, <id>_arm.jpg)

Licencias: todo CC0 (MakeHuman system assets vía MPFB 2.0.18; texturas Poly Haven; clips Quaternius UAL vía
caballero.glb). Ropa y espada: geometría propia.
Determinista: mismos parámetros → mismo resultado.
"""
import math
import os
import sys

import addon_utils
import bpy
from mathutils import Vector

addon_utils.enable("bl_ext.user_default.mpfb", default_set=True)

from bl_ext.user_default.mpfb.services.humanservice import HumanService  # noqa: E402
from bl_ext.user_default.mpfb.services.locationservice import LocationService  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from retarget import retarget  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:]
OUT_GLB = os.path.abspath(ARGS[0])
ANIMS = os.path.abspath(ARGS[1])
TEXDIR = os.path.abspath(ARGS[2])
PREVIEW = os.path.abspath(ARGS[3]) if len(ARGS) > 3 else None
U = LocationService.get_user_data()

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

# ---------------------------------------------------------------- humano
MACRO = {
    "gender": 1.0, "age": 0.55, "muscle": 0.8, "weight": 0.55, "proportions": 0.9,
    "height": 0.6, "cupsize": 0.5, "firmness": 0.5,
    "race": {"asian": 0.05, "caucasian": 0.85, "african": 0.1},
}
basemesh = HumanService.create_human(macro_detail_dict=MACRO)
rig = HumanService.add_builtin_rig(basemesh, "game_engine", import_weights=True)
rig.name = "Heroe"
HumanService.set_character_skin(os.path.join(U, "skins/young_caucasian_male/young_caucasian_male.mhmat"),
                                basemesh, skin_type="GAMEENGINE")
ASSETS = [
    ("eyes/low-poly/low-poly.mhclo", "Eyes"),
    ("eyebrows/eyebrow001/eyebrow001.mhclo", "Eyebrows"),
    ("eyelashes/eyelashes01/eyelashes01.mhclo", "Eyelashes"),
    ("hair/ponytail01/ponytail01.mhclo", "Hair"),
]
added = []
for rel, kind in ASSETS:
    p = os.path.join(U, rel)
    if not os.path.exists(p):
        print("FALTA", rel)
        continue
    added.append(HumanService.add_mhclo_asset(p, basemesh, asset_type=kind, subdiv_levels=0, material_type="GAMEENGINE"))
BONES = {b.name for b in rig.data.bones}


def bake(obj, name):
    """Copia evaluada (helpers ocultos, máscaras bajo la ropa y formas aplicadas) con los mismos grupos de vértices."""
    for m in obj.modifiers:
        if m.type in ("ARMATURE", "SUBSURF"):
            m.show_viewport = False
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    new = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(new)
    new.matrix_world = obj.matrix_world.copy()
    for vg in obj.vertex_groups:
        new.vertex_groups.new(name=vg.name)
    new.parent = rig
    new.matrix_parent_inverse = rig.matrix_world.inverted()
    mod = new.modifiers.new("Armature", "ARMATURE")
    mod.object = rig
    for vg in list(new.vertex_groups):
        if vg.name not in BONES:
            new.vertex_groups.remove(vg)
    for poly in new.data.polygons:
        poly.use_smooth = True
    return new


NAMES = {basemesh: "cuerpo"}
for a in added:
    n = a.name.lower()
    NAMES[a] = ("ojos" if "low-poly" in n or "high-poly" in n or "eye" in n and "brow" not in n and "lash" not in n else
                "cejas" if "brow" in n else "pestanas" if "lash" in n else "pelo" if "ponytail" in n or "hair" in n else
                "zapatos" if "shoe" in n else "ropa")
baked = [bake(o, NAMES[o]) for o in [basemesh] + added]
for o in list(bpy.data.objects):
    if o.type == "MESH" and o not in baked:
        bpy.data.objects.remove(o, do_unlink=True)

# materiales: rugosidad realista (piel algo satinada, ropa mate, ojos brillantes)
ROUGH = {"cuerpo": 0.52, "ropa": 0.85, "zapatos": 0.6, "pelo": 0.55, "ojos": 0.08, "cejas": 0.7, "pestanas": 0.7}
for o in baked:
    for slot in o.material_slots:
        m = slot.material
        if not m or not m.use_nodes:
            continue
        for nd in m.node_tree.nodes:
            if nd.type == "BSDF_PRINCIPLED":
                nd.inputs["Roughness"].default_value = ROUGH.get(o.name, 0.6)
                nd.inputs["Metallic"].default_value = 0.0
                if "Specular IOR Level" in nd.inputs:
                    nd.inputs["Specular IOR Level"].default_value = 0.5
        m.name = o.name
# ---------------------------------------------------------------- ropa y espada
from heroe_equipo import equipar  # noqa: E402
body = next(o for o in baked if o.name == "cuerpo")
baked += equipar(rig, body, TEXDIR)
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in baked)
print("TRIANGULOS:", tris, {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in baked})

# ---------------------------------------------------------------- clips del caballero (mismo esqueleto game_engine)
CLIPS = {c + "_Caballero": c for c in ("reposo", "guardia", "andar", "correr", "tajo", "hechizo", "conjurar", "rodar", "golpeado", "morir")}
made = retarget(ANIMS, rig, clips=CLIPS)   # el importador nombra las acciones <clip>_<armature>

# ---------------------------------------------------------------- exportar
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
for o in baked:
    o.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format="GLB", use_selection=True, export_skins=True,
                          export_animations=True, export_animation_mode="ACTIONS", export_apply=False,
                          export_image_format="WEBP", export_image_quality=88, export_yup=True, export_materials="EXPORT")


def fix_alpha(path):
    """MPFB deja todos los materiales en BLEND: piel, ojos y ropa pasan a OPAQUE; pelo, cejas y pestañas a MASK."""
    import json
    import struct
    data = open(path, "rb").read()
    jl = struct.unpack("<I", data[12:16])[0]
    js = json.loads(data[20:20 + jl])
    rest = data[20 + jl:]
    for m in js.get("materials", []):
        if m["name"] in ("pelo", "cejas", "pestanas"):
            m["alphaMode"], m["alphaCutoff"], m["doubleSided"] = "MASK", 0.25, True
        else:
            m["alphaMode"] = "OPAQUE"
            m["doubleSided"] = m["name"] in ("sobretunica", "fajin")
            m.pop("alphaCutoff", None)
    out = json.dumps(js, separators=(",", ":")).encode()
    out += b" " * ((4 - len(out) % 4) % 4)
    total = 12 + 8 + len(out) + len(rest)
    open(path, "wb").write(data[:8] + struct.pack("<I", total) + struct.pack("<I", len(out)) + b"JSON" + out + rest)


fix_alpha(OUT_GLB)
print("GLB:", OUT_GLB, os.path.getsize(OUT_GLB) // 1024, "KB")

# ---------------------------------------------------------------- renders de control (manos, rodillas, cuello)
if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 24; sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 800, 800
    sc.view_settings.view_transform = "AgX"
    world = bpy.data.worlds.new("cielo"); world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.55, 0.65, 0.8, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.7
    sc.world = world
    sun = bpy.data.objects.new("sol", bpy.data.lights.new("sol", "SUN"))
    sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), 0, math.radians(35)); sc.collection.objects.link(sun)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam

    def shot(name, target_bone, offset, lens=50, frame=None, action=None):
        rig.animation_data_create()
        rig.animation_data.action = bpy.data.actions.get(action) if action else None
        if not action:
            for pb in rig.pose.bones:
                pb.matrix_basis.identity()
        sc.frame_set(frame or 1)
        bpy.context.view_layer.update()
        tgt = rig.matrix_world @ rig.pose.bones[target_bone].head
        cam.location = tgt + Vector(offset)
        d = tgt - cam.location
        cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        cam.data.lens = lens
        sc.render.filepath = os.path.join(PREVIEW, name + ".png")
        bpy.ops.render.render(write_still=True)

    shot("cuerpo_reposo", "spine_01", (0.4, -3.2, 0.25), 50, 10, "reposo")
    shot("mano_reposo", "hand_l", (0.25, -0.45, 0.05), 85, 10, "reposo")
    shot("cara", "head", (0.15, -0.6, 0.05), 85, 10, "reposo")
