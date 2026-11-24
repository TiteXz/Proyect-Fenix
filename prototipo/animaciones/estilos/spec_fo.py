"""Estilo «Fallen Order» (recreación propia): combos rápidos de 3 golpes, guardia alta vertical, desvío seco, flourish. Perfil: fluido_agil."""
from util_spec import capa, clip, BRAZO_ALTO
JUEGO = "Star Wars Jedi: Fallen Order (estilo; recreación propia, sin datos del juego)"
TITULO = "Estilo Fallen Order (recreación propia)"
C = []

C.append(clip("estilo_fo_guardia_alta_EP", 1.33, [capa("ual1", "Sword_Idle", [(0, 0), (1.33, 1.33)])],
    "Sword_Idle (UAL1) + brazo derecho autorado (hoja vertical)",
    "Guardia alta: la hoja vertical ante el rostro, pecho de lado y ligero rebote sobre los pies (listo para pivotar).",
    direccion="neu", bucle=True, cubre="Guardia neutra en bucle", huesos=BRAZO_ALTO,
    inclina=[(0, 0), (0.66, 3), (1.33, 0)], torso=[(0, 6), (1.33, 6)],
    nota="Brazo posado a mano (rotaciones en ejes del personaje); la mano izquierda no sujeta la empuñadura."))

C.append(clip("estilo_fo_andar_guardia_EP", 0.9,
    [capa("ual1", "Walk_Loop", [(0, 0), (0.9, 1.07)]), capa("ual1", "Sword_Idle", [(0, 0), (0.9, 1.33)], solo="torso", fade=0.0)],
    "Walk_Loop (piernas) + Sword_Idle (torso) + brazo autorado",
    "Paso vivo en guardia alta con la hoja vertical; torso casi fijo para no perder la guardia.",
    categoria="locomocion", direccion="adelante", bucle=True, velocidad_ms=1.1, cubre="Andar en guardia",
    huesos=BRAZO_ALTO, desp=[(0, 0, 0), (0.9, 1.0, 0)], torso=[(0, 6), (0.9, 6)]))

C.append(clip("estilo_fo_ligero_1_EP", 0.5, [capa("ual1", "Sword_Attack", [(0, 0), (0.14, 0.33), (0.2, 0.5), (0.3, 0.72), (0.5, 1.27)])],
    "Sword_Attack (UAL1) re-temporizado",
    "Primer golpe del combo: diagonal rápido con lunge corto y giro de hombros (el torso gira más que la cadera).",
    direccion="izq", cubre="Ataque ligero 1",
    yaw=[(0, 0), (0.14, -6), (0.2, 8), (0.5, 0)], torso=[(0, 0), (0.14, -26), (0.2, 26), (0.5, 0)],
    desp=[(0, 0, 0), (0.14, 0.1, 0), (0.22, 0.5, 0), (0.5, 0.55, 0)]))

C.append(clip("estilo_fo_ligero_2_EP", 0.5,
    [capa("ual2", "Sword_Regular_B", [(0, 0), (0.12, 0.27), (0.17, 0.33), (0.21, 0.47)], fin=0.24, fade=0.05),
     capa("ual2", "Sword_Regular_B_Rec", [(0.18, 0), (0.5, 0.87)], ini=0.18, fade=0.05)],
    "Sword_Regular_B + _Rec (UAL2) re-temporizado",
    "Segundo golpe: tajo horizontal de vuelta, más corto, con hombros girando en sentido contrario.",
    direccion="der", cubre="Ataque ligero 2",
    yaw=[(0, 0), (0.12, 6), (0.18, -8), (0.5, 0)], torso=[(0, 0), (0.12, 22), (0.18, -24), (0.5, 0)],
    desp=[(0, 0, 0), (0.12, 0.1, 0), (0.2, 0.45, 0), (0.5, 0.5, 0)]))

C.append(clip("estilo_fo_ligero_3_EP", 0.6, [capa("ual2", "Sword_Regular_Combo", [(0, 1.1), (0.2, 1.33), (0.26, 1.4), (0.4, 1.63), (0.6, 2.0)])],
    "Sword_Regular_Combo [1.1-2.0 s] (UAL2) re-temporizado",
    "Tercer golpe: remate del combo con salto-giro, el más amplio y el que más avanza.",
    direccion="izq", cubre="Ataque ligero 3 (cierre de combo)",
    yaw=[(0, 0), (0.2, -10), (0.3, 14), (0.6, 0)], desp=[(0, 0, 0), (0.2, 0.2, 0), (0.32, 0.9, 0), (0.6, 1.0, 0)],
    nota="La fuente es un salto con giro bastante acrobático; no empalma limpio con el cierre en guardia."))

C.append(clip("estilo_fo_combo_3_EP", 1.35,
    [capa("ual1", "Sword_Attack", [(0, 0), (0.14, 0.33), (0.2, 0.5), (0.3, 0.72)], fin=0.34, fade=0.08),
     capa("ual2", "Sword_Regular_B", [(0.26, 0.1), (0.36, 0.27), (0.42, 0.33), (0.5, 0.47)], ini=0.26, fin=0.56, fade=0.08),
     capa("ual2", "Sword_Regular_Combo", [(0.5, 1.1), (0.62, 1.33), (0.68, 1.4), (0.82, 1.63), (1.05, 2.0)], ini=0.5, fin=1.1, fade=0.08),
     capa("ual1", "Sword_Idle", [(1.0, 0), (1.35, 0.35)], ini=1.0, fade=0.18)],
    "Sword_Attack + Sword_Regular_B + Sword_Regular_Combo [1.1-2.0] + Sword_Idle (UAL1/UAL2), encadenados con fundidos de 0,08 s",
    "Combo de 3 golpes encadenado sin pausa: diagonal, tajo de vuelta y cierre con giro; cada golpe lunge corto + giro de hombros alternado.",
    direccion="izq", cubre="Combo ligero de 3 golpes",
    yaw=[(0, 0), (0.14, -6), (0.22, 8), (0.36, 6), (0.44, -8), (0.62, -6), (0.7, 12), (1.35, 0)],
    torso=[(0, 0), (0.14, -26), (0.22, 26), (0.36, 22), (0.44, -24), (0.62, -22), (0.7, 22), (1.35, 0)],
    desp=[(0, 0, 0), (0.14, 0.1, 0), (0.24, 0.5, 0), (0.4, 0.6, 0), (0.46, 1.0, 0), (0.64, 1.1, 0), (0.74, 1.8, 0), (1.35, 1.9, 0)]))

