# VFX de magia (maqueta, fase 2): especificación visual realista

Ámbito: `prototipo/maqueta.src.html` (three.js r147, HDR + bloom + ACES) y `prototipo/vfx/vfx.js`. Sin texturas
externas: todo procedural (shader o canvas generado al arrancar). Elementos según `docs/COMBATE.md` §2.4:
**Fuego, Hielo, Luz, Rayo, Tierra, Sombra, Aire** (no hay Agua; "Mojado" no existe, ver Estados).
Tono: fantasía realista luminosa. Referencias de sensación, no se copia nada.

## 0. Diagnóstico de las capturas actuales (qué falla)
- Bolas de fuego y explosión: blob amarillo plano y saturado, sin núcleo blanco ni gradiente; parece sprite.
- Proyectil de fuego: puntos naranja sueltos, sin humo ni calor; la estela son partículas discretas, no continua.
- Escarcha: anillo azul uniforme y nítido (glow plano) y cristales poligonales sin refracción ni translucidez.
- Columna de luz: gradiente vertical liso, sin rayos volumétricos ni polvo; borde recto.
- Círculos de runas: neón de línea gruesa, brillan más que el entorno y no se apoyan en el suelo.
- Ninguno ilumina el entorno de forma creíble (rocas no reciben luz coloreada con parpadeo); sin humo, sin decals.
- Bandas visibles en el halo del bloom (escalones de oscuridad): añadir dithering/ruido al final (ver 1.9).

## 1. Técnicas comunes (aplican a todo; implementar una vez en la biblioteca)
1. **Soft particles:** renderizar la escena opaca a un `WebGLRenderTarget` con `depthTexture` (reutilizable si ya
   existe para el postproceso). En el fragment: `a *= saturate((sceneDepth - fragDepth) * k)` con k = 1/0,4 m. Elimina
   los bordes duros donde la nube corta el suelo y las rocas. Con humo/vapor usar k = 1/1,2 m.
2. **Flipbook procedural:** generar al inicio en canvas/RT un atlas 4x4 (512 px/celda máx. 1024x1024 total) de
   ruido fBm de 5 octavas con dominio deformado (warp), una variante "humo", otra "llama" y otra "nube". Nada de
   círculos radiales: la silueta de cada partícula debe ser irregular. Mezclar dos frames consecutivos
   (`mix(frameA, frameB, frac)`) y rotar la UV por partícula (rotación aleatoria + giro lento).
3. **Erosión por umbral (dissolve):** alfa = `smoothstep(t, t+0.15, noise)` donde `t` crece con la edad. El borde
   se consume irregular en vez de desvanecerse en alfa uniforme. Es la técnica clave de realismo en fuego y humo.
4. **Curvas de vida (por partícula):** tamaño `s(t)`, alfa `a(t)`, color `c(t)` y velocidad con arrastre (`v*=exp(-k dt)`).
   Todo por atributos + uniformes, sin cambiar de material. Flotabilidad en gases calientes (+0,5..2 m/s²).
5. **Color HDR y desaturación:** el color no se pinta con tono puro: la energía va en luminancia (valores >1) y el
   tono emerge del tonemapper (ACES desatura a blanco cálido al subir). Núcleo = blanco-amarillo ≥ 6, borde =
   naranja/rojo ≤ 1. Prohibido RGB saturado plano con luminancia ≤ 1.
6. **Humo con iluminación:** el humo es **NormalBlending** (premultiplicado), no aditivo. Color = albedo gris cálido
   x (ambiente + luz del hechizo con `1/d²` sobre el centro de la nube + luz direccional del sol). Autosombreado
   barato: oscurecer según la densidad de ruido (`1 - 0.5*noise`) y el lado opuesto a la luz.
7. **Luz dinámica con parpadeo:** usar el **pool fijo** de PointLights (`flashes`, hoy 3). Subir a **4 luces**
   máx. (nunca crear/destruir luces; intensidad 0 = apagada). Parpadeo: `I = I0 * (0.75 + 0.25*n1(t*14) + 0.15*n1(t*37))`
   con ruido 1D barato; color de la luz = color medio del efecto (no el del núcleo). Asignación por prioridad:
   la más cercana a cámara/jugador gana; las demás se fusionan (promedio ponderado de posición).
