"""Genera un caballo árabe negro con montura completa y animaciones, exportado a GLB.

Uso:
  blender -b -P juego/tools/blender/caballo.py -- <salida.glb> [dir_renders]

- Todo procedural (sin assets externos): cuerpo con modificador Skin + Subdivision,
  crin/cola de mechones (cintas), montura con silla, manta, estribos, cabezada, bocado, riendas.
- Convenciones: 1 unidad = 1 m, origen en el suelo entre las patas, mira a -Y (= +Z en glTF).
- Animaciones (30 fps, en el sitio): caballo_reposo, caballo_paso, caballo_trote, caballo_galope.
- Huesos `silla_asiento` y `riendas_mano` marcan pelvis y manos del jinete.
- Determinista (semilla fija).
"""
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_GLB = os.path.abspath(ARGS[0]) if ARGS else "/tmp/caballo.glb"
RENDER_DIR = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None
rng = random.Random(7)
FPS = 30

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)
scene = bpy.context.scene
scene.render.fps = FPS


def P(x, f, z):
    """x lateral (+ = izquierda del caballo), f hacia delante, z arriba -> coordenadas Blender."""
    return Vector((x, -f, z))


# ------------------------------------------------------------------ materiales
def mat(name, base, rough=0.5, metal=0.0, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*base, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    for k, v in kw.items():
        k = k.replace("_", " ")
        if k in b.inputs:
            b.inputs[k].default_value = (*v, 1) if isinstance(v, tuple) else v
    m.use_backface_culling = False
    return m


MATS = {
    "pelaje": mat("caballo_pelaje", (0.010, 0.012, 0.019), 0.5, Sheen_Weight=0.3, Sheen_Roughness=0.45,
                  Sheen_Tint=(0.3, 0.45, 0.9), Specular_IOR_Level=0.4),
    "crin": mat("caballo_crin", (0.007, 0.0075, 0.011), 0.5, Sheen_Weight=0.4, Sheen_Tint=(0.3, 0.4, 0.8)),
    "ojo": mat("caballo_ojo", (0.012, 0.006, 0.004), 0.04, Coat_Weight=1.0, Coat_Roughness=0.02),
    "casco": mat("caballo_casco", (0.025, 0.025, 0.028), 0.55),
    "cuero": mat("montura_cuero", (0.055, 0.032, 0.02), 0.5, Coat_Weight=0.25, Coat_Roughness=0.4),
    "costura": mat("montura_costura", (0.42, 0.34, 0.22), 0.8),
    "tela": mat("montura_manta", (0.14, 0.006, 0.016), 0.85, Sheen_Weight=0.6, Sheen_Tint=(0.8, 0.2, 0.25)),
    "dorado": mat("montura_dorado", (0.85, 0.6, 0.2), 0.28, 1.0),
    "metal": mat("montura_metal", (0.55, 0.56, 0.6), 0.32, 1.0),
}

BODY_OBJS = []   # (obj, matkey)


def finish(obj, matkey, smooth=True):
    obj.data.materials.clear()
    obj.data.materials.append(MATS[matkey])
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    BODY_OBJS.append((obj, matkey))
    return obj


def obj_from_bm(name, bm, matkey, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    return finish(o, matkey, smooth)


def apply_mods(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    old = obj.data
    obj.modifiers.clear()
    obj.data = me
    bpy.data.meshes.remove(old)


# ------------------------------------------------------------------ cuerpo (Skin por cadenas + remesh)
# Cada cadena (tronco, cuello+cabeza, mandíbula, cola, 4 patas) es un Skin sin ramas; luego se unen
# y un remesh voxel las suelda en una sola superficie continua (sin costuras ni uniones en caja).
R_SCALE = float(os.environ.get("CABALLO_R", "1.2"))
CHAIN_OBJS = []


def chain(name, pts):
    """pts: lista de (f, z, rx, ry[, x]); rx = semiancho lateral, ry = semiespesor en el plano YZ."""
    vs = [(p[4] if len(p) > 4 else 0.0, -p[0], p[1]) for p in pts]
    me = bpy.data.meshes.new(name)
    me.from_pydata(vs, [(i, i + 1) for i in range(len(vs) - 1)], [])
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    sk = o.modifiers.new("skin", "SKIN")
    sk.use_smooth_shade = True
    for i, p in enumerate(pts):
        me.skin_vertices[0].data[i].radius = (p[2] * R_SCALE, p[3] * R_SCALE)
    me.skin_vertices[0].data[0].use_root = True
    ss = o.modifiers.new("sub", "SUBSURF")
    ss.levels = ss.render_levels = 2
    apply_mods(o)
    CHAIN_OBJS.append(o)


chain("tronco", [
    (-0.76, 1.21, 0.20, 0.245), (-0.52, 1.23, 0.255, 0.285), (-0.22, 1.17, 0.215, 0.295),
    (0.05, 1.12, 0.245, 0.345), (0.33, 1.19, 0.235, 0.36), (0.55, 1.07, 0.20, 0.315),
    (0.68, 1.03, 0.17, 0.25), (0.76, 1.00, 0.10, 0.15)])
chain("cuello_cabeza", [
    (0.50, 1.17, 0.17, 0.20), (0.60, 1.26, 0.14, 0.17), (0.67, 1.37, 0.12, 0.165), (0.76, 1.52, 0.10, 0.14),
    (0.86, 1.67, 0.082, 0.12), (0.965, 1.80, 0.074, 0.098), (1.03, 1.73, 0.086, 0.086),
    (1.10, 1.645, 0.042, 0.046), (1.18, 1.575, 0.05, 0.056), (1.235, 1.52, 0.052, 0.055), (1.262, 1.495, 0.040, 0.042)])
chain("mandibula", [(1.03, 1.70, 0.07, 0.07), (0.995, 1.655, 0.07, 0.07)])
chain("cola_tocon", [(-0.72, 1.26, 0.08, 0.09), (-0.86, 1.36, 0.06, 0.065), (-0.95, 1.43, 0.04, 0.045), (-1.02, 1.445, 0.028, 0.03)])
for sx in (1, -1):
    x = 0.12 * sx
    chain(f"mano_{sx}", [
        (0.32, 1.28, 0.09, 0.12, 0.10 * sx), (0.36, 1.07, 0.115, 0.18, x), (0.40, 0.84, 0.09, 0.11, x),
        (0.425, 0.655, 0.065, 0.08, x), (0.443, 0.475, 0.05, 0.058, x), (0.455, 0.33, 0.025, 0.031, x),
        (0.462, 0.19, 0.036, 0.040, x), (0.482, 0.115, 0.027, 0.028, x), (0.497, 0.075, 0.031, 0.031, x)])
    chain(f"pata_{sx}", [
        (-0.56, 1.36, 0.10, 0.14, 0.11 * sx), (-0.50, 1.15, 0.12, 0.17, x), (-0.47, 1.00, 0.125, 0.16, x),
        (-0.405, 0.89, 0.085, 0.10, x), (-0.52, 0.70, 0.066, 0.09, x), (-0.64, 0.50, 0.05, 0.07, x),
        (-0.62, 0.33, 0.025, 0.031, x), (-0.60, 0.19, 0.036, 0.040, x), (-0.583, 0.115, 0.027, 0.028, x),
        (-0.568, 0.075, 0.031, 0.031, x)])

bpy.ops.object.select_all(action="DESELECT")
for o in CHAIN_OBJS:
    o.select_set(True)
body = CHAIN_OBJS[0]
bpy.context.view_layer.objects.active = body
with bpy.context.temp_override(active_object=body, object=body, selected_objects=CHAIN_OBJS,
                               selected_editable_objects=CHAIN_OBJS):
    bpy.ops.object.join()
body.name = "caballo_cuerpo"
rm = body.modifiers.new("remesh", "REMESH")
rm.mode = "VOXEL"
rm.voxel_size = float(os.environ.get("CABALLO_VOX", "0.012"))
rm.adaptivity = 0.0
rm.use_smooth_shade = True
apply_mods(body)
sm2 = body.modifiers.new("smooth", "SMOOTH")
sm2.factor = 0.5
sm2.iterations = int(os.environ.get("CABALLO_SMI", "3"))
dm = body.modifiers.new("musculo", "DISPLACE")
tex = bpy.data.textures.new("musc", "CLOUDS")
tex.noise_scale = 0.25
dm.texture = tex
dm.strength = 0.008
dm.mid_level = 0.5
apply_mods(body)
_n = len(body.data.polygons)
dec = body.modifiers.new("decimate", "DECIMATE")
dec.ratio = min(1.0, float(os.environ.get("CABALLO_TRIS", "26000")) / max(1, _n * 2))
apply_mods(body)
print("CUERPO caras remesh", _n, "-> tris", sum(len(p.vertices) - 2 for p in body.data.polygons))
finish(body, "pelaje")
body.data.update()
_bb = [v.co for v in body.data.vertices]
print("MEDIDAS bbox z", min(c.z for c in _bb), max(c.z for c in _bb), "y", min(c.y for c in _bb), max(c.y for c in _bb), "x", min(c.x for c in _bb), max(c.x for c in _bb))

# BVH para envolver la ropa/arreos sobre la superficie
_bm = bmesh.new()
_bm.from_mesh(body.data)
TREE = BVHTree.FromBMesh(_bm)
_bm.free()


def ray(o, d, maxd=3.0):
    d = Vector(d).normalized()
    h = TREE.ray_cast(o, d, maxd)
    return h[0] if h[0] is not None else o + d * 0.2


ZC = 1.12


def wrap(f, th, off):
    """Punto sobre el costillar a la altura f, ángulo th (rad desde arriba, + = izquierda)."""
    d = Vector((math.sin(th), 0, math.cos(th)))
    o = P(0, f, ZC)
    return ray(o, d) + d * off


# cabeza: eje poll -> labios
HP0 = P(0, 0.965, 1.80)
HP1 = P(0, 1.262, 1.495)
HA = (HP1 - HP0).normalized()
HU = Vector((0, HA.z, -HA.y)).normalized()   # dorsal
if HU.z < 0:
    HU = -HU
HX = Vector((1, 0, 0))


def head_pt(s, th, off=0.0):
    c = HP0.lerp(HP1, s)
    d = HU * math.cos(th) + HX * math.sin(th)
    return ray(c, d, 1.0) + d * off


NA0 = P(0, 0.60, 1.26)
NA1 = P(0, 0.965, 1.80)
ND = (NA1 - NA0).normalized()
NC = Vector((0, -ND.z, ND.y))            # perpendicular en el plano YZ
if NC.y < 0:
    NC = -NC


def neck_pt(t, phi, off=0.0, side=-1):
    c = NA0.lerp(NA1, t)
    d = NC * math.cos(phi) + HX * (side * math.sin(phi))
    return ray(c, d, 1.0) + d * off


# ------------------------------------------------------------------ helpers de geometría
def loft(name, pts, radii, matkey, side=Vector((1, 0, 0)), closed=False, sides=8, rect=False,
         caps=True, smooth=True):
    bm = bmesh.new()
    n = len(pts)
    rings = []
    ang = [(math.pi / 4 + k * math.pi / 2) for k in range(4)] if rect else [2 * math.pi * k / sides for k in range(sides)]
    sc = math.sqrt(2) if rect else 1.0
    for i, p in enumerate(pts):
        if closed:
            t = pts[(i + 1) % n] - pts[(i - 1) % n]
        else:
            t = pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]
        t = t.normalized()
        s = side - t * side.dot(t)
        if s.length < 1e-4:
            s = Vector((0, 1, 0)) - t * t.y
        s.normalize()
        nr = t.cross(s).normalized()
        rs, rn = radii[i] if isinstance(radii[i], tuple) else (radii[i], radii[i])
        rings.append([bm.verts.new(p + s * (rs * sc * math.cos(a)) + nr * (rn * sc * math.sin(a))) for a in ang])
    m = len(ang)
    last = n if closed else n - 1
    for i in range(last):
        r0, r1 = rings[i], rings[(i + 1) % n]
        for k in range(m):
            bm.faces.new((r0[k], r0[(k + 1) % m], r1[(k + 1) % m], r1[k]))
    if caps and not closed:
        bm.faces.new(rings[0][::-1])
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm, matkey, smooth)


def grid_panel(name, fn, nu, nv, matkey, thick=0.008, smooth=True):
    bm = bmesh.new()
    vs = [[bm.verts.new(fn(i / (nu - 1), j / (nv - 1))) for j in range(nv)] for i in range(nu)]
    for i in range(nu - 1):
        for j in range(nv - 1):
            bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = obj_from_bm(name, bm, matkey, smooth)
    if thick:
        m = o.modifiers.new("sol", "SOLIDIFY")
        m.thickness = thick
        m.offset = 1
        apply_mods(o)
    return o


def spheres(name, centers, r, matkey, subdiv=1):
    bm = bmesh.new()
    for c in centers:
        bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=r, matrix=Matrix.Translation(c))
    return obj_from_bm(name, bm, matkey, True)


