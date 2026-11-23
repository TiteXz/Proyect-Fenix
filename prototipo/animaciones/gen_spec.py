"""Genera candidatas_spec.json (entrada de retarget_candidatas.py). Rutas de las fuentes por argumento."""
import json, sys
u1, u2, out = sys.argv[1:4]
P = lambda c, t0=0, t1=None: {"clip": c, "t0": t0, "t1": t1}
C = []
def add(n, f, partes, cubre, nota, espejo=False):
    C.append({"fuente": f, "clip": partes[0]["clip"], "nombre": n, "partes": partes, "espejo": espejo, "cubre": cubre, "nota": nota})
# ataques ligeros
add("ataque_der_EP_ual2_1","ual2",[P("Sword_Regular_B"),P("Sword_Regular_B_Rec")],"Ataque ligero der.","Tajo horizontal de izquierda a derecha de pantalla, limpio; incluye recuperación")
add("ataque_der_EP_ual1_2m","ual1",[P("Sword_Attack")],"Ataque ligero der.","Sword_Attack ESPEJADO (arma en mano izq.): diagonal descendente hacia la derecha",True)
add("ataque_izq_EP_ual1_1","ual1",[P("Sword_Attack")],"Ataque ligero izq.","Diagonal descendente de alto-derecha a bajo-izquierda; el más sobrio")
add("ataque_izq_EP_ual2_2m","ual2",[P("Sword_Regular_B"),P("Sword_Regular_B_Rec")],"Ataque ligero izq.","Regular B ESPEJADO (arma en mano izq.)",True)
add("ataque_izq_EP_ual2_3","ual2",[P("Sword_Regular_Combo",0.95,1.9)],"Ataque ligero izq.","3er golpe del combo: barrido horizontal der.->izq. con salto y giro (EXAGERADO)")
add("ataque_arriba_EP_ual2_1","ual2",[P("Sword_Regular_C",0.45,1.5)],"Ataque ligero arriba","Tajo vertical descendente desde sobre la cabeza (2ª mitad de Regular C)")
add("ataque_arriba_EP_ual2_2","ual2",[P("Sword_Heavy_Combo",2.2,3.5)],"Ataque ligero arriba","Tajo vertical a dos tiempos del combo pesado; más lento y pesado")
add("ataque_abajo_EP_ual2_1","ual2",[P("Sword_Regular_A"),P("Sword_Regular_A_Rec")],"Ataque ligero abajo","Tajo ascendente desde abajo-derecha (golpe bajo que sube); incluye recuperación")
add("ataque_abajo_EP_ual2_2","ual2",[P("Sword_Heavy_Combo",0.0,1.1)],"Ataque ligero abajo","Giro y tajo ascendente del inicio del combo pesado (revisar: gira el torso)")
# guardia
add("guardia_neu_EP_ual1_1","ual1",[P("Sword_Idle")],"Guardia neutra EP (bucle)","Pose de espada en reposo; solo neutra, no hay guardias direccionales")
add("guardia_neu_EE_ual2_1","ual2",[P("Idle_Shield_Loop")],"Guardia neutra EE (bucle)","Escudo alzado ante el pecho; solo neutra")
# defensas
add("bloqueo_fro_EP_ual2_1","ual2",[P("Sword_Block")],"Parada / bloqueo / defensa frontal EP","Encogerse con la espada baja a un lado; 1,23 s, lento para parada (hay que recortar); sirve como bloqueo frontal")
add("bloqueo_imp_EP_ual1_1","ual1",[P("Hit_Chest")],"Bloqueo normal (impacto) / tambaleo 0,30 EP y EE","Sacudida del torso de 0,33 s; sin cambio de postura")
add("parada_fro_EE_ual2_1","ual2",[P("Shield_OneShot")],"Parada perfecta / bloqueo / defensa frontal EE","Alza el escudo, aguanta y baja; 0,83 s")
# contraataque
add("contraataque_EP_ual2_1","ual2",[P("Sword_Dash",0.0,0.9)],"Contraataque EP","Paso agachado hacia delante con tajo (primera parte de Sword Dash)")
add("contraataque_EE_ual2_1","ual2",[P("Shield_Dash",0.0,0.55)],"Contraataque EE (golpe de escudo)","Embate con el escudo (primera parte de Shield Dash); sin el tajo posterior")
# habilidades
add("estocada_EP_ual2_1","ual2",[P("Melee_Hook"),P("Melee_Hook_Rec")],"Habilidad EP: estocada","Avance con brazo extendido hacia delante (originalmente un gancho de puño; con espada lee como estocada baja)")
add("estocada_EP_ual2_2","ual2",[P("Sword_Dash")],"Habilidad EP: estocada","Zancada larga agachada con la espada al frente; 1,57 s, muy larga")
add("estocada_EP_ual1_3","ual1",[P("Punch_Cross")],"Habilidad EP: estocada","Directo con la mano derecha (puñetazo): con espada es un pinchazo recto; calidad mediocre")
add("embestida_EE_ual2_1","ual2",[P("Shield_Dash")],"Habilidad EE: embestida con escudo","Agachado y empuje con el escudo, se incorpora; 1,10 s")
# remate / tambaleo / guardia rota
add("remate_EP_ual2_1","ual2",[P("Sword_Heavy_Combo",2.2,3.6)],"Remate humanoide EP (1,30 s)","Tajo vertical pesado a dos manos? (una mano); sin víctima sincronizada")
add("guardia_rota_EE_ual2_1","ual2",[P("Idle_Shield_Break")],"Guardia rota EE (1,0 s)","El escudo es apartado, tambaleo y recuperación; 1,07 s")
add("tambaleo_EP_ual1_1","ual1",[P("Hit_Chest")],"Tambaleo 0,30 EP/EE","Reutiliza Hit_Chest")
add("tambaleo_EP_ual1_2","ual1",[P("Hit_Head")],"Tambaleo EP/EE / guardia rota EP","Sacudida de cabeza hacia atrás; 0,43 s")
json.dump({"fuentes": {"ual1": u1, "ual2": u2}, "clips": C}, open(out, "w"), indent=1, ensure_ascii=False)
print(len(C), "clips")
