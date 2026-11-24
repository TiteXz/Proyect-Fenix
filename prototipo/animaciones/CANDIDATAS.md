# Animaciones candidatas de combate con espada

Fichero: `candidatas.glb` (personaje del soldado de `caballero_soldado.glb` sin armas + 122 clips (24 de combate + 30 de locomoción/esquiva + 68 de magia), ~9,2 MB). Manifiesto: `candidatas.json`.
Regenerar: `python3 -I gen_spec.py <UAL1_Standard.glb> <UAL2_Standard.glb> candidatas_spec.json`,
`blender -b -P retarget_candidatas.py -- <caballero_soldado.glb> candidatas_spec.json candidatas.glb` (escribe también `candidatas.medidas.json`) y
`python3 -I gen_manifiesto.py candidatas_spec.json candidatas.medidas.json candidatas.json`. Los clips de magia (`gen_magia.py`, los añade `gen_spec.py`) se podan después con `NODE_PATH=<node_modules> node podar_magia.cjs sin_podar.glb candidatas.glb` (15,3 -> 9,2 MB; los 54 clips anteriores no cambian) y la tabla de magia se regenera con `python3 -I gen_doc_magia.py candidatas.json CANDIDATAS.md`.

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

## Locomoción y esquiva (añadidas)
Campos nuevos en `candidatas.json`: `categoria` (combate|locomocion|esquiva), `bucle`, `velocidad_ms` (bucles de locomoción: m/s del root en los `*_RM` de Quaternius; el personaje mide lo mismo, no se reescala), `desplazamiento_m` (rodar), `config_escudo`.
Config EE = mismo clip con la pose de brazo izq. de `Idle_Shield_Loop` (UAL2) fijada sobre los huesos del brazo/mano izq. (escudo al frente); el resto del cuerpo igual que EP. `DERIVADO` = no existe en UAL: fundido de 0,4 s entre poses (agacharse entrar/salir) o reproducción inversa (andar atrás, rodar atrás).

