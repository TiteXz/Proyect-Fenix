"""Clips de lanzamiento de magia (categoria "magia"): receta -> entradas para candidatas_spec.json.

Base: Quaternius UAL1 Spell_Simple_* (CC0, brazo izq. al frente) y UAL2 OverhandThrow / Farm_PlantSeed / Consume (CC0),
re-temporizados y modificados con rotaciones aditivas (ver retarget_candidatas.py, campo "ajustes").
Configuraciones (EP = solo espada, EE = espada + escudo, como COMBATE.md):
  Ambas: la espada sigue en la mano DER. (pose fija de Sword_Idle, no se suelta) y la magia sale de la mano IZQ.
  EP: brazo izq. libre, gesto completo.
  EE: decision de diseno: el escudo va atado al antebrazo izq. y la magia sale de la mano izq. por encima del borde; el brazo
      mezcla la guardia con el gesto (peso 0,2-0,6) y recorre ~65 % de la amplitud: gesto mas compacto y contenido, el escudo
      nunca se baja. El tronco y la cadera hacen el gesto completo (compensan).
Ajustes escritos para el brazo lanzador: ejes del personaje x = derecha, y = delante, z = arriba; grados, mano derecha.
"""
import math, os, re

ESPADA = ["ual1", "Sword_Idle"]      # mano der. con la espada: pose fija de Sword_Idle (la espada no se suelta)
ESCUDO = ["ual2", "Idle_Shield_Loop"]  # brazo izq. con el escudo
EE_ARM = 0.65   # EE: el brazo del escudo hace ~65 % del recorrido (el escudo pesa y sigue al antebrazo)
BRAZO_W = ("upperarm", "lowerarm", "hand", "clavicle")


def _res(a, cfg):
    """Resuelve un ajuste: C = brazo lanzador (izq.), N = el otro (der., espada); en EE escala el recorrido del brazo del escudo."""
    out = dict(a)
    m = re.match(r"^(upperarm|lowerarm|hand|clavicle|index_\d\d|middle_\d\d|ring_\d\d|pinky_\d\d|thumb_\d\d)([CN])$", a["b"])
    if m:
        out["b"] = f"{m.group(1)}_{'l' if m.group(2) == 'C' else 'r'}"
        if cfg == "EE" and m.group(2) == "C" and m.group(1) in BRAZO_W and a.get("modo", "w") == "w":
            if a.get("k"): out["k"] = [[k[0]] + [v * EE_ARM for v in k[1:]] for k in a["k"]]
            if a.get("osc"): out["osc"] = dict(a["osc"], amp=[v * EE_ARM for v in a["osc"]["amp"]])
    return out


def _k(*pts):
    return [list(map(float, p)) for p in pts]


def clip(nombre, cfg, partes, ajustes, meta, cubre, nota, bucle=False, dos_manos=False, fuente="ual1", ee_w=None):
    """dos_manos: el brazo der. (N) copia el gesto del izq. reflejado (EP: espada acompana; EE igual) ."""
    sobre, grupo = {}, []
    if dos_manos: grupo = ["brazo_r"]
    else: sobre["brazo_r"] = ESPADA
    if cfg == "EE":
        sobre["brazo_l"] = ESCUDO + [ee_w or [[0, 0.2], [60, 0.55]]]
    c = {"fuente": fuente, "clip": partes[0]["clip"], "nombre": nombre, "partes": partes, "espejo": False,
         "espejo_grupo": grupo, "sobre": sobre, "ajustes": [_res(a, cfg) for a in ajustes],
         "cubre": cubre, "nota": nota, "categoria": "magia", "bucle": bucle, "escudo": False, "meta": meta}
    return c


P = lambda c, t0=0, t1=None, dur=None: {k: v for k, v in {"clip": c, "t0": t0, "t1": t1, "dur": dur}.items() if v is not None}
A = lambda b, k=None, modo="w", **kw: dict({"b": b, "modo": modo, "k": k}, **kw)
LIN = lambda ads: [dict(a, lin=True) for a in ads]

# ---------------------------------------------------------------- piezas de gesto (todas devuelven listas de "ajustes")
def brazo(rows, lado="C"):
    """rows: (t, (rx,ry,rz) brazo, (..) antebrazo, (..) mano)."""
    return [A("upperarm" + lado, _k(*[(r[0],) + tuple(r[1]) for r in rows])),
            A("lowerarm" + lado, _k(*[(r[0],) + tuple(r[2]) for r in rows])),
            A("hand" + lado, _k(*[(r[0],) + tuple(r[3]) for r in rows]))]


def hombro(rows, lado="C"):
    """rows: (t, subir): sube el hombro (clavicula, giro sobre el eje delantero)."""
    return [A("clavicle" + lado, _k(*[(r[0], 0, r[1], 0) for r in rows]))]


def tronco(rows):
    """rows: (t, giro, inclinacion, ladeo): giro z (+ = a la izq.), inclinacion x (- = hacia delante), ladeo y; repartido en 3 vertebras."""
    return [A(n, _k(*[(r[0], r[2] * f, (r[3] if len(r) > 3 else 0) * f, r[1] * f) for r in rows]))
            for n, f in (("spine_01", 0.3), ("spine_02", 0.4), ("spine_03", 0.3))]


def cabeza(rows):
    return [A("head", _k(*[(r[0],) + tuple(r[1]) for r in rows])), A("neck_01", _k(*[(r[0],) + tuple(v * 0.4 for v in r[1]) for r in rows]))]


def cadera(rows):
    """rows: (t, x, y, z) en metros (x der., y delante, z arriba)."""
    return [A("pelvis_loc", _k(*rows))]


def agacha(rows):
    """rows: (t, d): baja la cadera d metros flexionando ambas piernas (pies fijos)."""
    out, pz = [], []
    th = lambda d: math.degrees(math.acos(min(1.0, max(0.0, 1 - d / 0.88))))
    for lado in "lr":
        out += [A(f"thigh_{lado}", _k(*[(t, th(d), 0, 0) for t, d in rows])),
                A(f"calf_{lado}", _k(*[(t, -2 * th(d), 0, 0) for t, d in rows])),
                A(f"foot_{lado}", _k(*[(t, th(d), 0, 0) for t, d in rows]))]
    out.append(A("pelvis_loc", _k(*[(t, 0, 0, -d) for t, d in rows])))
    return out


# dedos: curvatura (grados, eje x local) por articulacion 01/02/03 sobre la pose relajada del clip base
FORMA = {
    "puno": {"index": (70, 90, 65), "middle": (75, 95, 65), "ring": (80, 95, 65), "pinky": (80, 90, 60), "thumb": (20, 35, 20)},
    "garra": {"index": (30, 50, 35), "middle": (32, 52, 36), "ring": (32, 50, 34), "pinky": (30, 48, 32), "thumb": (10, 15, 10)},
    "plana": {"index": (-12, -6, -3), "middle": (-12, -6, -3), "ring": (-12, -6, -3), "pinky": (-10, -5, -3), "thumb": (-6, 0, 0)},
    "abierta": {"index": (-18, -10, -5), "middle": (-20, -10, -5), "ring": (-16, -8, -4), "pinky": (-14, -8, -4), "thumb": (-10, -5, 0)},
    "indice": {"index": (-10, -6, -3), "middle": (75, 95, 65), "ring": (80, 95, 65), "pinky": (80, 90, 60), "thumb": (20, 25, 15)},
    "dos": {"index": (-10, -6, -3), "middle": (-8, -5, -3), "ring": (80, 95, 65), "pinky": (80, 90, 60), "thumb": (20, 25, 15)},
    "suelta": {"index": (14, 20, 12), "middle": (16, 22, 14), "ring": (18, 24, 14), "pinky": (20, 26, 16), "thumb": (6, 8, 4)},
    "cero": {"index": (0, 0, 0), "middle": (0, 0, 0), "ring": (0, 0, 0), "pinky": (0, 0, 0), "thumb": (0, 0, 0)},
}


