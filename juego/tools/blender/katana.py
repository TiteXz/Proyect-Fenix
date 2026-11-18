"""Katana de fantasia oscura, modelada por script (Blender 4.2, sin interfaz).

Uso:
  blender -b -P juego/tools/blender/katana.py -- <salida.glb> [preview.png] [dir texturas PolyHaven]

- Escala en metros. Eje de empunadura = eje Y que pasa por el origen (centro de la zona de agarre).
  Punta de la hoja hacia +Y, filo hacia +X, lomo hacia -X, cara con hi hacia +Z.
- Largo total ~1,046 m (kashira y=-0,1695 ... punta y=+0,8766). Hoja 0,72 m desde el habaki.
- Objetos con nombre: hoja, tsuba, tsuka, ito, kashira (+ habaki, seppa, fuchi, menuki).
- Texturas: acero de la hoja y ito/tsuka procedurales (numpy, semilla fija); hierro y laton derivan de
  Poly Haven `metal_plate_02` (CC0), reescalados a 512 px y teñidos. Determinista.
- preview.png: genera <base>_completa.png, <base>_guarda.png y <base>_punta.png con Cycles (48 muestras).
"""
import sys, os, math, json
import numpy as np
import bpy, bmesh
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "katana.glb"
PREVIEW = argv[1] if len(argv) > 1 else None
HERE = os.path.dirname(os.path.abspath(__file__))
TEXDIR = argv[2] if len(argv) > 2 else os.path.normpath(os.path.join(HERE, "..", "..", "..", ".assets-cache", "polyhaven"))

TAU = 2 * math.pi
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.unit_settings.system = "METRIC"


