"""Animaciones de autor generadas por script sobre el esqueleto MPFB game_engine.

Cada clip se define con poses clave (direcciones de brazos en espacio mundo, inclinación y giro del
tronco, altura de cadera y cierre de los dedos) que se interpolan suavemente fotograma a fotograma.
Las piernas (th/sh/ft = muslo/pantorrilla/pie, peso w_legs) se apuntan como los brazos. Lo que no se especifica salen de un clip base capturado (guardia).
Ejes de Blender para el personaje: delante = -Y, izquierda = +X, arriba = +Z.
El cierre de dedos mezcla la mano abierta del clip "hechizo" con el puño del clip "guardia".
"""
import bpy
from mathutils import Matrix, Quaternion, Vector

FINGERS = [f"{f}_{i:02d}" for f in ("index", "middle", "ring", "pinky", "thumb") for i in (1, 2, 3)]
DIRS = ("ua_r", "la_r", "ua_l", "la_l", "th_r", "sh_r", "ft_r", "th_l", "sh_l", "ft_l")
BONE_OF = {"ua_r": "upperarm_r", "la_r": "lowerarm_r", "ua_l": "upperarm_l", "la_l": "lowerarm_l",
           "th_r": "thigh_r", "sh_r": "calf_r", "ft_r": "foot_r", "th_l": "thigh_l", "sh_l": "calf_l", "ft_l": "foot_l"}
LEG_KEYS = ("th_r", "sh_r", "ft_r", "th_l", "sh_l", "ft_l")


def _depth(b):
    d = 0
    while b.parent:
        d += 1
        b = b.parent
    return d


def _smooth(t):
    return t * t * (3 - 2 * t)


def _fill(keys):
    """Cada clave hereda los campos no indicados de la anterior."""
    out, cur = [], {"w_r": 0.0, "w_l": 0.0, "w_legs": 0.0, "pitch": 0.0, "twist": 0.0, "dz": 0.0, "curl_r": None, "curl_l": None}
    for k in keys:
        cur = dict(cur)
        cur.update(k)
        out.append(cur)
    return out


def _interp(keys, f):
    if f <= keys[0]["t"]:
        return keys[0]
    for a, b in zip(keys, keys[1:]):
        if a["t"] <= f <= b["t"]:
            u = _smooth((f - a["t"]) / max(1e-6, b["t"] - a["t"]))
            r = {}
            for key in set(a) | set(b):
                va, vb = a.get(key), b.get(key)
                if va is None or vb is None:
                    r[key] = vb if vb is not None else va
                elif isinstance(va, tuple):
                    r[key] = tuple(x + (y - x) * u for x, y in zip(va, vb))
                else:
                    r[key] = va + (vb - va) * u
            return r
    return keys[-1]


def _set_world(rig, pb, q_world, loc=None):
    mwq_inv = rig.matrix_world.to_quaternion().inverted()
    l = pb.matrix.to_translation() if loc is None else loc
    pb.matrix = Matrix.LocRotScale(l, mwq_inv @ q_world, Vector((1, 1, 1)))


def _world_q(rig, pb):
    return (rig.matrix_world @ pb.matrix).to_quaternion()


