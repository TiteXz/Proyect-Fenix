# Animaciones candidatas de combate con espada

Fichero: `candidatas.glb` (personaje del soldado de `caballero_soldado.glb` sin armas + 24 clips, ~3,4 MB). Manifiesto: `candidatas.json`.
Regenerar: `python3 -I gen_spec.py <UAL1_Standard.glb> <UAL2_Standard.glb> candidatas_spec.json` y
`blender -b -P retarget_candidatas.py -- <caballero_soldado.glb> candidatas_spec.json candidatas.glb`.

## Fuentes y licencias
- Quaternius Universal Animation Library 1 y 2 (Standard), CC0 1.0. Descargadas de https://quaternius.itch.io/universal-animation-library y https://quaternius.itch.io/universal-animation-library-2 (licencia: https://quaternius.com/packs/universalanimationlibrary2.html). UAL2 trae todo el set de espada y escudo; UAL1 solo `Sword_Attack`/`Sword_Idle`.
- No utilizables / no alcanzables: Bandai Namco Research Motion Dataset (CC BY-NC, no comercial: descartado); CMU Mocap (mocap.cs.cmu.edu bloqueado por el proxy; sin espada de todos modos); Mixamo requiere cuenta de Adobe (pendiente de descarga por el humano si se quiere ampliar); opengameart.org y fab.com bloqueados.

## Convenciones
- Nombre: `<accion>_<direccion>_<config>_<fuente><n>`; sufijo `m` en n = espejado izq.<->der. (el movimiento lo hace el brazo izquierdo: el arma iría en la mano izq.; sirve para evaluar el gesto, no tal cual para el juego).
- Dirección: marco de pantalla de COMBATE.md. Para ataques, `izq.` = el golpe termina hacia la izquierda de pantalla (del personaje, visto por detrás); `der.` = hacia la derecha; `arriba` = tajo que baja; `abajo` = tajo que sube. Es una interpretación mía: revisar.
- Config EP/EE: los ataques solo se listan como EP pero con escudo (EE) valen los que mantienen el brazo izq. cerca (Sword_Attack, Regular A/B); no se duplicaron.
- Armas: el modelo no lleva espada ni escudo; el visor/hoja de contacto dibuja una hoja en la mano der. (eje Y del hueso `hand_r`) y un disco en `lowerarm_l` solo como referencia.
- Reasignación: giro mundial por hueso sobre el reposo del soldado (método de `juego/tools/blender/retarget.py`), pelvis con traslación escalada. Sin IK de pies: puede haber leves deslizamientos/penetraciones. Los clips son in-place (UAL no mueve la raíz salvo la pelvis).
- Duraciones: son las de cada clip a 30 fps; hay que reescalar a las de COMBATE.md (0,6-0,8 s en ligeros) y recortar anticipación/recuperación.