def ellipsoid(name, center, basis, scale, matkey, u=12, v=8):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=1.0)
    m = Matrix.Translation(center) @ basis.to_4x4() @ Matrix.Diagonal(Vector((*scale, 1)))
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    return obj_from_bm(name, bm, matkey, True)


def lerp(a, b, t):
    return a + (b - a) * t


def sstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ cabeza: ojos, ojares, orejas, cascos
for sx in (1, -1):
    c = head_pt(0.22, sx * math.radians(68), -0.008)
    basis = Matrix((HX, HA, HU)).transposed()
    ellipsoid(f"ojo_{sx}", c, basis, (0.022, 0.024, 0.024), "ojo", 16, 10)
    c = head_pt(0.93, sx * math.radians(52), 0.0)
    ellipsoid(f"ollar_{sx}", c, basis, (0.010, 0.024, 0.013), "crin", 10, 6)
    # oreja corta y curvada hacia dentro
    e0 = P(0.034 * sx, 0.975, 1.865)
    pts = [e0, e0 + Vector((0.004 * sx, 0.0, 0.0)) + P(0, 0, 0.0) * 0 + Vector((0, -0.010, 0.04)),
           e0 + Vector((-0.002 * sx, -0.022, 0.082)), e0 + Vector((-0.014 * sx, -0.034, 0.118)),
           e0 + Vector((-0.026 * sx, -0.036, 0.145))]
    rad = [(0.027, 0.011), (0.029, 0.012), (0.024, 0.010), (0.015, 0.007), (0.003, 0.002)]
    loft(f"oreja_{sx}", pts, rad, "pelaje", side=Vector((0, 1, 0)), sides=8)
    # cascos (cono truncado inclinado)
    for (ff, xx, fz) in ((0.497, 0.12 * sx, 0.075), (-0.568, 0.12 * sx, 0.075)):
        toe = ff + (0.04 if ff > 0 else 0.03)
        pts = [P(xx, ff, 0.092), P(xx, ff + (toe - ff) * 0.55, 0.045), P(xx, toe, 0.0)]
        loft(f"casco_{sx}_{ff}", pts, [(0.032, 0.033), (0.040, 0.043), (0.049, 0.055)], "casco", sides=12)