def author(rig, name, keys, base="guardia", pelvis_origin=False):
    sc = bpy.context.scene
    P = rig.pose.bones
    order = sorted(rig.data.bones, key=_depth)
    levels = sorted({_depth(b) for b in order})
    acts = bpy.data.actions

    def capture(act_name, frame):
        rig.animation_data.action = acts[act_name]
        sc.frame_set(frame)
        return {pb.name: pb.matrix.copy() for pb in P}, {pb.name: pb.rotation_quaternion.copy() for pb in P}

    open_hand = capture("hechizo", int(acts["hechizo"].frame_range[1] * 0.6))[1]
    fist = capture("guardia", 0)[1]
    base_len = int(acts[base].frame_range[1])
    base_cache = {}

    keys = _fill(keys)
    length = int(keys[-1]["t"])
    out = acts.new(name)
    for f in range(0, length + 1):
        bf = f % max(1, base_len)
        if bf not in base_cache:
            base_cache[bf] = capture(base, bf)[0]
        base_m = base_cache[bf]
        rig.animation_data.action = out
        s = _interp(keys, f)
        # 1) pose base (padres primero)
        for lv in levels:
            for b in order:
                if _depth(b) == lv:
                    P[b.name].matrix = base_m[b.name]
            bpy.context.view_layer.update()
        # 2) cadera y tronco
        if s["dz"] or pelvis_origin:
            pel = P["pelvis"]
            m = pel.matrix.copy()
            m.translation.z += s["dz"]
            if pelvis_origin:   # pelvis en el origen horizontal del personaje
                m.translation.x = 0.0
                m.translation.y = 0.0
            pel.matrix = m
            bpy.context.view_layer.update()
        for sp in ("spine_01", "spine_02", "spine_03"):
            q = Quaternion(Vector((1, 0, 0)), s["pitch"] / 3) @ Quaternion(Vector((0, 0, 1)), s["twist"] / 3)
            _set_world(rig, P[sp], q @ _world_q(rig, P[sp]))
            bpy.context.view_layer.update()
        # 3) brazos apuntados (mezcla con la base según el peso de cada lado)
        for d in DIRS:
            if d not in s or s[d] is None:
                continue
            w = s["w_legs"] if d in LEG_KEYS else (s["w_r"] if d.endswith("_r") else s["w_l"])
            if w <= 1e-4:
                continue
            pb = P[BONE_OF[d]]
            cur_q = _world_q(rig, pb)
            cur_dir = (cur_q @ Vector((0, 1, 0))).normalized()
            tgt = Vector(s[d]).normalized()
            want = (cur_dir * (1 - w) + tgt * w).normalized()
            _set_world(rig, pb, cur_dir.rotation_difference(want) @ cur_q)
            bpy.context.view_layer.update()
        # 4) dedos: 0 = mano abierta (hechizo), 1 = puño (guardia)
        for side in ("r", "l"):
            c = s.get("curl_" + side)
            if c is None:
                continue
            for fb in FINGERS:
                n = f"{fb}_{side}"
                if n in P:
                    P[n].rotation_quaternion = open_hand[n].slerp(fist[n], max(0.0, min(1.0, c)))
        bpy.context.view_layer.update()
        for pb in P:
            pb.keyframe_insert("rotation_quaternion", frame=f)
            if pb.name == "pelvis":
                pb.keyframe_insert("location", frame=f)
    out.use_fake_user = True
    rig.animation_data.action = None
    return name, length