def dedos(rows, lado="C"):
    """rows: (t, forma, peso) -> curvatura de los 15 dedos (interpolada entre filas)."""
    out = []
    for f in ("index", "middle", "ring", "pinky", "thumb"):
        for j in range(3):
            out.append(A(f"{f}_0{j + 1}{lado}", _k(*[(t, FORMA[nm][f][j] * w, 0, 0) for t, nm, w in rows]), modo="l"))
    return out


def tiembla(b, amp, hz, t0, t1, fase=0.0, lado=None):
    """Temblor (oscilacion) con envolvente entre t0 y t1 (sube y baja en 0,08 s)."""
    return A(b, None, osc={"amp": list(amp), "hz": hz, "fase": fase, "env": [[t0 - 0.08, 0], [t0, 1], [t1, 1], [t1 + 0.08, 0]]})


def espejo_brazo(ads):
    """Pasa un gesto escrito para el brazo izq. (C) al der. (N): invierte ry y rz."""
    out = []
    for a in ads:
        b = a["b"]
        if not b.endswith("C"): continue
        d = dict(a, b=b[:-1] + "N")
        if a.get("modo", "w") == "w":
            if a.get("k"): d["k"] = [[k[0], k[1], -k[2], -k[3]] for k in a["k"]]
            if a.get("osc"): d["osc"] = dict(a["osc"], amp=[a["osc"]["amp"][0], -a["osc"]["amp"][1], -a["osc"]["amp"][2]])
        out.append(d)
    return out


# ---------------------------------------------------------------- recetas
FORMAS_T = {"proyectil": 0.4, "area": 0.8, "zona": 0.8, "cono": 0.3, "yo": 0.5}   # t_forma de DISENO.md (s)


def meta_de(forma, variante, cfg, t_disp, act, rec, elemento="cualquiera", piezas=1, modificador=None, inest=None, bucle=False,
            mano="L", extra=None):
    m = {"forma": forma, "variante": variante, "elemento": elemento, "piezas": piezas, "modificador": modificador, "inestabilidad": inest,
         "config": cfg, "bucle": bucle, "mano_lanzadora": mano, "t_disparo": None if bucle else round(t_disp, 2)}
    if bucle:
        m["fases"] = {"activo": [0.0, round(t_disp + act + rec, 2)]}
    else:
        m["fases"] = {"anticipacion": [0.0, round(t_disp, 2)], "activo": [round(t_disp, 2), round(t_disp + act, 2)],
                      "recuperacion": [round(t_disp + act, 2), round(t_disp + act + rec, 2)]}
    if extra: m.update(extra)
    return m


def lanz(cfg, nombre, forma, variante, ajustes, tA, act, rec, nota, cubre, partes=None, dos_manos=False, **kw):
    """Gesto de lanzamiento: Spell_Simple_Enter (tA) + Shoot (act) + Exit (rec) re-temporizados + ajustes."""
    partes = partes or [P("Spell_Simple_Enter", dur=tA), P("Spell_Simple_Shoot", t1=0.5, dur=act), P("Spell_Simple_Exit", dur=rec)]
    m = meta_de(forma, variante, cfg, tA, act, rec, mano="ambas" if dos_manos else "L", **kw)
    tt = round(tA + act, 2)
    ee_w = [[0, 0.15], [max(0.05, tA - 0.15), 0.35], [tA, 0.6], [tt, 0.6], [tt + rec, 0.15]]
    return clip(nombre, cfg, partes, ajustes, m, cubre, nota, dos_manos=dos_manos, ee_w=ee_w)


# ---------------------------------------------------------------- PROYECTIL (t_forma 0,4 s): empuje rapido de la mano
# Estilos por elemento. Tiempos clave: 0 -> reposo, tc = carga, TA (0,4) = sale el hechizo, TA+act = fin del activo, TOT.
TA, ACT, REC = 0.4, 0.15, 0.35
TOT = TA + ACT + REC


