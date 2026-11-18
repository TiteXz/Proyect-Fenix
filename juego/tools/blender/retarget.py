"""Reasigna animaciones de la Universal Animation Library de Quaternius (CC0) a un esqueleto MPFB game_engine.

Método: para cada hueso y fotograma se toma el giro en espacio mundo respecto a la pose de reposo del
origen (delta = R_origen · R_reposo_origen⁻¹) y se aplica sobre la pose de reposo del destino
(R_destino = delta · R_reposo_destino). Así da igual que uno esté en T y el otro en A.
La pelvis además copia la traslación, escalada por la altura relativa de las caderas.
"""
import bpy
from mathutils import Matrix, Vector

# clip de Quaternius -> nombre en el juego
CLIPS = {
    "Idle_Loop": "reposo",
    "Sword_Idle": "guardia",
    "Walk_Loop": "andar",
    "Jog_Fwd_Loop": "correr",
    "Sword_Attack": "tajo",
    "Spell_Simple_Shoot": "hechizo",
    "Roll": "rodar",
    "Hit_Chest": "golpeado",
    "Death01": "morir",
}
RENAME = {"head": "Head"}   # destino -> origen cuando difieren


def _depth(b):
    d = 0
    while b.parent:
        d += 1
        b = b.parent
    return d


def retarget(src_glb, tgt, clips=CLIPS):
    objs_before, acts_before = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=src_glb)
    new_objs = [o for o in bpy.data.objects if o not in objs_before]
    src = next(o for o in new_objs if o.type == "ARMATURE")
    src_acts = {a.name.replace("_Armature", ""): a for a in bpy.data.actions if a not in acts_before}

    pairs = []
    for tb in tgt.data.bones:
        s = RENAME.get(tb.name, tb.name)
        if s in src.data.bones and tb.name != "Root":
            pairs.append((s, tb.name, _depth(tb)))
    pairs.sort(key=lambda p: p[2])
    levels = sorted({p[2] for p in pairs})

    smw, tmw = src.matrix_world.copy(), tgt.matrix_world.copy()
    tmw_q_inv = tmw.to_quaternion().inverted()
    s_rest = {s: (smw @ src.data.bones[s].matrix_local).to_quaternion() for s, _, _ in pairs}
    t_rest = {t: (tmw @ tgt.data.bones[t].matrix_local).to_quaternion() for _, t, _ in pairs}
    k = (tmw @ tgt.data.bones["pelvis"].head_local).z / (smw @ src.data.bones["pelvis"].head_local).z

    sc = bpy.context.scene
    src.animation_data_create()
    tgt.animation_data_create()
    made = []
    for sname, tname in clips.items():
        act = src_acts.get(sname)
        if act is None:
            print("RETARGET: falta el clip", sname)
            continue
        src.animation_data.action = act
        out = bpy.data.actions.new(tname)
        tgt.animation_data.action = out
        for pb in tgt.pose.bones:
            pb.rotation_mode = "QUATERNION"
            pb.matrix_basis = Matrix.Identity(4)
        prev = {}
        f0, f1 = (int(round(x)) for x in act.frame_range)
        for f in range(f0, f1 + 1):
            sc.frame_set(f)
            for lv in levels:
                for s, t, d in pairs:
                    if d != lv:
                        continue
                    spb, tpb = src.pose.bones[s], tgt.pose.bones[t]
                    delta = (smw @ spb.matrix).to_quaternion() @ s_rest[s].inverted()
                    rot = tmw_q_inv @ (delta @ t_rest[t])
                    loc = tpb.matrix.to_translation()
                    if t == "pelvis":
                        sp = (smw @ spb.matrix).to_translation()
                        loc = tmw.inverted() @ Vector((sp.x * k, sp.y * k, sp.z * k))
                    tpb.matrix = Matrix.LocRotScale(loc, rot, Vector((1, 1, 1)))
                bpy.context.view_layer.update()
            for s, t, d in pairs:
                tpb = tgt.pose.bones[t]
                q = tpb.rotation_quaternion.copy()
                if t in prev and prev[t].dot(q) < 0:   # continuidad: evita saltos de signo al interpolar
                    q.negate()
                    tpb.rotation_quaternion = q
                prev[t] = q
                tpb.keyframe_insert("rotation_quaternion", frame=f)
                if t == "pelvis":
                    tpb.keyframe_insert("location", frame=f)
        out.use_fake_user = True
        made.append((tname, f1 - f0))
    tgt.animation_data.action = None
    for pb in tgt.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    for o in new_objs:
        bpy.data.objects.remove(o, do_unlink=True)
    for a in src_acts.values():
        bpy.data.actions.remove(a)
    print("RETARGET:", ", ".join("%s(%d f)" % m for m in made))
    return made