C.append(clip("estilo_fo_parada_EP", 0.42, [capa("ual2", "Sword_Block", [(0, 0), (0.06, 0.2), (0.2, 0.6), (0.42, 1.0)])],
    "Sword_Block (UAL2) re-temporizado",
    "Desvío seco: la hoja corta el golpe con un giro de hombros y un empujón adelante que abre la defensa del rival.",
    direccion="fro", cubre="Parada",
    torso=[(0, 0), (0.06, -16), (0.12, 12), (0.42, 0)], desp=[(0, 0, 0), (0.08, 0, 0), (0.16, 0.3, 0), (0.42, 0.3, 0)]))

C.append(clip("estilo_fo_ataque_cargado_EP", 1.15,
    [capa("ual2", "Sword_Heavy_Combo", [(0, 0), (0.4, 0.8), (0.62, 1.45), (0.68, 1.55), (0.8, 1.75), (1.0, 1.95)], fin=1.0, fade=0.15),
     capa("ual1", "Sword_Idle", [(0.85, 0), (1.15, 0.3)], ini=0.85, fade=0.15)],
    "Sword_Heavy_Combo [0-1.95 s] + Sword_Idle (UAL1/UAL2) + giro propio",
    "Ataque cargado: se encoge un instante cargando y suelta un tajo con giro de 360°, sacrificando velocidad.",
    direccion="izq", cubre="Ataque fuerte cargado",
    yaw=[(0, 0), (0.4, 12), (0.62, -200), (0.78, -360), (1.15, -360)], desp=[(0, 0, 0), (0.45, 0.1, 0), (0.7, 1.0, 0), (1.15, 1.2, 0)]))

C.append(clip("estilo_fo_esquiva_EP", 0.3, [capa("ual2", "Sword_Block", [(0, 0), (0.08, 0.25), (0.18, 0.5), (0.3, 0.95)])],
    "Sword_Block (UAL2) como base + desplazamiento propio",
    "Esquiva corta y muy rápida (0,9 m en 0,2 s) con el cuerpo encogido.",
    categoria="esquiva", direccion="izq", cubre="Esquiva corta",
    yaw=[(0, 0), (0.08, -14), (0.3, 0)], desp=[(0, 0, 0), (0.06, 0, 0.25), (0.2, -0.05, 0.9), (0.3, -0.05, 0.92)],
    nota="Sin IK: los pies deslizan."))

C.append(clip("estilo_fo_flourish_EP", 0.95,
    [capa("ual1", "Sword_Attack", [(0, 0.4), (0.2, 0.55), (0.5, 0.9), (0.95, 1.27)])],
    "Sword_Attack [0.4-1.27 s] (UAL1) + giro de muñeca propio",
    "Floritura de la hoja al terminar: la muñeca hace dos vueltas y la espada gira ante el cuerpo antes de volver a la guardia.",
    direccion="neu", cubre="Floritura final",
    huesos_local={"hand_r": [(0, 0, 0, 0), (0.15, 0, 0, 0), (0.7, 720, 0, 0), (0.95, 720, 0, 0)]}, torso=[(0, 0), (0.4, 14), (0.95, 0)],
    nota="El giro de muñeca es sobre un solo hueso: puede atravesar el antebrazo."))

C.append(clip("estilo_fo_contraataque_EP", 0.45, [capa("ual1", "Sword_Attack", [(0, 0.2), (0.1, 0.33), (0.16, 0.5), (0.25, 0.72), (0.45, 1.27)])],
    "Sword_Attack (UAL1) re-temporizado",
    "Contraataque casi inmediato tras el desvío: el mismo diagonal rápido, con lunge largo.",
    direccion="fro", cubre="Contraataque",
    yaw=[(0, 0), (0.1, -8), (0.16, 10), (0.45, 0)], torso=[(0, 0), (0.1, -20), (0.16, 24), (0.45, 0)],
    desp=[(0, 0, 0), (0.1, 0.15, 0), (0.18, 0.8, 0), (0.45, 0.85, 0)]))

C.append(clip("estilo_fo_remate_EP", 1.0, [capa("ual2", "Sword_Dash", [(0, 0), (0.3, 0.33), (0.38, 0.43), (0.6, 0.8), (1.0, 1.3)])],
    "Sword_Dash (UAL2) re-temporizado",
    "Remate: estocada larga y limpia tras un paso lanzado, con pausa de impacto y recogida rápida.",
    direccion="fro", cubre="Remate",
    yaw=[(0, 0), (0.3, -12), (0.4, 10), (1.0, 0)], desp=[(0, 0, 0), (0.3, 0.2, 0), (0.42, 1.4, 0), (1.0, 1.5, 0)]))

CLIPS = C
