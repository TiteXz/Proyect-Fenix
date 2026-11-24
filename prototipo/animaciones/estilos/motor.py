"""Motor de autoría de animaciones de combate (Blender, sin interfaz). Recreaciones ORIGINALES de estilo.

Parte de clips CC0 de Quaternius (UAL1/UAL2) reasignados al esqueleto de caballero_soldado.glb (mismo método que
../retarget_candidatas.py) y los EDITA: re-temporiza por nudos (anticipación larga / golpe seco / recuperación),
encadena y funde tramos, añade giro de cuerpo (pelvis), torsión de torso, mirada, inclinación, descenso de cadera y
MOVIMIENTO DE RAÍZ real (la pelvis es el hueso raíz del esqueleto: no existe hueso Root). Ningún dato de ningún juego.

Convenciones (ejes de Blender con el armature enderezado, como en retarget_candidatas.py):
  el personaje mira a -Y (= +Z en glTF), su izquierda es +X. Giro (yaw) positivo = gira a la IZQUIERDA (antihorario visto desde arriba).
  Desplazamiento: (t, adelante_m, izquierda_m) respecto a la orientación inicial del clip (marco fijo, no gira con el cuerpo).
"""
import bpy, math, json, sys
from mathutils import Matrix, Vector, Quaternion, Euler

FPS = 30
Q0 = Quaternion((1, 0, 0, 0))


# ---------------------------------------------------------------- utilidades de curvas
def pchip(knots):
    """Interpolador cúbico monótono (Fritsch-Carlson) por nudos [(x, y)]; fuera de rango se sujeta a los extremos."""
    xs = [float(k[0]) for k in knots]; ys = [float(k[1]) for k in knots]; n = len(xs)
    if n == 1: return lambda x: ys[0]
    h = [xs[i + 1] - xs[i] for i in range(n - 1)]; d = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
    m = [0.0] * n
    if n == 2: m = [d[0], d[0]]
    else:
        m[0], m[-1] = d[0], d[-1]
        for i in range(1, n - 1):
            m[i] = 0.0 if d[i - 1] * d[i] <= 0 else 2 * d[i - 1] * d[i] / (d[i - 1] + d[i])
        for i in range(n - 1):
            if d[i] == 0: m[i] = m[i + 1] = 0.0
            else:
                a, b = m[i] / d[i], m[i + 1] / d[i]; s = a * a + b * b
                if s > 9:
                    tt = 3 / math.sqrt(s); m[i] = tt * a * d[i]; m[i + 1] = tt * b * d[i]

    def f(x):
        if x <= xs[0]: return ys[0]
        if x >= xs[-1]: return ys[-1]
        i = 0
        while xs[i + 1] < x: i += 1
        u = (x - xs[i]) / h[i]; u2 = u * u; u3 = u2 * u
        return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h[i] * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h[i] * m[i + 1]
    return f


def smooth(u):
    u = min(max(u, 0.0), 1.0)
    return u * u * (3 - 2 * u)


def curva(knots, ndim=1):
    """[(t, v...)] -> f(t) devolviendo tupla de ndim valores (cero si no hay nudos)."""
    if not knots: return lambda t: (0.0,) * ndim
    fs = [pchip([(k[0], k[1 + i]) for k in knots]) for i in range(ndim)]
    return lambda t: tuple(f(t) for f in fs)


# ---------------------------------------------------------------- esqueleto y reasignación
def depth(b):
    d = 0
    while b.parent: d += 1; b = b.parent
    return d


def mirror_name(n):
    if n.endswith("_l"): return n[:-2] + "_r"
    if n.endswith("_r"): return n[:-2] + "_l"
    return n


def mq(q): return Quaternion((q.w, q.x, -q.y, -q.z))


_TORSO = ("spine", "clavicle", "upperarm", "lowerarm", "hand", "index", "middle", "ring", "pinky", "thumb", "neck", "head")
MASCARAS = {"torso": lambda n: n.startswith(_TORSO), "piernas": lambda n: n.startswith(("thigh", "calf", "foot", "ball", "pelvis")),
            "brazo_d": lambda n: n.endswith("_r") and n.startswith(("clavicle", "upperarm", "lowerarm", "hand", "index", "middle", "ring", "pinky", "thumb"))}