def estilo_proyectil(el):
    """-> (brazo, tronco, cabeza, cadera, dedos, extra, lin, nota)."""
    T = [0, 0.2, TA, TA + ACT, TOT]
    if el is None:   # forma generica
        return (brazo([(0, (0, 0, 0), (0, 0, 0), (0, 0, 0)), (0.2, (-8, 0, 34), (18, 0, 0), (-10, 0, 0)), (TA, (8, 0, -10), (-30, 0, 0), (10, 0, 0)),
                       (TA + ACT, (8, 0, -10), (-30, 0, 0), (10, 0, 0)), (TOT, (0, 0, 0), (0, 0, 0), (0, 0, 0))]),
                tronco([(0, 0, 0), (0.2, -14, 2), (TA, 10, -3), (TOT, 0, 0)]), cabeza([(0, (0, 0, 0)), (0.2, (0, 0, 7)), (TA, (-3, 0, -5)), (TOT, (0, 0, 0))]),
                cadera([(0, 0, 0, 0), (0.2, 0, -0.04, 0), (TA, 0, 0.07, 0), (TOT, 0, 0, 0)]),
                dedos([(0, "cero", 0), (0.2, "garra", 0.4), (TA, "abierta", 1), (TOT, "cero", 0)]), [], False,
                "Empuje de palma: carga con el codo atras y el tronco girado, estira el brazo y abre la mano al salir el hechizo")
    if el == "fuego":   # mano abierta que agarra y lanza, brusco
        return (brazo([(0, (0, 0, 0), (0, 0, 0), (0, 0, 0)), (0.24, (-14, 0, 44), (24, 0, 0), (-32, 0, 0)), (0.33, (-14, 0, 44), (24, 0, 0), (-32, 0, 0)),
                       (TA, (14, 0, -14), (-38, 0, 0), (28, 0, 0)), (TA + ACT, (10, 0, -10), (-30, 0, 0), (20, 0, 0)), (TOT, (0, 0, 0), (0, 0, 0), (0, 0, 0))]),
                tronco([(0, 0, 0), (0.24, -24, 3), (0.33, -24, 3), (TA, 18, -8), (TOT, 0, 0)]), cabeza([(0, (0, 0, 0)), (0.24, (0, 0, 12)), (TA, (-6, 0, -9)), (TOT, (0, 0, 0))]),
                cadera([(0, 0, 0, 0), (0.24, 0, -0.06, 0), (TA, 0, 0.11, 0), (TOT, 0, 0, 0)]),
                dedos([(0, "cero", 0), (0.14, "abierta", 1), (0.28, "garra", 1.15), (TA - 0.02, "garra", 1.15), (TA + 0.05, "abierta", 1.2), (TOT, "cero", 0)]), [], True,
                "Fuego: la mano se abre, agarra (garra) y lanza con un latigazo brusco del tronco y paso adelante")
    if el == "hielo":   # dedos rigidos, cortante y contenido
        return (brazo([(0, (0, 0, 0), (0, 0, 0), (0, 0, 0)), (0.18, (0, 0, 10), (10, 0, 0), (0, 0, 0)), (0.31, (0, 0, 10), (10, 0, 0), (0, 0, 0)),
                       (TA, (4, 0, -6), (-18, 0, 0), (6, 0, 0)), (TA + ACT, (4, 0, -6), (-18, 0, 0), (6, 0, 0)), (TOT, (0, 0, 0), (0, 0, 0), (0, 0, 0))]),
                tronco([(0, 0, 0), (0.18, -5, 0), (0.31, -5, 0), (TA, 5, 0), (TOT, 0, 0)]), cabeza([(0, (0, 0, 0)), (TA, (0, 0, -2)), (TOT, (0, 0, 0))]),
                cadera([(0, 0, 0, 0), (TA, 0, 0.03, 0), (TOT, 0, 0, 0)]),
                dedos([(0, "cero", 0), (0.15, "plana", 1.3), (TA + ACT, "plana", 1.3), (TOT, "cero", 0)]), [tiembla("handC", (0.8, 0, 0.8), 14, 0.2, 0.3)], True,
                "Hielo: dedos juntos y rigidos, carga corta y contenida, corte seco con la mano plana; el cuerpo apenas se mueve")
    if el == "luz":     # palma alzada, gesto amplio y sereno
        return (brazo([(0, (0, 0, 0), (0, 0, 0), (0, 0, 0)), (0.2, (36, 0, 24), (10, 0, 0), (-18, 0, 0)), (TA, (16, 0, -4), (-22, 0, 0), (-10, 0, 0)),
                       (TA + ACT + 0.1, (18, 0, -4), (-22, 0, 0), (-10, 0, 0)), (TOT, (0, 0, 0), (0, 0, 0), (0, 0, 0))]),
                tronco([(0, 0, 0), (0.2, -3, 9), (TA, 4, 5), (TOT, 0, 0)]), cabeza([(0, (0, 0, 0)), (0.2, (10, 0, 0)), (TA, (6, 0, 0)), (TOT, (0, 0, 0))]),
                cadera([(0, 0, 0, 0), (TA, 0, 0.05, 0), (TOT, 0, 0, 0)]),
                dedos([(0, "cero", 0), (0.2, "abierta", 1), (TA + ACT, "abierta", 1), (TOT, "cero", 0)]), [], False,
                "Luz: la palma sube abierta con el pecho erguido, arco amplio y sereno hacia delante; cabeza alta")
    if el == "rayo":    # dos dedos, tiron seco y rapido
        return (brazo([(0, (0, 0, 0), (0, 0, 0), (0, 0, 0)), (0.3, (4, 0, 8), (6, 0, 0), (-8, 0, 0)), (0.36, (6, 0, 12), (8, 0, 0), (-10, 0, 0)),
                       (TA, (10, 0, -8), (-34, 0, 0), (14, 0, 0)), (TA + 0.04, (6, 0, -4), (-22, 0, 0), (8, 0, 0)), (TA + ACT, (6, 0, -4), (-22, 0, 0), (8, 0, 0)), (TOT, (0, 0, 0), (0, 0, 0), (0, 0, 0))]),
                tronco([(0, 0, 0), (0.3, -4, 0), (0.36, -7, 0), (TA, 9, -2), (TOT, 0, 0)]), cabeza([(0, (0, 0, 0)), (0.36, (0, 0, 3)), (TA, (-7, 0, -4)), (TA + 0.06, (-3, 0, -2)), (TOT, (0, 0, 0))]),
                cadera([(0, 0, 0, 0), (0.36, 0, -0.02, 0), (TA, 0, 0.06, 0), (TOT, 0, 0, 0)]),
                dedos([(0, "cero", 0), (0.2, "dos", 1), (TA + ACT, "dos", 1), (TOT, "cero", 0)]),
                [tiembla("handC", (2, 0, 2), 18, 0.26, 0.36), tiembla("upperarmC", (1.5, 0, 1.5), 16, TA, TA + ACT)], True,
                "Rayo: dos dedos extendidos, casi sin carga y un tiron seco; temblor fino de la mano justo antes y tras el disparo")
    if el == "tierra":  # puno, pisoton con peso
        return (brazo([(0, (0, 0, 0), (0, 0, 0), (0, 0, 0)), (0.22, (-10, 0, 14), (14, 0, 0), (0, 0, 0)), (TA, (-4, 0, -6), (-20, 0, 0), (0, 0, 0)),
                       (TA + ACT, (-4, 0, -6), (-20, 0, 0), (0, 0, 0)), (TOT, (0, 0, 0), (0, 0, 0), (0, 0, 0))]),
                tronco([(0, 0, 0), (0.22, -8, 6), (TA, 5, -14), (TA + ACT, 3, -12), (TOT, 0, 0)]), cabeza([(0, (0, 0, 0)), (TA, (-8, 0, 0)), (TOT, (0, 0, 0))]),
                agacha([(0, 0), (0.22, 0), (TA, 0.10), (TA + ACT, 0.08), (TOT, 0)]) + cadera([(0, 0, 0, 0), (0.22, 0, -0.03, 0), (TA, 0, 0.05, 0), (TOT, 0, 0, 0)])
                + [A("thigh_r", _k((0, 0, 0, 0), (0.2, 38, 0, 0), (TA - 0.04, 38, 0, 0), (TA, 0, 0, 0), (TOT, 0, 0, 0))),
                   A("calf_r", _k((0, 0, 0, 0), (0.2, -50, 0, 0), (TA - 0.04, -50, 0, 0), (TA, 0, 0, 0), (TOT, 0, 0, 0)))],
                dedos([(0, "cero", 0), (0.15, "puno", 1), (TA + ACT, "puno", 1), (TOT, "cero", 0)]), [], False,
                "Tierra: puno cerrado, el pie der. se alza y pisa al salir el hechizo; la cadera baja y el tronco se inclina con peso")
    if el == "sombra":  # gesto envolvente, mano en garra, lento
        return (brazo([(0, (0, 0, 0), (0, 0, 0), (0, 0, 0)), (0.2, (0, 0, -38), (28, 0, 0), (-10, 0, 0)), (TA, (6, 0, 14), (-16, 0, 0), (12, 0, 0)),
                       (TA + ACT + 0.1, (6, 0, 22), (-16, 0, 0), (12, 0, 0)), (TOT, (0, 0, 0), (0, 0, 0), (0, 0, 0))]),
                tronco([(0, 0, 0), (0.2, -9, 8), (TA, 8, 6), (TOT, 0, 0)]), cabeza([(0, (0, 0, 0)), (0.2, (-10, 0, 8)), (TA, (-10, 0, -6)), (TOT, (0, 0, 0))]),
                cadera([(0, 0, 0, 0), (0.2, 0.02, -0.03, 0), (TA, -0.02, 0.04, 0), (TOT, 0, 0, 0)]),
                dedos([(0, "cero", 0), (0.2, "garra", 1.2), (TA + ACT + 0.1, "garra", 1.0), (TOT, "cero", 0)]), [], False,
                "Sombra: el brazo cruza el pecho en arco envolvente y se abre en garra; cabeza gacha, movimiento lento y continuo")
    if el == "aire":    # barrido abierto de brazo, giro de muñeca
        return (brazo([(0, (0, 0, 0), (0, 0, 0), (0, 0, 0)), (0.2, (2, 0, -30), (-16, 0, 0), (0, -32, 0)), (TA, (4, 0, 38), (-24, 0, 0), (0, 38, 0)),
                       (TA + ACT + 0.08, (4, 0, 46), (-24, 0, 0), (0, 44, 0)), (TOT, (0, 0, 0), (0, 0, 0), (0, 0, 0))]),
                tronco([(0, 0, 0), (0.2, -16, 0, -3), (TA, 18, 0, 3), (TOT, 0, 0)]), cabeza([(0, (0, 0, 0)), (0.2, (0, 0, 9)), (TA, (0, 0, -9)), (TOT, (0, 0, 0))]),
                cadera([(0, 0, 0, 0), (0.2, 0.03, -0.02, 0), (TA, -0.03, 0.04, 0), (TOT, 0, 0, 0)]),
                dedos([(0, "cero", 0), (0.2, "suelta", 1), (TA + ACT, "abierta", 0.8), (TOT, "cero", 0)]), [], False,
                "Aire: la mano barre de dentro afuera con el brazo abierto y la muñeca girando; el tronco acompaña el arco")


def proyectil(cfg, el=None):
    br, tr, cb, cd, df, ex, lin, nota = estilo_proyectil(el)
    ads = br + tr + cb + cd + df + ex
    if lin: ads = [a if a["b"].startswith(("thigh", "calf", "foot")) else dict(a, lin=True) for a in ads]
    nombre = f"magia_proyectil_{el or 'base'}_{cfg}_1"
    return lanz(cfg, nombre, "proyectil", el or "base", ads, TA, ACT, REC, nota, "Magia: Proyectil" + (f" ({el})" if el else ""), elemento=el or "cualquiera")



Z = (0, 0, 0)
Z4 = lambda t: (t, Z, Z, Z)


