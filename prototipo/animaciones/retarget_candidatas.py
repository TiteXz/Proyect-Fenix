"""Reasigna clips de combate (Quaternius UAL1/UAL2, CC0) al esqueleto de caballero_soldado.glb y exporta un GLB.

Uso:
  blender -b -P retarget_candidatas.py -- <soldado.glb> <spec.json> <salida.glb>
spec.json = {"fuentes": {"ual1": "ruta.glb", "ual2": "ruta.glb"},
             "clips": [{"fuente": "ual2", "clip": "Sword_Block", "nombre": "bloqueo_izq_EP_ual2_1",
                        "espejo": false, "frames": [a, b] (opcional, en fotogramas del original a 30 fps)}]}
Método (igual que juego/tools/blender/retarget.py): giro mundial de cada hueso respecto a su reposo,
aplicado sobre el reposo del destino; pelvis copia la traslación escalada por la altura de caderas.
`espejo` refleja el movimiento respecto al plano X (izq.<->der.): el giro mundial (w,x,y,z)->(w,x,-y,-z)
se aplica al hueso homólogo (_l/_r) y la traslación X de la pelvis se invierte.
"""
import sys, json
import bpy
from mathutils import Matrix, Vector, Quaternion

RENAME = {"head": "Head"}
FPS = 30


def depth(b):
    d = 0
    while b.parent:
        d += 1
        b = b.parent
    return d


def mirror_name(n):
    if n.endswith("_l"): return n[:-2] + "_r"
    if n.endswith("_r"): return n[:-2] + "_l"
    return n


def mq(q):
    return Quaternion((q.w, q.x, -q.y, -q.z))


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    sold, spec_path, out = argv[:3]
    spec = json.load(open(spec_path))
    sc = bpy.context.scene
    sc.render.fps = FPS
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    bpy.ops.import_scene.gltf(filepath=sold)
    tgt = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    # el glb del soldado trae el armature rotado -90 en X (eje Z arriba del FBX): se endereza para que
    # quede de pie en Blender (Z arriba) y mire a -Y (= +Z en glTF)
    from mathutils import Euler
    tgt.rotation_mode = "XYZ"
    tgt.rotation_euler = Euler((0, 0, 0))
    bpy.context.view_layer.update()
    # (comprobado: con rotación 0 el soldado mira a -Y de Blender)
    tgt.animation_data_create()
    for t_ in list(tgt.animation_data.nla_tracks):
        tgt.animation_data.nla_tracks.remove(t_)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    tmw = tgt.matrix_world.copy()
    tmw_q_inv = tmw.to_quaternion().inverted()
    tmw_inv = tmw.inverted()

    by_src = {}
    for c in spec["clips"]:
        by_src.setdefault(c["fuente"], []).append(c)
    made = []
    for key, clips in by_src.items():
        ob, ab = set(bpy.data.objects), set(bpy.data.actions)
        bpy.ops.import_scene.gltf(filepath=spec["fuentes"][key])
        new = [o for o in bpy.data.objects if o not in ob]
        src = next(o for o in new if o.type == "ARMATURE")
        acts = {a.name.replace("_Armature", "").replace("Armature|", ""): a for a in bpy.data.actions if a not in ab}
        pairs = []
        for tb in tgt.data.bones:
            s = RENAME.get(tb.name, tb.name)
            if s in src.data.bones and tb.name != "Root":
                pairs.append((s, tb.name, depth(tb)))
        pairs.sort(key=lambda p: p[2])
        levels = sorted({p[2] for p in pairs})
        tnames = {t for _, t, _ in pairs}
        smw = src.matrix_world.copy()
        s_rest = {s: (smw @ src.data.bones[s].matrix_local).to_quaternion() for s, _, _ in pairs}
        t_rest = {t: (tmw @ tgt.data.bones[t].matrix_local).to_quaternion() for _, t, _ in pairs}
        k = (tmw @ tgt.data.bones["pelvis"].head_local).z / (smw @ src.data.bones["pelvis"].head_local).z
        src.animation_data_create()
        for c in clips:
            mir = c.get("espejo", False)
            out_act = bpy.data.actions.new(c["nombre"])
            tgt.animation_data.action = out_act
            for pb in tgt.pose.bones:
                pb.rotation_mode = "QUATERNION"
                pb.matrix_basis = Matrix.Identity(4)
            prev = {}
            fo = 0
            # partes: lista de {"clip", "t0", "t1"} (segundos relativos al inicio) que se encadenan; si no hay, el clip entero
            partes = c.get("partes") or [{"clip": c["clip"]}]
            for part in partes:
                act = acts.get(part["clip"])
                if act is None:
                    print("RETARGET: falta", part["clip"], list(acts)[:5]); continue
                src.animation_data.action = act
                a0, a1 = (int(round(x)) for x in act.frame_range)
                f0 = a0 + int(round(part.get("t0", 0) * FPS))
                f1 = a1 if part.get("t1") is None else a0 + int(round(part["t1"] * FPS))
                for f in range(f0, f1 + 1):
                    sc.frame_set(f)
                    for lv in levels:
                        for s, t, d in pairs:
                            if d != lv: continue
                            ss = mirror_name(s) if mir else s
                            spb, tpb = src.pose.bones[ss], tgt.pose.bones[t]
                            delta = (smw @ spb.matrix).to_quaternion() @ s_rest[ss].inverted()
                            if mir: delta = mq(delta)
                            rot = tmw_q_inv @ (delta @ t_rest[t])
                            loc = tpb.matrix.to_translation()
                            if t == "pelvis":
                                sp = (smw @ spb.matrix).to_translation()
                                x = -sp.x if mir else sp.x
                                loc = tmw_inv @ Vector((x * k, sp.y * k, sp.z * k))
                            tpb.matrix = Matrix.LocRotScale(loc, rot, Vector((1, 1, 1)))
                        bpy.context.view_layer.update()
                    fo += 1
                    for s, t, d in pairs:
                        tpb = tgt.pose.bones[t]
                        q = tpb.rotation_quaternion.copy()
                        if t in prev and prev[t].dot(q) < 0:
                            q.negate(); tpb.rotation_quaternion = q
                        prev[t] = q
                        tpb.keyframe_insert("rotation_quaternion", frame=fo)
                        if t == "pelvis":
                            tpb.keyframe_insert("location", frame=fo)
            out_act.use_fake_user = True
            made.append((c["nombre"], (fo - 1) / FPS))
        tgt.animation_data.action = None
        for pb in tgt.pose.bones:
            pb.matrix_basis = Matrix.Identity(4)
        for o in new:
            bpy.data.objects.remove(o, do_unlink=True)
        for a in acts.values():
            bpy.data.actions.remove(a)
    # NLA: una pista por clip para que el exportador los incluya
    for a in bpy.data.actions:
        tr = tgt.animation_data.nla_tracks.new()
        tr.name = a.name
        st = tr.strips.new(a.name, 1, a)
        st.name = a.name
    tgt.animation_data.action = None
    sc.frame_start, sc.frame_end = 1, 300
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_animations=True,
                              export_animation_mode="NLA_TRACKS", export_force_sampling=True,
                              export_optimize_animation_size=False, export_image_format="WEBP",
                              export_yup=True, export_apply=False)
    print("RETARGET OK", json.dumps(made))


main()