8. **Heat haze / refracción:** un quad (o malla de cono) con material que lee el color de pantalla (RT copia del frame
   antes del bloom, `uScene`) y desplaza UV por `(noise(uv*8 + t) - .5) * 0.012 * mask`. Máscara = suave y
   proporcional a la temperatura. Solo en presets Medio+ y máx. 2 simultáneos.
9. **Dither de salida:** sumar ruido azul/IGN (±0.5/255) antes de cuantizar para eliminar las bandas visibles del bloom.
10. **Escala física:** llama de antorcha 0,3 m; bola de fuego del jugador 0,35..0,5 m radio; explosión de 2,5 m (radio
    de §2.4) alcanza su máximo a 0,25 s y el humo sigue 2..3 s; el rayo mide ~2..4 cm de núcleo visible. Partículas
    pequeñas y numerosas (0,05..0,4 m), no 3 sprites gigantes.
11. **Chispas con estela:** `THREE.LineSegments`/quads estirados en dirección de la velocidad (longitud = |v|*0.04),
    gravedad real (9,8 m/s²), rebote en el suelo con amortiguación, color HDR 4..8 que cae a 0,3 en 0,4..1 s
    (enfriamiento: blanco -> amarillo -> naranja -> rojo oscuro).
12. **Decals de suelo:** quad horizontal con polygonOffset, soft edge por ruido, **NormalBlending** multiplicativo en
    oscuro (quemadura, hollín) o con brillo emisivo que decae (brasas). Pool de 12 decals, el más viejo se recicla,
    fade en 8..20 s según el elemento.
13. **Evitar globalmente:** colores saturados planos, sprites radiales con borde visible, halo uniforme, aditivo para
    humo, partículas del mismo tamaño y fase, simetría perfecta, brillo constante (todo respira y parpadea).

## 2. Presupuesto global (maqueta)
| Preset | Partículas totales vivas | Luces dinámicas | Haze/refracción | Soft particles | Decals |
|---|---|---|---|---|---|
| Bajo | 600 | 2 | no | no (fade por distancia) | 4 |
| Medio | 1500 | 3 | 1 | sí | 8 |
| Alto | 3000 | 4 | 2 | sí | 12 |
| Ultra | 5000 | 4 | 2 + distorsión en explosión | sí | 12 |

- Una sola `Points`/`InstancedMesh` por material (aditivo, humo, chispas): **≤ 6 draw calls** de VFX en total
  sin contar anillos de runas (1 draw call cada uno, ≤ 3 visibles) ni rayos (1 por arco).
- Memoria: atlas de ruido 1024x1024 RGBA8 = 4 MB; RT de copia de pantalla solo si hay haze. Sin otros assets.
- Medir con `renderer.info` (calls, triangles, textures) antes y después; el coste en GPU manda más que el de CPU:
  vigilar fill-rate con nubes grandes (limitar a 25 % de pantalla por capa; reducir resolución del humo a 0,5x en Bajo).

## 3. Runa / círculo de conjuro (común)
Objetivo: **grabado y sutil**, no neón. El círculo es un fenómeno de luz sobre el suelo, no una pegatina.
- Dibujo en canvas procedural 1024 px: líneas finas (2..3 px), serifa tipo inscripción, 2 anillos concéntricos,
  poca densidad de glifos; añadir imperfecciones (jitter de trazo 0,5 px, grosor variable, trazos rotos).
- Material: se proyecta con la normal/AO del suelo (modula con el albedo del terreno), **no aditivo puro**:
  `emisión = runa * color * intensidad` con intensidad HDR 0,8..2,5 (nunca > 3) + un tenue relleno oscuro
  (`multiply 0.85`) bajo la runa que parece grabado o quemado.
- Animación: aparece por barrido radial con ruido (0,4 s), brilla en pulsos lentos (0,5 Hz, ±15 %), el giro es lento
  (≤ 8 °/s) y solo del anillo exterior; se apaga por erosión. Vida = duración de la carga. Sin glow radial extra.