## Tabla
| Clip | Fuente (clip original) | Licencia | Duración | Cubre | Notas |
|---|---|---|---|---|---|
| `ataque_der_EP_ual2_1` | Quaternius UAL2 Standard (`Sword_Regular_B + Sword_Regular_B_Rec`) | CC0 1.0 | 1.63 s | Ataque ligero der. | Tajo horizontal de izquierda a derecha de pantalla, limpio; incluye recuperación |
| `ataque_der_EP_ual1_2m` | Quaternius UAL1 Standard (`Sword_Attack`) | CC0 1.0 | 1.57 s | Ataque ligero der. | Espejado (zurdo, arma en mano izq.). Sword_Attack ESPEJADO (arma en mano izq.): diagonal descendente hacia la derecha |
| `ataque_izq_EP_ual1_1` | Quaternius UAL1 Standard (`Sword_Attack`) | CC0 1.0 | 1.57 s | Ataque ligero izq. | Diagonal descendente de alto-derecha a bajo-izquierda; el más sobrio |
| `ataque_izq_EP_ual2_2m` | Quaternius UAL2 Standard (`Sword_Regular_B + Sword_Regular_B_Rec`) | CC0 1.0 | 1.63 s | Ataque ligero izq. | Espejado (zurdo, arma en mano izq.). Regular B ESPEJADO (arma en mano izq.) |
| `ataque_izq_EP_ual2_3` | Quaternius UAL2 Standard (`Sword_Regular_Combo [0.95-1.9s]`) | CC0 1.0 | 1 s | Ataque ligero izq. | 3er golpe del combo: barrido horizontal der.->izq. con salto y giro (EXAGERADO) |
| `ataque_arriba_EP_ual2_1` | Quaternius UAL2 Standard (`Sword_Regular_C [0.45-1.5s]`) | CC0 1.0 | 1.07 s | Ataque ligero arriba | Tajo vertical descendente desde sobre la cabeza (2ª mitad de Regular C) |
| `ataque_arriba_EP_ual2_2` | Quaternius UAL2 Standard (`Sword_Heavy_Combo [2.2-3.5s]`) | CC0 1.0 | 1.33 s | Ataque ligero arriba | Tajo vertical a dos tiempos del combo pesado; más lento y pesado |
| `ataque_abajo_EP_ual2_1` | Quaternius UAL2 Standard (`Sword_Regular_A + Sword_Regular_A_Rec`) | CC0 1.0 | 1.47 s | Ataque ligero abajo | Tajo ascendente desde abajo-derecha (golpe bajo que sube); incluye recuperación |
| `ataque_abajo_EP_ual2_2` | Quaternius UAL2 Standard (`Sword_Heavy_Combo [0.0-1.1s]`) | CC0 1.0 | 1.13 s | Ataque ligero abajo | Giro y tajo ascendente del inicio del combo pesado (revisar: gira el torso) |
| `guardia_neu_EP_ual1_1` | Quaternius UAL1 Standard (`Sword_Idle`) | CC0 1.0 | 1.7 s | Guardia neutra EP (bucle) | Pose de espada en reposo; solo neutra, no hay guardias direccionales |
| `guardia_neu_EE_ual2_1` | Quaternius UAL2 Standard (`Idle_Shield_Loop`) | CC0 1.0 | 2.53 s | Guardia neutra EE (bucle) | Escudo alzado ante el pecho; solo neutra |
| `bloqueo_fro_EP_ual2_1` | Quaternius UAL2 Standard (`Sword_Block`) | CC0 1.0 | 1.27 s | Parada / bloqueo / defensa frontal EP | Encogerse con la espada baja a un lado; 1,23 s, lento para parada (hay que recortar); sirve como bloqueo frontal |
| `bloqueo_imp_EP_ual1_1` | Quaternius UAL1 Standard (`Hit_Chest`) | CC0 1.0 | 0.37 s | Bloqueo normal (impacto) / tambaleo 0,30 EP y EE | Sacudida del torso de 0,33 s; sin cambio de postura |
| `parada_fro_EE_ual2_1` | Quaternius UAL2 Standard (`Shield_OneShot`) | CC0 1.0 | 0.87 s | Parada perfecta / bloqueo / defensa frontal EE | Alza el escudo, aguanta y baja; 0,83 s |
| `contraataque_EP_ual2_1` | Quaternius UAL2 Standard (`Sword_Dash [0.0-0.9s]`) | CC0 1.0 | 0.93 s | Contraataque EP | Paso agachado hacia delante con tajo (primera parte de Sword Dash) |
| `contraataque_EE_ual2_1` | Quaternius UAL2 Standard (`Shield_Dash [0.0-0.55s]`) | CC0 1.0 | 0.57 s | Contraataque EE (golpe de escudo) | Embate con el escudo (primera parte de Shield Dash); sin el tajo posterior |
| `estocada_EP_ual2_1` | Quaternius UAL2 Standard (`Melee_Hook + Melee_Hook_Rec`) | CC0 1.0 | 1.13 s | Habilidad EP: estocada | Avance con brazo extendido hacia delante (originalmente un gancho de puño; con espada lee como estocada baja) |
| `estocada_EP_ual2_2` | Quaternius UAL2 Standard (`Sword_Dash`) | CC0 1.0 | 1.6 s | Habilidad EP: estocada | Zancada larga agachada con la espada al frente; 1,57 s, muy larga |
| `estocada_EP_ual1_3` | Quaternius UAL1 Standard (`Punch_Cross`) | CC0 1.0 | 1.03 s | Habilidad EP: estocada | Directo con la mano derecha (puñetazo): con espada es un pinchazo recto; calidad mediocre |
| `embestida_EE_ual2_1` | Quaternius UAL2 Standard (`Shield_Dash`) | CC0 1.0 | 1.13 s | Habilidad EE: embestida con escudo | Agachado y empuje con el escudo, se incorpora; 1,10 s |
| `remate_EP_ual2_1` | Quaternius UAL2 Standard (`Sword_Heavy_Combo [2.2-3.6s]`) | CC0 1.0 | 1.43 s | Remate humanoide EP (1,30 s) | Tajo vertical pesado a dos manos? (una mano); sin víctima sincronizada |
| `guardia_rota_EE_ual2_1` | Quaternius UAL2 Standard (`Idle_Shield_Break`) | CC0 1.0 | 1.1 s | Guardia rota EE (1,0 s) | El escudo es apartado, tambaleo y recuperación; 1,07 s |
| `tambaleo_EP_ual1_1` | Quaternius UAL1 Standard (`Hit_Chest`) | CC0 1.0 | 0.37 s | Tambaleo 0,30 EP/EE | Reutiliza Hit_Chest |
| `tambaleo_EP_ual1_2` | Quaternius UAL1 Standard (`Hit_Head`) | CC0 1.0 | 0.47 s | Tambaleo EP/EE / guardia rota EP | Sacudida de cabeza hacia atrás; 0,43 s |

## Huecos
- Guardia direccional (izq./der./arriba/abajo) EP y EE: solo hay guardia neutra (UAL no tiene guardias direccionales); habría que derivarlas de poses de ataque o animarlas.
- Parada perfecta y bloqueo con 4 direcciones: solo frontal (`bloqueo_fro_EP`, `parada_fro_EE`). Desvío de flecha con la hoja EP: sin candidata específica.
- Remate EE y remate de jefe (2,4 s): sin candidata; el remate EP es un tajo pesado sin víctima sincronizada.
- Guardia rota EP: solo tambaleos cortos (`tambaleo_EP_*`). `Hit_Knockback` (cae al suelo) descartado por exagerado.
- Exagerados (saltos/giros acrobáticos): `ataque_izq_EP_ual2_3`, `ataque_arriba_EP_ual2_1`, `ataque_abajo_EP_ual2_2`, `remate_EP_ual2_1`.