# ------------------------------------------------------------------ utilidades numericas
def sstep(a, b, x):
    t = np.clip((np.asarray(x, dtype=float) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def noise2(h, w, sy, sx, seed):
    """Ruido gaussiano filtrado (tileable), normalizado a desviacion 1."""
    r = np.random.default_rng(seed).standard_normal((h, w))
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    g = np.exp(-2 * (np.pi ** 2) * ((fy * sy) ** 2 + (fx * sx) ** 2))
    o = np.fft.irfft2(np.fft.rfft2(r) * g, s=(h, w))
    return o / (o.std() + 1e-9)


def normal_from_height(hm, k):
    dx = (np.roll(hm, -1, 1) - np.roll(hm, 1, 1)) * 0.5
    dy = (np.roll(hm, -1, 0) - np.roll(hm, 1, 0)) * 0.5
    n = np.stack([-k * dx, -k * dy, np.ones_like(hm)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5


def rgba(rgb):
    h, w = rgb.shape[:2]
    out = np.ones((h, w, 4), dtype=np.float32)
    out[..., :3] = np.clip(rgb, 0, 1)
    return out


def make_image(name, arr, srgb):
    h, w = arr.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=False)
    img.pixels.foreach_set(rgba(arr[..., :3]).ravel())
    img.colorspace_settings.name = "sRGB" if srgb else "Non-Color"
    img.file_format = "PNG"
    img.pack()
    return img


def read_raw(path):
    img = bpy.data.images.load(path)
    img.colorspace_settings.name = "Non-Color"  # valores crudos, sin conversion
    w, h = img.size
    a = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return a.reshape(h, w, 4)[..., :3]


def down2(a):
    return (a[0::2, 0::2] + a[1::2, 0::2] + a[0::2, 1::2] + a[1::2, 1::2]) * 0.25


# ------------------------------------------------------------------ construccion de mallas
def build_mesh(name, verts, faces, uvs=None, closed_fix=True):
    """verts (n,3); faces lista de listas de indices; uvs: lista paralela de listas de (u,v) por esquina."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bv = [bm.verts.new(tuple(map(float, v))) for v in verts]
    bm.verts.ensure_lookup_table(); bm.verts.index_update()
    uvmap = {}
    for fi, f in enumerate(faces):
        try:
            bf = bm.faces.new([bv[i] for i in f])
        except ValueError:
            continue
        if uvs is not None:
            for vi, uv in zip(f, uvs[fi]):
                uvmap[(bf, vi)] = uv
    bm.faces.ensure_lookup_table()
    if closed_fix:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if uvs is not None:
        layer = bm.loops.layers.uv.new("UVMap")
        for f in bm.faces:
            for lp in f.loops:
                lp[layer].uv = uvmap[(f, lp.vert.index)]
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def loft(loops, wrap_profile=False, cap_first=False, cap_last=False, uv_fn=None):
    """loops: lista de (M,3). Devuelve verts, faces, uvs. uv_fn(i, j, wrapflag)->(u,v)."""
    n, m = len(loops), len(loops[0])
    verts = [p for lp in loops for p in lp]
    faces, uvs = [], []
    rng = range(n) if wrap_profile else range(n - 1)
    for i in rng:
        i2 = (i + 1) % n
        for j in range(m):
            j2 = (j + 1) % m
            wrap = j2 == 0
            faces.append([i * m + j, i * m + j2, i2 * m + j2, i2 * m + j])
            if uv_fn:
                uvs.append([uv_fn(i, j, False), uv_fn(i, j2, wrap), uv_fn(i2, j2, wrap), uv_fn(i2, j, False)])
    for flag, idx in ((cap_first, 0), (cap_last, n - 1)):
        if flag:
            c = np.mean(loops[idx], axis=0)
            ci = len(verts)
            verts.append(c)
            for j in range(m):
                j2 = (j + 1) % m
                faces.append([idx * m + j, idx * m + j2, ci])
                if uv_fn:
                    uvs.append([(0, 0), (0, 0), (0, 0)])
    return np.array(verts), faces, (uvs if uv_fn else None)


def ellipse_loop(y, a, b, n=48, cx=0.0, cz=0.0, expo=2.0, phase=0.0):
    t = np.linspace(0, TAU, n, endpoint=False) + phase
    c, s = np.cos(t), np.sin(t)
    p = 2.0 / expo
    x = cx + a * np.sign(c) * np.abs(c) ** p
    z = cz + b * np.sign(s) * np.abs(s) ** p
    return np.stack([x, np.full(n, y), z], -1)


def smooth(ob, deg=40):
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(deg))


def uv_box(ob, tile=0.25):
    """UV por proyeccion planar segun el eje dominante de cada cara (metales)."""
    me = ob.data
    me.update()
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    pn = np.empty(len(me.polygons) * 3)
    me.polygons.foreach_get("normal", pn)
    pn = pn.reshape(-1, 3)
    lt = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get("loop_total", lt)
    vi = np.empty(len(me.loops), dtype=np.int32)
    me.loops.foreach_get("vertex_index", vi)
    n = pn[np.repeat(np.arange(len(me.polygons)), lt)]
    ax = np.argmax(np.abs(n), axis=1)
    p = co[vi]
    u = np.where(ax == 0, p[:, 1], p[:, 0])
    v = np.where(ax == 2, p[:, 1], p[:, 2])
    uv = np.stack([u, v], -1) / tile + 0.5
    layer = me.uv_layers.new(name="UVMap")
    layer.data.foreach_set("uv", uv.astype(np.float32).ravel())


def tri_count(obs):
    dg = bpy.context.evaluated_depsgraph_get()
    t = 0
    for ob in obs:
        me = ob.evaluated_get(dg).to_mesh()
        me.calc_loop_triangles()
        t += len(me.loop_triangles)
        ob.evaluated_get(dg).to_mesh_clear()
    return t


# ------------------------------------------------------------------ materiales
def occlusion_group():
    g = bpy.data.node_groups.get("glTF Material Output")
    if g is None:
        g = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
        g.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    return g


def make_mat(name, base, nor, orm, nstrength=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    tb = nt.nodes.new("ShaderNodeTexImage"); tb.image = base
    tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = nor
    to = nt.nodes.new("ShaderNodeTexImage"); to.image = orm
    for t in (tb, tn, to):
        t.interpolation = "Linear"
    nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = nstrength
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(tb.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tn.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(to.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    gn = nt.nodes.new("ShaderNodeGroup"); gn.node_tree = occlusion_group()
    nt.links.new(sep.outputs["Red"], gn.inputs["Occlusion"])
    return m


def assign(ob, mat):
    ob.data.materials.clear()
    ob.data.materials.append(mat)


# ------------------------------------------------------------------ texturas
def tex_hoja():
    """Acero de la hoja 512x1024: izquierda = cara con hi, derecha = cara opuesta. v = longitud."""
    H, W = 1024, 512
    V = ((np.arange(H) + 0.5) / H)[:, None]
    U = ((np.arange(W) + 0.5) / W)[None, :]
    front = U < 0.5
    uf = np.where(front, 2 * U, 2 * (1 - U))  # 0 filo .. 1 lomo
    arm = read_raw(os.path.join(TEXDIR, "armadura_gris_arm.jpg"))[:H, :W]

    def hamon_line(seed):
        ph = np.random.default_rng(seed).uniform(0, 1, 6)
        hl = 0.17 + 0.030 * np.sin(TAU * (3.1 * V + ph[0])) + 0.020 * np.sin(TAU * (7.7 * V + ph[1])) \
            + 0.010 * np.sin(TAU * (19 * V + ph[2]))
        gun = np.abs(np.sin(TAU * (10.5 * V + ph[3]))) ** 1.3
        hl = hl + 0.045 * gun * (0.6 + 0.4 * np.sin(TAU * (2.3 * V + ph[4])))
        hl = hl + 0.020 * np.maximum(0, np.sin(TAU * (33 * V + ph[5]))) ** 6
        hl = hl + 0.45 * np.clip((V - 0.935) / 0.065, 0, 1) ** 2  # boshi: el temple da la vuelta en el kissaki
        return hl

    hl = np.where(front, hamon_line(11), hamon_line(47))
    warp = 0.006 * noise2(H, W, 6, 1.5, 3)
    d = uf + warp - hl
    ric = 1 - sstep(0.036, 0.070, V)  # ricasso: sin temple, sin pulir
    M = sstep(0.011, -0.011, d) * (1 - ric)
    nie = np.exp(-(d / 0.022) ** 2) * (0.5 + 0.5 * np.clip(noise2(H, W, 0.7, 0.7, 5), -2, 2) / 2) * (1 - ric)
    grain = noise2(H, W, 38, 1.1, 7)       # hada: vetas largas
    grain2 = noise2(H, W, 5, 0.9, 8)
    mott = noise2(H, W, 60, 8, 9)
    hard = np.array([0.80, 0.82, 0.85])
    soft = np.array([0.47, 0.49, 0.54])
    rica = np.array([0.30, 0.31, 0.33])
    col = soft[None, None] * (1 - M[..., None]) + hard[None, None] * M[..., None]
    col = col * (1 + 0.035 * mott[..., None] + 0.03 * grain[..., None])
    col = col + 0.10 * nie[..., None]
    col = col * (1 - 0.25 * sstep(0.9, 1.0, uf)[..., None])  # lomo algo mas oscuro
    col = col * (1 - ric[..., None]) + rica[None, None] * (1 + 0.15 * grain2[..., None]) * ric[..., None]
    # rayas de pulido
    rng = np.random.default_rng(21)
    height = 0.30 * grain + 0.12 * grain2 + 0.9 * M * 0.0
    scr = np.zeros((H, W))
    for _ in range(70):
        x0, y0 = rng.uniform(0, W), rng.uniform(0, H)
        ln, ang = rng.uniform(20, 260), rng.normal(0, 0.12)
        t = np.linspace(0, ln, int(ln * 2))
        xs = (x0 + t * math.sin(ang)).astype(int) % W
        ys = (y0 + t * math.cos(ang)).astype(int) % H
        scr[ys, xs] += rng.uniform(0.4, 1.0)
    height = height - 0.8 * scr + 0.25 * M
    col = col + 0.05 * scr[..., None]
    rough = 0.30 + 0.05 * grain
    rough = rough - 0.10 * M
    rough = rough - 0.07 * (1 - sstep(0.0, 0.10, uf))  # el filo, mas pulido
    rough = rough + 0.04 * (arm[..., 1] - arm[..., 1].mean()) / (arm[..., 1].std() + 1e-6)
    rough = rough * (1 - ric) + (0.55 + 0.1 * grain2) * ric
    rough = rough + 0.10 * np.clip(scr, 0, 1) * 0 + 0.0
    ao = np.ones((H, W))
    ao = ao - 0.25 * ric
    orm = np.stack([ao, np.clip(rough, 0.08, 1.0), np.ones((H, W))], -1)
    nrm = normal_from_height(height, 2.2)
    return (make_image("hoja_color", col, True), make_image("hoja_normal", nrm, False),
            make_image("hoja_orm", orm, False))


def tex_ito():
    S = 512
    u = ((np.arange(S) + 0.5) / S)[None, :]
    v = ((np.arange(S) + 0.5) / S)[:, None]
    rib = 0.5 + 0.5 * np.cos(TAU * 12 * u)                       # hilos longitudinales
    twill = 0.80 + 0.20 * np.cos(TAU * (10 * v + 6 * u))           # ondulacion del cruce
    fuzz = noise2(S, S, 0.8, 0.8, 31)
    var = noise2(S, S, 30, 30, 32)
    h = rib * twill + 0.18 * fuzz
    base = np.array([0.050, 0.047, 0.066])                         # indigo casi negro, desgastado
    col = base[None, None] * (0.55 + 0.9 * h[..., None]) * (1 + 0.25 * var[..., None])
    col = col + np.array([0.012, 0.010, 0.008]) * (fuzz[..., None] > 1.5)
    rough = 0.82 + 0.05 * fuzz
    orm = np.stack([0.55 + 0.45 * h, rough, np.zeros((S, S))], -1)
    return (make_image("ito_color", col, True), make_image("ito_normal", normal_from_height(h, 5.0), False),
            make_image("ito_orm", orm, False))


def tex_same():
    S = 512
    u = ((np.arange(S) + 0.5) / S)[None, :]
    v = ((np.arange(S) + 0.5) / S)[:, None]
    n = 48
    row = np.floor(v * n)
    bead = (0.5 + 0.5 * np.cos(TAU * (n * u + 0.5 * (row % 2)))) * (0.5 + 0.5 * np.cos(TAU * n * v))
    bead = bead ** 0.6
    var = noise2(S, S, 20, 20, 41)
    col = np.array([0.30, 0.27, 0.21])[None, None] * (0.7 + 0.5 * bead[..., None]) * (1 + 0.15 * var[..., None])
    orm = np.stack([0.5 + 0.5 * bead, 0.55 - 0.2 * bead, np.zeros((S, S))], -1)
    return (make_image("same_color", col, True), make_image("same_normal", normal_from_height(bead, 4.0), False),
            make_image("same_orm", orm, False))


def tex_metales():
    d = down2(read_raw(os.path.join(TEXDIR, "armadura_gris_Diffuse.jpg")))
    nr = down2(read_raw(os.path.join(TEXDIR, "armadura_gris_nor_gl.jpg")))
    arm = down2(read_raw(os.path.join(TEXDIR, "armadura_gris_arm.jpg")))
    dn = d / (d.mean() + 1e-6)
    iron = np.clip(dn * np.array([0.20, 0.20, 0.215]), 0, 1)   # hierro ennegrecido (valores sRGB)
    brass = np.clip(dn * np.array([0.52, 0.38, 0.17]), 0, 1)   # laton viejo
    arm_i = arm.copy(); arm_i[..., 2] = 1.0
    arm_b = arm.copy(); arm_b[..., 2] = 1.0
    arm_b[..., 1] = np.clip(arm_b[..., 1] * 0.8 + 0.08, 0, 1)
    nrm = make_image("metal_normal", nr, False)
    return (make_image("hierro_color", iron, True), nrm, make_image("hierro_orm", arm_i, False),
            make_image("laton_color", brass, True), make_image("laton_orm", arm_b, False))


# ------------------------------------------------------------------ geometria: hoja
L = 0.72
Y0 = 0.1566            # inicio de la hoja (cara del habaki)
WB, WT = 0.0315, 0.0235
TB, TT = 0.0066, 0.0040
SY = L - 0.042         # yokote
SORI = 0.022


def hoja():
    # perfil: (uf, vf) con uf en 0..1 (filo..lomo), vf en unidades de grosor
    s_main = np.linspace(0, SY, 150, endpoint=False)
    q = 1 - (1 - np.linspace(0, 1, 47)[:-1]) ** 1.7
    s_all = np.concatenate([s_main, SY + (L - SY) * q[:-0 or None]])
    # ultimo punto del kissaki (q=1) se sustituye por un vertice de punta
    rings, ring_uv, sv = [], [], []
    ncols = 17
    for s in s_all:
        in_k = s > SY
        qq = (s - SY) / (L - SY) if in_k else 0.0
        w = WT * (1 - qq ** 2.0) ** 0.62 if in_k else WB - (WB - WT) * (s / SY)
        w = max(w, 1e-4)
        t = TB - (TB - TT) * (s / SY) ** 1.3 if not in_k else TT * (w / WT) ** 0.6
        t = max(t, 0.0005)
        g = lambda x: SORI * (x / L) ** 1.7
        cx = WB / 2 - g(s)
        dx = -SORI * 1.7 * (s / L) ** 0.7 / L
        nrm = math.hypot(1, dx)
        R = np.array([1 / nrm, 0, -dx / nrm])       # direccion hacia el filo (en el plano XY: x,y)
        # R esta en el plano XY: (rx, ry)
        rx, ry = 1 / nrm, -dx / nrm
        c = np.array([cx, Y0 + s])
        shift = -0.30 * (WT - w) if in_k else 0.0
        E = c + np.array([rx, ry]) * (0.5 * w + shift)
        hi = float(sstep(0.04, 0.10, s / L) * (1 - sstep(0.775, 0.815, s / L)))
        dh = 0.22 * hi
        e = 0.20 * (1 - float(sstep(0.015, 0.045, s))) + 0.005
        prof = [(0, e), (0.03, 0.07), (0.62, 0.5), (0.70, 0.5), (0.72, 0.5 - dh), (0.84, 0.5 - dh), (0.86, 0.5),
                (0.93, 0.485), (0.975, 0.42), (0.995, 0.26), (1.0, 0.0),
                (0.995, -0.26), (0.975, -0.42), (0.93, -0.485), (0.62, -0.5), (0.03, -0.07), (0, -e)]
        pts = []
        for uf, vf in prof:
            xy = E - np.array([rx, ry]) * (uf * w)
            pts.append([xy[0], xy[1], vf * t])
        rings.append(np.array(pts))
        sv.append(s / L)
    n = len(rings)
    tip = np.array([rings[-1][:, 0].mean(), rings[-1][:, 1].mean(), 0.0])
    # extender la punta: un punto final un poco mas alla del ultimo anillo
    tip[1] = Y0 + L
    tip[0] = rings[-1][:, 0].mean() - 0.0004
    verts = [p for r in rings for p in r] + [tip]
    ti = len(verts) - 1
    faces, uvs = [], []
    ut = [0.5 * p[0] for p in prof[:11]] + [1 - 0.5 * p[0] for p in prof[11:]]

    def uvc(i, j, closing=False):
        u = ut[j]
        if closing and j == 0:
            u = 1.0
        return (u, sv[i])
    for i in range(n - 1):
        for j in range(ncols):
            j2 = (j + 1) % ncols
            closing = j2 == 0
            faces.append([i * ncols + j, i * ncols + j2, (i + 1) * ncols + j2, (i + 1) * ncols + j])
            uvs.append([uvc(i, j), uvc(i, j2, closing), uvc(i + 1, j2, closing), uvc(i + 1, j)])
    for j in range(ncols):  # abanico de la punta
        j2 = (j + 1) % ncols
        closing = j2 == 0
        faces.append([(n - 1) * ncols + j, (n - 1) * ncols + j2, ti])
        uvs.append([uvc(n - 1, j), uvc(n - 1, j2, closing), (0.5, 1.0)])
    # tapa del arranque (queda dentro del habaki)
    c0 = len(verts)
    verts.append(np.mean(rings[0], axis=0))
    for j in range(ncols):
        j2 = (j + 1) % ncols
        faces.append([j, j2, c0])
        uvs.append([uvc(0, j), uvc(0, j2), (0.5, 0.0)])
    ob = build_mesh("hoja", np.array(verts), faces, uvs)
    smooth(ob, 38)
    return ob


# ------------------------------------------------------------------ empunadura
YC, HH = -0.010, 0.16
A0, B0 = 0.0148, 0.0118


def bulge(y):
    return 1 + 0.07 * (1 - np.clip((y - YC) / HH, -1, 1) ** 2)


def tsuka_core():
    ys = np.linspace(-0.152, 0.147, 46)
    loops = [ellipse_loop(y, A0 * bulge(y), B0 * bulge(y), 48, expo=2.3) for y in ys]
    def uvf(i, j, wrap):
        return ((1.0 if wrap else j / 48.0), ys[i] / 0.091)
    v, f, uv = loft(loops, uv_fn=uvf)
    ob = build_mesh("tsuka", v, f, uv)
    smooth(ob, 60)
    return ob


def ito():
    P, n = 0.14, 5
    y0, y1, Ns, M = -0.140, 0.118, 130, 6
    ys = np.linspace(y0, y1, Ns)
    rng = np.random.default_rng(77)
    allv, allf, alluv = [], [], []
    h, r0, wid, thk = 0.0009, 0.0008, 0.0080, 0.0016
    f = bulge(ys)
    a, b = A0 * f, B0 * f
    for dirn in (1, -1):
        for k in range(n):
            phi = TAU * k / n
            th = phi + dirn * TAU * ys / P
            off = r0 + dirn * h * np.cos(10 * np.pi * ys / P)
            ex, ez = a * np.cos(th), b * np.sin(th)
            nv = np.stack([np.cos(th) / a, np.zeros(Ns), np.sin(th) / b], -1)
            nv /= np.linalg.norm(nv, axis=1, keepdims=True)
            cen = np.stack([ex, ys, ez], -1) + nv * off[:, None]
            tg = np.gradient(cen, axis=0)
            tg /= np.linalg.norm(tg, axis=1, keepdims=True)
            wd = np.cross(nv, tg)
            wd /= np.linalg.norm(wd, axis=1, keepdims=True)
            wj = wid * (1 + 0.04 * np.sin(ys * 140 + rng.uniform(0, 6)))
            arc = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(cen, axis=0), axis=1))])
            loops = []
            for i in range(Ns):
                al = np.linspace(0, TAU, M, endpoint=False)
                pts = cen[i] + wd[i] * (wj[i] / 2) * np.cos(al)[:, None] + nv[i] * (thk / 2) * np.sin(al)[:, None]
                loops.append(pts)
            def uvf(i, j, wrap, arc=arc):
                return ((1.0 if wrap else j / M), arc[i] / 0.0075)
            v, fcs, uv = loft(loops, uv_fn=uvf)
            base = sum(len(x) for x in allv)
            allv.append(v)
            allf += [[base + q for q in fc] for fc in fcs]
            alluv += uv
    ob = build_mesh("ito", np.concatenate(allv), allf, alluv, closed_fix=False)
    smooth(ob, 70)
    return ob


def lathe_ellipse(name, spec, n=56, expo=2.6, cap_first=False, cap_last=False, sm=50):
    loops = [ellipse_loop(y, a, b, n, expo=expo) for (y, a, b) in spec]
    v, f, _ = loft(loops, cap_first=cap_first, cap_last=cap_last)
    ob = build_mesh(name, v, f)
    smooth(ob, sm)
    return ob


def fuchi():
    spec = [(0.112, 0.0178, 0.0148), (0.1125, 0.0188, 0.0158), (0.1160, 0.0192, 0.0162), (0.1200, 0.0192, 0.0162),
            (0.1210, 0.0197, 0.0167), (0.1235, 0.0197, 0.0167), (0.1245, 0.0191, 0.0161), (0.1400, 0.0188, 0.0158),
            (0.1470, 0.0184, 0.0154), (0.1488, 0.0176, 0.0146), (0.1495, 0.0166, 0.0136)]
    return lathe_ellipse("fuchi", spec, cap_first=True, cap_last=True, expo=2.4)


def kashira():
    spec = [(-0.135, 0.0178, 0.0148), (-0.1355, 0.0190, 0.0160), (-0.1380, 0.0194, 0.0164), (-0.1400, 0.0194, 0.0164),
            (-0.1410, 0.0198, 0.0168), (-0.1435, 0.0198, 0.0168), (-0.1445, 0.0192, 0.0162), (-0.1520, 0.0189, 0.0159)]
    # cupula redondeada
    for k in range(1, 9):
        t = k / 8.0
        spec.append((-0.1520 - 0.0175 * math.sin(t * math.pi / 2), 0.0189 * math.cos(t * math.pi / 2) ** 0.9 + 0.0002,
                     0.0159 * math.cos(t * math.pi / 2) ** 0.9 + 0.0002))
    return lathe_ellipse("kashira", spec, cap_first=True, cap_last=True, expo=2.4)


def habaki():
    spec = [(0.0000, 0.0166, 0.0040), (0.0003, 0.0174, 0.0046), (0.0020, 0.0177, 0.0049), (0.0120, 0.0175, 0.0047),
            (0.0200, 0.0172, 0.0045), (0.0235, 0.0168, 0.0042), (0.0245, 0.0162, 0.0037)]
    spec = [(Y0 + y, a, b) for y, a, b in spec]
    return lathe_ellipse("habaki", spec, n=56, expo=3.0, sm=55)


def seppa(name, yc):
    h = 0.00065
    prof = [(0.0, -h), (0.5, -h), (0.92, -h), (0.985, -0.55 * h), (1.0, 0.0), (0.985, 0.55 * h), (0.92, h),
            (0.5, h), (0.0, h)]
    ai, bi, ao, bo = 0.0162, 0.0037, 0.0232, 0.0185
    loops = []
    for rho, dy in prof:
        loops.append(ellipse_loop(yc + dy, ai + (ao - ai) * rho, bi + (bo - bi) * rho, 56, expo=2.0))
    v, f, _ = loft(loops, wrap_profile=True)
    ob = build_mesh(name, v, f)
    smooth(ob, 50)
    return ob


YT = 0.1535


def tsuba():
    N, R = 96, 0.0375
    prof = [(0.02, .0018), (0.5, .0019), (0.72, .0022), (0.82, .0029), (0.88, .0031), (0.95, .0031),
            (0.985, .0026), (1.0, .0012)]
    prof = prof + [(r, -y) for r, y in prof[::-1]]
    rng = np.random.default_rng(5)
    th = np.linspace(0, TAU, N, endpoint=False)
    ham = 0.010 * noise2(1, N, 0.01, 1.5, 6)[0]            # martilleado del borde
    lobe = 1 + 0.035 * np.cos(4 * th + 0.4) + 0.015 * np.cos(2 * th)
    loops = []
    for rho, y in prof:
        k = float(sstep(0.7, 1.0, rho))
        r = R * rho * (lobe * (1 - k) + (lobe + ham) * k)
        loops.append(np.stack([r * np.cos(th), np.full(N, YT + y), r * np.sin(th)], -1))
    v, f, _ = loft(loops, cap_first=True, cap_last=True)
    ob = build_mesh("tsuba", v, f)

    def cutter(name, a, b, cx, cz, bend=0.0, rot=0.0, expo=2.0, n=28):
        t = np.linspace(0, TAU, n, endpoint=False)
        c, s = np.cos(t), np.sin(t)
        x = a * np.sign(c) * np.abs(c) ** (2 / expo)
        z = b * np.sign(s) * np.abs(s) ** (2 / expo)
        x = x + bend * (z / max(b, 1e-6)) ** 2
        x, z = x * math.cos(rot) - z * math.sin(rot), x * math.sin(rot) + z * math.cos(rot)
        top = np.stack([cx + x, np.full(n, YT + 0.01), cz + z], -1)
        bot = top.copy(); bot[:, 1] = YT - 0.01
        vv, ff, _ = loft([top, bot], cap_first=True, cap_last=True)
        return build_mesh(name, vv, ff)
    cuts = [cutter("c_slot", 0.0162, 0.0037, 0, 0, expo=6.0, n=40),
            cutter("c_h1", 0.0042, 0.0085, 0.0258, 0.0, bend=-0.0030),
            cutter("c_h2", 0.0042, 0.0085, -0.0258, 0.0, bend=0.0030),
            cutter("c_s1", 0.0056, 0.0027, 0.0030, 0.0252, rot=0.25),
            cutter("c_s2", 0.0050, 0.0030, -0.0040, -0.0250, rot=-0.35)]
    bpy.context.view_layer.objects.active = ob
    for c in cuts:
        bm_ = ob.modifiers.new("b_" + c.name, "BOOLEAN")
        bm_.operation = "DIFFERENCE"; bm_.solver = "EXACT"; bm_.object = c
        bpy.ops.object.select_all(action="DESELECT")
        bpy.context.view_layer.objects.active = ob
        ob.select_set(True)
        bpy.ops.object.modifier_apply(modifier=bm_.name)
    for c in cuts:
        bpy.data.objects.remove(c, do_unlink=True)
    bv = ob.modifiers.new("bisel", "BEVEL")
    bv.limit_method = "ANGLE"; bv.angle_limit = math.radians(35); bv.width = 0.00045; bv.segments = 2
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier="bisel")
    smooth(ob, 40)
    return ob


def menuki():
    obs = []
    for sgn, yy in ((1, 0.022), (-1, -0.052)):
        zt = (B0 * bulge(yy) + 0.0026) * sgn
        loops = []
        prof = [(1.0, 0.0), (1.0, 0.0006), (0.9, 0.0013), (0.7, 0.0019), (0.45, 0.0023), (0.2, 0.0025), (0.02, 0.0026)]
        for sc, hz in prof:
            t = np.linspace(0, TAU, 24, endpoint=False)
            x = 0.0034 * sc * np.cos(t) * (1 + 0.25 * np.sin(t))
            y = 0.0085 * sc * np.sin(t)
            loops.append(np.stack([x, yy + y, np.full(24, zt + sgn * (hz - 0.0004))], -1))
        v, f, _ = loft(loops, cap_last=True)
        ob = build_mesh("menuki_%s" % ("a" if sgn > 0 else "b"), v, f)
        sub = ob.modifiers.new("s", "SUBSURF"); sub.levels = 1; sub.render_levels = 1
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier="s")
        smooth(ob, 60)
        obs.append(ob)
    return obs


# ------------------------------------------------------------------ montaje
def main():
    parts = {}
    mats = {}
    ch, cn, co = tex_hoja()
    mats["hoja"] = make_mat("acero_hoja", ch, cn, co, 1.0)
    ih, in_, io = tex_ito()
    mats["ito"] = make_mat("ito_tela", ih, in_, io, 1.0)
    sh, sn, so = tex_same()
    mats["same"] = make_mat("tsuka_same", sh, sn, so, 1.0)
    hc, mn, ho, lc, lo = tex_metales()
    mats["hierro"] = make_mat("hierro", hc, mn, ho, 0.8)
    mats["laton"] = make_mat("laton", lc, mn, lo, 0.8)

    parts["hoja"] = hoja(); assign(parts["hoja"], mats["hoja"])
    parts["ito"] = ito(); assign(parts["ito"], mats["ito"])
    parts["tsuka"] = tsuka_core(); assign(parts["tsuka"], mats["same"])
    parts["tsuba"] = tsuba()
    parts["fuchi"] = fuchi()
    parts["kashira"] = kashira()
    parts["habaki"] = habaki()
    parts["seppa_a"] = seppa("seppa_a", 0.1511)
    parts["seppa_b"] = seppa("seppa_b", 0.1559)
    for i, m in enumerate(menuki()):
        parts["menuki%d" % i] = m
    for k, m in parts.items():
        if k in ("tsuba", "fuchi", "kashira"):
            assign(m, mats["hierro"]); uv_box(m)
        elif k.startswith(("habaki", "seppa", "menuki")):
            assign(m, mats["laton"]); uv_box(m)

    root = bpy.data.objects.new("katana", None)
    bpy.context.scene.collection.objects.link(root)
    for m in parts.values():
        m.parent = root

    tris = tri_count(parts.values())
    print("KATANA_TRIS", tris)
    print("KATANA_TRIS_POR_PARTE", json.dumps({k: tri_count([m]) for k, m in parts.items()}))

    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for m in list(parts.values()) + [root]:
        m.select_set(True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_apply=True,
                              export_image_format="WEBP", export_yup=True, export_cameras=False,
                              export_lights=False, export_texcoords=True, export_normals=True)
    print("KATANA_GLB", OUT, os.path.getsize(OUT))
    if PREVIEW:
        render_previews(root)


# ------------------------------------------------------------------ renders de muestra
def render_previews(root):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 48
    sc.cycles.use_denoising = True
    sc.cycles.seed = 1
    sc.render.resolution_x, sc.render.resolution_y = 1600, 900
    sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
    sc.view_settings.exposure = float(os.environ.get("KATANA_EXPO", "0.0"))
    sc.render.image_settings.file_format = "PNG"
    sc.cycles.max_bounces = 6
    # katana tumbado: punta hacia +X, filo hacia -Y (camara), cara con hi hacia arriba
    root.rotation_euler = (0, 0, -math.pi / 2)
    root.location = (0, 0, 0)
    # suelo de piedra (Poly Haven suelo, CC0)
    bpy.ops.mesh.primitive_plane_add(size=4, location=(0.4, 0, -0.0165))
    fl = bpy.context.object
    fm = bpy.data.materials.new("suelo"); fm.use_nodes = True
    nt = fm.node_tree; b = nt.nodes["Principled BSDF"]
    def tex(fn, cs):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = bpy.data.images.load(os.path.join(TEXDIR, fn)); n.image.colorspace_settings.name = cs
        mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (4, 4, 4)
        tc = nt.nodes.new("ShaderNodeTexCoord")
        nt.links.new(tc.outputs["UV"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
        return n
    td = tex("suelo_Diffuse.jpg", "sRGB"); tn = tex("suelo_nor_gl.jpg", "Non-Color"); ta = tex("suelo_arm.jpg", "Non-Color")
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0; mix.inputs["B"].default_value = (0.35, 0.33, 0.32, 1)
    nt.links.new(td.outputs["Color"], mix.inputs["A"]); nt.links.new(mix.outputs["Result"], b.inputs["Base Color"])
    nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(tn.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    sp = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(ta.outputs["Color"], sp.inputs["Color"])
    nt.links.new(sp.outputs["Green"], b.inputs["Roughness"])
    fl.data.materials.append(fm)
    # mundo nocturno
    w = bpy.data.worlds.new("noche"); w.use_nodes = True; sc.world = w
    bg = w.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = (0.010, 0.016, 0.034, 1); bg.inputs["Strength"].default_value = 1.0
    # luna fria (area grande) y antorcha calida
    def light(kind, loc, energy, color, size=1.0, target=(0.4, 0, 0)):
        bpy.ops.object.light_add(type=kind, location=loc)
        l = bpy.context.object; l.data.energy = energy; l.data.color = color
        if kind == "AREA":
            l.data.size = size
        else:
            l.data.shadow_soft_size = size
        d = Vector(target) - Vector(loc)
        l.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        return l
    light("AREA", (-0.6, 1.4, 1.6), 260, (0.55, 0.70, 1.0), 1.6)
    light("AREA", (1.6, 1.2, 0.9), 90, (0.45, 0.60, 1.0), 1.2)
    light("POINT", (0.55, -0.85, 0.32), 110, (1.0, 0.50, 0.20), 0.05)
    bpy.ops.object.empty_add(location=(0.4, 0, 0)); tgt = bpy.context.object

    def cam(name, loc, lens, target):
        tgt.location = target
        bpy.ops.object.camera_add(location=loc)
        c = bpy.context.object; c.data.lens = lens
        tc = c.constraints.new("TRACK_TO"); tc.target = tgt; tc.track_axis = "TRACK_NEGATIVE_Z"; tc.up_axis = "UP_Y"
        return c
    base, _ = os.path.splitext(PREVIEW)
    views = [("completa", (0.36, -1.35, 0.95), 50, (0.36, 0, 0)),
             ("guarda", (0.02, -0.42, 0.30), 85, (0.14, 0, 0)),
             ("punta", (0.74, -0.28, 0.22), 85, (0.80, 0, 0))]
    only = os.environ.get("KATANA_VISTAS")
    for nm_, loc, lens, tg in views:
        if only and nm_ not in only.split(","):
            continue
        tgt.location = tg
        c = cam(nm_, loc, lens, tg)
        sc.camera = c
        sc.render.filepath = "%s_%s.png" % (base, nm_)
        bpy.ops.render.render(write_still=True)
        print("KATANA_RENDER", sc.render.filepath)


main()