# ------------------------------------------------------------------ crin, tupé y cola (cintas)
def ribbons(name, strands, matkey):
    bm = bmesh.new()
    for pts, widths, ref in strands:
        n = len(pts)
        row = []
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
            w = ref - t * ref.dot(t)
            if w.length < 1e-4:
                w = Vector((1, 0, 0))
            w.normalize()
            if i == n - 1:
                row.append((bm.verts.new(p),))
            else:
                row.append((bm.verts.new(p - w * widths[i] * 0.5), bm.verts.new(p + w * widths[i] * 0.5)))
        for i in range(n - 1):
            a, b = row[i], row[i + 1]
            if len(b) == 1:
                bm.faces.new((a[0], a[1], b[0]))
            else:
                bm.faces.new((a[0], a[1], b[1], b[0]))
    return obj_from_bm(name, bm, matkey, False)


def rand_ref():
    a = rng.uniform(0, math.pi)
    return Vector((math.cos(a), math.sin(a), 0.0))


mane = []
for k in range(170):
    ts = rng.uniform(0.06, 1.0) ** 1.0
    L = rng.uniform(0.20, 0.36) * (0.8 + 0.4 * (1 - ts))
    phimax = math.radians(rng.uniform(70, 105))
    pts, wd = [], []
    nseg = 7
    for i in range(nseg + 1):
        u = i / nseg
        phi = phimax * min(1.0, u / 0.5)
        t = max(0.0, ts - 0.10 * u * L / 0.3)
        off = 0.006 + 0.10 * u * u * L / 0.3 + rng.uniform(-0.004, 0.004) * u
        p = neck_pt(t, phi, off)
        p.z -= 0.10 * u * u * (L / 0.3)
        p.y += 0.02 * u * u + rng.uniform(-0.006, 0.006) * u
        pts.append(p)
        wd.append(0.030 * (1 - u) ** 0.7 + 0.004)
    mane.append((pts, wd, rand_ref()))
for k in range(14):  # tupé
    s0 = rng.uniform(0.02, 0.07)
    th0 = rng.uniform(-0.25, 0.25)
    L = rng.uniform(0.14, 0.24)
    pts, wd = [], []
    for i in range(7):
        u = i / 6
        s = s0 + 0.30 * u * (L / 0.2)
        p = head_pt(min(s, 0.98), th0 * (1 + 2 * u), 0.008 + 0.03 * u * u)
        p.z -= 0.04 * u * u
        pts.append(p)
        wd.append(0.022 * (1 - u) ** 0.7 + 0.004)
    mane.append((pts, wd, rand_ref()))
ribbons("crin", mane, "crin")

TAILP = [P(0, -0.88, 1.40), P(0, -0.99, 1.465), P(0, -1.09, 1.41), P(0, -1.13, 1.22), P(0, -1.15, 0.95),
         P(0, -1.15, 0.62)]


def tail_path(u):
    """Catmull-Rom sencillo sobre TAILP, u en [0,1]."""
    n = len(TAILP) - 1
    x = u * n
    i = min(int(x), n - 1)
    t = x - i
    p0, p1, p2, p3 = TAILP[max(i - 1, 0)], TAILP[i], TAILP[i + 1], TAILP[min(i + 2, n)]
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)


tail = []
for k in range(150):
    u0 = rng.uniform(0.0, 0.25)
    uend = rng.uniform(0.80, 1.0)
    ox, oy, oz = rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1)
    pts, wd = [], []
    nseg = 9
    for i in range(nseg + 1):
        u = i / nseg
        uu = lerp(u0, uend, u)
        p = tail_path(uu)
        spread = 0.035 + 0.075 * u
        p = p + Vector((ox * spread, oy * spread * 0.6, oz * 0.02 * u)) + Vector((0, 0.04 * math.sin(u * 3 + ox * 3) * u, 0))
        pts.append(p)
        wd.append(0.032 * (1 - u) ** 0.6 + 0.004)
    tail.append((pts, wd, rand_ref()))
ribbons("cola", tail, "crin")

# ------------------------------------------------------------------ MONTURA
BR = math.radians
# manta
def manta_edge(th, u):
    q = abs(th) / BR(72)
    ff = 0.40 - 0.10 * q ** 3
    fb = -0.27 + 0.07 * q ** 3
    return lerp(fb, ff, u)


def manta_fn(u, v):
    th = lerp(-BR(72), BR(72), u)
    return wrap(manta_edge(th, v), th, 0.014)


grid_panel("manta", manta_fn, 25, 22, "tela", thick=0.010)


def manta_loop(inset, off):
    t0 = BR(72 - inset * 60)
    pts = []
    for i in range(0, 25):  # delante
        th = lerp(-t0, t0, i / 24)
        pts.append(wrap(manta_edge(th, 1.0) - inset, th, off))
    for i in range(1, 12):  # lado derecho hacia atrás
        v = 1 - i / 12
        pts.append(wrap(lerp(manta_edge(t0, 0) + inset, manta_edge(t0, 1) - inset, v), t0, off))
    for i in range(0, 25):  # atrás
        th = lerp(t0, -t0, i / 24)
        pts.append(wrap(manta_edge(th, 0.0) + inset, th, off))
    for i in range(1, 12):
        v = i / 12
        pts.append(wrap(lerp(manta_edge(-t0, 0) + inset, manta_edge(-t0, 1) - inset, v), -t0, off))
    return pts