# ---------------------------------------------------------------- AREA (t_forma 0,8 s): brazo en arco hacia un punto lejano
TA_A, ACT_A, REC_A = 0.8, 0.2, 0.5
TOT_A = TA_A + ACT_A + REC_A


def estilo_area():
    T0, TC, TA_, TF, TT = 0, 0.5, TA_A, TA_A + ACT_A, TOT_A
    br = brazo([Z4(T0), (0.28, (30, 0, 18), (14, 0, 0), (-10, 0, 0)), (TC, (60, 0, 34), (26, 0, 0), (-24, 0, 0)), (0.62, (62, 0, 36), (26, 0, 0), (-24, 0, 0)),
                (TA_, (14, 0, -8), (-36, 0, 0), (8, 0, 0)), (TF, (4, 0, -4), (-30, 0, 0), (8, 0, 0)), (TF + 0.2, (-14, 0, 0), (-10, 0, 0), (0, 0, 0)), Z4(TT)])
    tr = tronco([(0, 0, 0), (0.3, -12, 3), (TC, -28, 9), (0.62, -28, 9), (TA_, 22, -12), (TF + 0.1, 14, -14), (TT, 0, 0)])
    cb = cabeza([(0, Z), (TC, (0, 0, 14)), (TA_, (-6, 0, -12)), (TT, Z)])
    cd = cadera([(0, 0, 0, 0), (TC, 0, -0.07, 0), (0.62, 0, -0.07, 0), (TA_, 0, 0.17, 0), (TF + 0.2, 0, 0.17, 0), (TT, 0, 0.12, 0)]) + agacha([(0, 0), (TC, 0), (TA_, 0.10), (TF + 0.2, 0.10), (TT, 0.02)])
    df = dedos([(0, "cero", 0), (0.3, "abierta", 0.8), (0.62, "garra", 0.6), (TA_, "indice", 1), (TF, "indice", 1), (TT, "cero", 0)])
    return br + tr + cb + cd + df


def area(cfg):
    ads = estilo_area()
    return lanz(cfg, f"magia_area_base_{cfg}_1", "area", "base", ads, TA_A, ACT_A, REC_A,
                "Arrojar a un punto lejano: el brazo sube atras en arco, el tronco carga y se lanza en zancada marcando el punto con el indice",
                "Magia: Area", partes=[P("Spell_Simple_Enter", dur=TA_A), P("Spell_Simple_Shoot", t1=0.5, dur=ACT_A), P("Spell_Simple_Exit", dur=REC_A)])


# ---------------------------------------------------------------- ZONA (t_forma 0,8 s): gesto hacia el suelo
def estilo_zona(el):
    TC, TA_, TF, TT = 0.4, TA_A, TA_A + ACT_A, TOT_A
    pre = [Z4(0)]
    if el is None:   # planta la palma en el suelo
        return (brazo(pre + [(TC, (38, 0, 10), (12, 0, 0), (-10, 0, 0)), (TA_, (-76, 0, -4), (-14, 0, 0), (26, 0, 0)), (TF, (-76, 0, -4), (-14, 0, 0), (26, 0, 0)), Z4(TT)]),
                tronco([(0, 0, 0), (TC, -4, 8), (TA_, 4, -38), (TF, 4, -38), (TT, 0, 0)]), cabeza([(0, Z), (TA_, (-16, 0, 0)), (TT, Z)]),
                agacha([(0, 0), (TC, 0), (TA_, 0.2), (TF, 0.2), (TT, 0)]) + cadera([(0, 0, 0, 0), (TA_, 0, 0.12, 0), (TF, 0, 0.12, 0), (TT, 0, 0, 0)]),
                dedos([(0, "cero", 0), (TA_ - 0.1, "abierta", 1), (TF, "abierta", 1), (TT, "cero", 0)]), [], False,
                "Zona: la mano se alza y baja hasta plantarse abierta en el suelo con la rodilla flexionada")
    if el == "fuego":   # palmada brusca desde fuera
        return (brazo(pre + [(0.3, (52, 0, 44), (16, 0, 0), (-30, 0, 0)), (0.62, (52, 0, 44), (16, 0, 0), (-30, 0, 0)), (TA_, (-72, 0, -12), (-16, 0, 0), (30, 0, 0)), (TF, (-72, 0, -12), (-16, 0, 0), (30, 0, 0)), Z4(TT)]),
                tronco([(0, 0, 0), (0.3, -18, 4), (0.62, -22, 4), (TA_, 16, -34), (TF, 16, -34), (TT, 0, 0)]), cabeza([(0, Z), (TA_, (-14, 0, -8)), (TT, Z)]),
                agacha([(0, 0), (0.62, 0.02), (TA_, 0.18), (TF, 0.18), (TT, 0)]) + cadera([(0, 0, 0, 0), (0.62, 0, -0.05, 0), (TA_, 0, 0.14, 0), (TT, 0, 0, 0)]),
                dedos([(0, "cero", 0), (0.2, "abierta", 1), (0.5, "garra", 1.2), (TA_ - 0.04, "garra", 1.2), (TA_ + 0.04, "abierta", 1.2), (TT, "cero", 0)]), [], True,
                "Fuego: la mano abierta agarra (garra) el aire y lo estampa en el suelo de una palmada brusca")
    if el == "hielo":   # dedos rigidos, clavar contenido
        return (brazo(pre + [(0.45, (30, 0, 6), (6, 0, 0), (0, 0, 0)), (0.66, (30, 0, 6), (6, 0, 0), (0, 0, 0)), (TA_, (-68, 0, 0), (-10, 0, 0), (36, 0, 0)), (TF, (-68, 0, 0), (-10, 0, 0), (36, 0, 0)), Z4(TT)]),
                tronco([(0, 0, 0), (0.66, -3, 4), (TA_, 3, -24), (TF, 3, -24), (TT, 0, 0)]), cabeza([(0, Z), (TA_, (-8, 0, 0)), (TT, Z)]),
                agacha([(0, 0), (0.66, 0), (TA_, 0.12), (TF, 0.12), (TT, 0)]),
                dedos([(0, "cero", 0), (0.3, "plana", 1.3), (TF, "plana", 1.3), (TT, "cero", 0)]), [tiembla("handC", (0.8, 0, 0.8), 13, 0.5, 0.7)], True,
                "Hielo: mano plana de dedos rigidos, una pausa tensa y se clava en el suelo de un corte vertical contenido")
    if el == "luz":     # palma al cielo y la baja serena
        return (brazo(pre + [(0.4, (78, 0, 14), (10, 0, 0), (-20, 0, 0)), (0.6, (80, 0, 16), (10, 0, 0), (-22, 0, 0)), (TA_, (-42, 0, 8), (-8, 0, 0), (-4, 0, 0)), (TF + 0.1, (-44, 0, 8), (-8, 0, 0), (-4, 0, 0)), Z4(TT)]),
                tronco([(0, 0, 0), (0.5, 0, 10), (TA_, 0, -8), (TT, 0, 0)]), cabeza([(0, Z), (0.5, (12, 0, 0)), (TA_, (-4, 0, 0)), (TT, Z)]),
                agacha([(0, 0), (TA_, 0.06), (TF, 0.06), (TT, 0)]),
                dedos([(0, "cero", 0), (0.3, "abierta", 1), (TF, "abierta", 1), (TT, "cero", 0)]), [], False,
                "Luz: la palma sube al cielo con el pecho abierto y baja serena y amplia hacia el suelo; cabeza alta")
    if el == "rayo":    # indice al suelo, tiron seco
        return (brazo(pre + [(0.5, (36, 0, 4), (8, 0, 0), (-12, 0, 0)), (0.7, (40, 0, 4), (8, 0, 0), (-12, 0, 0)), (TA_, (-70, 0, 0), (-16, 0, 0), (20, 0, 0)), (TA_ + 0.05, (-62, 0, 0), (-10, 0, 0), (14, 0, 0)), (TF, (-62, 0, 0), (-10, 0, 0), (14, 0, 0)), Z4(TT)]),
                tronco([(0, 0, 0), (0.7, -3, 5), (TA_, 4, -28), (TF, 4, -26), (TT, 0, 0)]), cabeza([(0, Z), (TA_, (-14, 0, -3)), (TT, Z)]),
                agacha([(0, 0), (0.7, 0), (TA_, 0.14), (TF, 0.12), (TT, 0)]),
                dedos([(0, "cero", 0), (0.3, "indice", 1), (TF, "indice", 1), (TT, "cero", 0)]), [tiembla("handC", (2, 0, 2), 18, 0.55, 0.78), tiembla("upperarmC", (1.5, 0, 1.5), 16, TA_, TF)], True,
                "Rayo: el indice apunta al suelo, tiembla un instante y se clava de un tiron seco")
    if el == "tierra":  # puño y pisoton con peso
        return (brazo(pre + [(0.4, (30, 0, 8), (12, 0, 0), (0, 0, 0)), (0.6, (34, 0, 8), (12, 0, 0), (0, 0, 0)), (TA_, (-74, 0, 0), (-12, 0, 0), (10, 0, 0)), (TF, (-74, 0, 0), (-12, 0, 0), (10, 0, 0)), Z4(TT)]),
                tronco([(0, 0, 0), (0.6, -6, 6), (TA_, 4, -34), (TF, 4, -34), (TT, 0, 0)]), cabeza([(0, Z), (TA_, (-14, 0, 0)), (TT, Z)]),
                agacha([(0, 0), (0.6, 0), (TA_, 0.2), (TF, 0.18), (TT, 0)]) + cadera([(0, 0, 0, 0), (0.6, 0, -0.04, 0), (TA_, 0, 0.08, 0), (TT, 0, 0, 0)])
                + [A("thigh_r", _k((0, 0, 0, 0), (0.3, 0, 0, 0), (0.55, 46, 0, 0), (TA_ - 0.04, 46, 0, 0), (TA_, 0, 0, 0), (TT, 0, 0, 0))),
                   A("calf_r", _k((0, 0, 0, 0), (0.3, 0, 0, 0), (0.55, -58, 0, 0), (TA_ - 0.04, -58, 0, 0), (TA_, 0, 0, 0), (TT, 0, 0, 0)))],
                dedos([(0, "cero", 0), (0.2, "puno", 1), (TF, "puno", 1), (TT, "cero", 0)]), [], False,
                "Tierra: el pie der. sube y pisa con peso mientras el puño cae como un martillo; la cadera se hunde")
    if el == "sombra":  # garra arrastrada, envolvente, lento
        return (brazo(pre + [(0.35, (-10, 0, -40), (30, 0, 0), (-12, 0, 0)), (0.6, (-30, 0, -26), (20, 0, 0), (-6, 0, 0)), (TA_, (-62, 0, 24), (-6, 0, 0), (22, 0, 0)), (TF + 0.1, (-58, 0, 34), (-6, 0, 0), (22, 0, 0)), Z4(TT)]),
                tronco([(0, 0, 0), (0.35, -10, 10), (0.6, 0, -16), (TA_, 14, -30), (TF + 0.1, 18, -30), (TT, 0, 0)]), cabeza([(0, Z), (0.5, (-12, 0, 6)), (TA_, (-14, 0, -6)), (TT, Z)]),
                agacha([(0, 0), (0.35, 0.04), (TA_, 0.18), (TF + 0.1, 0.18), (TT, 0)]),
                dedos([(0, "cero", 0), (0.25, "garra", 1.2), (TF + 0.1, "garra", 1.2), (TT, "cero", 0)]), [], False,
                "Sombra: la garra cruza el pecho y arrastra por el suelo en un barrido envolvente y lento, encorvado")
    if el == "aire":    # barrido bajo del brazo con giro de muñeca
        return (brazo(pre + [(0.35, (-30, 0, -50), (-10, 0, 0), (0, -30, 0)), (TA_, (-52, 0, 50), (-14, 0, 0), (0, 44, 0)), (TF + 0.05, (-54, 0, 58), (-14, 0, 0), (0, 50, 0)), Z4(TT)]),
                tronco([(0, 0, 0), (0.35, -22, -10), (TA_, 24, -22), (TT, 0, 0)]), cabeza([(0, Z), (0.35, (-6, 0, 12)), (TA_, (-8, 0, -12)), (TT, Z)]),
                agacha([(0, 0), (0.35, 0.04), (TA_, 0.12), (TF, 0.12), (TT, 0)]) + cadera([(0, 0, 0, 0), (0.35, 0.04, -0.02, 0), (TA_, -0.05, 0.06, 0), (TT, 0, 0, 0)]),
                dedos([(0, "cero", 0), (0.3, "suelta", 1), (TA_, "abierta", 0.8), (TT, "cero", 0)]), [], False,
                "Aire: el brazo barra el suelo de dentro afuera en un arco amplio y la muñeca gira; el tronco acompaña")


