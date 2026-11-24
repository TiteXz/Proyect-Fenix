# Estilos de animación de combate con espada (recreaciones propias)

Tres sets de clips EP (solo espada) **autorados por nosotros** sobre el esqueleto de `juego/public/assets/personajes/caballero_soldado.glb`, uno por estilo de referencia. Cada GLB lleva el personaje (sin armas ni malla comprimida) y los clips; cada manifiesto `estilo_*.json` sigue el formato de `../candidatas.json` y añade `categoria`, `direccion`, `config`, `bucle`, `desplazamiento_m`, `trayecto_m`, `giro_deg`, `rasgos` e `inspirado_en`.

No se hizo versión EE (espada + escudo): ninguno de los tres estilos la pide como rasgo.

## Aviso legal
Ninguna animación, modelo, textura, sonido, captura, fotograma ni dato de **The Witcher 3**, **Star Wars Jedi: Fallen Order** ni **The Blood of Dawnwalker** se ha usado, extraído, descargado ni calcado, y no se hizo rotoscopia de ningún vídeo. Los clips son recreaciones **originales** del *estilo* (sensación y principios de animación), escritas a partir de las descripciones de `../REFERENCIAS.md` y `../perfiles.json` y de principios generales (anticipación, peso, arcos, solapamiento). La base de movimiento procede de clips CC0 de Quaternius (Universal Animation Library 1 y 2), reasignados al esqueleto del soldado y **editados** (re-temporizados por nudos, recombinados con fundidos, con giros de cuerpo, torsión de torso, brazo posado a mano y movimiento de raíz propios). Los nombres de los juegos solo indican la referencia de estilo. Licencia de los resultados: CC0 1.0 (base) + edición propia.

## Cómo está hecho
- `motor.py`: muestrea los clips UAL ya reasignados (método de `../retarget_candidatas.py`) y los edita por fotograma en Blender: re-temporizado por nudos (curvas cúbicas monótonas), capas con fundido y máscaras (torso/piernas), giro de cuerpo (yaw de la pelvis), torsión de torso, mirada, inclinación, descenso de cadera, giros extra por hueso y **movimiento de raíz real**.
- `spec_w3.py`, `spec_fo.py`, `spec_dw.py`: definición de cada clip (nudos de tiempo, curvas de giro/avance, rasgos). `util_spec.py`: ayudas y poses del brazo.
- Regenerar: `UAL1=<UAL1_Standard.glb> UAL2=<UAL2_Standard.glb> bash estilos.sh [w3|fo|dw]` (genera GLB, manifiesto y visores). Revisión visual: `NODE_PATH=$(npm root -g) node hoja_contacto.js <glb> <png> [regex] [poses] [tile] [3q|lado|frente|arriba]`.
- Visores: `python3 ../build_visor.py estilo_w3.glb visor_w3.html estilo_w3.json "Estilo Witcher 3 (recreación propia)"` (manifiesto y título opcionales).

## Notas comunes de calidad
- **Raíz**: el esqueleto no tiene hueso `Root`; el movimiento de raíz (avance y giro del personaje) va en el hueso `pelvis`, que es la raíz de la jerarquía. `desplazamiento_m` = distancia neta en el suelo entre el primer y el último fotograma; `trayecto_m` = longitud recorrida; `giro_deg` = giro neto (+ = izquierda). Un juego que quiera root motion «limpio» debe extraer esa traslación/giro de la pelvis o añadir un hueso Root (cambio de esqueleto, no hecho aquí).
- **Pies**: sin IK. Los clips con avance o giro de cuerpo rígido (pirueta, esquivas, remates) deslizan los pies; las locomociones y golpes con paso propio de la fuente deslizan poco.
- **Mano izquierda**: no sujeta la empuñadura (no hay guardias a dos manos).
- **Duración**: la reproducción en el visor es la del clip tal cual (`original` del visor desactiva re-temporizado; el perfil «COMBATE.md» no se aplica porque los nombres `estilo_*` no encajan con su tabla).
- Los bucles (`guardia`, `andar`) cierran porque la fuente (Sword_Idle, Walk_Loop) es cíclica.
- Hoja de contacto de cada set (poses clave de cada clip): `scratchpad/estilos/{w3,fo,dw}.png` de la sesión (no se versiona).

## The Witcher 3 (`estilo_w3.glb`, 12 clips)
Perfil de referencia: `fluido` con más desplazamiento y giros (`perfiles.json`, fluido_agil + pasos/pivotes).

