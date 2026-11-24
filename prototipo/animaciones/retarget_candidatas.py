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

Extensiones (clips de magia, ver gen_magia.py); todas opcionales, los clips antiguos no las usan:
  "partes": [{"clip","t0","t1","dur"}]  "dur" (s) re-temporiza la parte (muestreo a fotogramas fraccionarios con mezcla)
  "espejo_grupo": ["brazo_l"|"brazo_r"]  refleja solo ese brazo (el resto sin espejo salvo "espejo")
  "sobre": {"brazo_l": ["ual2","Idle_Shield_Loop", [[t,w],..]], "brazo_r": ["ual1","Sword_Idle"]}  el brazo sigue una pose fija de otro
     clip (relativa al hombro); el 3er elemento opcional es el peso de mezcla con el clip base (0 = pose fija, 1 = base)
  "ajustes": [{"b": hueso, "modo": "w"|"l", "k": [[t, rx, ry, rz], ...], "osc": {"amp":[..],"hz":f,"fase":p,"env":[[t,g],..]}}]
     rotaciones aditivas (grados) sobre el movimiento original. modo "w": ejes del personaje (x=derecha, y=delante, z=arriba)
     aplicadas en el pivote del hueso a toda su cadena; modo "l": ejes del propio hueso (dedos). "b":"pelvis_loc" = desplazamiento (m).
     "lin": true = interpolacion lineal; si no, suavizada por tramos.