def zona(cfg, el=None):
    br, tr, cb, cd, df, ex, lin, nota = estilo_zona(el)
    ads = br + tr + cb + cd + df + ex
    if lin: ads = [a if a["b"].startswith(("thigh", "calf", "foot")) else dict(a, lin=True) for a in ads]
    return lanz(cfg, f"magia_zona_{el or 'base'}_{cfg}_1", "zona", el or "base", ads, TA_A, ACT_A, REC_A, nota, "Magia: Zona" + (f" ({el})" if el else ""),
                elemento=el or "cualquiera")


# ---------------------------------------------------------------- CONO (t_forma 0,3 s): chorro con barrido de ~60 grados
TA_C, ACT_C, REC_C = 0.3, 0.5, 0.4


def cono(cfg):
    T = TA_C + ACT_C + REC_C
    ads = (brazo([Z4(0), (TA_C, (6, 0, -6), (-30, 0, 0), (6, 0, 0)), (TA_C + ACT_C, (6, 0, -6), (-30, 0, 0), (6, 0, 0)), Z4(T)])
           + tronco([(0, 0, 0), (TA_C, -28, -4), (TA_C + ACT_C, 28, -4), (T, 0, 0)])
           + cabeza([(0, Z), (TA_C, (0, 0, 14)), (TA_C + ACT_C, (0, 0, -14)), (T, Z)])
           + cadera([(0, 0, 0, 0), (TA_C, 0, 0.05, 0), (TA_C + ACT_C, 0, 0.05, 0), (T, 0, 0, 0)]) + agacha([(0, 0), (TA_C, 0.05), (TA_C + ACT_C, 0.05), (T, 0)])
           + dedos([(0, "cero", 0), (TA_C, "abierta", 1.2), (TA_C + ACT_C, "abierta", 1.2), (T, "cero", 0)])
           + [tiembla("handC", (1.2, 0, 1.2), 15, TA_C, TA_C + ACT_C)])
    return lanz(cfg, f"magia_cono_base_{cfg}_1", "cono", "base", ads, TA_C, ACT_C, REC_C,
                "Chorro: brazo extendido, palma abierta; el tronco barre ~60 grados de derecha a izquierda mientras dura el chorro",
                "Magia: Cono", partes=[P("Spell_Simple_Enter", dur=TA_C), P("Spell_Simple_Shoot", t1=0.5, dur=ACT_C), P("Spell_Simple_Exit", dur=REC_C)])


LOOP = 2.1   # s (63 fotogramas); los temblores usan ciclos enteros en este periodo


def _bucle(cfg, nombre, forma, variante, ads, nota, cubre, **kw):
    m = meta_de(forma, variante, cfg, 0, 0, LOOP, bucle=True, **kw)
    return clip(nombre, cfg, [P("Spell_Simple_Idle_Loop", dur=LOOP)], ads, m, cubre, nota, bucle=True, ee_w=[[0, 0.55], [60, 0.55]])