| Clip | Original | Duración | Bucle | v (m/s) | Cubre | Notas |
|---|---|---|---|---|---|---|
| `parado_EP_ual1_1` | Idle_Loop | 2.53 s | sí |  | Parado relajado EP | Reposo en bucle, respiración suave |
| `parado_EE_ual1_1` | Idle_Loop | 2.53 s | sí |  | Parado relajado EE | Reposo en bucle, respiración suave (brazo izq. recogido con el escudo al frente) |
| `parado_guardia_EP_ual1_1` | Sword_Idle | 1.7 s | sí |  | Parado en guardia EP | Sword_Idle: peso adelantado, espada en guardia baja |
| `parado_guardia_EE_ual2_1` | Idle_Shield_Loop | 2.53 s | sí |  | Parado en guardia EE | Escudo alzado ante el pecho |
| `andar_adelante_EP_ual1_1` | Walk_Loop | 1.37 s | sí | 0.98 | Andar adelante EP | Paso natural |
| `andar_adelante_EE_ual1_1` | Walk_Loop | 1.37 s | sí | 0.98 | Andar adelante EE | Paso natural (brazo izq. recogido con el escudo al frente) |
| `andar_adelante_EP_ual1_2` | Walk_Formal_Loop | 1.37 s | sí | 0.98 | Andar adelante (formal) EP | Paso erguido y marcial, más solemne |
| `andar_adelante_EE_ual1_2` | Walk_Formal_Loop | 1.37 s | sí | 0.98 | Andar adelante (formal) EE | Paso erguido y marcial, más solemne (brazo izq. recogido con el escudo al frente) |
| `andar_atras_EP_ual1_1` | Walk_Loop (invertido) | 1.37 s | sí | 0.98 | Andar atrás EP | DERIVADO: Walk_Loop en reproducción inversa (no hay marcha atrás en UAL); pies y torso invertidos, leer en el visor |
| `andar_atras_EE_ual1_1` | Walk_Loop (invertido) | 1.37 s | sí | 0.98 | Andar atrás EE | DERIVADO: Walk_Loop en reproducción inversa (no hay marcha atrás en UAL); pies y torso invertidos, leer en el visor (brazo izq. recogido con el escudo al frente) |
| `correr_EP_ual1_1` | Jog_Fwd_Loop | 0.97 s | sí | 5.38 | Correr EP | Trote/carrera ligera |
| `correr_EE_ual1_1` | Jog_Fwd_Loop | 0.97 s | sí | 5.38 | Correr EE | Trote/carrera ligera (brazo izq. recogido con el escudo al frente) |
| `sprint_EP_ual1_1` | Sprint_Loop | 0.7 s | sí | 8.21 | Sprint EP | Carrera a tope, torso inclinado |
| `sprint_EE_ual1_1` | Sprint_Loop | 0.7 s | sí | 8.21 | Sprint EE | Carrera a tope, torso inclinado (brazo izq. recogido con el escudo al frente) |
| `salto_inicio_EP_ual1_1` | Jump_Start | 1.37 s |  |  | Salto: despegue EP | Flexión y impulso |
| `salto_inicio_EE_ual1_1` | Jump_Start | 1.37 s |  |  | Salto: despegue EE | Flexión y impulso (brazo izq. recogido con el escudo al frente) |
| `salto_aire_EP_ual1_1` | Jump_Loop | 2.53 s | sí |  | Salto: en el aire EP | Pose de vuelo en bucle |
| `salto_aire_EE_ual1_1` | Jump_Loop | 2.53 s | sí |  | Salto: en el aire EE | Pose de vuelo en bucle (brazo izq. recogido con el escudo al frente) |
| `salto_aterrizaje_EP_ual1_1` | Jump_Land | 1.3 s |  |  | Salto: aterrizaje EP | Amortiguación y recuperación |
| `salto_aterrizaje_EE_ual1_1` | Jump_Land | 1.3 s |  |  | Salto: aterrizaje EE | Amortiguación y recuperación (brazo izq. recogido con el escudo al frente) |
| `agachado_entrar_EP_ual1_1` | mezcla Idle_Loop -> Crouch_Idle_Loop (0.4 s) | 0.4 s |  |  | Agacharse: entrar EP | DERIVADO: fundido de 0,4 s de Idle_Loop a Crouch_Idle_Loop (UAL no trae transición) |
| `agachado_entrar_EE_ual1_1` | mezcla Idle_Loop -> Crouch_Idle_Loop (0.4 s) | 0.4 s |  |  | Agacharse: entrar EE | DERIVADO: fundido de 0,4 s de Idle_Loop a Crouch_Idle_Loop (UAL no trae transición) (brazo izq. recogido con el escudo al frente) |
| `agachado_salir_EP_ual1_1` | mezcla Crouch_Idle_Loop -> Idle_Loop (0.4 s) | 0.4 s |  |  | Agacharse: salir EP | DERIVADO: fundido de 0,4 s de Crouch_Idle_Loop a Idle_Loop |
| `agachado_salir_EE_ual1_1` | mezcla Crouch_Idle_Loop -> Idle_Loop (0.4 s) | 0.4 s |  |  | Agacharse: salir EE | DERIVADO: fundido de 0,4 s de Crouch_Idle_Loop a Idle_Loop (brazo izq. recogido con el escudo al frente) |
| `agachado_parado_EP_ual1_1` | Crouch_Idle_Loop | 2.97 s | sí |  | Agachado parado EP | Cuclillas en reposo |
| `agachado_parado_EE_ual1_1` | Crouch_Idle_Loop | 2.97 s | sí |  | Agachado parado EE | Cuclillas en reposo (brazo izq. recogido con el escudo al frente) |
| `agachado_andar_EP_ual1_1` | Crouch_Fwd_Loop | 2.03 s | sí | 0.75 | Agachado andando EP | Avance sigiloso agachado |
| `agachado_andar_EE_ual1_1` | Crouch_Fwd_Loop | 2.03 s | sí | 0.75 | Agachado andando EE | Avance sigiloso agachado (brazo izq. recogido con el escudo al frente) |
| `rodar_adelante_EP_ual1_1` | Roll | 1.5 s |  | 4.99 | Voltereta adelante EP | Voltereta completa con root motion; ver notas (puede resultar acrobática) |
| `rodar_atras_EP_ual1_1` | Roll (invertido) | 1.5 s |  | 4.99 | Voltereta atrás EP | DERIVADO: Roll en reproducción inversa |