# ----------------------------------------------------------------------------- clips
def author_all(rig):
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
    made = []
    # Conjurar (mano izquierda): recoge energía, carga con la mano en garra junto al hombro, lanza con la palma abierta.
    made.append(author(rig, "conjurar", [
        {"t": 0, "w_l": 0.0},
        {"t": 6, "w_l": 1.0, "ua_l": (0.25, -0.45, -0.85), "la_l": (-0.55, -0.8, 0.2), "curl_l": 0.15, "pitch": 0.12},
        {"t": 15, "ua_l": (0.6, -0.15, -0.35), "la_l": (0.1, -0.55, 0.85), "curl_l": 0.55, "pitch": -0.06, "twist": -0.25},
        {"t": 19, "ua_l": (0.12, -0.97, 0.12), "la_l": (0.05, -1.0, 0.1), "curl_l": 0.0, "pitch": 0.16, "twist": 0.3},
        {"t": 25, "w_l": 0.8},
        {"t": 33, "w_l": 0.0, "w_legs": 0.0, "pitch": 0.0, "twist": 0.0, "curl_l": None},
    ]))
    # Invocar (ambas manos): manos juntas, brazos al cielo, golpe hacia el suelo.
    made.append(author(rig, "invocar", [
        {"t": 0, "w_l": 0.0, "w_r": 0.0},
        {"t": 8, "w_l": 1.0, "w_r": 1.0, "ua_l": (0.35, -0.5, -0.75), "la_l": (-0.75, -0.6, 0.2),
         "ua_r": (-0.35, -0.5, -0.75), "la_r": (0.75, -0.6, 0.2), "curl_l": 0.35, "curl_r": 0.6, "pitch": 0.06},
        {"t": 18, "ua_l": (0.25, -0.15, 0.95), "la_l": (-0.08, -0.08, 1.0), "ua_r": (-0.25, -0.15, 0.95),
         "la_r": (0.08, -0.08, 1.0), "curl_l": 0.0, "pitch": -0.2, "dz": 0.02},
        {"t": 22, "ua_l": (0.5, -0.6, -0.6), "la_l": (0.2, -0.5, -0.85), "ua_r": (-0.5, -0.6, -0.6),
         "la_r": (-0.2, -0.5, -0.85), "pitch": 0.38, "dz": -0.13},
        {"t": 30},
        {"t": 40, "w_l": 0.0, "w_r": 0.0, "pitch": 0.0, "dz": 0.0, "curl_l": None, "curl_r": None},
    ]))
    # Martillazo a dos manos: carga por encima de la cabeza y golpe al suelo.
    made.append(author(rig, "martillazo", [
        {"t": 0, "w_l": 0.0, "w_r": 0.0},
        {"t": 9, "w_l": 1.0, "w_r": 1.0, "ua_r": (0.0, 0.25, 0.95), "la_r": (0.5, 0.5, 0.7),
         "ua_l": (0.0, 0.25, 0.95), "la_l": (-0.5, 0.5, 0.7), "pitch": -0.28, "twist": -0.2, "curl_l": 1.0, "curl_r": 1.0},
        {"t": 14, "ua_r": (0.3, -0.85, -0.4), "la_r": (0.45, -0.65, -0.6), "ua_l": (-0.3, -0.85, -0.4),
         "la_l": (-0.45, -0.65, -0.6), "pitch": 0.5, "twist": 0.1, "dz": -0.12},
        {"t": 18, "ua_r": (0.3, -0.7, -0.7), "la_r": (0.4, -0.5, -0.8), "ua_l": (-0.3, -0.7, -0.7),
         "la_l": (-0.4, -0.5, -0.8), "pitch": 0.6},
        {"t": 30, "w_l": 0.0, "w_r": 0.0, "pitch": 0.0, "twist": 0.0, "dz": 0.0, "curl_l": None},
    ]))
    # Disparo con arco (arco en la mano izquierda): levantar, tensar hasta la mejilla, soltar.
    made.append(author(rig, "disparo_arco", [
        {"t": 0, "w_l": 0.0, "w_r": 0.0},
        {"t": 8, "w_l": 1.0, "w_r": 1.0, "ua_l": (0.12, -0.97, 0.15), "la_l": (0.05, -1.0, 0.12), "curl_l": 0.9,
         "ua_r": (-0.3, -0.9, 0.1), "la_r": (0.2, -0.95, 0.1), "curl_r": 0.6, "twist": 0.45},
        {"t": 16, "ua_r": (-0.8, 0.45, 0.25), "la_r": (0.75, -0.55, 0.12), "curl_r": 0.75},
        {"t": 18, "la_r": (-0.5, 0.5, 0.1), "curl_r": 0.0},
        {"t": 26},
        {"t": 34, "w_l": 0.0, "w_r": 0.0, "twist": 0.0, "curl_l": None, "curl_r": None},
    ]))
    # Jinete: sentado en la silla (pelvis en el origen horizontal), muslos abiertos y adelantados, rodillas a ~85 grados,
    # pies en estribos, manos juntas con las riendas. Base: reposo.
    legs = {"w_legs": 1.0,
            "th_l": (0.45, -0.86, -0.28), "sh_l": (0.12, 0.25, -0.96), "ft_l": (0.05, -0.93, -0.36),
            "th_r": (-0.45, -0.86, -0.28), "sh_r": (-0.12, 0.25, -0.96), "ft_r": (-0.05, -0.93, -0.36)}
    hands = {"w_l": 1.0, "w_r": 1.0, "curl_l": 1.0, "curl_r": 1.0,
             "ua_l": (0.12, -0.25, -0.96), "la_l": (-0.28, -0.93, 0.2),
             "ua_r": (-0.12, -0.25, -0.96), "la_r": (0.28, -0.93, 0.2)}
    made.append(author(rig, "montado", [
        dict(legs, **hands, t=0, pitch=0.12, twist=0.0, dz=0.0),
        {"t": 12, "pitch": 0.05, "twist": 0.03, "dz": 0.012},
        {"t": 24, "pitch": 0.12, "twist": 0.0, "dz": 0.0},
        {"t": 36, "pitch": 0.19, "twist": -0.03, "dz": 0.012},
        {"t": 48, "pitch": 0.12, "twist": 0.0, "dz": 0.0},
    ], base="reposo", pelvis_origin=True))
    gh = dict(hands, ua_l=(0.1, -0.55, -0.83), la_l=(-0.25, -0.96, 0.1),
              ua_r=(-0.1, -0.55, -0.83), la_r=(0.25, -0.96, 0.1))
    gl = dict(legs, th_l=(0.45, -0.8, -0.4), th_r=(-0.45, -0.8, -0.4))
    made.append(author(rig, "montado_galope", [
        dict(gl, **gh, t=0, pitch=0.5, twist=0.0, dz=0.0),
        {"t": 7, "pitch": 0.58, "dz": 0.07},
        {"t": 14, "pitch": 0.5, "dz": 0.0},
    ], base="reposo", pelvis_origin=True))
    print("POSES:", ", ".join("%s(%d f)" % m for m in made))
    return made