pl = manta_loop(0.004, 0.026)
loft("ribete_manta", pl, [0.0065] * len(pl), "dorado", closed=True, sides=6)
pl = manta_loop(0.030, 0.026)
loft("ribete_manta_int", pl, [0.0035] * len(pl), "dorado", closed=True, sides=5)

# silla (asiento + faldones en una sola lámina)
def sil_edges(th):
    q = abs(th) / BR(58)
    fr = 0.27 - 0.06 * sstep(0.35, 1.0, q) - 0.02 * q
    fb = -0.145 + 0.045 * sstep(0.35, 1.0, q) + 0.02 * q * q
    return fb, fr


def sil_off(th, f):
    a = abs(th)
    seat = 1 - sstep(BR(14), BR(30), a)
    dish = 0.05 + 0.035 * ((f - 0.06) / 0.2) ** 2
    return 0.034 + (dish - 0.01) * seat - 0.004 * a / BR(58)


def sil_fn(u, v):
    th = lerp(-BR(58), BR(58), u)
    fb, fr = sil_edges(th)
    f = lerp(fb, fr, v)
    return wrap(f, th, sil_off(th, f))


grid_panel("silla", sil_fn, 31, 20, "cuero", thick=0.014)


def sil_loop(inset, extra, th_max=BR(58)):
    pts = []
    n = 24
    ths = [lerp(-th_max, th_max, i / n) for i in range(n + 1)]
    for th in ths:
        fb, fr = sil_edges(th)
        pts.append((th, fr - inset))
    for th in reversed(ths):
        fb, fr = sil_edges(th)
        pts.append((th, fb + inset))
    return [wrap(f, th, sil_off(th, f) + extra) for th, f in pts]


pts = sil_loop(0.014, 0.012, BR(55))
loft("costura_silla", pts, [(0.0025, 0.0025)] * len(pts), "costura", closed=True, sides=4)
pts = sil_loop(0.004, 0.012, BR(57.5))
loft("borde_silla", pts, [(0.004, 0.004)] * len(pts), "cuero", closed=True, sides=6)

# borrenes
pp = []
for i in range(17):
    th = lerp(-BR(36), BR(36), i / 16)
    pp.append(wrap(0.262, th, 0.05 + 0.075 * (1 - (th / BR(36)) ** 2) ** 0.8))
loft("borren_del", pp, [(0.030, 0.022)] * len(pp), "cuero", side=Vector((0, 1, 0)), sides=10)
pp = []
for i in range(17):
    th = lerp(-BR(38), BR(38), i / 16)
    pp.append(wrap(-0.135, th, 0.045 + 0.055 * (1 - (th / BR(38)) ** 2) ** 0.8))
loft("borren_tras", pp, [(0.034, 0.020)] * len(pp), "cuero", side=Vector((0, 1, 0)), sides=10)
spheres("pomo", [wrap(0.262, 0, 0.133)], 0.019, "dorado", 2)

# remaches
riv = []
for sx in (1, -1):
    for f, th, o in ((0.20, 40, 0.046), (0.08, 44, 0.046), (-0.05, 42, 0.044), (0.23, 24, 0.06), (-0.10, 27, 0.056),
                     (0.15, 50, 0.04), (-0.02, 52, 0.04)):
        riv.append(wrap(f, sx * BR(th), o))
for i in range(5):
    th = lerp(-BR(28), BR(28), i / 4)
    riv.append(wrap(0.262, th, 0.05 + 0.075 * (1 - (th / BR(36)) ** 2) ** 0.8 + 0.02))
    th = lerp(-BR(30), BR(30), i / 4)
    riv.append(wrap(-0.135, th, 0.045 + 0.055 * (1 - (th / BR(38)) ** 2) ** 0.8 + 0.018))
spheres("remaches", riv, 0.0055, "dorado", 1)

# cincha (pasa por debajo del vientre)
pts = [wrap(0.265, BR(lerp(52, 308, i / 30)), 0.012) for i in range(31)]
loft("cincha", pts, [(0.032, 0.005)] * len(pts), "cuero", side=Vector((0, 1, 0)), rect=True, smooth=False)
bk = []
for sx in (1, -1):
    c = wrap(0.265, sx * BR(60), 0.02)
    bk.append(c)
spheres("hebillas", bk, 0.012, "metal", 1)

# estribos, aciones y hierros
for sx in (1, -1):
    X = sx
    leather = [Vector((0.19 * X, -0.09, 1.455)), Vector((0.265 * X, -0.09, 1.34)), Vector((0.31 * X, -0.09, 1.16)),
               Vector((0.325 * X, -0.09, 1.0))]
    # curva suave
    sm_pts = []
    for i in range(12):
        t = i / 11
        a, b, c, d = leather
        sm_pts.append(a * (1 - t) ** 3 + b * 3 * t * (1 - t) ** 2 + c * 3 * t * t * (1 - t) + d * t ** 3)
    loft(f"acion_{sx}", sm_pts, [(0.0125, 0.0035)] * len(sm_pts), "cuero", side=Vector((0, 1, 0)), rect=True, smooth=False)
    cx, cz = 0.33 * X, 0.905
    ring = []
    for i in range(20):
        a = 2 * math.pi * i / 20
        w = 0.058 * (1.0 if math.sin(a) < 0 else 0.55 + 0.45 * (1 + math.sin(a)) * 0 + 0.0)
        wx = 0.062 * math.cos(a) * (1.0 if math.sin(a) <= 0 else 0.72)
        wz = 0.075 * math.sin(a)
        ring.append(Vector((cx + wx, -0.09, cz + wz)))
    loft(f"estribo_{sx}", ring, [0.0065] * 20, "metal", closed=True, sides=6)
    tread = [Vector((cx - 0.058, -0.09, cz - 0.073)), Vector((cx + 0.058, -0.09, cz - 0.073))]
    loft(f"pisadera_{sx}", tread, [(0.040, 0.007)] * 2, "metal", side=Vector((0, 1, 0)), rect=True, smooth=False)
    spheres(f"hebilla_acion_{sx}", [Vector((cx, -0.09, cz + 0.082))], 0.011, "metal", 1)

# pretal (collera de pecho)
ctr = P(0, 0.42, 1.08)
pts = []
for i in range(23):
    az = lerp(-BR(100), BR(100), i / 22)    # 0 = hacia delante
    d = Vector((math.sin(az), -math.cos(az), 0))
    pts.append(ray(ctr, d, 1.2) + d * 0.011)
loft("pretal", pts, [(0.025, 0.005)] * len(pts), "cuero", side=Vector((0, 0, 1)), rect=True, smooth=False)
for sx in (1, -1):
    a = pts[-1] if sx > 0 else pts[0]
    # correa hacia la silla; a es el extremo lateral. Con az>0 -> x>0
    b = wrap(0.235, sx * BR(50), 0.05)
    mid = (a + b) * 0.5 + Vector((0.01 * sx, 0, 0))
    loft(f"pretal_tirante_{sx}", [a, mid, b], [(0.016, 0.004)] * 3, "cuero", side=Vector((0, 1, 0)), rect=True, smooth=False)