### Huecos de locomoción y esquiva
- Esquiva corta (paso rápido) en 4 direcciones: UAL no trae ninguna y no hay nada que espejar; sin candidata. Solo existen `rodar_adelante` y `rodar_atras` (inversa). Pendiente de Mixamo (humano) o de animar a mano.
- Strafe izq./der. (andar y correr lateral): no existe en UAL. Rodar izq./der.: no existe.
- Salto en carrera: solo `NinjaJump_*` (acrobático, descartado). Arranque y frenada de carrera: no existen.
- Agacharse entrar/salir: derivados por fundido (suficientes para prototipo).
- `rodar_*` no tiene variante EE (la voltereta no mantiene el brazo recogido); `rodar_adelante` es una voltereta completa algo acrobática (4,99 m de root motion en 1,47 s).
- Los clips son in-place (solo se mueve la pelvis); el avance lo pone el juego/visor con `velocidad_ms`.

<!-- MAGIA:INICIO -->

## Magia: animaciones de lanzamiento (categoria `magia`)

68 clips (34 EP + 34 EE) generados por `gen_magia.py` (receta) + `retarget_candidatas.py` (retarget y ajustes). Base: Quaternius UAL1/UAL2 Standard (CC0 1.0) `Spell_Simple_Enter/Shoot/Exit/Idle_Loop` re-temporizados, con rotaciones aditivas (tronco, brazo, mano, dedos, cadera, piernas) creadas aqui; la mano der. sigue la pose de `Sword_Idle` (la espada no se suelta) y, en EE, el brazo izq. mezcla la pose de `Idle_Shield_Loop` con el gesto.

**Convenciones.** Nombre `magia_<forma>_<variante>_<EP|EE>_<n>`. La magia sale siempre de la mano IZQ. (`mano_lanzadora` = `L`; `ambas` en las fusiones). EP: brazo libre, gesto completo. EE (decision): el escudo va atado al antebrazo, la magia sale por encima del borde; el brazo hace ~65 % del recorrido y mezcla la guardia (peso 0,15-0,6), el tronco y la cadera hacen el gesto completo. Tiempos: `t_disparo` = instante (s) en que sale el hechizo = `t_forma + 0,1 x (piezas - 1)` de DISENO.md (Proyectil 0,4, Area/Zona 0,8, Cono 0,3, Yo 0,5, fusion 0,5/0,9; fusion+Potencia 0,8). `fases` = [inicio, fin] s de anticipacion / activo / recuperacion. Campos del manifiesto: `forma`, `variante`, `elemento` (o `cualquiera`), `piezas`, `modificador`, `inestabilidad` (`estable`->null, `inestable`, `sobrecarga`, `contragolpe`, `fallo`), `config`, `bucle`, `mano_lanzadora`, `t_disparo`, `fases` (+ `t_disparos` en Multiplicar, `desplazamiento_m` en Sobrecarga: la cadera queda 0,30 m atras, root motion).

