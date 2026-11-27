"""Equipo del héroe: ropa de mezcla medieval / ciencia ficción y espada híbrida (katana + sable de luz) en la cintura.

La ropa se deriva de la malla del cuerpo ("conchas" desplazadas por la normal, con sus mismos pesos de esqueleto),
así deforma igual que la piel. Texturas de tela y cuero de Poly Haven (CC0). La espada es geometría propia
(enfundada, emparentada al hueso de la pelvis, lado izquierdo, filo hacia arriba como una katana).

Se usa desde heroe.py:  objs = equipar(rig, body, tex_dir)
"""
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

TEX = None
BORRADAS = 0


def _img(path, srgb=True, max_size=1024):
    im = bpy.data.images.load(path, check_existing=True)
    if not srgb:
        im.colorspace_settings.name = "Non-Color"
    if max(im.size) > max_size:
        im.scale(max_size, max_size)
    return im


def _tinted(base, name, tint):
    """Copia de la textura de color con el tinte ya aplicado (el exportador glTF no exporta nodos Mix)."""
    import numpy as np
    src = _img(os.path.join(TEX, base + "_Diffuse.jpg"))
    w, h = src.size
    px = np.empty(w * h * 4, dtype=np.float32); src.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    # desatura un poco y aplica el tinte (en espacio lineal: Blender guarda los píxeles en lineal)
    lum = (px[:, :3] @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32))[:, None]
    px[:, :3] = (0.35 * px[:, :3] + 0.65 * lum) * np.array(tint[:3], dtype=np.float32) * 1.6
    np.clip(px, 0, 1, out=px)
    im = bpy.data.images.new(name + "_color", w, h)
    im.pixels.foreach_set(px.ravel())
    im.file_format = "JPEG"
    im.pack()
    return im


