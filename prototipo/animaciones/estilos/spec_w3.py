"""Estilo «Witcher 3» (recreación propia): esgrima danzada, pasos amplios, pivotes y giros. Perfil: fluido con más desplazamiento."""
from util_spec import capa, clip
JUEGO = "The Witcher 3 (estilo; recreación propia, sin datos del juego)"
TITULO = "Estilo Witcher 3 (recreación propia)"
INS = "Estilo W3"
SI = "Sword_Idle (UAL1)"
C = []

C.append(clip("estilo_w3_guardia_EP", 1.33, [capa("ual1", "Sword_Idle", [(0, 0), (1.33, 1.33)])],
    SI + " + balanceo propio de torso/cadera",
    "Guardia baja con la espada al costado (una mano), peso en vaivén suave de bailarín.",
    direccion="neu", bucle=True, cubre="Guardia neutra en bucle",
    yaw=[(0, 0), (0.33, 4), (0.66, 0), (1.0, -4), (1.33, 0)], torso=[(0, 0), (0.33, -5), (0.66, 0), (1.0, 5), (1.33, 0)],
    nota="Balanceo periodico sobre el idle de espada; la guardia a dos manos no se pudo autorar (la fuente no tiene mano izq. en la empuñadura)."))

C.append(clip("estilo_w3_andar_guardia_EP", 1.07,
    [capa("ual1", "Walk_Loop", [(0, 0), (1.07, 1.07)]), capa("ual1", "Sword_Idle", [(0, 0), (1.07, 1.33)], solo="torso", fade=0.0)],
    "Walk_Loop (UAL1) piernas + Sword_Idle torso/brazos",
    "Andar en guardia baja con ligera torsión de hombros alternada (paso de baile).",
    categoria="locomocion", direccion="adelante", bucle=True, velocidad_ms=0.95, cubre="Andar en guardia",
    desp=[(0, 0, 0), (1.07, 1.02, 0)], torso=[(0, 4), (0.27, -4), (0.53, 4), (0.8, -4), (1.07, 4)],
    nota="Avance de raiz 1,02 m por ciclo (0,95 m/s). Torso de otro clip: puede ir ligeramente desacompasado del paso."))

C.append(clip("estilo_w3_ataque_rapido_izq_EP", 0.8, [capa("ual1", "Sword_Attack", [(0, 0), (0.24, 0.33), (0.33, 0.53), (0.45, 0.72), (0.8, 1.27)])],
    "Sword_Attack (UAL1) re-temporizado",
    "Tajo rápido en diagonal con pivote: la cadera se carga hacia la derecha y gira a la izquierda al golpear, con paso amplio adelante y lateral.",
    direccion="izq", cubre="Ataque ligero izq. (rápido)",
    yaw=[(0, 0), (0.24, -22), (0.33, 18), (0.55, 8), (0.8, 0)], torso=[(0, 0), (0.24, -22), (0.33, 20), (0.8, 0)],
    desp=[(0, 0, 0), (0.2, 0.1, 0), (0.36, 0.7, 0.15), (0.8, 0.85, 0.2)]))

C.append(clip("estilo_w3_ataque_rapido_der_EP", 0.85,
    [capa("ual2", "Sword_Regular_B", [(0, 0), (0.2, 0.27), (0.27, 0.33), (0.33, 0.47)], fin=0.36, fade=0.06),
     capa("ual2", "Sword_Regular_B_Rec", [(0.3, 0), (0.85, 0.85)], ini=0.3, fade=0.06)],
    "Sword_Regular_B + _Rec (UAL2) re-temporizado",
    "Tajo horizontal rápido de izquierda a derecha con giro de cadera y paso en arco (pivote sobre el pie adelantado).",
    direccion="der", cubre="Ataque ligero der. (rápido)",
    yaw=[(0, 0), (0.2, 22), (0.3, -26), (0.5, -10), (0.85, 0)], torso=[(0, 0), (0.2, 20), (0.3, -22), (0.85, 0)],
    desp=[(0, 0, 0), (0.2, 0.1, 0.15), (0.36, 0.6, -0.2), (0.85, 0.75, -0.3)]))

C.append(clip("estilo_w3_ataque_fuerte_EP", 1.15, [capa("ual2", "Sword_Heavy_Combo", [(0, 2.2), (0.38, 2.58), (0.46, 2.66), (0.6, 2.8), (1.15, 3.5)])],
    "Sword_Heavy_Combo [2.2-3.5 s] (UAL2) re-temporizado",
    "Golpe fuerte: anticipación visible (la hoja sube y el torso se echa atrás) y tajo vertical con zancada larga; claramente más lento que el rápido.",
    direccion="arr", cubre="Ataque fuerte",
    yaw=[(0, 0), (0.3, -15), (0.46, 14), (1.15, 0)], inclina=[(0, 0), (0.3, -14), (0.46, 22), (0.7, 8), (1.15, 0)],
    desp=[(0, 0, 0), (0.25, 0.15, 0), (0.46, 0.95, 0), (1.15, 1.1, 0)]))