def cono_canal(cfg):
    ads = (brazo([(0, (6, 0, -6), (-30, 0, 0), (6, 0, 0)), (LOOP, (6, 0, -6), (-30, 0, 0), (6, 0, 0))])
           + [A("spine_02", None, osc={"amp": [0, 0, 18], "hz": 1 / LOOP, "fase": 0}), A("spine_01", None, osc={"amp": [0, 0, 8], "hz": 1 / LOOP, "fase": 0}),
              A("spine_03", None, osc={"amp": [0, 0, 8], "hz": 1 / LOOP, "fase": 0}), A("head", None, osc={"amp": [0, 0, -12], "hz": 1 / LOOP, "fase": 0}),
              A("handC", None, osc={"amp": [1.2, 0, 1.2], "hz": 20 / LOOP, "fase": 0}), A("upperarmC", None, osc={"amp": [1.0, 0, 1.0], "hz": 18 / LOOP, "fase": 0.2})]
           + cadera([(0, 0, 0.05, 0), (LOOP, 0, 0.05, 0)]) + agacha([(0, 0.05), (LOOP, 0.05)])
           + dedos([(0, "abierta", 1.2), (LOOP, "abierta", 1.2)]))
    return _bucle(cfg, f"magia_cono_canalizar_{cfg}_1", "cono", "canalizar", ads,
                  "Canalizar el chorro (bucle 2,1 s): brazo extendido, el tronco barre +-26 grados de lado a lado una vez por ciclo y la mano tiembla", "Magia: Cono sostenido (bucle)")


def persistencia(cfg):
    ads = (brazo([(0, (8, 0, -4), (-26, 0, 0), (8, 0, 0)), (LOOP, (8, 0, -4), (-26, 0, 0), (8, 0, 0))])
           + hombro([(0, 6), (LOOP, 6)]) + tronco([(0, 0, -6), (LOOP, 0, -6)])
           + [A("upperarmC", None, osc={"amp": [1.4, 0, 1.0], "hz": 13 / LOOP, "fase": 0}), A("lowerarmC", None, osc={"amp": [1.8, 0, 0], "hz": 15 / LOOP, "fase": 0.3}),
              A("handC", None, osc={"amp": [2.4, 0, 1.6], "hz": 17 / LOOP, "fase": 0.1}), A("spine_02", None, osc={"amp": [0.8, 0, 0], "hz": 1 / LOOP, "fase": 0})]
           + cadera([(0, 0, 0.04, 0), (LOOP, 0, 0.04, 0)]) + agacha([(0, 0.06), (LOOP, 0.06)])
           + dedos([(0, "garra", 0.9), (LOOP, "garra", 0.9)]))
    return _bucle(cfg, f"magia_persistencia_canalizar_{cfg}_1", "proyectil", "canalizar", ads,
                  "Mantener el hechizo (bucle 2,1 s): brazo tenso al frente, hombro algo alzado, dedos en garra y temblor leve de brazo y mano",
                  "Magia: Persistencia / canalizacion", modificador="Persistencia")


# ---------------------------------------------------------------- YO (t_forma 0,5 s): aura sobre uno mismo
TA_Y, ACT_Y, REC_Y = 0.5, 0.3, 0.4


def yo(cfg):
    T = TA_Y + ACT_Y + REC_Y
    ads = (brazo([Z4(0), (0.28, (-6, 0, -34), (40, 0, 0), (0, 0, -14)), (TA_Y, (-10, 0, -46), (54, 0, 0), (0, 0, -26)), (TA_Y + ACT_Y, (-10, 0, -46), (54, 0, 0), (0, 0, -26)), Z4(T)])
           + hombro([(0, 0), (TA_Y, 8), (TA_Y + ACT_Y, 4), (T, 0)])
           + tronco([(0, 0, 0), (0.28, 0, 2), (TA_Y, 0, 9), (TA_Y + ACT_Y, 0, 4), (T, 0, 0)]) + cabeza([(0, Z), (TA_Y, (-10, 0, 0)), (TA_Y + ACT_Y, (-6, 0, 0)), (T, Z)])
           + dedos([(0, "cero", 0), (0.25, "abierta", 0.6), (TA_Y, "puno", 1), (TA_Y + ACT_Y - 0.05, "puno", 1), (TA_Y + ACT_Y + 0.1, "abierta", 1), (T, "cero", 0)])
           + agacha([(0, 0), (TA_Y, 0.03), (T, 0)]))
    return lanz(cfg, f"magia_yo_base_{cfg}_1", "yo", "base", ads, TA_Y, ACT_Y, REC_Y,
                "Gesto sobre uno mismo: la mano se lleva al pecho y se cierra en puño, el pecho se llena y se abre la mano al formarse el aura",
                "Magia: Yo", partes=[P("Spell_Simple_Enter", dur=TA_Y), P("Spell_Simple_Shoot", t1=0.5, dur=ACT_Y), P("Spell_Simple_Exit", dur=REC_Y)])


# ---------------------------------------------------------------- MULTIPLICAR: abanico (barrido del brazo)
def multiplicar(cfg):
    T = TOT
    ads = (brazo([Z4(0), (0.16, (-4, 0, -36), (16, 0, 0), (-10, 0, 0)), (TA, (8, 0, -20), (-26, 0, 0), (8, 0, 0)), (TA + ACT, (8, 0, 30), (-26, 0, 0), (8, 0, 22)), (TA + ACT + 0.12, (4, 0, 34), (-20, 0, 0), (0, 0, 20)), Z4(T)])
           + tronco([(0, 0, 0), (0.16, -18, 2), (TA, -12, -2), (TA + ACT, 18, -3), (T, 0, 0)]) + cabeza([(0, Z), (0.16, (0, 0, 8)), (TA, (0, 0, 5)), (TA + ACT, (0, 0, -8)), (T, Z)])
           + cadera([(0, 0, 0, 0), (0.16, 0, -0.03, 0), (TA, 0, 0.05, 0), (T, 0, 0, 0)])
           + dedos([(0, "cero", 0), (0.2, "abierta", 1), (TA + ACT, "abierta", 1), (T, "cero", 0)]))
    return lanz(cfg, f"magia_proyectil_multiplicar_{cfg}_1", "proyectil", "multiplicar", ads, TA, ACT, REC,
                "Multiplicar: el brazo carga cruzado y barre en abanico (~55 grados) abriendo la mano; los 3 proyectiles salen a lo largo del barrido",
                "Magia: Proyectil + Multiplicar", modificador="Multiplicar", extra={"t_disparos": [0.4, 0.47, 0.55]})


# ---------------------------------------------------------------- FUSION (2 piezas): las dos manos se juntan y se separan
def _dos(c_rows, dedos_rows):
    c = brazo(c_rows, "C") + dedos(dedos_rows, "C")
    return c + espejo_brazo(brazo(c_rows, "C")) + dedos(dedos_rows, "N")