"""
import sys, json, math
import bpy
from mathutils import Matrix, Vector, Quaternion, Euler

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


def capturar(src, act, t):
    """Pose local (rotacion, posicion) de todos los huesos de src en el segundo t de la accion."""
    src.animation_data.action = act
    a0 = int(round(act.frame_range[0]))
    bpy.context.scene.frame_set(a0 + int(round(t * FPS)))
    return {pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in src.pose.bones}


def capturar_f(src, act, f):
    """Pose local (rotacion, posicion) en el fotograma entero f de la accion."""
    src.animation_data.action = act
    bpy.context.scene.frame_set(f)
    return {pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in src.pose.bones}


def aplicar(src, pa, pb_, u):
    src.animation_data.action = None
    for n, (qa, la) in pa.items():
        qb, lb = pb_[n]
        if qa.dot(qb) < 0: qb = -qb
        src.pose.bones[n].rotation_quaternion = qa.slerp(qb, u)
        src.pose.bones[n].location = la.lerp(lb, u)
    bpy.context.view_layer.update()


def velocidad(m):
    """Velocidad de avance (m/s) estimada por la zancada: velocidad en Y del pie mas bajo (apoyado) respecto al personaje."""
    if len(m) < 4: return 0.0
    zmin = min(min(r[1], r[3]) for r in m)
    v = []
    for a, b in zip(m, m[1:]):
        # pie apoyado = el mas bajo (cerca del suelo); su desplazamiento respecto a la pelvis es lo que avanza el personaje
        if a[1] <= a[3] and a[1] < zmin + 0.04: v.append(abs((b[0] - b[4]) - (a[0] - a[4])) * FPS)
        elif a[3] < a[1] and a[3] < zmin + 0.04: v.append(abs((b[2] - b[4]) - (a[2] - a[4])) * FPS)
    v.sort()
    return round(v[len(v) // 2], 2) if v else 0.0


def pose_escudo(spec):
    """Pose local del brazo izq. con el escudo al frente (Idle_Shield_Loop de UAL2), para las variantes EE."""
    if not any(c.get("escudo") for c in spec["clips"]): return {}
    ob, ab = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=spec["fuentes"]["ual2"])
    new = [o for o in bpy.data.objects if o not in ob]
    src = next(o for o in new if o.type == "ARMATURE")
    acts = {a.name.replace("_Armature", "").replace("Armature|", ""): a for a in bpy.data.actions if a not in ab}
    src.animation_data_create()
    p = capturar(src, acts["Idle_Shield_Loop"], 0.0)
    huesos = [b.name for b in src.data.bones if b.name.endswith("_l") and any(x in b.name for x in ("upperarm", "lowerarm", "hand", "index", "middle", "ring", "pinky", "thumb"))]
    res = {n: p[n] for n in huesos}
    for a in [a for a in bpy.data.actions if a not in ab]: bpy.data.actions.remove(a)
    for o in new: bpy.data.objects.remove(o, do_unlink=True)
    return res


ARM_KEYS = ("upperarm", "lowerarm", "hand", "index", "middle", "ring", "pinky", "thumb")
RZ180 = Quaternion((0, 0, 0, 1))  # giro de 180 grados sobre Z: marco del personaje (x=der., y=delante) <-> Blender (-X, -Y)


def grupo_huesos(g, nombres):
    lado = g[-1]
    return {n for n in nombres if n.endswith("_" + lado) and any(k in n for k in ARM_KEYS)}


def poses_sobre(spec):
    """Poses fijas de brazo (hueso -> (rot, loc)) de otros clips, para los brazos que no lanzan (escudo, espada)."""
    claves = {tuple(v[:2]) for c in spec["clips"] for v in (c.get("sobre") or {}).values()}
    res = {}
    for fuente, clip in claves:
        ob, ab = set(bpy.data.objects), set(bpy.data.actions)
        bpy.ops.import_scene.gltf(filepath=spec["fuentes"][fuente])
        new = [o for o in bpy.data.objects if o not in ob]
        src = next(o for o in new if o.type == "ARMATURE")
        acts = {a.name.replace("_Armature", "").replace("Armature|", ""): a for a in bpy.data.actions if a not in ab}
        src.animation_data_create()
        res[(fuente, clip)] = capturar(src, acts[clip], 0.0)
        for a in [a for a in bpy.data.actions if a not in ab]: bpy.data.actions.remove(a)
        for o in new: bpy.data.objects.remove(o, do_unlink=True)
    return res


def suave(u):
    return u * u * (3 - 2 * u)


def curva(k, t, lin=False):
    """Interpola [[t, v...], ...] (extremos fijos)."""
    if t <= k[0][0]: return list(k[0][1:])
    if t >= k[-1][0]: return list(k[-1][1:])
    for a, b in zip(k, k[1:]):
        if a[0] <= t <= b[0]:
            u = (t - a[0]) / max(1e-9, b[0] - a[0])
            u = u if lin else suave(u)
            return [x + (y - x) * u for x, y in zip(a[1:], b[1:])]


def evaluar_ajustes(ajs, t):
    """-> (euler por hueso modo w, euler por hueso modo l, desplazamiento pelvis en marco del personaje)."""
    w, l, pel = {}, {}, [0.0, 0.0, 0.0]
    for a in ajs:
        v = curva(a["k"], t, a.get("lin", False)) if a.get("k") else [0.0, 0.0, 0.0]
        o = a.get("osc")
        if o:
            g = curva(o["env"], t, True)[0] if o.get("env") else 1.0
            sn = math.sin(2 * math.pi * (o["hz"] * t + o.get("fase", 0.0)))
            v = [x + am * sn * g for x, am in zip(v, o["amp"])]
        if a["b"] == "pelvis_loc":
            pel = [x + y for x, y in zip(pel, v)]
            continue
        d = l if a.get("modo") == "l" else w
        d[a["b"]] = [x + y for x, y in zip(d.get(a["b"], [0, 0, 0]), v)]
    return w, l, pel


def quat_personaje(e):
    """Euler (grados, ejes del personaje) -> cuaternion en ejes de Blender."""
    q = Euler((math.radians(e[0]), math.radians(e[1]), math.radians(e[2])), "XYZ").to_quaternion()
    return RZ180 @ q @ RZ180.inverted()


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
    escudo_pose_global = pose_escudo(spec)
    sobre_poses = poses_sobre(spec)
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
        escudo_pose = escudo_pose_global
        nombres_src = [b.name for b in src.data.bones]
        sname = {t: s_ for s_, t, _ in pairs}
        sobre_rel = {}
        for ky in {tuple(v[:2]) for c in clips for v in (c.get("sobre") or {}).values()}:
            for bn, (q_, l_) in sobre_poses[ky].items():
                if bn in src.pose.bones: src.pose.bones[bn].rotation_quaternion = q_
            bpy.context.view_layer.update()
            sobre_rel[ky] = {t: (smw @ src.pose.bones[s_].matrix).to_quaternion() @ s_rest[s_].inverted() for s_, t, _ in pairs}
        src.animation_data.action = None
        for c in clips:
            mir = c.get("espejo", False)
            mgrupo = set().union(*[grupo_huesos(g, tnames) for g in c.get("espejo_grupo", [])]) if c.get("espejo_grupo") else set()
            sobre_c = c.get("sobre") or {}
            sobre_t = set().union(*[grupo_huesos(g, tnames) for g in sobre_c]) if sobre_c else set()
            ajs = c.get("ajustes") or []
            out_act = bpy.data.actions.new(c["nombre"])
            tgt.animation_data.action = out_act
            for pb in tgt.pose.bones:
                pb.rotation_mode = "QUATERNION"
                pb.matrix_basis = Matrix.Identity(4)
            prev = {}
            fo = 0
            muestras = []
            # partes: lista de {"clip", "t0", "t1"} (segundos relativos al inicio) que se encadenan; si no hay, el clip entero
            partes = c.get("partes") or [{"clip": c["clip"]}]
            for part in partes:
                if "mezcla" in part:
                    mz = part["mezcla"]
                    pa = capturar(src, acts[mz["de"][0]], mz["de"][1])
                    pb_ = capturar(src, acts[mz["a"][0]], mz["a"][1])
                    n = max(2, int(round(mz["dur"] * FPS)))
                    pasos = [("mix", pa, pb_, i_ / (n - 1)) for i_ in range(n)]
                else:
                    act = acts.get(part["clip"])
                    if act is None:
                        print("RETARGET: falta", part["clip"], list(acts)[:5]); continue
                    a0, a1 = (int(round(x)) for x in act.frame_range)
                    f0 = a0 + int(round(part.get("t0", 0) * FPS))
                    f1 = a1 if part.get("t1") is None else a0 + int(round(part["t1"] * FPS))
                    fr = list(range(f0, f1 + 1))
                    if part.get("invertir"): fr.reverse()
                    pasos = [("act", act, f) for f in fr]
                    if part.get("dur"):   # re-temporizado: n muestras a fotogramas fraccionarios (mezcla de los dos vecinos)
                        n = max(1, int(round(part["dur"] * FPS)))
                        ult = part is partes[-1] and not c.get("bucle")
                        pasos = []
                        for i_ in range(n + (1 if ult else 0)):
                            ff = f0 + (f1 - f0) * i_ / n
                            fl = int(math.floor(ff + 1e-6)); u = ff - fl
                            if u < 1e-3 or fl >= f1:
                                pasos.append(("act", act, min(fl, f1)))
                            else:
                                pasos.append(("mixf", act, fl, u))
                for paso in pasos:
                    if paso[0] == "act":
                        src.animation_data.action = paso[1]
                        sc.frame_set(paso[2])
                    elif paso[0] == "mixf":
                        pa = capturar_f(src, paso[1], paso[2]); pb_ = capturar_f(src, paso[1], paso[2] + 1)
                        aplicar(src, pa, pb_, paso[3])
                    else:
                        aplicar(src, paso[1], paso[2], paso[3])
                    if c.get("escudo"):
                        for bn, (q_, l_) in escudo_pose.items():
                            src.pose.bones[bn].rotation_quaternion = q_
                        bpy.context.view_layer.update()
                    # giro mundial de cada hueso respecto a su reposo (precalculado; la pose fuente no cambia en el bucle de abajo)
                    raw = {}
                    for s, t, d in pairs:
                        raw[s] = (smw @ src.pose.bones[s].matrix).to_quaternion() @ s_rest[s].inverted()
                    DL = {}
                    for s, t, d in pairs:   # 'pairs' va ordenado por profundidad: el padre ya esta calculado
                        pn = tgt.data.bones[t].parent
                        pn = pn.name if pn else None
                        if mir:
                            DL[t] = mq(raw[mirror_name(s)])
                        elif t in mgrupo and pn in DL:   # brazo reflejado: movimiento relativo al hombro, sobre el tronco real
                            DL[t] = DL[pn] @ mq(raw[mirror_name(sname[pn])].inverted() @ raw[mirror_name(s)])
                        elif t in sobre_t and pn in DL:  # brazo que sigue una pose fija: relativo al hombro
                            sv = sobre_c["brazo_" + t[-1]]
                            ky = tuple(sv[:2])
                            DL[t] = DL[pn] @ (sobre_rel[ky][pn].inverted() @ sobre_rel[ky][t])
                            if len(sv) > 2:   # peso (0 = pose fija, 1 = movimiento del clip base) segun el tiempo
                                DL[t] = DL[t].slerp(raw[s], curva(sv[2], fo / FPS, True)[0])
                        else:
                            DL[t] = raw[s]
                    spel = (smw @ src.pose.bones["pelvis"].matrix).to_translation()
                    if ajs:
                        aw, al, apel = evaluar_ajustes(ajs, fo / FPS)
                    else:
                        aw, al, apel = {}, {}, (0, 0, 0)
                    dacc = {}
                    for lv in levels:
                        for s, t, d in pairs:
                            if d != lv: continue
                            tpb = tgt.pose.bones[t]
                            rot = tmw_q_inv @ (DL[t] @ t_rest[t])
                            loc = tpb.matrix.to_translation()
                            if t == "pelvis":
                                x = -spel.x if mir else spel.x
                                loc = tmw_inv @ Vector((x * k, spel.y * k, spel.z * k))
                                if ajs: loc = loc + Vector((-apel[0], -apel[1], apel[2]))
                            par = tgt.data.bones[t].parent
                            dp = dacc.get(par.name) if par else None
                            if dp is not None: rot = dp @ rot
                            if t in aw or t in al:
                                if t in aw: dw = quat_personaje(aw[t])
                                else:
                                    e_ = al[t]
                                    dw = rot @ Euler((math.radians(e_[0]), math.radians(e_[1]), math.radians(e_[2])), "XYZ").to_quaternion() @ rot.inverted()
                                dp = dw if dp is None else dw @ dp
                                rot = dw @ rot
                            if dp is not None: dacc[t] = dp
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
                    fp = tgt.pose.bones
                    muestras.append((fp["foot_l"].head.y, fp["foot_l"].head.z, fp["foot_r"].head.y, fp["foot_r"].head.z, fp["pelvis"].head.y))
            out_act.use_fake_user = True
            made.append((c["nombre"], (fo - 1) / FPS, velocidad(muestras)))
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
    json.dump(made, open(out.rsplit(".", 1)[0] + ".medidas.json", "w"))
    print("RETARGET OK", json.dumps(made))


main()