- Color por elemento (HDR, ver tabla). Partículas de polvo/chispas que se desprenden del trazo (12 máx.).
- Evitar: línea de 6 px blanca, bloom que sature el trazo, círculo plano flotando sobre el suelo sin sombra.

## 4. Los 7 elementos
Notación: P = partículas pico, L = luces del pool, D = duración. Colores en RGB lineal HDR (valores >1 = emisión).

### 4.1 Fuego (cálido, el más importante de acertar)
- Paleta: núcleo (6, 4.5, 2.2); cuerpo (3, 1.1, 0.25); borde (1.2, 0.2, 0.04); brasa (2, 0.3, 0.05) cae a (0.3,0.03,0.01);
  humo albedo (0.12, 0.10, 0.09) x iluminación. Runa: (1.8, 0.7, 0.2).
- **Proyectil** (P 120, L 1, haze 1): núcleo como una esfera de ~0,25 m con ruido que rota + 3..4 "lenguas"
  (quads estirados en la dirección contraria al movimiento con flipbook de llama) + estela de brasas con gravedad y
  humo tenue que se queda en el aire (NormalBlending, 1,5 s). Luz naranja que parpadea y barre las rocas al pasar.
- **Explosión** (radio 2,5 m; P 260, L 1; D 2,5 s): (1) destello blanco 0,08 s con luz 6x; (2) bola de fuego de
  8..12 puffs de flipbook que crece rápido y se enfría (blanco -> naranja -> rojo); (3) onda de choque: anillo
  de refracción fino en Alto+ (distorsión radial 0,03); (4) humo negro-pardo ascendente con dissolve; (5) 40 chispas
  con estela; (6) decal de quemadura 3 m con brasas que se enfrían en 12 s.
- **Zona persistente** (suelo en llamas, 4 daño/s): P 90, L 1 tenue; D = según hechizo. Llamas bajas (0,4..1 m) con
  erosión, 1 humo cada 0,3 s, decal de hollín creciente. La zona termina por extinción irregular, no de golpe.
- **Cono/chorro** (lanzallamas): P 200; partículas de alta velocidad con arrastre y expansión (`s` x 3), flotabilidad;
  luz pegada al punto medio del cono; haze fuerte tras el borde.
- **Aura propia**: P 40, L 0; llama baja sobre el antebrazo/espalda y brasas ascendentes. Calor visible (haze suave).
- Evitar: bola amarilla plana, núcleo sin blanco, humo aditivo, chispas todas iguales.

### 4.2 Hielo (translúcido, frío, refractivo)
- Paleta: cristal fondo (0.35, 0.8, 1.4) con Fresnel hacia (1.2, 2.2, 3); aristas blancas (3,3.5,4); niebla fría (0.5,0.7,0.9);
  runa (0.5, 1.2, 2.2).
- Cristales: no poliedros planos; **mallas icosaédricas deformadas** con material `MeshPhysicalMaterial` (transmisión
  falsa: Fresnel + `matcap` procedural + `envMap` de la maqueta + normal ruidosa grano de hielo; `transmission` real solo en
  Ultra y con 1..3 cristales). Interior con ruido de fractura (grietas blancas finas) y SSS falso (brillo por Fresnel inverso).
- **Proyectil** (P 80, L 1): lanza de cristal (cono alargado, 0,5 m) + polvo de hielo con destellos y niebla fría que cae
  hacia el suelo (el aire frío pesa). **Explosión/área** (P 150, L 1; D 1,8 s): estallido de fragmentos con gravedad y
  rebote (24 trozos), niebla baja que se expande en el suelo, chispas azules brillantes tipo glitter (twinkle por hash).
- **Zona**: placa de hielo en el suelo con decal (Fresnel + grietas + reflejos de pantalla del cielo, rugosidad 0,1);
  los bordes crecen con un frente fractal (0,6 s); niebla rastrera (P 30). Persiste hasta el final con sublimación.