| Clip | Rasgo que imita | Dur. (s) | Desp. (m) / giro | Base (CC0) | Notas de calidad |
|---|---|---|---|---|---|
| `estilo_w3_andar_guardia_EP` (bucle) | Andar en guardia baja con ligera torsión de hombros alternada (paso de baile). | 1.07 | 1.02 | Walk_Loop (UAL1) piernas + Sword_Idle torso/brazos | Avance de raiz 1,02 m por ciclo (0,95 m/s). Torso de otro clip: puede ir ligeramente desacompasado del paso. |
| `estilo_w3_ataque_fuerte_EP` | Golpe fuerte: anticipación visible (la hoja sube y el torso se echa atrás) y tajo vertical con zancada larga; claramente más lento que el rápido. | 1.13 | 1.1 | Sword_Heavy_Combo [2.2-3.5 s] (UAL2) re-temporizado | - |
| `estilo_w3_ataque_rapido_der_EP` | Tajo horizontal rápido de izquierda a derecha con giro de cadera y paso en arco (pivote sobre el pie adelantado). | 0.87 | 0.81 | Sword_Regular_B + _Rec (UAL2) re-temporizado | - |
| `estilo_w3_ataque_rapido_izq_EP` | Tajo rápido en diagonal con pivote: la cadera se carga hacia la derecha y gira a la izquierda al golpear, con paso amplio adelante y lateral. | 0.8 | 0.87 | Sword_Attack (UAL1) re-temporizado | - |
| `estilo_w3_contraataque_EP` | Contraataque inmediato tras la parada: giro de cadera hacia el enemigo y tajo con paso largo. | 0.7 | 1.05 | Sword_Dash (UAL2) re-temporizado | - |
| `estilo_w3_esquiva_lateral_EP` | Esquiva corta lateral (paso de 1,1 m) con el cuerpo girado y agachado, vuelve a guardia. | 0.43 | 1.1 | Sword_Block (UAL2) como base + desplazamiento lateral propio | Sin IK: los pies deslizan en el paso lateral. |
| `estilo_w3_guardia_EP` (bucle) | Guardia baja con la espada al costado (una mano), peso en vaivén suave de bailarín. | 1.33 | 0.0 | Sword_Idle (UAL1) + balanceo propio de torso/cadera | Balanceo periodico sobre el idle de espada; la guardia a dos manos no se pudo autorar (la fuente no tiene mano izq. en la empuñadura). |
| `estilo_w3_parada_EP` | Parada corta con paso atrás y torsión: se recoge sobre la espada y devuelve a guardia lista para el contraataque. | 0.53 | 0.25 | Sword_Block (UAL2) re-temporizado | - |
| `estilo_w3_pirueta_EP` | Pirueta de 360° con tajo horizontal en el giro (el golpe cae en mitad de la vuelta) y aterrizaje en guardia. | 0.93 | 1.04 / -360° | Sword_Regular_B + _Rec (UAL2) + giro de 360° propio | El giro lo hace la pelvis (cuerpo rígido); los pies giran con el cuerpo, sin pasos de pivote. |
| `estilo_w3_pivote_EP` | Paso con pivote de 180° para reorientarse hacia otro enemigo sin perder la guardia. | 0.7 | 0.61 / -180° | Walk_Loop + Sword_Idle (UAL1) + giro de 180° propio | - |
| `estilo_w3_remate_giro_EP` | Remate: giro completo con corte ascendente y cierre con tajo descendente; el golpe final es la «pose para cámara lenta». | 1.9 | 1.2 / -360° | Sword_Heavy_Combo [0-1.95 s] + [2.3-3.5 s] (UAL2) con giro propio | - |
| `estilo_w3_voltereta_EP` | Voltereta en diagonal para salir del área (3 m). | 0.87 | 3.23 / 25° | Roll (UAL1) + desplazamiento y giro propios | - |

**Valoración honesta.** Fiel: ritmo con giros y desplazamiento de raíz, ataque rápido vs fuerte bien diferenciados, pirueta y remate con giro. No fiel: la fuente son clips acrobáticos de Quaternius (posturas agachadas tipo ninja), no la esgrima de espadachín con pasos cruzados; guardia a dos manos no autorada; los pies deslizan en giros y esquivas (sin IK).

## Star Wars Jedi: Fallen Order (`estilo_fo.glb`, 12 clips)
Perfil de referencia: `fluido_agil` (ligero ≈ 0,45-0,5 s, cancelación 30 %).