| Clip | Forma / variante | Elemento | Piezas | Mod. | Inestab. | Mano | t_disparo | Dur. | Bucle | Fases (s) | Nota |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `magia_proyectil_base_EP_1` | proyectil / base | cualquiera | 1 | - | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Empuje de palma: carga con el codo atras y el tronco girado, estira el brazo y abre la mano al salir el hechizo |
| `magia_area_base_EP_1` | area / base | cualquiera | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Arrojar a un punto lejano: el brazo sube atras en arco, el tronco carga y se lanza en zancada marcando el punto con el indice |
| `magia_zona_base_EP_1` | zona / base | cualquiera | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Zona: la mano se alza y baja hasta plantarse abierta en el suelo con la rodilla flexionada |
| `magia_cono_base_EP_1` | cono / base | cualquiera | 1 | - | - | L | 0.3 | 1.23 | no | ant 0.0-0.3 / act 0.3-0.8 / rec 0.8-1.2 | Chorro: brazo extendido, palma abierta; el tronco barre ~60 grados de derecha a izquierda mientras dura el chorro |
| `magia_cono_canalizar_EP_1` | cono / canalizar | cualquiera | 1 | - | - | L | - | 2.1 | si | act 0.0-2.1 | Canalizar el chorro (bucle 2,1 s): brazo extendido, el tronco barre +-26 grados de lado a lado una vez por ciclo y la mano tiembla |
| `magia_yo_base_EP_1` | yo / base | cualquiera | 1 | - | - | L | 0.5 | 1.23 | no | ant 0.0-0.5 / act 0.5-0.8 / rec 0.8-1.2 | Gesto sobre uno mismo: la mano se lleva al pecho y se cierra en puño, el pecho se llena y se abre la mano al formarse el aura |
| `magia_proyectil_fuego_EP_1` | proyectil / fuego | fuego | 1 | - | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Fuego: la mano se abre, agarra (garra) y lanza con un latigazo brusco del tronco y paso adelante |
| `magia_proyectil_hielo_EP_1` | proyectil / hielo | hielo | 1 | - | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Hielo: dedos juntos y rigidos, carga corta y contenida, corte seco con la mano plana; el cuerpo apenas se mueve |
| `magia_proyectil_luz_EP_1` | proyectil / luz | luz | 1 | - | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Luz: la palma sube abierta con el pecho erguido, arco amplio y sereno hacia delante; cabeza alta |
| `magia_proyectil_rayo_EP_1` | proyectil / rayo | rayo | 1 | - | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Rayo: dos dedos extendidos, casi sin carga y un tiron seco; temblor fino de la mano justo antes y tras el disparo |
| `magia_proyectil_tierra_EP_1` | proyectil / tierra | tierra | 1 | - | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Tierra: puno cerrado, el pie der. se alza y pisa al salir el hechizo; la cadera baja y el tronco se inclina con peso |
| `magia_proyectil_sombra_EP_1` | proyectil / sombra | sombra | 1 | - | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Sombra: el brazo cruza el pecho en arco envolvente y se abre en garra; cabeza gacha, movimiento lento y continuo |
| `magia_proyectil_aire_EP_1` | proyectil / aire | aire | 1 | - | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Aire: la mano barre de dentro afuera con el brazo abierto y la muñeca girando; el tronco acompaña el arco |
| `magia_zona_fuego_EP_1` | zona / fuego | fuego | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Fuego: la mano abierta agarra (garra) el aire y lo estampa en el suelo de una palmada brusca |
| `magia_zona_hielo_EP_1` | zona / hielo | hielo | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Hielo: mano plana de dedos rigidos, una pausa tensa y se clava en el suelo de un corte vertical contenido |
| `magia_zona_luz_EP_1` | zona / luz | luz | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Luz: la palma sube al cielo con el pecho abierto y baja serena y amplia hacia el suelo; cabeza alta |
| `magia_zona_rayo_EP_1` | zona / rayo | rayo | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Rayo: el indice apunta al suelo, tiembla un instante y se clava de un tiron seco |
| `magia_zona_tierra_EP_1` | zona / tierra | tierra | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Tierra: el pie der. sube y pisa con peso mientras el puño cae como un martillo; la cadera se hunde |
| `magia_zona_sombra_EP_1` | zona / sombra | sombra | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Sombra: la garra cruza el pecho y arrastra por el suelo en un barrido envolvente y lento, encorvado |
| `magia_zona_aire_EP_1` | zona / aire | aire | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Aire: el brazo barra el suelo de dentro afuera en un arco amplio y la muñeca gira; el tronco acompaña |
| `magia_fusion_proyectil_EP_1` | proyectil / fusion_proyectil | cualquiera | 2 | - | - | ambas | 0.5 | 1.07 | no | ant 0.0-0.5 / act 0.5-0.65 / rec 0.65-1.05 | Fusion (2 piezas): las manos se juntan al centro, se frotan y se separan, y salen a la vez empujando hacia delante |
| `magia_fusion_area_EP_1` | area / fusion_area | cualquiera | 2 | - | - | ambas | 0.9 | 1.63 | no | ant 0.0-0.9 / act 0.9-1.1 / rec 1.1-1.6 | Fusion de area: las manos se juntan y se separan, suben unidas sobre la cabeza y se lanzan hacia delante a la vez |
| `magia_fusion_potencia_EP_1` | proyectil / fusion_potencia | cualquiera | 2 | Potencia | - | ambas | 0.8 | 1.5 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.45 | Fusion cargada (Potencia): las manos se juntan y se aprietan temblando, anticipacion larga y tensa; sale con un empuje mas fuerte |
| `magia_proyectil_multiplicar_EP_1` | proyectil / multiplicar | cualquiera | 1 | Multiplicar | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Multiplicar: el brazo carga cruzado y barre en abanico (~55 grados) abriendo la mano; los 3 proyectiles salen a lo largo del barrido |
| `magia_persistencia_canalizar_EP_1` | proyectil / canalizar | cualquiera | 1 | Persistencia | - | L | - | 2.1 | si | act 0.0-2.1 | Mantener el hechizo (bucle 2,1 s): brazo tenso al frente, hombro algo alzado, dedos en garra y temblor leve de brazo y mano |
| `magia_proyectil_inestable_EP_1` | proyectil / inestable | cualquiera | 1 | - | inestable | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Lanzamiento inestable (I 20-50): el brazo tiembla, la mano se aparta, el hombro sube y la cara se contrae en una mueca de esfuerzo |
| `magia_proyectil_sobrecarga_EP_1` | proyectil / sobrecarga | cualquiera | 1 | - | sobrecarga | L | 0.4 | 1.33 | no | ant 0.0-0.4 / act 0.4-0.6 / rec 0.6-1.3 | Sobrecarga: el exceso de potencia lanza el brazo hacia arriba y atras, el tronco se echa atras y el caballero retrocede medio paso (la cadera queda 0,30 m atras: root motion) |
| `magia_proyectil_contragolpe_EP_1` | proyectil / contragolpe | cualquiera | 1 | - | contragolpe | L | 0.4 | 1.53 | no | ant 0.0-0.4 / act 0.4-0.5 / rec 0.5-1.5 | Contragolpe: el hechizo muerde al lanzador: sacudida de dolor, la mano se recoge al pecho y la otra la sujeta, se encorva y se tambalea con las rodillas flojas |
| `magia_proyectil_fallo_EP_1` | proyectil / fallo | cualquiera | 1 | - | fallo | L | 0.4 | 1.13 | no | ant 0.0-0.4 / act 0.4-0.5 / rec 0.5-1.1 | Fallo / chispazo: el gesto sale entero pero el hechizo se apaga; la mano se sacude, el brazo cae y los hombros se hunden |
| `magia_area_inestable_EP_1` | area / inestable | cualquiera | 1 | - | inestable | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Lanzamiento inestable (I 20-50): el brazo tiembla, la mano se aparta, el hombro sube y la cara se contrae en una mueca de esfuerzo |
| `magia_area_sobrecarga_EP_1` | area / sobrecarga | cualquiera | 1 | - | sobrecarga | L | 0.8 | 1.73 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.7 | Sobrecarga: el exceso de potencia lanza el brazo hacia arriba y atras, el tronco se echa atras y el caballero retrocede medio paso (la cadera queda 0,30 m atras: root motion) |
| `magia_area_contragolpe_EP_1` | area / contragolpe | cualquiera | 1 | - | contragolpe | L | 0.8 | 1.93 | no | ant 0.0-0.8 / act 0.8-0.9 / rec 0.9-1.9 | Contragolpe: el hechizo muerde al lanzador: sacudida de dolor, la mano se recoge al pecho y la otra la sujeta, se encorva y se tambalea con las rodillas flojas |
| `magia_area_fallo_EP_1` | area / fallo | cualquiera | 1 | - | fallo | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-0.9 / rec 0.9-1.5 | Fallo / chispazo: el gesto sale entero pero el hechizo se apaga; la mano se sacude, el brazo cae y los hombros se hunden |
| `magia_sinmana_abortado_EP_1` | cualquiera / sin_mana | cualquiera | 1 | - | - | L | - | 0.57 | no | ant 0.0-0.24 / rec 0.24-0.55 | Gesto abortado: la mano empieza a subir, se cierra en puño y baja; el hechizo no sale (sin t_disparo) |
| `magia_proyectil_base_EE_1` | proyectil / base | cualquiera | 1 | - | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Empuje de palma: carga con el codo atras y el tronco girado, estira el brazo y abre la mano al salir el hechizo |
| `magia_area_base_EE_1` | area / base | cualquiera | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Arrojar a un punto lejano: el brazo sube atras en arco, el tronco carga y se lanza en zancada marcando el punto con el indice |
| `magia_zona_base_EE_1` | zona / base | cualquiera | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Zona: la mano se alza y baja hasta plantarse abierta en el suelo con la rodilla flexionada |
| `magia_cono_base_EE_1` | cono / base | cualquiera | 1 | - | - | L | 0.3 | 1.23 | no | ant 0.0-0.3 / act 0.3-0.8 / rec 0.8-1.2 | Chorro: brazo extendido, palma abierta; el tronco barre ~60 grados de derecha a izquierda mientras dura el chorro |
| `magia_cono_canalizar_EE_1` | cono / canalizar | cualquiera | 1 | - | - | L | - | 2.1 | si | act 0.0-2.1 | Canalizar el chorro (bucle 2,1 s): brazo extendido, el tronco barre +-26 grados de lado a lado una vez por ciclo y la mano tiembla |
| `magia_yo_base_EE_1` | yo / base | cualquiera | 1 | - | - | L | 0.5 | 1.23 | no | ant 0.0-0.5 / act 0.5-0.8 / rec 0.8-1.2 | Gesto sobre uno mismo: la mano se lleva al pecho y se cierra en puño, el pecho se llena y se abre la mano al formarse el aura |
| `magia_proyectil_fuego_EE_1` | proyectil / fuego | fuego | 1 | - | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Fuego: la mano se abre, agarra (garra) y lanza con un latigazo brusco del tronco y paso adelante |
| `magia_proyectil_hielo_EE_1` | proyectil / hielo | hielo | 1 | - | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Hielo: dedos juntos y rigidos, carga corta y contenida, corte seco con la mano plana; el cuerpo apenas se mueve |
| `magia_proyectil_luz_EE_1` | proyectil / luz | luz | 1 | - | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Luz: la palma sube abierta con el pecho erguido, arco amplio y sereno hacia delante; cabeza alta |
| `magia_proyectil_rayo_EE_1` | proyectil / rayo | rayo | 1 | - | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Rayo: dos dedos extendidos, casi sin carga y un tiron seco; temblor fino de la mano justo antes y tras el disparo |
| `magia_proyectil_tierra_EE_1` | proyectil / tierra | tierra | 1 | - | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Tierra: puno cerrado, el pie der. se alza y pisa al salir el hechizo; la cadera baja y el tronco se inclina con peso |
| `magia_proyectil_sombra_EE_1` | proyectil / sombra | sombra | 1 | - | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Sombra: el brazo cruza el pecho en arco envolvente y se abre en garra; cabeza gacha, movimiento lento y continuo |
| `magia_proyectil_aire_EE_1` | proyectil / aire | aire | 1 | - | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Aire: la mano barre de dentro afuera con el brazo abierto y la muñeca girando; el tronco acompaña el arco |
| `magia_zona_fuego_EE_1` | zona / fuego | fuego | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Fuego: la mano abierta agarra (garra) el aire y lo estampa en el suelo de una palmada brusca |
| `magia_zona_hielo_EE_1` | zona / hielo | hielo | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Hielo: mano plana de dedos rigidos, una pausa tensa y se clava en el suelo de un corte vertical contenido |
| `magia_zona_luz_EE_1` | zona / luz | luz | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Luz: la palma sube al cielo con el pecho abierto y baja serena y amplia hacia el suelo; cabeza alta |
| `magia_zona_rayo_EE_1` | zona / rayo | rayo | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Rayo: el indice apunta al suelo, tiembla un instante y se clava de un tiron seco |
| `magia_zona_tierra_EE_1` | zona / tierra | tierra | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Tierra: el pie der. sube y pisa con peso mientras el puño cae como un martillo; la cadera se hunde |
| `magia_zona_sombra_EE_1` | zona / sombra | sombra | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Sombra: la garra cruza el pecho y arrastra por el suelo en un barrido envolvente y lento, encorvado |
| `magia_zona_aire_EE_1` | zona / aire | aire | 1 | - | - | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Aire: el brazo barra el suelo de dentro afuera en un arco amplio y la muñeca gira; el tronco acompaña |
| `magia_fusion_proyectil_EE_1` | proyectil / fusion_proyectil | cualquiera | 2 | - | - | ambas | 0.5 | 1.07 | no | ant 0.0-0.5 / act 0.5-0.65 / rec 0.65-1.05 | Fusion (2 piezas): las manos se juntan al centro, se frotan y se separan, y salen a la vez empujando hacia delante |
| `magia_fusion_area_EE_1` | area / fusion_area | cualquiera | 2 | - | - | ambas | 0.9 | 1.63 | no | ant 0.0-0.9 / act 0.9-1.1 / rec 1.1-1.6 | Fusion de area: las manos se juntan y se separan, suben unidas sobre la cabeza y se lanzan hacia delante a la vez |
| `magia_fusion_potencia_EE_1` | proyectil / fusion_potencia | cualquiera | 2 | Potencia | - | ambas | 0.8 | 1.5 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.45 | Fusion cargada (Potencia): las manos se juntan y se aprietan temblando, anticipacion larga y tensa; sale con un empuje mas fuerte |
| `magia_proyectil_multiplicar_EE_1` | proyectil / multiplicar | cualquiera | 1 | Multiplicar | - | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Multiplicar: el brazo carga cruzado y barre en abanico (~55 grados) abriendo la mano; los 3 proyectiles salen a lo largo del barrido |
| `magia_persistencia_canalizar_EE_1` | proyectil / canalizar | cualquiera | 1 | Persistencia | - | L | - | 2.1 | si | act 0.0-2.1 | Mantener el hechizo (bucle 2,1 s): brazo tenso al frente, hombro algo alzado, dedos en garra y temblor leve de brazo y mano |
| `magia_proyectil_inestable_EE_1` | proyectil / inestable | cualquiera | 1 | - | inestable | L | 0.4 | 0.9 | no | ant 0.0-0.4 / act 0.4-0.55 / rec 0.55-0.9 | Lanzamiento inestable (I 20-50): el brazo tiembla, la mano se aparta, el hombro sube y la cara se contrae en una mueca de esfuerzo |
| `magia_proyectil_sobrecarga_EE_1` | proyectil / sobrecarga | cualquiera | 1 | - | sobrecarga | L | 0.4 | 1.33 | no | ant 0.0-0.4 / act 0.4-0.6 / rec 0.6-1.3 | Sobrecarga: el exceso de potencia lanza el brazo hacia arriba y atras, el tronco se echa atras y el caballero retrocede medio paso (la cadera queda 0,30 m atras: root motion) |
| `magia_proyectil_contragolpe_EE_1` | proyectil / contragolpe | cualquiera | 1 | - | contragolpe | L | 0.4 | 1.53 | no | ant 0.0-0.4 / act 0.4-0.5 / rec 0.5-1.5 | Contragolpe: el hechizo muerde al lanzador: sacudida de dolor, la mano se recoge al pecho y la otra la sujeta, se encorva y se tambalea con las rodillas flojas |
| `magia_proyectil_fallo_EE_1` | proyectil / fallo | cualquiera | 1 | - | fallo | L | 0.4 | 1.13 | no | ant 0.0-0.4 / act 0.4-0.5 / rec 0.5-1.1 | Fallo / chispazo: el gesto sale entero pero el hechizo se apaga; la mano se sacude, el brazo cae y los hombros se hunden |
| `magia_area_inestable_EE_1` | area / inestable | cualquiera | 1 | - | inestable | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.5 | Lanzamiento inestable (I 20-50): el brazo tiembla, la mano se aparta, el hombro sube y la cara se contrae en una mueca de esfuerzo |
| `magia_area_sobrecarga_EE_1` | area / sobrecarga | cualquiera | 1 | - | sobrecarga | L | 0.8 | 1.73 | no | ant 0.0-0.8 / act 0.8-1.0 / rec 1.0-1.7 | Sobrecarga: el exceso de potencia lanza el brazo hacia arriba y atras, el tronco se echa atras y el caballero retrocede medio paso (la cadera queda 0,30 m atras: root motion) |
| `magia_area_contragolpe_EE_1` | area / contragolpe | cualquiera | 1 | - | contragolpe | L | 0.8 | 1.93 | no | ant 0.0-0.8 / act 0.8-0.9 / rec 0.9-1.9 | Contragolpe: el hechizo muerde al lanzador: sacudida de dolor, la mano se recoge al pecho y la otra la sujeta, se encorva y se tambalea con las rodillas flojas |
| `magia_area_fallo_EE_1` | area / fallo | cualquiera | 1 | - | fallo | L | 0.8 | 1.53 | no | ant 0.0-0.8 / act 0.8-0.9 / rec 0.9-1.5 | Fallo / chispazo: el gesto sale entero pero el hechizo se apaga; la mano se sacude, el brazo cae y los hombros se hunden |
| `magia_sinmana_abortado_EE_1` | cualquiera / sin_mana | cualquiera | 1 | - | - | L | - | 0.57 | no | ant 0.0-0.24 / rec 0.24-0.55 | Gesto abortado: la mano empieza a subir, se cierra en puño y baja; el hechizo no sale (sin t_disparo) |