frontc = pts[11]
spheres("pretal_medallon", [frontc + Vector((0, -0.01, 0))], 0.022, "dorado", 2)

# cabezada, frontalera, muserola, ahogadero, bocado y riendas
def head_loop(s, th0, th1, off, n=14):
    return [head_pt(s, lerp(th0, th1, i / (n - 1)), off) for i in range(n)]


cab = []
# bocado -> mejilla izquierda -> nuca -> mejilla derecha -> bocado
for i in range(10):
    t = i / 9
    cab.append(head_pt(lerp(0.84, 0.03, t), BR(lerp(112, 98, t)), 0.007))
cab += head_loop(0.0, BR(95), -BR(95), 0.008, 14)[1:-1]
for i in range(10):
    t = i / 9
    cab.append(head_pt(lerp(0.03, 0.84, t), -BR(lerp(98, 112, t)), 0.007))
loft("cabezada", cab, [(0.011, 0.0032)] * len(cab), "cuero", side=HA, rect=True, smooth=False)
fr = head_loop(0.12, -BR(98), BR(98), 0.008, 18)
loft("frontalera", fr, [(0.011, 0.0032)] * len(fr), "cuero", side=HA, rect=True, smooth=False)
mu = [head_pt(0.62, 2 * math.pi * i / 20, 0.008) for i in range(20)]
loft("muserola", mu, [(0.014, 0.0035)] * 20, "cuero", side=HA, rect=True, closed=True, smooth=False)
ah = head_loop(0.06, BR(100), BR(260), 0.008, 18)
loft("ahogadero", ah, [(0.010, 0.0032)] * 18, "cuero", side=HA, rect=True, smooth=False)
cn = []
for sx in (1, -1):
    cn.append(head_pt(0.30, sx * BR(100), 0.01))
spheres("conchos", cn + [head_pt(0.12, sx * BR(98), 0.012) for sx in (1, -1)], 0.009, "dorado", 1)

bit_c = head_pt(0.86, BR(180), 0.0)   # bajo la comisura
bit_c = HP0.lerp(HP1, 0.83) - HU * 0.014
loft("bocado", [bit_c + Vector((-0.06, 0, 0)), bit_c + Vector((0.06, 0, 0))], [0.0055] * 2, "metal", sides=8)
for sx in (1, -1):
    ring = []
    cc = bit_c + Vector((0.064 * sx, 0, 0))
    for i in range(14):
        a = 2 * math.pi * i / 14
        ring.append(cc + Vector((0, 0.026 * math.cos(a), 0.026 * math.sin(a))))
    loft(f"anilla_{sx}", ring, [0.0035] * 14, "metal", closed=True, sides=6)

RIEND_HAND = P(0, 0.36, 1.645)
REIN_PTS = {}
for sx in (1, -1):
    a = bit_c + Vector((0.064 * sx, 0.026 * 0.7, 0.026 * 0.7))
    p1 = P(0.115 * sx, 1.10, 1.50)
    p2 = P(0.155 * sx, 0.78, 1.37)
    p3 = P(0.130 * sx, 0.50, 1.50)
    p4 = P(0.040 * sx, 0.36, 1.645)
    pts = []
    for i in range(24):
        t = i / 23
        # tramo en dos bezier para que cuelgue
        if t < 0.5:
            q = t / 0.5
            A, B, C, D = a, p1, p1.lerp(p2, 0.5), p2
        else:
            q = (t - 0.5) / 0.5
            A, B, C, D = p2, p3, p3.lerp(p4, 0.5), p4
        pts.append(A * (1 - q) ** 3 + B * 3 * q * (1 - q) ** 2 + C * 3 * q * q * (1 - q) + D * q ** 3)
    o = loft(f"rienda_{sx}", pts, [0.0075] * 24, "cuero", sides=6)
    REIN_PTS[o.name] = pts

# ------------------------------------------------------------------ esqueleto
arm_data = bpy.data.armatures.new("caballo_armature")
arm = bpy.data.objects.new("caballo_armature", arm_data)
scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")
BONES = {}


def bone(name, parent, head, tail, deform=True):
    eb = arm_data.edit_bones.new(name)
    eb.head, eb.tail = head, tail
    eb.align_roll(Vector((1, 0, 0)))
    eb.use_deform = deform
    if parent:
        eb.parent = arm_data.edit_bones[parent]
    BONES[name] = (head.copy(), tail.copy())


bone("raiz", None, P(0, 0, 0), P(0, 0, 0.2), False)
bone("cuerpo", "raiz", P(0, 0.05, 1.10), P(0, 0.05, 1.25), False)
bone("pelvis", "cuerpo", P(0, -0.72, 1.31), P(0, -0.25, 1.33))
bone("espalda", "pelvis", P(0, -0.25, 1.33), P(0, 0.28, 1.35))
bone("pecho", "espalda", P(0, 0.28, 1.35), P(0, 0.60, 1.26))
bone("cuello1", "pecho", P(0, 0.60, 1.26), P(0, 0.75, 1.50))
bone("cuello2", "cuello1", P(0, 0.75, 1.50), P(0, 0.87, 1.67))
bone("cuello3", "cuello2", P(0, 0.87, 1.67), P(0, 0.965, 1.80))
bone("cabeza", "cuello3", P(0, 0.965, 1.80), P(0, 1.262, 1.495))
bone("mandibula", "cabeza", P(0, 1.005, 1.675), P(0, 1.245, 1.51))
bone("cola1", "pelvis", TAILP[0], TAILP[1])
bone("cola2", "cola1", TAILP[1], TAILP[2])
bone("cola3", "cola2", TAILP[2], TAILP[4])
bone("cola4", "cola3", TAILP[4], TAILP[5])
for sx, s in ((1, "i"), (-1, "d")):
    x = 0.12 * sx
    pf = f"pata_del_{s}_"
    bone(pf + "escapula", "pecho", P(x, 0.36, 1.37), P(x, 0.40, 0.84))
    bone(pf + "antebrazo", pf + "escapula", P(x, 0.40, 0.84), P(x, 0.443, 0.47))
    bone(pf + "cana", pf + "antebrazo", P(x, 0.443, 0.47), P(x, 0.462, 0.19))
    bone(pf + "cuartilla", pf + "cana", P(x, 0.462, 0.19), P(x, 0.515, 0.0))
    ph = f"pata_tras_{s}_"
    bone(ph + "femur", "pelvis", P(x, -0.50, 1.24), P(x, -0.405, 0.89))
    bone(ph + "tibia", ph + "femur", P(x, -0.405, 0.89), P(x, -0.635, 0.50))
    bone(ph + "cana", ph + "tibia", P(x, -0.635, 0.50), P(x, -0.60, 0.19))
    bone(ph + "cuartilla", ph + "cana", P(x, -0.60, 0.19), P(x, -0.545, 0.0))