| Clip | Rasgo que imita | Dur. (s) | Desp. (m) / giro | Base (CC0) | Notas de calidad |
|---|---|---|---|---|---|
| `estilo_fo_andar_guardia_EP` (bucle) | Paso vivo en guardia alta con la hoja vertical; torso casi fijo para no perder la guardia. | 0.9 | 1.0 | Walk_Loop (piernas) + Sword_Idle (torso) + brazo autorado | - |
| `estilo_fo_ataque_cargado_EP` | Ataque cargado: se encoge un instante cargando y suelta un tajo con giro de 360°, sacrificando velocidad. | 1.13 | 1.19 / -360° | Sword_Heavy_Combo [0-1.95 s] + Sword_Idle (UAL1/UAL2) + giro propio | - |
| `estilo_fo_combo_3_EP` | Combo de 3 golpes encadenado sin pausa: diagonal, tajo de vuelta y cierre con giro; cada golpe lunge corto + giro de hombros alternado. | 1.33 | 1.9 | Sword_Attack + Sword_Regular_B + Sword_Regular_Combo [1.1-2.0] + Sword_Idle (UAL1/UAL2), encadenados con fundidos de 0,08 s | - |
| `estilo_fo_contraataque_EP` | Contraataque casi inmediato tras el desvío: el mismo diagonal rápido, con lunge largo. | 0.47 | 0.85 | Sword_Attack (UAL1) re-temporizado | - |
| `estilo_fo_esquiva_EP` | Esquiva corta y muy rápida (0,9 m en 0,2 s) con el cuerpo encogido. | 0.3 | 0.92 | Sword_Block (UAL2) como base + desplazamiento propio | Sin IK: los pies deslizan. |
| `estilo_fo_flourish_EP` | Floritura de la hoja al terminar: la muñeca hace dos vueltas y la espada gira ante el cuerpo antes de volver a la guardia. | 0.93 | 0.0 | Sword_Attack [0.4-1.27 s] (UAL1) + giro de muñeca propio | El giro de muñeca es sobre un solo hueso: puede atravesar el antebrazo. |
| `estilo_fo_guardia_alta_EP` (bucle) | Guardia alta: la hoja vertical ante el rostro, pecho de lado y ligero rebote sobre los pies (listo para pivotar). | 1.33 | 0.0 | Sword_Idle (UAL1) + brazo derecho autorado (hoja vertical) | Brazo posado a mano (rotaciones en ejes del personaje); la mano izquierda no sujeta la empuñadura. |
| `estilo_fo_ligero_1_EP` | Primer golpe del combo: diagonal rápido con lunge corto y giro de hombros (el torso gira más que la cadera). | 0.5 | 0.55 | Sword_Attack (UAL1) re-temporizado | - |
| `estilo_fo_ligero_2_EP` | Segundo golpe: tajo horizontal de vuelta, más corto, con hombros girando en sentido contrario. | 0.5 | 0.5 | Sword_Regular_B + _Rec (UAL2) re-temporizado | - |
| `estilo_fo_ligero_3_EP` | Tercer golpe: remate del combo con salto-giro, el más amplio y el que más avanza. | 0.6 | 1.0 | Sword_Regular_Combo [1.1-2.0 s] (UAL2) re-temporizado | La fuente es un salto con giro bastante acrobático; no empalma limpio con el cierre en guardia. |
| `estilo_fo_parada_EP` | Desvío seco: la hoja corta el golpe con un giro de hombros y un empujón adelante que abre la defensa del rival. | 0.43 | 0.3 | Sword_Block (UAL2) re-temporizado | - |
| `estilo_fo_remate_EP` | Remate: estocada larga y limpia tras un paso lanzado, con pausa de impacto y recogida rápida. | 1.0 | 1.5 | Sword_Dash (UAL2) re-temporizado | - |

**Valoración honesta.** Fiel: guardia alta con la hoja vertical (autorada a mano), cadena de 3 golpes sin pausa con giro de hombros alternado, esquiva muy corta, floritura de muñeca. No fiel: la fuente es agachada y cae en acrobacia en el 3.er golpe; la floritura es una rotación de un solo hueso (atraviesa el antebrazo); la parada es un recoger-y-empujar sin pose de hoja diagonal real.

## The Blood of Dawnwalker (`estilo_dw.glb`, 13 clips)
Perfil de referencia: `tactico_pesado` (ligero lateral 0,76 s en `perfiles.json`; aquí ×1,15 para dar anticipación larga y legible).