- **Cono**: aliento helado = humo azul claro con cristales diminutos (partículas 0,02 m, brillo por ángulo), sin color neón.
- **Aura**: escarcha creciendo en el borde del equipo (shader en la pose: máscara de ruido sobre normal) + vaho exhalado.
- Evitar: azul cian saturado plano, anillo de glow uniforme, cristales opacos mates.

### 4.3 Luz (sagrado)
- Paleta: núcleo (5, 4.4, 3); haz (2.4, 1.9, 1.1); polvo (1.8, 1.5, 0.9); runa (1.6, 1.3, 0.8). Siempre cálido-dorado, nunca blanco azulado.
- **Proyectil** (P 60, L 1): núcleo muy pequeño y brillante (0,12 m) con flare anamórfico fino (2 rayos en cruz, sutiles),
  motas de polvo que se quedan flotando y brillan al dejar de ser iluminadas. **Haz rápido**: cuerda de luz.
- **Explosión/área** (P 120, L 1; D 1,2 s): anillo de luz que se expande con ruido angular (rayos radiales variables, no
  uniformes) + 60 motas que ascienden con deriva.
- **Columna** (actual): sustituir el gradiente por **cortina volumétrica falsa**: cilindro abierto con 3 capas de ruido
  vertical que se desplazan en direcciones distintas, soft depth, fade en el borde por Fresnel (sin bordes rectos), y
  polvo iluminado ascendente. Anchura 1,5 m con bordes difusos; luz del pool dorada intensa.
- **Zona consagrada**: suelo con filigrana (runa grabada tenue) y motas ascendentes lentas, pulso suave de 0,4 Hz.
- **Aura**: "nimbo": gradiente muy tenue detrás del personaje + motas; evitar halo uniforme.
- Evitar: blanco quemado sin gradiente, columna lisa de bordes duros, bloom enorme.

### 4.4 Rayo (rápido, nítido, inestable)
- Paleta: núcleo (8, 8, 10) casi blanco; halo (0.9, 1.4, 3) azul violáceo; chispa (3,3,4).
  Runa (0.7, 1.0, 2.0).
- **Rayo/cono** (en `rayos.js`): polilínea fractal (midpoint displacement, 5 niveles) con ramas secundarias (2..4 de
  hasta 40 % de longitud). Ribbon de 2 capas: núcleo de 3 cm + halo de 25 cm con alfa baja. **Re-generar la forma a 20..30 Hz**
  (jitter temporal) y variar el brillo por frame (flashes irregulares: 1 frame brillante, 2 débiles).
- Luz del pool con **ráfagas** (intensidad aleatoria 0..8 por frame, D total 0,18 s): ilumina el entorno como un flash
  y deja imagen residual breve (post-brillo 0,1 s).
- **Proyectil** (P 40, L 1): esfera de plasma inestable de 0,2 m con arcos cortos a su alrededor (3 arcos de 0,3 m que
  saltan al azar) y chispas. **Explosión** (P 70; D 0,35 s): destello, múltiples arcos radiales que tocan el suelo, 30 chispas,
  decal de quemadura pequeña (hollín radial, 1,2 m) y ozono (humo muy tenue).
- **Zona (charco eléctrico)**: arcos pequeños sobre el suelo (aleatorios, cortos, 0,4 s), brillo reflejado en el suelo mojado
  no existe: usar luz azul pulsante a 8..12 Hz irregular.
- **Aura**: 4..6 arcos cortos que saltan entre el cuerpo y el equipo; micro luz. **Cadena**: rayo con retardo de 0,06 s por salto.
- Evitar: rayos con línea gruesa constante, color azul saturado (debe ser casi blanco), sin parpadeo.

### 4.5 Tierra (pesado, polvoriento, roca)
- Paleta: roca (0.18, 0.15, 0.12) sin emisión (material PBR, rugosidad 0,9); polvo (0.35, 0.28, 0.2) iluminado;
  runa (1.0, 0.7, 0.3) ocre apagado.
- Fragmentos: **mallas de roca low-detail pero con normales de ruido triplanar** (tamaño 0,1..0,6 m), con rotación
  pesada y rebote con rozamiento; comparten el material de las rocas de la escena. 12..20 piezas instanciadas.