class Banco:
    """Carga el soldado y las fuentes UAL, y muestrea clips reasignados al esqueleto del soldado."""

    def __init__(self, soldado, fuentes):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        sc = bpy.context.scene; sc.render.fps = FPS; self.sc = sc
        bpy.ops.import_scene.gltf(filepath=soldado)
        self.tgt = next(o for o in bpy.data.objects if o.type == "ARMATURE")
        t = self.tgt
        t.rotation_mode = "XYZ"; t.rotation_euler = Euler((0, 0, 0)); bpy.context.view_layer.update()
        t.animation_data_create()
        for tr in list(t.animation_data.nla_tracks): t.animation_data.nla_tracks.remove(tr)
        for a in list(bpy.data.actions): bpy.data.actions.remove(a)
        self.tmw = t.matrix_world.copy(); self.tmw_q_inv = self.tmw.to_quaternion().inverted(); self.tmw_inv = self.tmw.inverted()
        for pb in t.pose.bones: pb.rotation_mode = "QUATERNION"
        self.orden = [b.name for b in t.data.bones]   # padres antes que hijos
        self.padre = {b.name: (b.parent.name if b.parent else None) for b in t.data.bones}
        self.rest = {b.name: (self.tmw @ b.matrix_local).to_quaternion() for b in t.data.bones}
        self.lrest = {n: (self.rest[self.padre[n]].inverted() @ self.rest[n]) if self.padre[n] else self.rest[n] for n in self.orden}
        self.src = {}
        for key, path in fuentes.items():
            ob, ab = set(bpy.data.objects), set(bpy.data.actions)
            bpy.ops.import_scene.gltf(filepath=path)
            new = [o for o in bpy.data.objects if o not in ob]
            s = next(o for o in new if o.type == "ARMATURE"); s.animation_data_create()
            acts = {a.name.replace("_Armature", "").replace("Armature|", "").split(".0")[0]: a for a in bpy.data.actions if a not in ab}
            pairs = []
            for tb in t.data.bones:
                sn = "head" if tb.name == "Head" else tb.name
                if sn in s.data.bones: pairs.append((sn, tb.name, depth(tb)))
            pairs.sort(key=lambda p: p[2])
            smw = s.matrix_world.copy()
            self.src[key] = dict(ob=s, acts=acts, pairs=pairs, levels=sorted({p[2] for p in pairs}), smw=smw,
                                 srest={sn: (smw @ s.data.bones[sn].matrix_local).to_quaternion() for sn, _, _ in pairs},
                                 trest={tn: (self.tmw @ t.data.bones[tn].matrix_local).to_quaternion() for _, tn, _ in pairs},
                                 k=(self.tmw @ t.data.bones["pelvis"].head_local).z / (smw @ s.data.bones["pelvis"].head_local).z)
        self.cache = {}

    def muestrear(self, key, clip, espejo=False):
        """Lista de fotogramas a 30 fps: ({hueso: Quaternion base local}, Vector loc pelvis)."""
        ck = (key, clip, espejo)
        if ck in self.cache: return self.cache[ck]
        S = self.src[key]; s = S["ob"]; act = S["acts"][clip]; t = self.tgt; sc = self.sc
        a0, a1 = (int(round(x)) for x in act.frame_range)
        for pb in t.pose.bones: pb.matrix_basis = Matrix.Identity(4)
        s.animation_data.action = act
        res = []
        for f in range(a0, a1 + 1):
            sc.frame_set(f)
            for lv in S["levels"]:
                for sn, tn, d in S["pairs"]:
                    if d != lv: continue
                    ss = mirror_name(sn) if espejo else sn
                    spb, tpb = s.pose.bones[ss], t.pose.bones[tn]
                    delta = (S["smw"] @ spb.matrix).to_quaternion() @ S["srest"][ss].inverted()
                    if espejo: delta = mq(delta)
                    rot = self.tmw_q_inv @ (delta @ S["trest"][tn])
                    loc = tpb.matrix.to_translation()
                    if tn == "pelvis":
                        sp = (S["smw"] @ spb.matrix).to_translation()
                        x = -sp.x if espejo else sp.x; k = S["k"]
                        loc = self.tmw_inv @ Vector((x * k, sp.y * k, sp.z * k))
                    tpb.matrix = Matrix.LocRotScale(loc, rot, Vector((1, 1, 1)))
                bpy.context.view_layer.update()
            res.append(({pb.name: pb.rotation_quaternion.copy() for pb in t.pose.bones}, t.pose.bones["pelvis"].location.copy()))
        s.animation_data.action = None
        for pb in t.pose.bones: pb.matrix_basis = Matrix.Identity(4)
        self.cache[ck] = res
        return res

    # ------------------------------------------------------------ composición
    def pose_capa(self, capa, t):
        """Pose de una capa en el instante t de salida (warp por nudos y muestreo interpolado)."""
        m = self.muestrear(capa["f"], capa["clip"], capa.get("espejo", False))
        ts = capa["_warp"](t) * FPS
        ts = min(max(ts, 0.0), len(m) - 1.0)
        i = min(int(ts), len(m) - 2); u = ts - i
        (qa, la), (qb, lb) = m[i], m[i + 1]
        q = {}
        for n in qa:
            a, b = qa[n], qb[n]
            if a.dot(b) < 0: b = -b
            q[n] = a.slerp(b, u)
        return q, la.lerp(lb, u)

    def componer(self, c):
        dur = c["dur"]; n = int(round(dur * FPS)) + 1
        capas = c["capas"]
        for k, cp in enumerate(capas):
            cp["_warp"] = pchip(cp["warp"])
            cp.setdefault("ini", 0.0); cp.setdefault("fin", dur); cp.setdefault("fade", 0.12)
        yawf = curva(c.get("yaw"), 1); torf = curva(c.get("torso"), 1); cabf = curva(c.get("cabeza"), 1)
        incf = curva(c.get("inclina"), 1); dspf = curva(c.get("desp"), 2); bajf = curva(c.get("baja"), 1)
        hw = {b: curva(k, 3) for b, k in (c.get('huesos') or {}).items()}; hl = {b: curva(k, 3) for b, k in (c.get('huesos_local') or {}).items()}
        out = []; raw0 = None
        for fr in range(n):
            t = fr / FPS
            poses, ws, cps = [], [], []
            for cp in capas:
                w = 1.0
                if cp["ini"] > 1e-6: w *= smooth((t - cp["ini"]) / cp["fade"])
                if cp["fin"] < dur - 1e-6: w *= 1.0 - smooth((t - (cp["fin"] - cp["fade"])) / cp["fade"])
                if w > 1e-5: poses.append(self.pose_capa(cp, t)); ws.append(w); cps.append(cp)
            if not poses: poses.append(self.pose_capa(capas[-1], t)); ws.append(1.0); cps.append(capas[-1])
            q, loc = poses[0]; acc = ws[0]
            for (q2, l2), w2, cp2 in zip(poses[1:], ws[1:], cps[1:]):
                solo = MASCARAS[cp2["solo"]] if cp2.get("solo") else None
                if solo is None:       # fundido normal (pesos normalizados)
                    u = w2 / (acc + w2)
                    for nme in q:
                        a, b = q[nme], q2[nme]
                        if a.dot(b) < 0: b = -b
                        q[nme] = a.slerp(b, u)
                    loc = loc.lerp(l2, u); acc += w2
                else:                  # capa enmascarada: sobrescribe solo esos huesos
                    for nme in q:
                        if not solo(nme): continue
                        a, b = q[nme], q2[nme]
                        if a.dot(b) < 0: b = -b
                        q[nme] = a.slerp(b, w2)
            if raw0 is None: raw0 = loc.copy()
            out.append(self.editar(q, loc, t, yawf(t)[0], torf(t)[0], cabf(t)[0], incf(t)[0], dspf(t), bajf(t)[0], raw0, {b: f(t) for b, f in hw.items()}, {b: f(t) for b, f in hl.items()}))
        return out

    def editar(self, q, loc, t, yaw, tor, cab, inc, dsp, baja, loc0, hw, hl):
        """Aplica giro de cuerpo, torsión, mirada, inclinación, descenso y desplazamiento de raíz (todo en ejes del mundo)."""
        rz = lambda a: Quaternion((0, 0, 1), math.radians(a))
        lat = rz(yaw) @ Vector((1, 0, 0))
        R = {"pelvis": rz(yaw)}
        for nme, ft, fi in (("spine_01", 0.30, 0.25), ("spine_02", 0.40, 0.40), ("spine_03", 0.30, 0.35)):
            r = rz(tor * ft)
            if abs(inc) > 1e-6: r = r @ Quaternion(lat, math.radians(inc * fi))
            R[nme] = r
        if abs(cab) > 1e-6:
            R["neck_01"] = rz(cab * 0.4); R["head"] = rz(cab * 0.6)
        iyaw = rz(-yaw)
        for nme, (x, y, z) in hw.items():   # giros extra en ejes del personaje (X izq., Y atrás, Z arriba), grados
            e = rz(yaw) @ Euler((math.radians(x), math.radians(y), math.radians(z)), "XYZ").to_quaternion() @ iyaw
            R[nme] = e @ R[nme] if nme in R else e
        O = {}; res = {}
        for nme in self.orden:
            p = self.padre[nme]
            A = (O[p] if p else Q0) @ self.lrest[nme]
            B = q[nme]
            if nme in hl: B = B @ Euler(tuple(math.radians(v) for v in hl[nme]), 'XYZ').to_quaternion()
            r = R.get(nme)
            if r is not None:
                res[nme] = A.inverted() @ r @ A @ B; O[nme] = r @ A @ B
            else:
                res[nme] = B; O[nme] = A @ B
        # pelvis: la oscilación horizontal de la fuente gira con el cuerpo; se suma el descenso y el avance de raíz
        if loc0 is None: loc0 = loc
        rw = self.rest["pelvis"]
        w = rw @ loc; w0 = rw @ loc0
        h = Vector((w.x - w0.x, w.y - w0.y, 0)); h = rz(yaw) @ h
        wn = Vector((w0.x + h.x, w0.y + h.y, w.z + baja))
        fwd, left = dsp
        wn += Vector((left, -fwd, 0))
        return res, rw.inverted() @ wn, Vector((fwd, left, yaw))

    # ------------------------------------------------------------ salida
    def escribir(self, c, frames):
        t = self.tgt
        act = bpy.data.actions.new(c["nombre"]); t.animation_data.action = act
        n = len(frames)
        prev = {}
        qs = {b: [] for b in self.orden}
        for q, loc, _ in frames:
            for b in self.orden:
                x = q[b].copy()
                if b in prev and prev[b].dot(x) < 0: x.negate()
                prev[b] = x; qs[b].append(x)
        for b in self.orden:
            for i in range(4):
                fc = act.fcurves.new(f'pose.bones["{b}"].rotation_quaternion', index=i, action_group=b)
                fc.keyframe_points.add(n)
                fc.keyframe_points.foreach_set("co", [v for k in range(n) for v in (k + 1, qs[b][k][i])])
                fc.keyframe_points.foreach_set("interpolation", [1] * n)  # lineal (muestreo denso a 30 fps)
                fc.update()
        for i in range(3):
            fc = act.fcurves.new('pose.bones["pelvis"].location', index=i, action_group="pelvis")
            fc.keyframe_points.add(n)
            fc.keyframe_points.foreach_set("co", [v for k in range(n) for v in (k + 1, frames[k][1][i])])
            fc.keyframe_points.foreach_set("interpolation", [1] * n)
            fc.update()
        act.use_fake_user = True
        t.animation_data.action = None
        return act

    def exportar(self, out):
        t = self.tgt
        for pb in t.pose.bones: pb.matrix_basis = Matrix.Identity(4)
        for a in bpy.data.actions:
            if not a.name.startswith("estilo_"): continue
            tr = t.animation_data.nla_tracks.new(); tr.name = a.name
            st = tr.strips.new(a.name, 0, a); st.name = a.name
        t.animation_data.action = None
        # quitar fuentes (armatures UAL) para que no se exporten
        for k, S in self.src.items():
            for o in [S["ob"]] + list(S["ob"].children_recursive): bpy.data.objects.remove(o, do_unlink=True)
        self.sc.frame_start, self.sc.frame_end = 0, 400
        bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_animations=True, export_animation_mode="NLA_TRACKS",
                                  export_force_sampling=True, export_optimize_animation_size=False, export_image_format="WEBP",
                                  export_yup=True, export_apply=False)