def fusion(cfg, potencia=False, area_=False):
    if area_:
        tA, act, rec = 0.9, 0.2, 0.5
        rows = [Z4(0), (0.18, (6, 0, 38), (10, 0, 0), (0, -20, 0)), (0.4, (12, 0, -14), (16, 0, 0), (0, -30, 0)), (0.52, (12, 0, -14), (16, 0, 0), (0, 30, 0)),
                (0.7, (66, 0, 6), (20, 0, 0), (-20, 0, 0)), (tA, (14, 0, -8), (-30, 0, 0), (8, 0, 0)), (tA + act, (10, 0, -6), (-26, 0, 0), (8, 0, 0)), Z4(tA + act + rec)]
        tr = tronco([(0, 0, 0), (0.4, 0, -6), (0.7, 0, 8), (tA, 0, -14), (tA + act + rec, 0, 0)])
        cd = cadera([(0, 0, 0, 0), (0.7, 0, -0.04, 0), (tA, 0, 0.14, 0), (tA + act + rec, 0, 0, 0)]) + agacha([(0, 0), (0.7, 0), (tA, 0.1), (tA + act, 0.1), (tA + act + rec, 0)])
        df = [(0, "cero", 0), (0.18, "abierta", 1), (0.4, "puno", 1), (0.52, "garra", 1), (tA, "abierta", 1.2), (tA + act + rec, "cero", 0)]
        nombre, nota = "area", "Fusion de area: las manos se juntan y se separan, suben unidas sobre la cabeza y se lanzan hacia delante a la vez"
    else:
        tA, act, rec = (0.8, 0.2, 0.45) if potencia else (0.5, 0.15, 0.4)
        if potencia:   # anticipacion larga y tensa: manos apretadas, temblor creciente, lanzamiento mas fuerte
            rows = [Z4(0), (0.14, (6, 0, 38), (10, 0, 0), (0, -20, 0)), (0.3, (14, 0, -18), (24, 0, 0), (0, -30, 0)), (0.62, (14, 0, -20), (28, 0, 0), (0, 30, 0)),
                    (tA - 0.06, (16, 0, -20), (28, 0, 0), (0, 30, 0)), (tA, (16, 0, -6), (-36, 0, 0), (12, 0, 0)), (tA + act, (14, 0, -6), (-34, 0, 0), (10, 0, 0)), Z4(tA + act + rec)]
            tr = tronco([(0, 0, 0), (0.3, 0, -10), (tA - 0.06, 0, -14), (tA, 0, 8), (tA + act + rec, 0, 0)])
            cd = cadera([(0, 0, 0, 0), (0.62, 0, -0.04, 0), (tA, 0, 0.14, 0), (tA + act + rec, 0, 0, 0)]) + agacha([(0, 0), (0.3, 0.06), (tA - 0.06, 0.1), (tA + act, 0.08), (tA + act + rec, 0)])
            df = [(0, "cero", 0), (0.14, "abierta", 1), (0.3, "puno", 1.1), (tA - 0.06, "puno", 1.1), (tA, "abierta", 1.3), (tA + act + rec, "cero", 0)]
            nombre, nota = "potencia", "Fusion cargada (Potencia): las manos se juntan y se aprietan temblando, anticipacion larga y tensa; sale con un empuje mas fuerte"
        else:
            rows = [Z4(0), (0.12, (4, 0, 40), (10, 0, 0), (0, -20, 0)), (0.26, (8, 0, -16), (16, 0, 0), (0, -30, 0)), (0.34, (8, 0, -16), (16, 0, 0), (0, 30, 0)),
                    (0.4, (4, 0, 22), (8, 0, 0), (0, 20, 0)), (tA, (10, 0, -8), (-28, 0, 0), (10, 0, 0)), (tA + act, (10, 0, -8), (-28, 0, 0), (10, 0, 0)), Z4(tA + act + rec)]
            tr = tronco([(0, 0, 0), (0.3, 0, -6), (tA, 0, 3), (tA + act + rec, 0, 0)])
            cd = cadera([(0, 0, 0, 0), (0.3, 0, -0.02, 0), (tA, 0, 0.07, 0), (tA + act + rec, 0, 0, 0)])
            df = [(0, "cero", 0), (0.12, "abierta", 1), (0.28, "puno", 1), (0.36, "garra", 1), (tA, "abierta", 1.2), (tA + act + rec, "cero", 0)]
            nombre, nota = "proyectil", "Fusion (2 piezas): las manos se juntan al centro, se frotan y se separan, y salen a la vez empujando hacia delante"
    ads = _dos(rows, df) + tr + cd + cabeza([(0, Z), (0.3, (-6, 0, 0)), (tA, (-2, 0, 0)), (tA + act + rec, Z)])
    if potencia:
        ads += [tiembla("handC", (2.4, 0, 2.4), 14, 0.3, tA - 0.06), tiembla("handN", (2.4, 0, -2.4), 14, 0.3, tA - 0.06, 0.25),
                tiembla("upperarmC", (1.4, 0, 1.4), 11, 0.3, tA - 0.06), tiembla("upperarmN", (1.4, 0, -1.4), 11, 0.3, tA - 0.06, 0.3)]
    mod = "Potencia" if potencia else None
    return lanz(cfg, f"magia_fusion_{nombre}_{cfg}_1", "area" if area_ else "proyectil", "fusion_" + nombre, ads, tA, act, rec, nota,
                "Magia: fusion (2 elementos)" + (" + Potencia" if potencia else ""), piezas=2, modificador=mod, dos_manos=True,
                partes=[P("Spell_Simple_Enter", dur=tA), P("Spell_Simple_Shoot", t1=0.5, dur=act), P("Spell_Simple_Exit", dur=rec)])


# ---------------------------------------------------------------- INESTABILIDAD
def _base(forma):
    """Ajustes del gesto generico de la forma, recortados hasta el disparo."""
    if forma == "proyectil":
        br, tr, cb, cd, df, ex, lin, _ = estilo_proyectil(None); tA, act, rec = TA, ACT, REC
    else:
        ads = estilo_area(); tA, act, rec = TA_A, ACT_A, REC_A
        return ads, tA, act, rec
    return br + tr + cb + cd + df + ex, tA, act, rec


def _corta(ads, t):
    """Mantiene las claves hasta t (el gesto 'se congela' en el disparo; las extras se suman encima)."""
    out = []
    for a in ads:
        a = dict(a)
        if a.get("k"):
            k = [r for r in a["k"] if r[0] <= t + 1e-6]
            if len(k) < len(a["k"]):
                n = a["k"][len(k)]; p = k[-1]; u = (t - p[0]) / (n[0] - p[0])
                k.append([t] + [x + (y - x) * u for x, y in zip(p[1:], n[1:])])
            a["k"] = k
        out.append(a)
    return out


