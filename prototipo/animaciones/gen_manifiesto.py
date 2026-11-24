"""Genera candidatas.json (manifiesto del visor) a partir de candidatas_spec.json y de <glb>.medidas.json (lo escribe
retarget_candidatas.py con la duración de cada clip).

Uso: python3 -I gen_manifiesto.py candidatas_spec.json candidatas.medidas.json candidatas.json

velocidad_ms (solo bucles de locomoción): velocidad de avance del root del clip original en las variantes *_RM de
Quaternius UAL (distancia del root en un ciclo / duración del ciclo). El personaje de destino mide lo mismo (~1,8 m;
pelvis a la misma altura), así que no se reescala. Medida por zancada (pie apoyado respecto a la pelvis) en el
retarget: andar 0,88, correr 4,6 (el pie patina algo; usar la del root). desplazamiento_m: distancia del root en
clips no cíclicos con root motion.
"""
import json, sys
spec, med, out = sys.argv[1:4]
spec = json.load(open(spec)); med = {m[0]: m for m in json.load(open(med))}
# root motion de UAL1/UAL2 *_RM.glb (m recorridos / duración del ciclo original)
VEL = {"Walk_Loop": 0.98, "Walk_Formal_Loop": 0.98, "Jog_Fwd_Loop": 5.38, "Sprint_Loop": 8.21, "Crouch_Fwd_Loop": 0.75}
DESPL = {"Roll": 4.99}
FUENTE = {"ual1": "Quaternius UAL1 Standard", "ual2": "Quaternius UAL2 Standard"}
def orig(p):
    if "mezcla" in p:
        m = p["mezcla"]; return f"mezcla {m['de'][0]} -> {m['a'][0]} ({m['dur']} s)"
    s = p["clip"]
    if p.get("t0") or p.get("t1") is not None:
        s += f" [{p.get('t0', 0)}-{p['t1']}s]" if p.get("t1") is not None else f" [{p.get('t0', 0)}s-]"
    if p.get("invertir"): s += " (invertido)"
    return s
res = []
for c in spec["clips"]:
    e = {"clip": c["nombre"], "categoria": c.get("categoria", "combate"), "fuente": FUENTE[c["fuente"]], "licencia": "CC0 1.0",
         "original": " + ".join(orig(p) for p in c["partes"]), "duracion": round(med[c["nombre"]][1] + 1 / 30, 2),
         "bucle": bool(c.get("bucle")), "cubre": c["cubre"], "espejo": c["espejo"], "nota": c["nota"]}
    base = c["partes"][0].get("clip")
    if e["bucle"] and e["categoria"] == "locomocion" and base in VEL: e["velocidad_ms"] = VEL[base]
    if e["categoria"] == "esquiva" and base in DESPL: e["desplazamiento_m"] = DESPL[base]
    if c.get("escudo"): e["config_escudo"] = True
    res.append(e)
json.dump(res, open(out, "w"), indent=1, ensure_ascii=False)
print(len(res), "clips ->", out)