def pbr(name, base, tint=(1, 1, 1, 1), rough_add=0.0):
    """Material PBR de Poly Haven (Diffuse + nor_gl + arm) con tinte multiplicativo horneado en la textura."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    col = nt.nodes.new("ShaderNodeTexImage"); col.image = _tinted(base, name, tint)
    nor = nt.nodes.new("ShaderNodeTexImage"); nor.image = _img(os.path.join(TEX, base + "_nor_gl.jpg"), False)
    arm = nt.nodes.new("ShaderNodeTexImage"); arm.image = _img(os.path.join(TEX, base + "_arm.jpg"), False)
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nmap = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(col.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(arm.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(nor.outputs["Color"], nmap.inputs["Color"])
    nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Metallic"].default_value = 0.0
    return mat


def flat(name, rgb, rough=0.5, metal=0.0, emit=None, strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    return mat


def equipar(rig, body, tex_dir):
    global TEX
    TEX = tex_dir
    BONES = {b.name for b in rig.data.bones}
    names = {vg.index: vg.name for vg in body.vertex_groups}

    def bone_world(n):
        b = rig.data.bones[n]
        return rig.matrix_world @ b.head_local, rig.matrix_world @ b.tail_local

    knee_z = bone_world("calf_l")[0].z
    hip_z = bone_world("pelvis")[0].z
    ankle_z = bone_world("foot_l")[0].z
    sh = bone_world("upperarm_l")[0]

    # ------------------------------------------------------------ materiales
    LINO = pbr("lino", "rough_linen", (0.50, 0.45, 0.37, 1))
    ARPILLERA = pbr("sobretunica", "hessian_230", (0.62, 0.47, 0.32, 1))
    PANO = pbr("pantalon", "caban", (0.30, 0.25, 0.21, 1))
    FAJIN = pbr("fajin", "caban", (0.17, 0.13, 0.11, 1))
    CUERO = pbr("cuero", "brown_leather", (0.55, 0.42, 0.33, 1))
    CUERO_OSC = pbr("cuero_oscuro", "brown_leather", (0.28, 0.21, 0.17, 1))
    METAL = flat("metal", (0.62, 0.63, 0.66), rough=0.32, metal=1.0)
    METAL_OSC = flat("metal_oscuro", (0.10, 0.10, 0.11), rough=0.38, metal=1.0)
    LACA = flat("laca", (0.018, 0.02, 0.026), rough=0.22)
    EMISOR = flat("emisor", (0.3, 0.7, 1.0), rough=0.3, emit=(0.35, 0.75, 1.0), strength=6.0)

    # ------------------------------------------------------------ conchas derivadas del cuerpo
    def dominant(v, dl):
        d = v[dl]
        return max(((names[k], w) for k, w in d.items() if names.get(k) in BONES), key=lambda t: t[1], default=(None, 0))[0]

    def shell(name, groups, offset, thick, mat, *, zmin=None, zmax=None, keep=None, uv_scale=3.0, smooth=6, decimate=1.0):
        me = body.data.copy()
        obj = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(obj)
        obj.matrix_world = body.matrix_world.copy()
        for vg in body.vertex_groups:
            obj.vertex_groups.new(name=vg.name)
        bm = bmesh.new(); bm.from_mesh(me)
        dl = bm.verts.layers.deform.active
        drop = []
        for v in bm.verts:
            best = dominant(v, dl)
            ok = best in groups and (zmin is None or v.co.z >= zmin) and (zmax is None or v.co.z <= zmax)
            if ok and keep is not None:
                ok = keep(v.co, best)
            if not ok:
                drop.append(v)
        bmesh.ops.delete(bm, geom=drop, context="VERTS")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        # dobladillos limpios: alisa los bordes abiertos (laplaciano solo a lo largo del borde)
        for _ in range(12):
            bvs = [v for v in bm.verts if v.is_boundary]
            new = {}
            for v in bvs:
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
            p.material_index = 0
        sm = obj.modifiers.new("Suavizar", "SMOOTH"); sm.factor = 0.6; sm.iterations = smooth
        if decimate < 1:
            dc = obj.modifiers.new("Reducir", "DECIMATE"); dc.ratio = decimate
        if thick > 0:
            so = obj.modifiers.new("Grosor", "SOLIDIFY"); so.thickness = thick; so.offset = 1.0
        bpy.context.view_layer.objects.active = obj
        for m in list(obj.modifiers):
            with bpy.context.temp_override(object=obj):
                bpy.ops.object.modifier_apply(modifier=m.name)
        for p in me.polygons:
            p.use_smooth = True
        return obj

    arms = {"upperarm_l", "upperarm_r", "lowerarm_l", "lowerarm_r"}
    torso = {"spine_01", "spine_02", "spine_03", "clavicle_l", "clavicle_r", "pelvis"}
    legs = {"thigh_l", "thigh_r", "calf_l", "calf_r"}
    feet = {"foot_l", "foot_r", "ball_l", "ball_r"}

    pieces = []
    # túnica interior de lino: manga larga hasta la muñeca, hasta medio muslo; cuello redondo (sin el hueso neck)
    pieces.append(shell("tunica", torso | arms | {"thigh_l", "thigh_r"}, 0.012, 0.0, LINO, decimate=0.6,
                        keep=lambda c, b: c.z > hip_z - 0.06, uv_scale=4))
    # pantalón de paño (bajo la túnica), metido en las botas
    pieces.append(shell("pantalon", legs | {"pelvis"}, 0.008, 0.0, PANO, zmax=hip_z + 0.02,
                        keep=lambda c, b: c.z > ankle_z + 0.12, uv_scale=4))
    # botas altas de cuero hasta debajo de la rodilla
    pieces.append(shell("botas", {"calf_l", "calf_r"}, 0.02, 0.0, CUERO_OSC, zmax=knee_z - 0.05, uv_scale=5, smooth=12))
    # pie de la bota: envolvente convexa del pie (sin dedos marcados), algo hinchada, con los pesos del cuerpo
    for sd in ("l", "r"):
        bmf = bmesh.new(); bmf.from_mesh(body.data); dlf = bmf.verts.layers.deform.active
        pts = [Vector(v.co) for v in bmf.verts if dominant(v, dlf) in ("foot_" + sd, "ball_" + sd)
               or (dominant(v, dlf) == "calf_" + sd and v.co.z < ankle_z + 0.08)]
        bmf.free()
        hb = bmesh.new()
        for p_ in pts:
            hb.verts.new(p_)
        bmesh.ops.convex_hull(hb, input=hb.verts)
        bmesh.ops.delete(hb, geom=[v for v in hb.verts if not v.link_faces], context="VERTS")
        cen = sum((v.co for v in hb.verts), Vector()) / len(hb.verts)
        for v in hb.verts:   # 1,5 cm hacia fuera; la suela queda plana en el suelo
            dv = v.co - cen
            v.co = v.co + dv.normalized() * 0.015
            v.co.z = max(v.co.z, 0.0)
        bmesh.ops.subdivide_edges(hb, edges=list(hb.edges), cuts=1, use_grid_fill=True)
        mm = bpy.data.meshes.new("bota_" + sd); hb.to_mesh(mm); hb.free(); mm.materials.append(CUERO_OSC)
        ob = bpy.data.objects.new("bota_" + sd, mm); bpy.context.scene.collection.objects.link(ob)
        ob.matrix_world = body.matrix_world.copy()
        sm = ob.modifiers.new("Suavizar", "SMOOTH"); sm.factor = 0.5; sm.iterations = 6
        for vg in body.vertex_groups:
            ob.vertex_groups.new(name=vg.name)
        dt = ob.modifiers.new("pesos", "DATA_TRANSFER"); dt.object = body
        dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}; dt.vert_mapping = "NEAREST"
        dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
        for m in list(ob.modifiers):
            with bpy.context.temp_override(object=ob):
                bpy.ops.object.modifier_apply(modifier=m.name)
        for p_ in mm.polygons:
            p_.use_smooth = True
        uvb = mm.uv_layers.new(name="UVMap")
        for lp in mm.loops:
            c = mm.vertices[lp.vertex_index].co
            uvb.data[lp.index].uv = (c.x * 8 + c.z * 8, c.y * 8)
        pieces.append(ob)
    # sobretúnica (tabardo cruzado, sin mangas) de arpillera
    pieces.append(shell("sobretunica", {"spine_01", "spine_02", "spine_03", "clavicle_l", "clavicle_r", "pelvis"}, 0.024, 0.0, ARPILLERA, decimate=0.7,
                        keep=lambda c, b: abs(c.x) < 0.165 and c.z > hip_z - 0.05, uv_scale=3))
    # brazales de cuero (mitad inferior del antebrazo)
    pieces.append(shell("brazales", {"lowerarm_l", "lowerarm_r"}, 0.022, 0.004, CUERO,
                        keep=lambda c, b: True, uv_scale=5, smooth=10))
    # hombrera de cuero en el hombro izquierdo (toque medieval asimétrico)
    pieces.append(shell("hombrera", {"upperarm_l", "clavicle_l"}, 0.032, 0.006, CUERO_OSC,
                        zmin=sh.z - 0.13, keep=lambda c, b: c.x > 0.11, uv_scale=4, smooth=12))
    # fajín ancho (obi) y cinturón de cuero encima
    pieces.append(shell("fajin", torso, 0.034, 0.004, FAJIN, zmin=hip_z + 0.05, zmax=hip_z + 0.16, uv_scale=4, smooth=10))
    pieces.append(shell("cinturon", torso, 0.044, 0.006, CUERO, zmin=hip_z + 0.075, zmax=hip_z + 0.11, uv_scale=6, smooth=10))

    # el brazal solo en la mitad cercana a la muñeca: recorta por distancia al codo
    br = pieces[4]
    bm = bmesh.new(); bm.from_mesh(br.data)
    dl = bm.verts.layers.deform.active
    kill = []
    for v in bm.verts:
        b = dominant(v, dl)
        if b in ("lowerarm_l", "lowerarm_r"):
            e, w = bone_world(b)[0], bone_world("hand_" + b[-1])[0]
            t = (v.co - e).dot(w - e) / max(1e-6, (w - e).length_squared)
            if t < 0.45:
                kill.append(v)
    bmesh.ops.delete(bm, geom=kill, context="VERTS")
    bm.to_mesh(br.data); bm.free()

    # faldón de la sobretúnica: falda abierta por delante (dos paneles) hasta encima de la rodilla
    vs = [body.matrix_world @ Vector(v.co) for v in body.data.vertices]
    # solo el tronco (sin brazos ni manos, que cuelgan a la altura del cinturón)
    _bmt = bmesh.new(); _bmt.from_mesh(body.data); _dlt = _bmt.verts.layers.deform.active
    tronco = [body.matrix_world @ Vector(v.co) for v in _bmt.verts if dominant(v, _dlt) in ("spine_01", "spine_02", "pelvis", "thigh_l", "thigh_r")]
    _bmt.free()
    top, bot = hip_z + 0.06, knee_z + 0.06
    SEG, NR = 40, 7
    b = bmesh.new(); uvl = b.loops.layers.uv.new()
    rings = []
    for j in range(NR + 1):
        t = j / NR
        z = top + (bot - top) * t
        sl = [v for v in vs if abs(v.z - z) < 0.03 and abs(v.x) < 0.3]
        cx = sum(v.x for v in sl) / len(sl); cy = sum(v.y for v in sl) / len(sl)
        rx = (max(v.x for v in sl) - min(v.x for v in sl)) / 2 + 0.05 + 0.07 * t
        ry = (max(v.y for v in sl) - min(v.y for v in sl)) / 2 + 0.05 + 0.06 * t
        ring = []
        for i in range(SEG + 1):
            # abierto por delante (−Y): de 290° a 250° pasando por detrás (deja ~40° de abertura)
            a = math.radians(-80 + (340 * i / SEG))
            wob = 0.007 * math.sin(a * 9 + j) * t
            ring.append(b.verts.new((cx + math.cos(a) * (rx + wob), cy + math.sin(a) * (ry + wob), z)))
        rings.append(ring)
    for j in range(NR):
        for i in range(SEG):
            f = b.faces.new((rings[j][i], rings[j][i + 1], rings[j + 1][i + 1], rings[j + 1][i]))
            for lp, uv in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                lp[uvl].uv = (uv[0] / SEG * 5, 1 - uv[1] / NR * 1.5)
    me = bpy.data.meshes.new("faldon"); b.to_mesh(me); b.free(); me.materials.append(ARPILLERA)
    sk = bpy.data.objects.new("faldon", me); bpy.context.scene.collection.objects.link(sk)
    for vg in body.vertex_groups:
        sk.vertex_groups.new(name=vg.name)
    dt = sk.modifiers.new("pesos", "DATA_TRANSFER"); dt.object = body
    dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}; dt.vert_mapping = "POLYINTERP_NEAREST"
    dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
    so = sk.modifiers.new("Grosor", "SOLIDIFY"); so.thickness = 0.004
    for m in list(sk.modifiers):
        with bpy.context.temp_override(object=sk):
            bpy.ops.object.modifier_apply(modifier=m.name)
    for p in me.polygons:
        p.use_smooth = True
    pieces.append(sk)

    # cuerpo: se borran las caras que quedan totalmente bajo ropa opaca (ahorra triángulos y evita que asome)
    bm = bmesh.new(); bm.from_mesh(body.data)
    dl = bm.verts.layers.deform.active
    hidden = {"spine_01", "spine_02", "pelvis", "thigh_l", "thigh_r", "calf_l", "calf_r", "upperarm_l", "upperarm_r"} | feet
    kill = [f for f in bm.faces if all(dominant(v, dl) in hidden for v in f.verts)
            and all(v.co.z > ankle_z - 0.2 for v in f.verts)]
    global BORRADAS
    BORRADAS = len(kill)
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bm.to_mesh(body.data); bm.free()

    # ------------------------------------------------------------ piezas rígidas: bolsillos y hebilla del cinturón
    rigid = []

    def box(name, size, loc, mat, rot_z=0.0, bevel=0.004):
        bb = bmesh.new(); bmesh.ops.create_cube(bb, size=1.0)
        for v in bb.verts:
            v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
        bmesh.ops.bevel(bb, geom=list(bb.edges), offset=bevel, segments=2, affect="EDGES")
        m4 = Matrix.Translation(loc) @ Matrix.Rotation(rot_z, 4, "Z")
        bmesh.ops.transform(bb, matrix=m4, verts=bb.verts)
        mm = bpy.data.meshes.new(name); bb.to_mesh(mm); bb.free(); mm.materials.append(mat)
        for p in mm.polygons:
            p.use_smooth = True
        o = bpy.data.objects.new(name, mm); bpy.context.scene.collection.objects.link(o); rigid.append(o); return o

    belt_z = hip_z + 0.092
    belt_vs = [v for v in tronco if abs(v.z - belt_z) < 0.02]
    fy = min(v.y for v in belt_vs) - 0.05       # frente del cinturón (−Y)
    by = max(v.y for v in belt_vs) + 0.05
    bx = max(v.x for v in belt_vs) + 0.05
    box("hebilla", (0.075, 0.012, 0.05), Vector((0.0, fy, belt_z)), METAL, bevel=0.004)
    box("hebilla_centro", (0.04, 0.008, 0.024), Vector((0.0, fy - 0.008, belt_z)), METAL_OSC, bevel=0.002)
    # bolsillos tipo cartuchera alrededor del cinturón (derecha y atrás; la izquierda la ocupa la espada)
    for k, ang in enumerate((-118, -150, 160, 125)):
        a = math.radians(ang)
        x = math.cos(a) * bx * 0.98; y = math.sin(a) * (by - fy) / 2 * 0.98 + (by + fy) / 2
        box("bolsillo_%d" % k, (0.06, 0.035, 0.07), Vector((x, y, belt_z - 0.01)), CUERO_OSC, rot_z=a + math.pi / 2, bevel=0.006)
        box("broche_%d" % k, (0.018, 0.006, 0.014), Vector((x * 1.06, y + (0.02 if y > 0 else -0.02) * 0, belt_z + 0.012)), METAL, rot_z=a + math.pi / 2, bevel=0.002)

    # ------------------------------------------------------------ espada híbrida enfundada
    def tube(name, pts, radii, mat, segs=20, ell=1.0, cap=True):
        """Tubo a lo largo de pts (Vector) con radio por punto; sección elíptica (ell = ry/rx)."""
        bb = bmesh.new()
        rings2 = []
        up = Vector((0, 0, 1))
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            n1 = up.cross(t)
            if n1.length < 1e-4:
                n1 = Vector((1, 0, 0)).cross(t)
            n1.normalize(); n2 = t.cross(n1).normalized()
            r = radii[i]
            ring = [bb.verts.new(p + n1 * math.cos(2 * math.pi * k / segs) * r + n2 * math.sin(2 * math.pi * k / segs) * r * ell) for k in range(segs)]
            rings2.append(ring)
        for i in range(len(rings2) - 1):
            for k in range(segs):
                bb.faces.new((rings2[i][k], rings2[i][(k + 1) % segs], rings2[i + 1][(k + 1) % segs], rings2[i + 1][k]))
        if cap:
            bb.faces.new(rings2[0][::-1]); bb.faces.new(rings2[-1])
        mm = bpy.data.meshes.new(name); bb.to_mesh(mm); bb.free(); mm.materials.append(mat)
        for p in mm.polygons:
            p.use_smooth = True
        o = bpy.data.objects.new(name, mm); bpy.context.scene.collection.objects.link(o)
        return o

    sword = []
    # eje local de la espada: +X a lo largo (de la boca de la saya hacia la punta), curva hacia +Z (filo arriba)
    L_SAYA, L_TSUKA, SAG = 0.74, 0.27, 0.022
    saya_pts = [Vector((L_SAYA * u, 0, SAG * 4 * u * (1 - u) - SAG * u * 0.6)) for u in [i / 24 for i in range(25)]]
    saya_r = [0.020 * (1 - 0.18 * u) for u in [i / 24 for i in range(25)]]
    sword.append(tube("saya", saya_pts, saya_r, LACA, segs=14, ell=1.35))
    # contera (punta metálica) y boca (koiguchi) con anillos tecnológicos
    sword.append(tube("saya_contera", saya_pts[22:], [r * 1.07 for r in saya_r[22:]], METAL_OSC, segs=18, ell=1.35))
    for u0 in (0.0, 0.16, 0.5):
        i0 = int(u0 * 24)
        sword.append(tube("saya_anillo_%d" % i0, saya_pts[i0:i0 + 2], [saya_r[i0] * 1.12] * 2, METAL, segs=18, ell=1.3))
    # línea emisora a lo largo de la saya (ranura de energía, como el núcleo de un sable de luz)
    sword.append(tube("saya_ranura", [p + Vector((0, 0, saya_r[i] * 1.33)) for i, p in enumerate(saya_pts[2:21], 2)],
                      [0.0024] * 19, EMISOR, segs=8))
    # habaki/emisor: anillo que brilla entre la saya y la tsuba
    sword.append(tube("emisor", [Vector((-0.004, 0, 0)), Vector((-0.016, 0, 0))], [0.021, 0.021], EMISOR, segs=24, ell=1.25))
    # tsuba: disco metálico oscuro con escotaduras (8 lóbulos)
    bb = bmesh.new()
    ring_o, ring_i = [], []
    for k in range(48):
        a = 2 * math.pi * k / 48
        r = 0.040 * (1 - 0.10 * (math.cos(a * 4) > 0.7))
        ring_o.append(Vector((0, math.cos(a) * r, math.sin(a) * r * 1.1)))
    mm = bpy.data.meshes.new("tsuba")
    vv = [bb.verts.new(Vector((-0.018, 0, 0)) + p) for p in ring_o] + [bb.verts.new(Vector((-0.026, 0, 0)) + p) for p in ring_o]
    bb.faces.new(vv[:48]); bb.faces.new(vv[48:][::-1])
    for k in range(48):
        bb.faces.new((vv[k], vv[48 + k], vv[48 + (k + 1) % 48], vv[(k + 1) % 48]))
    bb.to_mesh(mm); bb.free(); mm.materials.append(METAL_OSC)
    ts = bpy.data.objects.new("tsuba", mm); bpy.context.scene.collection.objects.link(ts); sword.append(ts)
    # tsuka: empuñadura metálica estriada (sable de luz) con tramos envueltos (katana)
    xs = [-0.026 - L_TSUKA * u for u in [i / 40 for i in range(41)]]
    tsuka_pts = [Vector((x, 0, 0.012 * ((x + 0.026) / -L_TSUKA))) for x in xs]
    rad = []
    for i, x in enumerate(xs):
        u = i / 40
        base = 0.0165 + 0.002 * math.sin(math.pi * u)
        rad.append(base * (0.93 if (i % 3 == 0 and 0.1 < u < 0.85) else 1.0))
    sword.append(tube("tsuka", tsuka_pts, rad, METAL, segs=14, ell=1.15))
    # envoltura de cuero en diamantes (tramo central)
    wrap = [p for i, p in enumerate(tsuka_pts) if 10 <= i <= 30]
    sword.append(tube("tsuka_ito", wrap, [0.0175] * len(wrap), CUERO_OSC, segs=12, ell=1.15))
    # botón de activación y pomo (kashira)
    st = tube("boton", [tsuka_pts[6] + Vector((0, 0, 0.016)), tsuka_pts[6] + Vector((0, 0, 0.021))], [0.004, 0.004], EMISOR, segs=10)
    sword.append(st)
    sword.append(tube("kashira", [tsuka_pts[-1], tsuka_pts[-1] + Vector((-0.02, 0, 0.001))], [0.019, 0.015], METAL_OSC, segs=20, ell=1.15))

    # colocar: boca de la saya en la cadera izquierda, algo adelantada; la saya baja hacia atrás; empuñadura hacia
    # delante y arriba; MakeHuman mira hacia −Y y su izquierda es +X
    pel = bone_world("pelvis")[0]
    pelvis_vs = [v for v in tronco if abs(v.z - belt_z) < 0.03 and v.x > 0]
    side_x = max(v.x for v in pelvis_vs) + 0.045
    mouth = Vector((side_x, (fy + by) / 2 - 0.07, belt_z - 0.015))
    d = Vector((0.10, 1.0, -0.52)).normalized()          # dirección de la saya (hacia atrás y abajo)
    xax = d
    zax = Vector((0, 0, 1)) - d * d.z; zax.normalize()   # «arriba» de la espada (filo hacia arriba)
    yax = zax.cross(xax).normalized()
    M = Matrix((xax, yax, zax)).transposed().to_4x4()
    M.translation = mouth
    for o in sword:
        o.data.transform(M)          # geometría ya colocada en el mundo (el objeto queda con matriz identidad)

    # ------------------------------------------------------------ unir la ropa al esqueleto
    for p in pieces:
        p.parent = rig
        p.matrix_parent_inverse = rig.matrix_world.inverted()
        mod = p.modifiers.new("Armature", "ARMATURE"); mod.object = rig
        for vg in list(p.vertex_groups):
            if vg.name not in BONES:
                p.vertex_groups.remove(vg)

    # unir las piezas rígidas de la espada y del cinturón en dos mallas (menos draw calls)
    def join(objs, name):
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.join()
        objs[0].name = name
        return objs[0]

    espada = join(sword, "espada")
    accesorios = join(rigid, "accesorios_cinturon")
    # piezas rígidas: pesadas al 100 % en la pelvis (mismo camino de exportación que la ropa)
    for o in (espada, accesorios):
        o.data.transform(o.matrix_world); o.matrix_world = Matrix.Identity(4)
        vg = o.vertex_groups.new(name="pelvis"); vg.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")
        o.parent = rig; o.matrix_parent_inverse = rig.matrix_world.inverted()
        mod = o.modifiers.new("Armature", "ARMATURE"); mod.object = rig
    print("CUERPO: caras borradas bajo la ropa =", BORRADAS)
    return pieces + [espada, accesorios]