- **Proyectil** (P 90): bloque rocoso con estela de polvo y gravilla que cae. **Explosión/área** (P 140; D 3 s): erupción
  del suelo (fragmentos), nube de polvo NormalBlending soft, que se expande con arrastre y se posa lentamente; decal de
  grietas radiales + cráter ligero (normal map procedural). Sacudida de cámara 0,15 s.
- **Zona (pinchos, fragmentos 4 s)**: pinchos que emergen con desplazamiento y tierra suelta; polvo en la base; desaparecen
  hundiéndose, no desvaneciéndose.
- **Cono**: avalancha de gravilla con polvo. **Aura**: capa de piedras flotando a poca distancia (3..5), polvo ligero.
- Evitar: tierra emisiva, polvo aditivo, rocas lisas y brillantes.

### 4.6 Sombra (necrótico, sustractivo)
- Paleta: oscuridad (0.01, 0.005, 0.02) con **borde** (0.6, 0.2, 1.0) tenue por Fresnel, solo en el contorno. Runa (0.5, 0.2, 0.9) apagada.
- Técnica: humo **oscuro NormalBlending** que **absorbe** luz (más que emitir): `color = ambiente * 0.1` con un tenue
  borde violeta y trazas de ceniza. Opcional: reducir la luz cercana (un "anti-light": luz negativa no es posible, así que
  bajar `intensity` de la luz del pool más cercana un 30 % mientras esté activo, volver al terminar).
- **Proyectil** (P 70, L 0): masa de humo oscuro con ojos de distorsión (haze) y jirones. **Explosión** (P 100; D 2 s):
  nube que se contrae primero (0,15 s, succión) y luego se expande. **Zona/penumbra**: niebla oscura rastrera con
  motas que caen. **Cono**: oscuridad que avanza con volutas. **Aura**: sombra alrededor de los pies que reduce el brillo.
- Evitar: negro total plano, púrpura neón, partículas aditivas.

### 4.7 Aire (invisible: se ve por lo que mueve)
- Paleta: apenas color (0.9, 0.95, 1.0) con alfa 0,05..0,15; polvo/hojas del entorno.
- **Proyectil/ráfaga** (P 80, haze 1): **distorsión por refracción** (lo principal), líneas de viento (ribbons finos
  espirales, alfa baja con estela), polvo, hojas y brizna de hierba arrastrados. **Explosión** (P 100; D 1 s): onda de
  presión en anillo (refracción) que levanta polvo y hojas, inclina la hierba cercana (viento en el shader de la hierba).
- **Zona (corriente)**: remolinos largos en espiral (ribbons de 4..6 vueltas) con polvo visible, 30 P. **Cono**: ráfaga
  con distorsión + polvo. **Aura**: cinta de viento orbitando lenta, ropa y cabello se agitan (parámetro de viento).
- Evitar: ondas blancas semitransparentes tipo cartoon, círculos de "swoosh" opacos, líneas de velocidad en 2D.

## 5. Estados sobre enemigos (VFX en el cuerpo; ≤ 24 partículas por enemigo, máx. 4 enemigos con VFX completo)
| Estado | Técnica |
|---|---|
| Ardiendo | Llamas bajas ancladas a huesos/malla (flipbook, 20 P), humo oscuro, material con emisión en rojo por ruido (grietas calientes), chispas ocasionales; luz del pool solo si es el más cercano. Termina con humo. |
| Escarcha / Congelado | Capa de hielo sobre el albedo (shader con máscara de ruido que crece del suelo hacia arriba), Fresnel azul, escarcha en el borde; Congelado: la animación se pausa, brillo cristalino, rugosidad 0,1, vaho. Al romper, estalla en fragmentos. |
| Iluminado | Contorno cálido fino (rim por Fresnel, 1,5 HDR) + motas de polvo. Revela: silueta visible a través de obstáculos con alfa baja. |
| Cargado / Aturdido | 2..3 arcos cortos y erráticos entre extremidades (20 Hz); Aturdido: temblor visual y destellos. |
| Lastrado / Derribado | Polvo en los pies, rocas pegadas al cuerpo; hundimiento ligero. |
| Maldito | Contorno oscuro con humo que sale del cuerpo y deriva hacia el lanzador (hilos finos). |
| Desequilibrado | Distorsión de viento en las piernas, polvo y desvío de la capa. |
| Mojado | No existe en §2.4. Si se quisiera, tratarlo como un material PBR más oscuro y reflectante (rugosidad 0,2, albedo x0,7) y gotas; **fuera de alcance** hasta que COMBATE.md lo defina. |
Regla: un estado = máx. 1 capa de shader + 1 emisor pequeño. Combinar con la reacción activa al instante (sin duplicar luces).

