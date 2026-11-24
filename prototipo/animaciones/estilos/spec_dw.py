"""Estilo «Dawnwalker» (recreación propia): esgrima medieval pesada y direccional (izq., der., arriba, abajo/estocada). Perfil: tactico_pesado."""
from util_spec import capa, clip, BRAZO_PUNTA
JUEGO = "The Blood of Dawnwalker (estilo; recreación propia, sin datos del juego)"
TITULO = "Estilo Dawnwalker (recreación propia)"
C = []
IDLE = lambda d: capa("ual1", "Sword_Idle", [(0, 0), (d, 0.2)])   # una guardia casi congelada como base de las paradas
# poses de la hoja para las paradas direccionales (giros extra del brazo derecho, ejes del personaje, validados en hoja de contacto)
P_IZQ = {"upperarm_r": (-40, 0, 80), "lowerarm_r": (-80, 0, 0), "hand_r": (-45, 0, -45)}
P_DER = {"upperarm_r": (-40, 0, -40), "lowerarm_r": (-80, 0, 0), "hand_r": (-45, 0, -45)}
P_ARR = {"upperarm_r": (-100, 0, 0), "lowerarm_r": (-60, 0, 0), "hand_r": (-30, 0, 0)}


def parada(nombre, dirn, pose, tor, desc, nota=""):
    h = {b: [(0, 0, 0, 0), (0.05, 0, 0, 0), (0.17, *v), (0.42, *v), (0.62, 0, 0, 0)] for b, v in pose.items()}
    return clip(nombre, 0.62, [IDLE(0.62)], "Sword_Idle (UAL1) + posición de la hoja autorada por dirección",
                desc, direccion=dirn, cubre="Parada direccional " + dirn, huesos=h,
                torso=[(0, 0), (0.17, tor), (0.42, tor), (0.62, 0)], inclina=[(0, 0), (0.17, 8), (0.42, 8), (0.62, 0)],
                desp=[(0, 0, 0), (0.17, -0.12, 0), (0.62, -0.12, 0)], baja=[(0, 0), (0.17, -0.03), (0.42, -0.03), (0.62, 0)],
                nota=nota or "Solo la hoja y el torso cambian con la dirección; los pies no se reposicionan.")


C.append(clip("estilo_dw_guardia_EP", 2.0, [capa("ual1", "Sword_Idle", [(0, 0), (2.0, 1.33)])],
    "Sword_Idle (UAL1) ralentizado + brazo derecho autorado",
    "Guardia media pesada: hoja al frente con la punta baja, pies plantados, respiración lenta.",
    direccion="neu", bucle=True, cubre="Guardia neutra en bucle", huesos=BRAZO_PUNTA, inclina=[(0, 3), (1.0, 5), (2.0, 3)],
    nota="La mano izquierda no sujeta la empuñadura."))

C.append(clip("estilo_dw_andar_guardia_EP", 1.5,
    [capa("ual1", "Walk_Loop", [(0, 0), (1.5, 1.07)]), capa("ual1", "Sword_Idle", [(0, 0), (1.5, 1.33)], solo="torso", fade=0.0)],
    "Walk_Loop ralentizado (piernas) + Sword_Idle (torso) + brazo autorado",
    "Paso lento y cargado en guardia, centro de gravedad bajo y hoja al frente.",
    categoria="locomocion", direccion="adelante", bucle=True, velocidad_ms=0.65, cubre="Andar en guardia",
    huesos=BRAZO_PUNTA, inclina=[(0, 4), (1.5, 4)], desp=[(0, 0, 0), (1.5, 0.98, 0)]))

C.append(clip("estilo_dw_ataque_izq_EP", 1.05, [capa("ual1", "Sword_Attack", [(0, 0), (0.42, 0.33), (0.5, 0.43), (0.58, 0.53), (0.75, 0.72), (1.05, 1.27)])],
    "Sword_Attack (UAL1) re-temporizado",
    "Tajo diagonal que termina a la izquierda: anticipación larga y legible (la hoja sube y el torso se carga) y golpe con todo el peso de la cadera.",
    direccion="izq", cubre="Ataque ligero izq.",
    yaw=[(0, 0), (0.42, -14), (0.54, 12), (1.05, 0)], torso=[(0, 0), (0.42, -18), (0.54, 14), (1.05, 0)],
    desp=[(0, 0, 0), (0.4, 0.05, 0), (0.56, 0.4, 0), (1.05, 0.4, 0)], baja=[(0, 0), (0.42, 0.01), (0.56, -0.03), (1.05, 0)]))

C.append(clip("estilo_dw_ataque_der_EP", 1.1,
    [capa("ual2", "Sword_Regular_B", [(0, 0), (0.4, 0.27), (0.5, 0.33), (0.56, 0.47)], fin=0.6, fade=0.06),
     capa("ual2", "Sword_Regular_B_Rec", [(0.54, 0), (1.1, 0.87)], ini=0.54, fade=0.06)],
    "Sword_Regular_B + _Rec (UAL2) re-temporizado",
    "Tajo horizontal de izquierda a derecha, con la hoja cargada a la izquierda un buen rato y giro de cadera pesado.",
    direccion="der", cubre="Ataque ligero der.",
    yaw=[(0, 0), (0.4, 14), (0.52, -14), (1.1, 0)], torso=[(0, 0), (0.4, 16), (0.52, -16), (1.1, 0)],
    desp=[(0, 0, 0), (0.4, 0.05, 0), (0.56, 0.35, 0), (1.1, 0.35, 0)]))

