"""Clips de lanzamiento de magia (categoria "magia"): receta -> entradas para candidatas_spec.json.

Base: Quaternius UAL1 Spell_Simple_* (CC0, brazo izq. al frente) y UAL2 OverhandThrow / Farm_PlantSeed / Consume (CC0),
re-temporizados y modificados con rotaciones aditivas (ver retarget_candidatas.py, campo "ajustes").
Configuraciones:
  EP  espada en la mano der. (no se suelta, sigue la pose de Sword_Idle): la magia sale de la mano IZQ.
  EE  escudo en el brazo izq. (sigue la pose de Idle_Shield_Loop): la magia sale de la mano DER. (decision de diseno: el brazo
      del escudo no se mueve para lanzar, asi la guardia no se rompe; el tronco aun asi acompana el gesto).
Los ajustes se escriben para el brazo lanzador IZQUIERDO (EP) y se reflejan solos para EE (ry, rz y x de la pelvis cambian de signo).
Ejes del personaje: x = derecha, y = delante, z = arriba; angulos en grados, regla de la mano derecha.
"""
import math, os, re

SOBRE = {"EP": {"brazo_r": ["ual1", "Sword_Idle"]}, "EE": {"brazo_l": ["ual2", "Idle_Shield_Loop"]}}
LADO = {"EP": "l", "EE": "r"}


def _res(a, cfg, dos_manos=False):
    """Resuelve un ajuste escrito para el brazo lanzador IZQ.: nombres sin lado + C (lanzador) / N (otro brazo)."""
    b = a["b"]
    out = dict(a)
    refl = cfg == "EE"
    m = re.match(r"^(upperarm|lowerarm|hand|clavicle|index_\d|middle_\d|ring_\d|pinky_\d|thumb_\d)([CN])$", b)
    if m:
        lado = LADO[cfg] if m.group(2) == "C" else ("l" if cfg == "EE" else "r")
        out["b"] = f"{m.group(1)}_{lado}"
    if refl and a.get("modo", "w") == "w":
        out["k"] = [[k[0], k[1], -k[2], -k[3]] for k in a["k"]] if a.get("k") else a.get("k")
        if a["b"] == "pelvis_loc" and a.get("k"):
            out["k"] = [[k[0], -k[1], k[2], k[3]] for k in a["k"]]
        if a.get("osc"):
            o = dict(a["osc"]); am = o["amp"]; o["amp"] = [am[0], -am[1], -am[2]]
            if a["b"] == "pelvis_loc": o["amp"] = [-am[0], am[1], am[2]]
            out["osc"] = o
    elif refl and a.get("osc") is None and a.get("k") is None:
        pass
    # dedos (modo l): mismos angulos en ambos lados
    return out


def _k(*pts):
    return [list(map(float, p)) for p in pts]


def clip(nombre, cfg, partes, ajustes, meta, cubre, nota, bucle=False, dos_manos=False, fuente="ual1"):
    esp_grupo = []
    sobre = dict(SOBRE[cfg])
    if cfg == "EE": esp_grupo.append("brazo_r")
    if dos_manos:
        if cfg == "EP": esp_grupo.append("brazo_r"); sobre.pop("brazo_r", None)
    c = {"fuente": fuente, "clip": partes[0]["clip"], "nombre": nombre, "partes": partes, "espejo": False,
         "espejo_grupo": esp_grupo, "sobre": sobre, "ajustes": [_res(a, cfg, dos_manos) for a in ajustes],
         "cubre": cubre, "nota": nota, "categoria": "magia", "bucle": bucle, "escudo": False, "meta": meta}
    return c


P = lambda c, t0=0, t1=None, dur=None: {k: v for k, v in {"clip": c, "t0": t0, "t1": t1, "dur": dur}.items() if v is not None}
A = lambda b, k=None, modo="w", **kw: dict({"b": b, "modo": modo, "k": k}, **kw)


def proyectil_base(cfg, extra=()):
    ad = [
        A("pelvis_loc", _k((0, 0, 0, 0), (0.2, 0, -0.04, 0), (0.4, 0, 0.06, 0), (0.7, 0, 0, 0))),
        A("spine_02", _k((0, 0, 0, 0), (0.2, 0, 0, -15), (0.4, 5, 0, 12), (0.8, 0, 0, 0))),
        A("upperarm_C", _k((0, 0, 0, 0), (0.2, 0, 0, 40), (0.4, 0, 0, 0), (0.8, 0, 0, 0))),
        A("lowerarm_C", _k((0, 0, 0, 0), (0.2, 0, 0, -50), (0.4, 0, 0, 0), (0.8, 0, 0, 0))),
    ]
    return clip(f"magia_proyectil_base_{cfg}_1", cfg,
                [P("Spell_Simple_Enter", dur=0.4), P("Spell_Simple_Shoot", t1=0.5, dur=0.15), P("Spell_Simple_Exit", dur=0.35)],
                ad + list(extra), {"forma": "proyectil"}, "", "")


def build():
    return [proyectil_base(c) for c in ("EP", "EE")]