C.append(clip("estilo_w3_pirueta_EP", 0.95,
    [capa("ual2", "Sword_Regular_B", [(0, 0), (0.2, 0.27), (0.5, 0.33), (0.58, 0.47)], fin=0.62, fade=0.06),
     capa("ual2", "Sword_Regular_B_Rec", [(0.56, 0), (0.95, 0.85)], ini=0.56, fade=0.06)],
    "Sword_Regular_B + _Rec (UAL2) + giro de 360° propio",
    "Pirueta de 360° con tajo horizontal en el giro (el golpe cae en mitad de la vuelta) y aterrizaje en guardia.",
    direccion="der", cubre="Ataque en giro 360°",
    yaw=[(0, 0), (0.12, 14), (0.5, -250), (0.72, -362), (0.95, -360)], torso=[(0, 0), (0.12, 15), (0.5, -10), (0.95, 0)],
    desp=[(0, 0, 0), (0.15, 0.1, 0.1), (0.6, 0.9, -0.2), (0.95, 1.0, -0.3)],
    nota="El giro lo hace la pelvis (cuerpo rígido); los pies giran con el cuerpo, sin pasos de pivote."))

C.append(clip("estilo_w3_parada_EP", 0.55, [capa("ual2", "Sword_Block", [(0, 0), (0.1, 0.22), (0.3, 0.6), (0.55, 1.0)])],
    "Sword_Block (UAL2) re-temporizado",
    "Parada corta con paso atrás y torsión: se recoge sobre la espada y devuelve a guardia lista para el contraataque.",
    direccion="fro", cubre="Parada / bloqueo",
    torso=[(0, 0), (0.1, 12), (0.3, 8), (0.55, 0)], inclina=[(0, 0), (0.1, -6), (0.55, 0)], desp=[(0, 0, 0), (0.12, -0.25, 0), (0.55, -0.25, 0)]))

C.append(clip("estilo_w3_contraataque_EP", 0.7, [capa("ual2", "Sword_Dash", [(0, 0.1), (0.12, 0.33), (0.2, 0.43), (0.35, 0.7), (0.7, 1.25)])],
    "Sword_Dash (UAL2) re-temporizado",
    "Contraataque inmediato tras la parada: giro de cadera hacia el enemigo y tajo con paso largo.",
    direccion="fro", cubre="Contraataque",
    yaw=[(0, 0), (0.12, -12), (0.2, 12), (0.7, 0)], torso=[(0, 0), (0.12, -14), (0.2, 14), (0.7, 0)],
    desp=[(0, 0, 0), (0.12, 0.15, 0), (0.22, 0.95, 0.1), (0.7, 1.05, 0.1)]))

C.append(clip("estilo_w3_esquiva_lateral_EP", 0.42, [capa("ual2", "Sword_Block", [(0, 0), (0.12, 0.25), (0.28, 0.5), (0.42, 0.95)])],
    "Sword_Block (UAL2) como base + desplazamiento lateral propio",
    "Esquiva corta lateral (paso de 1,1 m) con el cuerpo girado y agachado, vuelve a guardia.",
    categoria="esquiva", direccion="izq", cubre="Esquiva corta lateral",
    yaw=[(0, 0), (0.12, -22), (0.3, -12), (0.42, 0)], inclina=[(0, 0), (0.12, 10), (0.42, 0)],
    desp=[(0, 0, 0), (0.1, 0.0, 0.3), (0.26, -0.1, 1.05), (0.42, -0.1, 1.1)],
    nota="Sin IK: los pies deslizan en el paso lateral."))

C.append(clip("estilo_w3_voltereta_EP", 0.85, [capa("ual1", "Roll", [(0, 0), (0.85, 1.17)])],
    "Roll (UAL1) + desplazamiento y giro propios",
    "Voltereta en diagonal para salir del área (3 m).", categoria="esquiva", direccion="adelante", cubre="Voltereta",
    yaw=[(0, 0), (0.15, 0), (0.7, 25), (0.85, 25)], desp=[(0, 0, 0), (0.12, 0.1, 0), (0.3, 0.9, 0.15), (0.6, 2.4, 0.9), (0.85, 3.0, 1.2)]))

C.append(clip("estilo_w3_remate_giro_EP", 1.9,
    [capa("ual2", "Sword_Heavy_Combo", [(0, 0), (0.5, 0.9), (0.8, 1.45), (0.9, 1.55), (1.1, 1.95)], fin=1.05, fade=0.1),
     capa("ual2", "Sword_Heavy_Combo", [(0.95, 2.3), (1.2, 2.58), (1.28, 2.66), (1.45, 2.9), (1.9, 3.5)], ini=0.95, fade=0.1)],
    "Sword_Heavy_Combo [0-1.95 s] + [2.3-3.5 s] (UAL2) con giro propio",
    "Remate: giro completo con corte ascendente y cierre con tajo descendente; el golpe final es la «pose para cámara lenta».",
    direccion="arr", cubre="Remate con giro",
    yaw=[(0, 0), (0.2, 14), (0.8, -350), (1.1, -362), (1.9, -360)], desp=[(0, 0, 0), (0.5, 0.2, 0), (1.25, 1.0, 0), (1.9, 1.2, 0)],
    inclina=[(0, 0), (0.95, 0), (1.2, 18), (1.9, 0)]))

C.append(clip("estilo_w3_pivote_EP", 0.7,
    [capa("ual1", "Walk_Loop", [(0, 0), (0.7, 0.75)]), capa("ual1", "Sword_Idle", [(0, 0), (0.7, 0.93)], solo="torso", fade=0.0)],
    "Walk_Loop + Sword_Idle (UAL1) + giro de 180° propio",
    "Paso con pivote de 180° para reorientarse hacia otro enemigo sin perder la guardia.", categoria="locomocion", direccion="giro", cubre="Pivote / giro de 180°",
    yaw=[(0, 0), (0.12, 0), (0.55, -180), (0.7, -180)], desp=[(0, 0, 0), (0.7, 0.5, 0.35)]))

CLIPS = C