SEAT = P(0, 0.07, 1.52)
HAND = RIEND_HAND
bone("silla_asiento", "espalda", SEAT, SEAT + Vector((0, 0, 0.06)), False)
bone("riendas_mano", "espalda", HAND, HAND + Vector((0, 0, 0.06)), False)
bpy.ops.object.mode_set(mode="OBJECT")

# ------------------------------------------------------------------ pesos
def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + ab * t)).length


def weight_by_bones(obj, names, sigma=0.06, maxinf=3):
    for n in names:
        if n not in obj.vertex_groups:
            obj.vertex_groups.new(name=n)
    for v in obj.data.vertices:
        ws = []
        for n in names:
            h, t = BONES[n]
            d = seg_dist(v.co, h, t)
            ws.append((math.exp(-(d / sigma) ** 2), n))
        ws.sort(reverse=True)
        ws = ws[:maxinf]
        tot = sum(w for w, _ in ws) or 1.0
        if tot < 1e-9:
            ws = [(1.0, ws[0][1])]
            tot = 1.0
        for w, n in ws:
            if w / tot > 0.01:
                obj.vertex_groups[n].add([v.index], w / tot, "REPLACE")


def rigid(obj, bname):
    g = obj.vertex_groups.new(name=bname)
    g.add([v.index for v in obj.data.vertices], 1.0, "REPLACE")


# cuerpo: pesado automático
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
with bpy.context.temp_override(active_object=arm, object=arm, selected_objects=[body, arm],
                               selected_editable_objects=[body, arm]):
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
for m in [m for m in body.modifiers if m.type == "ARMATURE"][1:]:
    body.modifiers.remove(m)   # parent_set puede dejar dos
auto_ok = len(body.vertex_groups) > 5
if not auto_ok:
    print("AVISO: pesado automático falló, uso pesos por distancia")
    body.parent = arm
    body.modifiers.new("Armature", "ARMATURE").object = arm
    weight_by_bones(body, [b for b in BONES if arm_data.bones[b].use_deform], 0.07)