def construir(soldado, fuentes, clips, salida, manifiesto, juego, titulo):
    banco = Banco(soldado, fuentes)
    meta = []
    for c in clips:
        frames = banco.componer(c)
        banco.escribir(c, frames)
        fin = frames[-1][2]; ini = frames[0][2]
        desp = math.hypot(fin[0] - ini[0], fin[1] - ini[1]); giro = fin[2] - ini[2]
        # recorrido total del suelo (longitud de la trayectoria) y giro acumulado máximo
        trayecto = sum(math.hypot(b[2][0] - a[2][0], b[2][1] - a[2][1]) for a, b in zip(frames, frames[1:]))
        e = {"clip": c["nombre"], "categoria": c.get("categoria", "combate"), "fuente": "Quaternius UAL1/UAL2 Standard (CC0 1.0), editado y recombinado",
             "licencia": "CC0 1.0 (base) + edición propia", "original": c["original"], "duracion": round((len(frames) - 1) / FPS, 2),
             "bucle": bool(c.get("bucle")), "cubre": c.get("cubre", ""), "espejo": False, "nota": c.get("nota", ""),
             "direccion": c.get("direccion", ""), "config": c.get("config", "EP"),
             "desplazamiento_m": round(desp, 2), "trayecto_m": round(trayecto, 2), "giro_deg": round(giro),
             "rasgos": c["rasgos"], "inspirado_en": juego}
        if c.get("categoria") == "locomocion" and c.get("velocidad_ms"): e["velocidad_ms"] = c["velocidad_ms"]
        meta.append(e)
        print("CLIP", c["nombre"], e["duracion"], "s desp", e["desplazamiento_m"], "giro", e["giro_deg"])
    banco.exportar(salida)
    json.dump(meta, open(manifiesto, "w"), indent=1, ensure_ascii=False)
    print("ESTILO OK", salida, len(meta), "clips")