| Clip | Rasgo que imita | Dur. (s) | Desp. (m) / giro | Base (CC0) | Notas de calidad |
|---|---|---|---|---|---|
| `estilo_dw_andar_guardia_EP` (bucle) | Paso lento y cargado en guardia, centro de gravedad bajo y hoja al frente. | 1.5 | 0.98 | Walk_Loop ralentizado (piernas) + Sword_Idle (torso) + brazo autorado | - |
| `estilo_dw_ataque_abajo_EP` | Tajo bajo que sube desde abajo-derecha: la hoja baja y se carga atrás antes del barrido ascendente. | 1.1 | 0.3 | Sword_Regular_A + _Rec (UAL2) re-temporizado | - |
| `estilo_dw_ataque_arriba_EP` | Tajo vertical desde arriba: la hoja se eleva despacio (señal clara de dirección) y cae con todo el peso. | 1.4 | 0.45 | Sword_Heavy_Combo [2.2-3.5 s] (UAL2) re-temporizado | - |
| `estilo_dw_ataque_der_EP` | Tajo horizontal de izquierda a derecha, con la hoja cargada a la izquierda un buen rato y giro de cadera pesado. | 1.1 | 0.35 | Sword_Regular_B + _Rec (UAL2) re-temporizado | - |
| `estilo_dw_ataque_izq_EP` | Tajo diagonal que termina a la izquierda: anticipación larga y legible (la hoja sube y el torso se carga) y golpe con todo el peso de la cadera. | 1.07 | 0.4 | Sword_Attack (UAL1) re-temporizado | - |
| `estilo_dw_contraataque_EP` | Contraataque directo: sin floreos, un solo tajo/estocada frontal inmediatamente tras la parada. | 0.8 | 0.6 | Sword_Dash (UAL2) re-temporizado | - |
| `estilo_dw_esquiva_lateral_EP` | Esquiva lateral corta y pesada (0,9 m): el cuerpo se hunde y vuelve a plantarse en guardia. | 0.5 | 0.92 | Sword_Block (UAL2) como base + desplazamiento lateral propio | Sin IK: los pies deslizan. |
| `estilo_dw_estocada_EP` | Estocada baja con zancada larga: se agacha y retrae la hoja antes de lanzarla de punta. | 1.2 | 1.3 | Sword_Dash (UAL2) re-temporizado | - |
| `estilo_dw_guardia_EP` (bucle) | Guardia media pesada: hoja al frente con la punta baja, pies plantados, respiración lenta. | 2.0 | 0.0 | Sword_Idle (UAL1) ralentizado + brazo derecho autorado | La mano izquierda no sujeta la empuñadura. |
| `estilo_dw_parada_arriba_EP` | Parada alta: la hoja se alza sobre la cabeza y el cuerpo se hunde para absorber el golpe. | 0.63 | 0.12 | Sword_Idle (UAL1) + posición de la hoja autorada por dirección | Solo la hoja y el torso cambian con la dirección; los pies no se reposicionan. |
| `estilo_dw_parada_der_EP` | Parada a la derecha: el brazo se abre y la hoja intercepta por fuera. | 0.63 | 0.12 | Sword_Idle (UAL1) + posición de la hoja autorada por dirección | Solo la hoja y el torso cambian con la dirección; los pies no se reposicionan. |
| `estilo_dw_parada_izq_EP` | Parada a la izquierda: la hoja cruza el cuerpo, casi vertical, y el torso se cierra. | 0.63 | 0.12 | Sword_Idle (UAL1) + posición de la hoja autorada por dirección | Solo la hoja y el torso cambian con la dirección; los pies no se reposicionan. |
| `estilo_dw_remate_EP` | Remate brutal y lento: la hoja se eleva, se detiene un instante arriba (aviso) y cae con un paso adelante y todo el cuerpo detrás. | 2.0 | 0.9 | Sword_Heavy_Combo [2.2-3.5 s] (UAL2) muy ralentizado con pausa en lo alto | - |

**Valoración honesta.** Fiel: 4 direcciones (izq., der., arriba, abajo-sube + estocada), anticipación larga, peso en cadera con descenso, paradas direccionales con la hoja en tres posiciones distintas, remate lento con pausa en lo alto. No fiel: no hay técnica medieval real (guardias históricas, cortes con pies cruzados); la parada solo mueve brazo y torso, los pies no se recolocan; el golpe abajo es un tajo ascendente de una fuente acrobática.