NECK = ["cuello1", "cuello2", "cuello3", "cabeza"]
for o, k in BODY_OBJS:
    n = o.name
    if o is body:
        continue
    if n == "crin":
        weight_by_bones(o, NECK + ["espalda"], 0.09)
    elif n == "cola":
        weight_by_bones(o, ["cola1", "cola2", "cola3", "cola4", "pelvis"], 0.12)
    elif n.startswith(("ojo_", "ollar_", "oreja_", "cabezada", "frontalera", "muserola", "ahogadero", "conchos",
                       "bocado", "anilla_")):
        rigid(o, "cabeza")
    elif n.startswith("casco_"):
        sx = 1 if n.split("_")[1] == "1" else -1
        fore = float(n.split("_")[2]) > 0
        rigid(o, f"pata_{'del' if fore else 'tras'}_{'i' if sx > 0 else 'd'}_cuartilla")
    elif n.startswith("rienda_"):
        pts = REIN_PTS[n]
        N = len(pts)
        # los vértices del loft: 6 por anillo -> índice de anillo = i // 6
        ga, gb = o.vertex_groups.new(name="cabeza"), o.vertex_groups.new(name="pecho")
        for v in o.data.vertices:
            i = min(v.index // 6, N - 1) if v.index < N * 6 else (N - 1 if v.index == N * 6 + 5 else 0)
            t = i / (N - 1)
            ga.add([v.index], 1 - t, "REPLACE")
            gb.add([v.index], t, "REPLACE")
    elif n.startswith(("pretal",)):
        rigid(o, "pecho")
    else:
        rigid(o, "espalda")

for o, k in BODY_OBJS:
    if o.name.startswith("casco_"):
        print("DBG", o.name, [g.name for g in o.vertex_groups], len(o.data.vertices))
# unir por material
groups = {}
for o, k in BODY_OBJS:
    groups.setdefault(k, []).append(o)
final_objs = []
for k, lst in groups.items():
    if lst == [body]:
        final_objs.append(body)
        continue
    if body in lst:                      # las orejas comparten material con el cuerpo
        lst.remove(body)
        lst.insert(0, body)
    bpy.ops.object.select_all(action="DESELECT")
    for o in lst:
        o.select_set(True)
    bpy.context.view_layer.objects.active = lst[0]
    with bpy.context.temp_override(active_object=lst[0], object=lst[0], selected_objects=lst,
                                   selected_editable_objects=lst):
        bpy.ops.object.join()
    j = lst[0]
    j.name = f"caballo_{k}"
    if j is not body:
        pass
    j.parent = arm
    if not any(m.type == "ARMATURE" for m in j.modifiers):
        j.modifiers.new("Armature", "ARMATURE").object = arm
    final_objs.append(j)
body.name = "caballo_pelaje"
body.data.name = "caballo_pelaje"
for o in final_objs:
    o.data.name = o.name

# ------------------------------------------------------------------ animaciones
arm.animation_data_create()
for pb in arm.pose.bones:
    pb.rotation_mode = "XYZ"
ANIM_BONES = [b.name for b in arm_data.bones if b.name not in ("raiz", "silla_asiento", "riendas_mano")]
TAU = 2 * math.pi


def smooth01(u):
    return u * u * (3 - 2 * u)


def leg(phi, duty, A, K, fore):
    """Devuelve ángulos relativos (escapula/femur, 2, 3, 4) para una pata. phi en [0,1)."""
    if phi < duty:
        u = phi / duty
        s = -1 + 2 * u
        lift = 0.0
        stance = math.sin(math.pi * u)
    else:
        u = (phi - duty) / (1 - duty)
        s = 1 - 2 * smooth01(u)
        lift = math.sin(math.pi * u) ** 0.8
        stance = 0.0
    if fore:
        return (A * s - 0.10 * K * lift, -0.25 * K * lift, 1.15 * K * lift, 0.55 * K * lift - 0.14 * stance)
    return (A * s - 0.12 * K * lift, 0.55 * K * lift, -0.95 * K * lift, 0.65 * K * lift - 0.12 * stance)


def pose_gait(t, cfg):
    d = {b: [0.0, 0.0, 0.0] for b in ANIM_BONES}   # [swish(x), twist(y), pitch(z)]
    loc = {"cuerpo": [0.0, 0.0, 0.0]}
    scl = {"pecho": [1.0, 1.0, 1.0]}
    legs = {"i_del": cfg["ph"][0], "d_del": cfg["ph"][1], "i_tras": cfg["ph"][2], "d_tras": cfg["ph"][3]}
    for k, ph in legs.items():
        side, kind = k.split("_")
        fore = kind == "del"
        a = leg((t - ph) % 1.0, cfg["duty"], cfg["Af"] if fore else cfg["Ah"], cfg["K"], fore)
        base = f"pata_{kind}_{side}_"
        names = ("escapula", "antebrazo", "cana", "cuartilla") if fore else ("femur", "tibia", "cana", "cuartilla")
        for n, ang in zip(names, a):
            d[base + n][2] = ang
    cfg["body"](t, d, loc, scl)
    return d, loc, scl


def key_all(act, frame, d, loc, scl):
    for b, r in d.items():
        pb = arm.pose.bones[b]
        pb.rotation_euler = r   # [swish(x), twist(y), pitch(z)]; Z local = X mundo
        pb.keyframe_insert("rotation_euler", frame=frame)
    for b, l in loc.items():
        pb = arm.pose.bones[b]
        pb.location = l
        pb.keyframe_insert("location", frame=frame)
    for b, s in scl.items():
        pb = arm.pose.bones[b]
        pb.scale = s
        pb.keyframe_insert("scale", frame=frame)


def tail_wave(d, t, amp, freq, lag=0.7, raise_=0.0, phase=0.0):
    for i, n in enumerate(("cola1", "cola2", "cola3", "cola4")):
        d[n][0] = amp * math.sin(TAU * freq * t - lag * i + phase) * (0.6 + 0.2 * i)
        d[n][2] += raise_ * (1 if i < 2 else 0.5)


def body_walk(t, d, loc, scl):
    loc["cuerpo"][1] = 0.010 * math.cos(2 * TAU * t)
    d["cuerpo"][1] = 0.02 * math.sin(TAU * t)
    d["pelvis"][1] = 0.04 * math.sin(TAU * t + 0.3)
    d["espalda"][1] = -0.03 * math.sin(TAU * t + 0.3)
    d["pelvis"][2] = 0.012 * math.sin(2 * TAU * t)
    d["cuello1"][2] = 0.05 * math.sin(TAU * t - 0.6)
    d["cuello2"][2] = 0.04 * math.sin(TAU * t - 1.0)
    d["cuello3"][2] = 0.03 * math.sin(TAU * t - 1.4)
    d["cabeza"][2] = 0.05 * math.sin(TAU * t - 1.8)
    d["cabeza"][0] = 0.03 * math.sin(TAU * t)
    tail_wave(d, t, 0.10, 1, 0.8)


def body_trot(t, d, loc, scl):
    loc["cuerpo"][1] = -0.022 * math.cos(2 * TAU * (t - 0.22))
    d["cuerpo"][2] = 0.012 * math.sin(2 * TAU * t)
    d["pelvis"][2] = 0.03 * math.sin(2 * TAU * t + 0.5)
    d["espalda"][2] = -0.02 * math.sin(2 * TAU * t + 0.5)
    d["cuello1"][2] = 0.03 * math.sin(2 * TAU * t - 0.8)
    d["cuello2"][2] = 0.03 * math.sin(2 * TAU * t - 1.2)
    d["cabeza"][2] = 0.04 * math.sin(2 * TAU * t - 1.6)
    d["pelvis"][1] = 0.025 * math.sin(2 * TAU * t)
    tail_wave(d, t, 0.14, 2, 0.8, raise_=0.12)


def body_gallop(t, d, loc, scl):
    loc["cuerpo"][1] = -0.045 * math.cos(TAU * (t - 0.35))
    d["cuerpo"][2] = -0.06 * math.sin(TAU * (t - 0.10))
    d["pelvis"][2] = 0.09 * math.sin(TAU * (t - 0.02))
    d["espalda"][2] = -0.07 * math.sin(TAU * (t - 0.02))
    d["pecho"][2] = 0.04 * math.sin(TAU * (t - 0.1))
    d["cuello1"][2] = 0.10 * math.sin(TAU * (t - 0.30)) - 0.08
    d["cuello2"][2] = 0.08 * math.sin(TAU * (t - 0.42)) - 0.05
    d["cuello3"][2] = 0.06 * math.sin(TAU * (t - 0.50))
    d["cabeza"][2] = 0.10 * math.sin(TAU * (t - 0.55)) + 0.10
    d["mandibula"][2] = 0.05
    tail_wave(d, t, 0.10, 1, 0.9, raise_=0.35)


def body_idle(t, d, loc, scl):
    br = math.sin(TAU * 2 * t)
    scl["pecho"] = [1 + 0.014 * br, 1.0, 1 + 0.018 * br]
    loc["cuerpo"][1] = 0.003 * br
    slow = math.sin(TAU * t)
    d["cuello1"][2] = 0.05 * slow + 0.02 * br
    d["cuello2"][2] = 0.06 * slow
    d["cuello3"][2] = 0.06 * slow
    d["cabeza"][2] = 0.05 * slow + 0.02 * math.sin(TAU * 2 * t + 1)
    d["cabeza"][0] = 0.05 * math.sin(TAU * t + 0.5)
    d["cuello1"][0] = 0.03 * math.sin(TAU * t + 0.5)
    d["mandibula"][2] = 0.03 * max(0, math.sin(TAU * 3 * t))
    tail_wave(d, t, 0.30, 2, 0.9, 0.0)
    # cambio de apoyo: pata trasera derecha descansa
    u = max(0.0, (t - 0.30) / 0.4) if 0.30 <= t <= 0.70 else 0.0
    bump = math.sin(math.pi * u) ** 2 if u > 0 else 0.0
    d["pata_tras_d_femur"][2] = -0.10 * bump
    d["pata_tras_d_tibia"][2] = 0.18 * bump
    d["pata_tras_d_cana"][2] = -0.20 * bump
    d["pata_tras_d_cuartilla"][2] = 0.55 * bump
    d["pelvis"][1] = 0.02 * bump
    d["pelvis"][2] = -0.01 * bump
    # pata delantera izquierda: pequeño golpe de casco
    v = max(0.0, (t - 0.78) / 0.12) if 0.78 <= t <= 0.90 else 0.0
    bv = math.sin(math.pi * v) if v > 0 else 0.0
    d["pata_del_i_escapula"][2] = -0.18 * bv
    d["pata_del_i_antebrazo"][2] = -0.10 * bv
    d["pata_del_i_cana"][2] = 0.55 * bv
    d["pata_del_i_cuartilla"][2] = 0.30 * bv


CLIPS = [
    ("caballo_reposo", 120, dict(body=body_idle, ph=(0, 0, 0, 0), duty=0.0, Af=0, Ah=0, K=0), True),
    ("caballo_paso", 33, dict(body=body_walk, ph=(0.25, 0.75, 0.0, 0.5), duty=0.68, Af=0.24, Ah=0.22, K=0.8), False),
    ("caballo_trote", 21, dict(body=body_trot, ph=(0.0, 0.5, 0.5, 0.0), duty=0.45, Af=0.30, Ah=0.27, K=1.0), False),
    ("caballo_galope", 18, dict(body=body_gallop, ph=(0.40, 0.28, 0.10, 0.0), duty=0.30, Af=0.50, Ah=0.46, K=1.25), False),
]
ACTIONS = {}
for name, nfr, cfg, idle in CLIPS:
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data.action = act
    for i in range(nfr + 1):
        t = (i % nfr) / nfr
        if idle:
            d = {b: [0.0, 0.0, 0.0] for b in ANIM_BONES}
            loc = {"cuerpo": [0.0, 0.0, 0.0]}
            scl = {"pecho": [1.0, 1.0, 1.0]}
            cfg["body"](t, d, loc, scl)
        else:
            d, loc, scl = pose_gait(t, cfg)
        key_all(act, 1 + i, d, loc, scl)
    act.frame_range = (1, 1 + nfr)
    ACTIONS[name] = (act, nfr)

# ------------------------------------------------------------------ exportar
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
for pb in arm.pose.bones:
    pb.rotation_euler = (0, 0, 0)
    pb.location = (0, 0, 0)
    pb.scale = (1, 1, 1)
arm.animation_data.action = None
for o in bpy.data.objects:
    o.select_set(False)
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format="GLB", export_yup=True, export_apply=False,
                          export_animations=True, export_animation_mode="ACTIONS", export_force_sampling=True,
                          export_optimize_animation_size=True, export_skins=True, export_def_bones=False,
                          export_cameras=False, export_lights=False, export_materials="EXPORT")