**Matiz por elemento (Proyectil y Zona, EP y EE).** Fuego: mano abierta que agarra (garra) y lanza, brusco, paso adelante. Hielo: dedos juntos y rigidos, carga corta, corte seco, cuerpo quieto. Luz: palma alzada, pecho erguido, arco amplio y sereno, cabeza alta. Rayo: dos dedos/indice, casi sin carga, tiron seco con temblor fino. Tierra: puño y pisoton del pie der. con peso, cadera hundida. Sombra: gesto envolvente que cruza el pecho, mano en garra, cabeza gacha, lento. Aire: barrido abierto del brazo con giro de muñeca y el tronco acompañando.

**Inestabilidad (Proyectil y Area).** `inestable` (I 20-50): temblor de brazo/mano, la mano se aparta, hombro alzado y mueca. `sobrecarga`: retroceso fuerte del brazo hacia arriba, tronco atras, medio paso atras. `contragolpe`: sacudida de dolor, la mano se recoge al pecho y la otra la sujeta, encorvado y tambaleo. `fallo`: el gesto sale pero el hechizo se apaga, mano sacudida y brazo caido. `magia_sinmana_abortado`: gesto abortado (mano que sube, se cierra y baja) para sin maná o en recarga.

**Huecos / limites.** Sin IK de pies (la zancada de Sobrecarga y la flexion de rodillas de Zona/Tierra pueden deslizar los pies unos cm); el contragolpe en EP/EE lleva la mano de la espada al pecho (la espada se inclina, no se suelta); los dedos son aditivos sobre la mano relajada del clip base (el pulgar es aproximado); fusion EE: el brazo del escudo solo acompaña ~65 %. Elementos solo para Proyectil y Zona; Area, Cono y Yo son genericos.

<!-- MAGIA:FIN -->