C.append(clip("estilo_dw_ataque_arriba_EP", 1.4, [capa("ual2", "Sword_Heavy_Combo", [(0, 2.2), (0.55, 2.58), (0.65, 2.66), (0.8, 2.8), (1.4, 3.5)])],
    "Sword_Heavy_Combo [2.2-3.5 s] (UAL2) re-temporizado",
    "Tajo vertical desde arriba: la hoja se eleva despacio (señal clara de dirección) y cae con todo el peso.",
    direccion="arr", cubre="Ataque ligero arriba",
    inclina=[(0, 0), (0.55, -12), (0.66, 18), (1.4, 0)], desp=[(0, 0, 0), (0.5, 0.05, 0), (0.66, 0.45, 0), (1.4, 0.45, 0)],
    baja=[(0, 0), (0.66, -0.04), (1.4, 0)]))

C.append(clip("estilo_dw_ataque_abajo_EP", 1.1,
    [capa("ual2", "Sword_Regular_A", [(0, 0), (0.4, 0.23), (0.5, 0.33), (0.56, 0.37)], fin=0.6, fade=0.06),
     capa("ual2", "Sword_Regular_A_Rec", [(0.54, 0), (1.1, 0.8)], ini=0.54, fade=0.06)],
    "Sword_Regular_A + _Rec (UAL2) re-temporizado",
    "Tajo bajo que sube desde abajo-derecha: la hoja baja y se carga atrás antes del barrido ascendente.",
    direccion="aba", cubre="Ataque ligero abajo",
    yaw=[(0, 0), (0.4, -8), (0.52, 10), (1.1, 0)], desp=[(0, 0, 0), (0.4, 0.05, 0), (0.56, 0.3, 0), (1.1, 0.3, 0)]))

C.append(clip("estilo_dw_estocada_EP", 1.2, [capa("ual2", "Sword_Dash", [(0, 0), (0.5, 0.33), (0.6, 0.43), (0.8, 0.7), (1.2, 1.3)])],
    "Sword_Dash (UAL2) re-temporizado",
    "Estocada baja con zancada larga: se agacha y retrae la hoja antes de lanzarla de punta.",
    direccion="fro", cubre="Estocada / ataque frontal",
    yaw=[(0, 0), (0.5, -8), (0.62, 6), (1.2, 0)], desp=[(0, 0, 0), (0.45, 0.1, 0), (0.62, 1.2, 0), (1.2, 1.3, 0)]))

C.append(parada("estilo_dw_parada_izq_EP", "izq", P_IZQ, 14, "Parada a la izquierda: la hoja cruza el cuerpo, casi vertical, y el torso se cierra."))
C.append(parada("estilo_dw_parada_der_EP", "der", P_DER, -14, "Parada a la derecha: el brazo se abre y la hoja intercepta por fuera."))
C.append(parada("estilo_dw_parada_arriba_EP", "arr", P_ARR, 0, "Parada alta: la hoja se alza sobre la cabeza y el cuerpo se hunde para absorber el golpe."))

C.append(clip("estilo_dw_contraataque_EP", 0.8, [capa("ual2", "Sword_Dash", [(0, 0.1), (0.14, 0.33), (0.22, 0.43), (0.4, 0.7), (0.8, 1.25)])],
    "Sword_Dash (UAL2) re-temporizado",
    "Contraataque directo: sin floreos, un solo tajo/estocada frontal inmediatamente tras la parada.",
    direccion="fro", cubre="Contraataque",
    yaw=[(0, 0), (0.14, -6), (0.24, 6), (0.8, 0)], desp=[(0, 0, 0), (0.14, 0.1, 0), (0.24, 0.55, 0), (0.8, 0.6, 0)]))

C.append(clip("estilo_dw_esquiva_lateral_EP", 0.5, [capa("ual2", "Sword_Block", [(0, 0), (0.14, 0.25), (0.32, 0.5), (0.5, 0.95)])],
    "Sword_Block (UAL2) como base + desplazamiento lateral propio",
    "Esquiva lateral corta y pesada (0,9 m): el cuerpo se hunde y vuelve a plantarse en guardia.",
    categoria="esquiva", direccion="izq", cubre="Esquiva lateral corta",
    yaw=[(0, 0), (0.14, -12), (0.5, 0)], desp=[(0, 0, 0), (0.12, 0, 0.25), (0.34, -0.05, 0.9), (0.5, -0.05, 0.92)], baja=[(0, 0), (0.2, -0.03), (0.5, 0)],
    nota="Sin IK: los pies deslizan."))

C.append(clip("estilo_dw_remate_EP", 2.0, [capa("ual2", "Sword_Heavy_Combo", [(0, 2.2), (0.5, 2.5), (0.95, 2.56), (1.08, 2.66), (1.25, 2.8), (2.0, 3.5)])],
    "Sword_Heavy_Combo [2.2-3.5 s] (UAL2) muy ralentizado con pausa en lo alto",
    "Remate brutal y lento: la hoja se eleva, se detiene un instante arriba (aviso) y cae con un paso adelante y todo el cuerpo detrás.",
    direccion="arr", cubre="Remate",
    inclina=[(0, 0), (0.8, -18), (1.08, 30), (2.0, 0)], desp=[(0, 0, 0), (0.9, 0.1, 0), (1.1, 0.9, 0), (2.0, 0.9, 0)],
    baja=[(0, 0), (1.08, -0.06), (2.0, 0)]))

CLIPS = C