## 6. Reacciones de fusión (5 prioritarias, §2.5)
Mezclar los dos lenguajes visuales; la reacción siempre es **más brillante y breve** que cada elemento (0,3..1,5 s).
1. **Vapor (Fuego+Hielo, #1):** nube blanca-gris NormalBlending (soft, iluminada, 80 P, D 3,5 s) que crece a 4 m, con
   flash cálido inicial (luz 3x durante 0,1 s) y silbido de vapor a presión (chorro vertical corto). Haze fuerte
   sobre la nube; los bordes se disipan por dissolve. Si el objetivo estaba Congelado: x2 (trozos de hielo que se evaporan).
   Evitar: nube blanca opaca sin volumen, circular.
2. **Magma (Fuego+Tierra, #4):** charcos de lava: decal emisivo con ruido de Voronoi + costra oscura; la grieta brilla
   (4, 1.2, 0.2) y la costra (0.1,0.05,0.03). 5 s, 50 P (brasas y salpicaduras con gravedad y arrastre), humo bajo. Luz naranja baja.
   Al enfriarse, la emisión decae lentamente, la costra gana peso. Inmoviliza: la costra sube por las piernas.
3. **Incendio (Aire+Fuego, #16, "fuego avivado por viento"):** las llamas se inclinan en la dirección del viento y se
   estiran (x2 de altura, turbulencia mayor), lluvia de brasas ascendentes que viajan 5..8 m, humo en jirones. Salta a
   los enemigos a 4 m con una lengua de fuego que cruza el aire (arco de brasas). 150 P, 1 luz con parpadeo rápido.
4. **Cellisca (Aire+Hielo, #17, "ventisca"):** zona móvil de nieve granulada horizontal (150 P, alargadas en velocidad),
   niebla baja blanquecina, ráfagas visibles (ribbons), visibilidad reducida (niebla local con `fogDensity` temporal
   sobre el jugador). Luz fría y apagada (0.5, 0.7, 1.0). Cristales de escarcha en el cuerpo del objetivo.
5. **Tempestad (Aire+Rayo, #19; "tormenta eléctrica"):** nube oscura sobre la zona (humo oscuro con luz interior: pulsa en el
   interior con cada rayo, 2..3 flashes por segundo), rayos al azar con ráfagas de luz (pool), viento en la hierba y polvo.
   El enemigo recibe empuje con onda de distorsión. Alternativa barata: Escarcha eléctrica (#7), cadena de rayos azules sobre cristales.
Evitar en todas: mezclar dos efectos opacos sin interacción; aditivo en toda la nube; luz persistente alta.

## 7. Checklist de aceptación (para el programador y el QA visual)
- [ ] Ningún borde duro de sprite ni de nube contra el suelo (soft particles activos o fade en el borde).
- [ ] Los efectos de fuego y rayo iluminan el entorno cercano con parpadeo; las rocas cambian de color.
- [ ] Núcleos blancos (HDR ≥ 4) con borde coloreado, nunca color uniforme; sin halo radial uniforme.
- [ ] Humo en NormalBlending, con iluminación; sin bandas en el bloom (dither).
- [ ] Runas finas, grabadas, intensidad ≤ 2,5, giro ≤ 8 °/s.
- [ ] Respetar presupuesto de §2; `renderer.info.render.calls` crece ≤ 6 por efectos y 0 luces nuevas.
- [ ] Capturas por efecto en `prototipo/vfx/capturas/` (fuego, hielo, rayo, luz, tierra, sombra, aire, 5 reacciones) en noche y día.
