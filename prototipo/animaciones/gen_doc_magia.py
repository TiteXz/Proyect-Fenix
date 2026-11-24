"""Inserta/actualiza en CANDIDATAS.md la seccion de magia a partir de candidatas.json (entre marcadores).
Uso: python3 -I gen_doc_magia.py candidatas.json CANDIDATAS.md"""
import json, sys
man, md = sys.argv[1:3]
cl = [c for c in json.load(open(man, encoding="utf-8")) if c.get("categoria") == "magia"]
ini, fin = "<!-- MAGIA:INICIO -->", "<!-- MAGIA:FIN -->"
L = [ini, "", "## Magia: animaciones de lanzamiento (categoria `magia`)", "",
     f"{len(cl)} clips (34 EP + 34 EE) generados por `gen_magia.py` (receta) + `retarget_candidatas.py` (retarget y ajustes). Base: Quaternius UAL1/UAL2 Standard (CC0 1.0) "
     "`Spell_Simple_Enter/Shoot/Exit/Idle_Loop` re-temporizados, con rotaciones aditivas (tronco, brazo, mano, dedos, cadera, piernas) creadas aqui; "
     "la mano der. sigue la pose de `Sword_Idle` (la espada no se suelta) y, en EE, el brazo izq. mezcla la pose de `Idle_Shield_Loop` con el gesto.",
     "", "**Convenciones.** Nombre `magia_<forma>_<variante>_<EP|EE>_<n>`. La magia sale siempre de la mano IZQ. (`mano_lanzadora` = `L`; `ambas` en las fusiones). "
     "EP: brazo libre, gesto completo. EE (decision): el escudo va atado al antebrazo, la magia sale por encima del borde; el brazo hace ~65 % del recorrido y mezcla la guardia "
     "(peso 0,15-0,6), el tronco y la cadera hacen el gesto completo. Tiempos: `t_disparo` = instante (s) en que sale el hechizo = `t_forma + 0,1 x (piezas - 1)` de DISENO.md "
     "(Proyectil 0,4, Area/Zona 0,8, Cono 0,3, Yo 0,5, fusion 0,5/0,9; fusion+Potencia 0,8). `fases` = [inicio, fin] s de anticipacion / activo / recuperacion. "
     "Campos del manifiesto: `forma`, `variante`, `elemento` (o `cualquiera`), `piezas`, `modificador`, `inestabilidad` (`estable`->null, `inestable`, `sobrecarga`, `contragolpe`, `fallo`), "
     "`config`, `bucle`, `mano_lanzadora`, `t_disparo`, `fases` (+ `t_disparos` en Multiplicar, `desplazamiento_m` en Sobrecarga: la cadera queda 0,30 m atras, root motion).",
     "", "| Clip | Forma / variante | Elemento | Piezas | Mod. | Inestab. | Mano | t_disparo | Dur. | Bucle | Fases (s) | Nota |", "|---|---|---|---|---|---|---|---|---|---|---|---|"]
for c in cl:
    f = c.get("fases", {})
    fs = " / ".join(f"{k[:3]} {v[0]}-{v[1]}" for k, v in f.items())
    L.append(f"| `{c['clip']}` | {c['forma']} / {c['variante']} | {c['elemento']} | {c['piezas']} | {c['modificador'] or '-'} | {c['inestabilidad'] or '-'} | "
             f"{c['mano_lanzadora']} | {c['t_disparo'] if c['t_disparo'] is not None else '-'} | {c['duracion']} | {'si' if c['bucle'] else 'no'} | {fs} | {c['nota']} |")
L += ["", "**Matiz por elemento (Proyectil y Zona, EP y EE).** Fuego: mano abierta que agarra (garra) y lanza, brusco, paso adelante. Hielo: dedos juntos y rigidos, carga corta, corte seco, cuerpo quieto. "
      "Luz: palma alzada, pecho erguido, arco amplio y sereno, cabeza alta. Rayo: dos dedos/indice, casi sin carga, tiron seco con temblor fino. Tierra: puño y pisoton del pie der. con peso, cadera hundida. "
      "Sombra: gesto envolvente que cruza el pecho, mano en garra, cabeza gacha, lento. Aire: barrido abierto del brazo con giro de muñeca y el tronco acompañando.",
      "", "**Inestabilidad (Proyectil y Area).** `inestable` (I 20-50): temblor de brazo/mano, la mano se aparta, hombro alzado y mueca. `sobrecarga`: retroceso fuerte del brazo hacia arriba, tronco atras, medio paso atras. "
      "`contragolpe`: sacudida de dolor, la mano se recoge al pecho y la otra la sujeta, encorvado y tambaleo. `fallo`: el gesto sale pero el hechizo se apaga, mano sacudida y brazo caido. "
      "`magia_sinmana_abortado`: gesto abortado (mano que sube, se cierra y baja) para sin maná o en recarga.",
      "", "**Huecos / limites.** Sin IK de pies (la zancada de Sobrecarga y la flexion de rodillas de Zona/Tierra pueden deslizar los pies unos cm); el contragolpe en EP/EE lleva la mano de la espada al pecho (la espada se inclina, no se suelta); "
      "los dedos son aditivos sobre la mano relajada del clip base (el pulgar es aproximado); fusion EE: el brazo del escudo solo acompaña ~65 %. Elementos solo para Proyectil y Zona; Area, Cono y Yo son genericos.",
      "", fin]
txt = open(md, encoding="utf-8").read()
blk = "\n".join(L)
if ini in txt:
    a, b = txt.index(ini), txt.index(fin) + len(fin)
    txt = txt[:a] + blk + txt[b:]
else:
    txt = txt.rstrip("\n") + "\n\n" + blk + "\n"
open(md, "w", encoding="utf-8").write(txt)
print(len(cl), "clips de magia documentados en", md)