def inestable(cfg, forma, estado):
    ads, tA, act, rec = _base(forma)
    if estado == "inestable":
        tot = tA + act + rec
        ex = [tiembla("upperarmC", (3.2, 0, 3.2), 10, 0.1, tA + act), tiembla("lowerarmC", (3.8, 0, 0), 12, 0.1, tA + act, 0.2), tiembla("handC", (4.5, 0, 4.5), 14, 0.1, tA + act, 0.4),
              A("handC", _k((0, 0, 0, 0), (tA - 0.14, 0, 0, 0), (tA - 0.04, 0, -14, 34), (tA + act, 0, -14, 34), (tot, 0, 0, 0))),     # la mano se aparta
              A("head", _k((0, 0, 0, 0), (tA - 0.16, -4, 0, 0), (tA - 0.04, -10, 8, -18), (tA + act, -10, 8, -18), (tot, 0, 0, 0))),   # mueca: gira y encoge la cara
              A("neck_01", _k((0, 0, 0, 0), (tA - 0.04, -4, 3, -6), (tA + act, -4, 3, -6), (tot, 0, 0, 0))),
              A("clavicleC", _k((0, 0, 0, 0), (tA - 0.14, 0, 0, 0), (tA - 0.04, 0, 14, 0), (tA + act, 0, 14, 0), (tot, 0, 0, 0))),     # hombro alzado
              tiembla("spine_02", (1.5, 0, 0), 9, 0.1, tA + act, 0.1)]
        nota = "Lanzamiento inestable (I 20-50): el brazo tiembla, la mano se aparta, el hombro sube y la cara se contrae en una mueca de esfuerzo"
        inest = "inestable"
        return lanz(cfg, f"magia_{forma}_inestable_{cfg}_1", forma, "inestable", ads + ex, tA, act, rec, nota, f"Magia: {forma} inestable (I 20-50)", inest=inest)
    base = _corta(ads, tA)
    if estado == "sobrecarga":
        act, rec = 0.2, 0.7
        tt = tA + act
        ex = [A("upperarmC", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.1, 26, 0, 8), (tA + 0.3, 18, 0, 6), (tA + act + rec, 0, 0, 0))),
              A("lowerarmC", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.1, 40, 0, 0), (tA + act + rec, 0, 0, 0))),
              A("handC", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.1, -40, 0, 0), (tA + act + rec, 0, 0, 0))),
              A("upperarmN", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.12, 18, 0, 6), (tA + act + rec, 0, 0, 0))),     # la espada se balancea
              A("spine_02", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.12, 14, 0, -4), (tA + 0.4, 8, 0, 0), (tA + act + rec, 0, 0, 0))),
              A("spine_03", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.12, 10, 0, 0), (tA + act + rec, 0, 0, 0))),
              A("head", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.12, 14, 0, 0), (tA + act + rec, 0, 0, 0))),
              A("pelvis_loc", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.12, 0, -0.1, 0), (tA + 0.38, 0, -0.3, 0), (tA + act + rec, 0, -0.3, 0))),   # medio paso atras
              A("thigh_l", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.14, -22, 0, 0), (tA + 0.38, 0, 0, 0), (tA + act + rec, 0, 0, 0))),   # un pie se retrasa
              A("calf_l", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.14, -10, 0, 0), (tA + 0.38, 0, 0, 0), (tA + act + rec, 0, 0, 0)))]
        ex += dedos([(0, "cero", 0), (tA, "abierta", 1.2), (tA + 0.1, "abierta", 1.6), (tA + act + rec, "cero", 0)])
        nota = "Sobrecarga: el exceso de potencia lanza el brazo hacia arriba y atras, el tronco se echa atras y el caballero retrocede medio paso (la cadera queda 0,30 m atras: root motion)"
        return lanz(cfg, f"magia_{forma}_sobrecarga_{cfg}_1", forma, "sobrecarga", base + ex, tA, act, rec, nota, f"Magia: {forma} sobrecarga",
                    inest="sobrecarga", extra={"desplazamiento_m": -0.3})
    if estado == "contragolpe":
        act, rec = 0.1, 1.0
        tt = tA + act
        ex = [A("upperarmC", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.14, -24, 0, -46), (tA + 0.6, -24, 0, -44), (tA + act + rec, 0, 0, 0))),
              A("lowerarmC", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.14, 70, 0, 0), (tA + 0.6, 66, 0, 0), (tA + act + rec, 0, 0, 0))),
              A("handC", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.14, 0, 0, -22), (tA + act + rec, 0, 0, 0))),
              A("upperarmN", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.25, 28, 0, 42), (tA + 0.6, 26, 0, 40), (tA + act + rec, 0, 0, 0))),     # la otra mano sujeta la herida
              A("lowerarmN", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.25, 40, 0, 0), (tA + 0.6, 36, 0, 0), (tA + act + rec, 0, 0, 0))),
              A("spine_02", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.12, -24, 0, 0), (tA + 0.6, -20, 0, 0), (tA + act + rec, 0, 0, 0))),
              A("spine_01", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.12, -10, 0, 0), (tA + 0.6, -8, 0, 0), (tA + act + rec, 0, 0, 0))),
              A("head", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.12, -22, 0, 0), (tA + 0.6, -18, 0, 0), (tA + act + rec, 0, 0, 0))),
              A("pelvis_loc", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.12, 0.03, -0.08, 0), (tA + 0.35, -0.05, -0.1, 0), (tA + 0.6, 0.03, -0.06, 0), (tA + act + rec, 0, 0, 0))),
              A("clavicleC", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.14, 0, 14, 0), (tA + act + rec, 0, 0, 0))),
              tiembla("spine_03", (0, 0, 2.5), 6, tA + 0.1, tA + 0.9), tiembla("handC", (2.5, 0, 2.5), 12, tA + 0.15, tA + 0.8)]
        ex += agacha([(0, 0), (tA, 0), (tA + 0.2, 0.14), (tA + 0.7, 0.12), (tA + act + rec, 0)])
        ex += dedos([(0, "cero", 0), (tA, "abierta", 1), (tA + 0.14, "puno", 1.2), (tA + 0.6, "puno", 1.0), (tA + act + rec, "cero", 0)])
        nota = "Contragolpe: el hechizo muerde al lanzador: sacudida de dolor, la mano se recoge al pecho y la otra la sujeta, se encorva y se tambalea con las rodillas flojas"
        return lanz(cfg, f"magia_{forma}_contragolpe_{cfg}_1", forma, "contragolpe", base + ex, tA, act, rec, nota, f"Magia: {forma} contragolpe",
                    inest="contragolpe")
    if estado == "fallo":
        act, rec = 0.1, 0.6
        ex = [A("upperarmC", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.15, -28, 0, 4), (tA + act + rec, 0, 0, 0))),
              A("lowerarmC", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.15, 30, 0, 0), (tA + act + rec, 0, 0, 0))),
              A("handC", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.15, 25, 0, 0), (tA + act + rec, 0, 0, 0))),
              tiembla("handC", (7, 0, 5), 12, tA + 0.04, tA + 0.4), tiembla("lowerarmC", (4, 0, 0), 12, tA + 0.04, tA + 0.4, 0.3),
              A("spine_02", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.2, -8, 0, 0), (tA + act + rec, 0, 0, 0))),
              A("head", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.2, -10, 5, 6), (tA + act + rec, 0, 0, 0))),
              A("clavicleC", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.2, 0, -8, 0), (tA + act + rec, 0, 0, 0))),
              A("pelvis_loc", _k((0, 0, 0, 0), (tA, 0, 0, 0), (tA + 0.2, 0, -0.04, 0), (tA + act + rec, 0, 0, 0)))]
        ex += dedos([(0, "cero", 0), (tA, "abierta", 1), (tA + 0.12, "suelta", 1.6), (tA + act + rec, "cero", 0)])
        nota = "Fallo / chispazo: el gesto sale entero pero el hechizo se apaga; la mano se sacude, el brazo cae y los hombros se hunden"
        return lanz(cfg, f"magia_{forma}_fallo_{cfg}_1", forma, "fallo", base + ex, tA, act, rec, nota, f"Magia: {forma} fallo (chispazo)", inest="fallo")


# ---------------------------------------------------------------- SIN MANA / EN RECARGA: gesto abortado
def sin_mana(cfg):
    T = 0.55
    ads = (brazo([Z4(0), (0.14, (-4, 0, -6), (30, 0, 0), (-14, 0, 0)), (0.24, (-4, 0, -4), (26, 0, 0), (-12, 0, 0)), (0.36, (-10, 0, -10), (12, 0, 0), (6, 0, 0)), Z4(T)])
           + dedos([(0, "cero", 0), (0.14, "abierta", 0.7), (0.26, "puno", 1), (T - 0.1, "puno", 0.6), (T, "cero", 0)])
           + tronco([(0, 0, 0), (0.24, 0, 3), (0.4, 0, -4), (T, 0, 0)]) + cabeza([(0, Z), (0.3, (-8, 0, 0)), (T, Z)])
           + [tiembla("handC", (2, 0, 2), 12, 0.14, 0.26)])
    partes = [P("Spell_Simple_Enter", t1=0.25, dur=0.2), P("Spell_Simple_Exit", t0=0.15, dur=0.35)]
    m = meta_de("cualquiera", "sin_mana", cfg, 0.0, 0.0, T)
    m.update({"t_disparo": None, "fases": {"anticipacion": [0.0, 0.24], "recuperacion": [0.24, T]}, "estado": "sin_mana_o_recarga"})
    return clip(f"magia_sinmana_abortado_{cfg}_1", cfg, partes, ads, m, "Magia: sin mana / en recarga",
                "Gesto abortado: la mano empieza a subir, se cierra en puño y baja; el hechizo no sale (sin t_disparo)", ee_w=[[0, 0.2], [0.24, 0.45], [T, 0.2]])


ELEMENTOS = ("fuego", "hielo", "luz", "rayo", "tierra", "sombra", "aire")


def build():
    out = []
    for cfg in ("EP", "EE"):
        out += [proyectil(cfg), area(cfg), zona(cfg), cono(cfg), cono_canal(cfg), yo(cfg)]
        out += [proyectil(cfg, e) for e in ELEMENTOS] + [zona(cfg, e) for e in ELEMENTOS]
        out += [fusion(cfg), fusion(cfg, area_=True), fusion(cfg, potencia=True), multiplicar(cfg), persistencia(cfg)]
        for forma in ("proyectil", "area"):
            out += [inestable(cfg, forma, e) for e in ("inestable", "sobrecarga", "contragolpe", "fallo")]
        out.append(sin_mana(cfg))
    return out