ntri = sum(len(o.data.polygons) for o in final_objs)
print("EXPORTADO", OUT_GLB, "objetos:", [o.name for o in final_objs])

# ------------------------------------------------------------------ renders de comprobación (Cycles, noche)
if RENDER_DIR and not os.environ.get("CABALLO_SKIP_RENDER"):
    os.makedirs(RENDER_DIR, exist_ok=True)
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    FAST = bool(os.environ.get("CABALLO_FAST"))
    scene.cycles.samples = 12 if FAST else 48
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.exposure = float(os.environ.get("CABALLO_EXPO", "1.0"))
    scene.render.resolution_percentage = 100
    w = bpy.data.worlds.new("noche")
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.012, 0.02, 0.045, 1)
    bg.inputs["Strength"].default_value = 1.0
    scene.world = w
    gm = bpy.data.materials.new("suelo")
    gm.use_nodes = True
    gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.05, 0.045, 0.04, 1)
    gm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    bpy.context.active_object.data.materials.append(gm)

    def light(kind, loc, energy, color, size=0.1, rot=None):
        ld = bpy.data.lights.new(kind, kind)
        ld.energy = energy
        ld.color = color
        if kind == "SUN":
            ld.angle = 0.03
        else:
            ld.shadow_soft_size = size
        lo = bpy.data.objects.new(kind, ld)
        lo.location = loc
        if rot:
            lo.rotation_euler = rot
        scene.collection.objects.link(lo)
        return lo

    light("SUN", (0, 0, 5), 4.0, (0.55, 0.68, 1.0), rot=(math.radians(55), 0, math.radians(-150)))
    light("POINT", (-1.9, -1.6, 1.7), 220, (1.0, 0.45, 0.16), 0.12)
    light("AREA", (3.0, 3.0, 2.5), 50, (0.5, 0.65, 1.0), 1.5)
    light("POINT", (1.5, 3.5, 2.0), 80, (1.0, 0.5, 0.2), 0.3)
    target = bpy.data.objects.new("target", None)
    scene.collection.objects.link(target)
    cam_d = bpy.data.cameras.new("cam")
    cam = bpy.data.objects.new("cam", cam_d)
    scene.collection.objects.link(cam)
    scene.camera = cam
    tc = cam.constraints.new("TRACK_TO")
    tc.target = target
    tc.track_axis = "TRACK_NEGATIVE_Z"
    tc.up_axis = "UP_Y"

    def shot(path, loc, tgt, lens=70, res=(1280, 720), pose=None):
        cam.location = loc
        target.location = tgt
        cam_d.lens = lens
        scene.render.resolution_x, scene.render.resolution_y = (res[0] // 2, res[1] // 2) if FAST else res
        if pose:
            arm.animation_data.action = ACTIONS[pose[0]][0]
            scene.frame_set(pose[1])
        else:
            arm.animation_data.action = ACTIONS["caballo_reposo"][0]
            scene.frame_set(1)
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)

    if os.environ.get("CABALLO_DBGSHOTS"):
        shot(os.path.join(RENDER_DIR, "d_trasera.png"), (-1.6, 3.2, 2.0), (0, 0.6, 1.1), 50)
        shot(os.path.join(RENDER_DIR, "d_arriba.png"), (-0.3, 0.3, 5.5), (0, -0.2, 1.0), 50)
        raise SystemExit
    shot(os.path.join(RENDER_DIR, "perfil.png"), (-6.4, -0.1, 1.0), (0, -0.15, 0.98), 48)
    shot(os.path.join(RENDER_DIR, "tres_cuartos.png"), (-2.9, -3.6, 1.6), (0, -0.2, 1.0), 45)
    shot(os.path.join(RENDER_DIR, "montura.png"), (-1.3, 1.3, 2.0), (0, -0.05, 1.3), 60)
    shot(os.path.join(RENDER_DIR, "cabeza.png"), (-0.9, -2.3, 1.9), (0, -1.1, 1.6), 75)
    tiles = []
    for fr in (1, 6, 10, 15):
        p = os.path.join(RENDER_DIR, f"_g{fr}.png")
        shot(p, (-6.4, -0.1, 1.0), (0, -0.1, 0.98), 50, (800, 450), ("caballo_galope", fr))
        tiles.append(p)
    imgs = [bpy.data.images.load(p) for p in tiles]
    W, H = imgs[0].size
    import numpy as np
    sheet = np.zeros((H * 2, W * 2, 4), dtype=np.float32)
    for k, im in enumerate(imgs):
        a = np.array(im.pixels[:], dtype=np.float32).reshape(H, W, 4)
        r, c = divmod(k, 2)
        sheet[(1 - r) * H:(2 - r) * H, c * W:(c + 1) * W] = a
    out = bpy.data.images.new("hoja", W * 2, H * 2, alpha=True)
    out.pixels = sheet.ravel().tolist()
    out.filepath_raw = os.path.join(RENDER_DIR, "galope_hoja.png")
    out.file_format = "PNG"
    out.save()
    for p in tiles:
        os.remove(p)
print("TRIS_BLENDER_POLY", ntri)

# medidas de alzada (rayo vertical sobre la cruz y bajo el vientre)
_h = TREE.ray_cast(Vector((0, -0.33, 3.0)), Vector((0, 0, -1)), 5)
_b = TREE.ray_cast(Vector((0, -0.05, 0.0)), Vector((0, 0, 1)), 5)
print("MEDIDAS cruz z=%.3f vientre z=%.3f" % (_h[0].z if _h[0] else -1, _b[0].z if _b[0] else -1))
