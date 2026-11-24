# Referencias de sensación: animación de combate cuerpo a cuerpo

Solo referencia de **sensación** (principios, órdenes de magnitud, descripciones). No se copia ningún dato de animación, captura ni asset.
Fecha de la investigación: 2026-11-24.

## 0. Honestidad sobre las fuentes (leer primero)
- **Casi no existe frame data publicado** de ninguno de los tres juegos (ni charlas GDC con tiempos de ataque, ni datamining fiable).
  Lo cuantitativo que aparece abajo es: (a) un dato de la comunidad (ventana de contraataque de Witcher 3) y (b) **estimaciones mías**
  a partir de lo que describen las fuentes, marcadas `[EST]`. Deben validarse en playtest o con vídeo cuadro a cuadro.
- En esta sesión **no se pudo abrir ninguna página** (WebFetch falló: `gameinformer.com`, `gamesradar.com` sin resolver; hay que permitir
  esos dominios en la red de la sesión para profundizar). Todo se basa en **resúmenes de resultados de búsqueda**, no en lectura completa.
- **Dawnwalker sí tiene información pública** (se lanzó previsto el 3-sep-2026; hay previews y guías), pero casi toda es cualitativa.
- No se encontró ni verificó ningún enlace directo a vídeo de YouTube; en la sección 6 hay páginas con vídeo y **búsquedas de YouTube** (marcadas).

## 1. The Blood of Dawnwalker (Rebel Wolves)
**Filosofía.** Combate de espada **direccional de 4 direcciones** con base de ataque / bloqueo / parada, pensado para no dejar "desconectado"
al jugador ([Game Informer, preview](https://www.gameinformer.com/preview/2026/06/03/how-the-combat-hopes-to-keep-you-immersed-in-the-action)).
Técnicas **medievales** en vez de la influencia japonesa de Witcher 3, con espadachines entrenados en el equipo
([GamesRadar](https://www.gamesradar.com/games/rpg/ex-witcher-3-devs-new-vampire-rpg-the-blood-of-dawnwalker-features-combat-that-feels-authentic-because-they-studied-medieval-fighting-styles-and-even-have-a-few-trained-swordsmen-on-the-team/)).
Mocap con el coordinador de especialistas M. Kwiatkowski / Alpha 7 (el de Geralt), con **mucho retoque de animadores** tras la captura
([GamesRadar](https://www.gamesradar.com/games/open-world/ex-witcher-3-devs-studied-medieval-fighting-styles-and-even-have-a-few-trained-swordsmen-to-really-nail-blood-of-dawnwalkers-melee-combat);
[Bandai Namco](https://www.bandainamcoent.com/news/the-blood-of-dawnwalker-gameplay-revealed)). Descrito como golpes de espada "pesados"
([Geek Culture](https://geekculture.co/?p=333912)). Una crítica de preview apunta algo de **repetición** de animaciones y patrones
([Wccftech](https://wccftech.com/blood-of-dawnwalker-beyond-witcher-influence/amp/)).
**Defensa.** Un icono de escudo sobre el objetivo indica la dirección entrante; pulsar bloqueo cuando se pone naranja = **parada** (sin coste de aguante);
mantener bloqueo gasta aguante; bloqueo omnidireccional como opción fácil con más gasto. Ataques con **calavera roja** = imbloqueables: esquivar de lado o atrás;
esquiva de lado justo antes del impacto = **esquiva perfecta** gratis que abre ventana de contraataque
([Method.gg](https://www.method.gg/the-blood-of-dawnwalker/the-blood-of-dawnwalker-combat-explained-directional-duels-vampire-powers-and-how-it-all-works)).
**Remates.** Ataques, bloqueos y paradas cargan "cargas de activación" que alimentan hexes, poderes y remates/ejecuciones.
**Tiempos.** Sin cifras públicas. `[EST]` ventana de parada tipo "icono naranja" ≈ 0,2-0,3 s (coherente con nuestros 200-250 ms).
**Telegrafiado.** Iconografía + pose de anticipación larga y legible; la dirección es el dato clave (justo nuestro diseño).

## 2. The Witcher 3: Wild Hunt (CD Projekt Red)
**Filosofía.** Estilo "baile" de espadachín, vistoso más que realista ([Early Game](https://earlygame.com/news/gaming/fighting-like-a-dancer-why-geralt-has-an-unrealistic-but-beautiful-combat-style)).
Mocap con el espadachín/especialista Kwiatkowski ([Game Informer 2013](https://www.gameinformer.com/b/features/archive/2013/02/22/capturing-the-animations-and-combat-for-the-witcher-3-wild-hunt.aspx);
[Gamepressure](https://www.gamepressure.com/editorials/there-would-be-no-geralt-without-him-maciej-kwiatkowski-on-the-ar/z177c)).
Muchísimo material: ~16.000 animaciones únicas en el juego (charla GDC de S. Kalemba citada por prensa; no es solo combate).
Crítica recurrente: animación "simplificada", más "batear" que esgrima en algunos momentos.
**Ataques.** Rápido y fuerte: el fuerte tiene anticipación visible y puede ser interrumpido por un rápido enemigo; si atacas pronto quedas **encerrado**
en la animación y no puedes esquivar un AOE ([Fextralife](https://thewitcher3.wiki.fextralife.com/Combat); [Prima](https://primagames.com/eguides/the-witcher-3-wild-hunt-eguide/getting-started/witcher-training/melee-combat-swordplay-and-unarmed)).
Mucho **desplazamiento/giro** de cuerpo en cada golpe (pasos, pivotes) que persigue al objetivo (magnetismo). `[EST]` ligero ≈ 0,5-0,7 s totales.
**Defensa.** Parada = mismo botón que bloqueo, pulsado justo al llegar el golpe; éxito abre contraataque. Un mod de comunidad cita una ventana de
contraataque de **0,4 s = 24 frames a 60 fps** por defecto ([Nexus](https://www.nexusmods.com/witcher3/mods/5800/); dato de mod, no oficial).
Esquiva corta (paso) para ataques normales; rodar para áreas. Fuentes discrepan en los i-frames (sin i-frames salvo habilidad "Fleet Footed" según una guía).
**Remates.** Finishers en cámara lenta al matar al último enemigo (más variantes en un DLC gratuito; [GamesRadar](https://www.gamesradar.com/uk/witcher-3-finishers-dlc)).
**Game feel.** Cámara lenta en remates, reacciones de golpe diferenciadas, telegrafiado por anticipación del monstruo.

## 3. Star Wars Jedi: Fallen Order (Respawn)
**Filosofía.** "Combate reflexivo": el sable **no es una espada ni un bate**, no puedes machacar; defensa activa de inspiración Souls/Sekiro
con **postura** ([GamesRadar](https://www.gamesradar.com/looks-like-star-wars-jedi-fallen-order-has-a-sekiro-style-posture-system);
[Twinfinite, J. De Heras](https://twinfinite.net/2019/10/star-wars-jedi-fallen-order-interview-devs-talk-combat-design-difficulty-creating-new-characters-more/);
[PC Gamer](https://www.pcgamer.com/uk/star-wars-is-for-everyone-how-fallen-order-adds-difficulty-options-to-dark-souls-inspired-combat)).
Animación **física** (simulación mezclada con animación autoral) para reacciones y poderes
([GDC 2020, B. Waszak](https://80.lv/articles/gdc-2020-talk-on-physical-animation-in-star-wars-jedi-fallen-order)).
Charlas GDC 2020 sobre controlador de personaje y "Becoming a Jedi" (J. Perez), anunciadas en [GDC](https://gdconf.com/news/come-gdc-2020-inside-look-star-wars-jedi-fallen-orders-design); no se leyó su contenido.
**Ataques.** Cadenas ligeras fluidas con lunge corto y mucho giro de hombros; el fuerte sacrifica velocidad. `[EST]` ligero ≈ 0,4-0,55 s.
**Defensa.** Bloqueo mantenido y **parada** de ventana corta antes del impacto (guías: "medio segundo o menos"; escala con la dificultad:
larga en Jedi Knight, muy corta en Grand Master; [guías agregadas en búsqueda](https://blog.hyperx.com/article/8925/how-to-parry-in-star-wars-jedi-fallen-order)). Ataques con aviso **rojo** = no parables (esquivar).
**Remates/contra.** Parada perfecta rompe postura y permite remate; el "Jedi" encadena remates cortos.
**Game feel.** Chispas y destellos del sable, retroceso de postura, reacciones físicas; telegrafiado por color.

## 4. Síntesis de principios (transferibles)
1. **Anticipación larga y legible** en el enemigo; la del jugador, más corta que la del enemigo (asimetría de reacción).
2. **Recuperación** es lo que da el peso; el **activo** casi siempre es muy corto (≈ 0,08-0,12 s).
3. **Lunge**: cada golpe mueve el cuerpo 0,3-0,8 m con giro de cadera; los remates y habilidades 3-5 m.
4. **Cancelación**: Witcher 3 y Fallen Order permiten esquivar/rodar casi desde cualquier recuperación; Dawnwalker (más "compromiso") prioriza la defensa direccional.
5. **Hit-stop** corto: `[EST]` 40-70 ms en ligero, 80-140 ms en remate; más en la parada para "vender" el choque.
6. **Telegrafiado doble**: pose + símbolo (dirección en Dawnwalker, color rojo en Fallen Order, calavera roja en Dawnwalker).

## 5. Cruce con `docs/COMBATE.md` §1.1 (sin modificarlo)
| Aspecto | Nuestro valor | Lectura frente a las referencias |
|---|---|---|
| Ligero EP lateral 0,60 s (0,25/0,10/0,25) | medio | Coherente con Witcher 3 `[EST]`; más lento que Fallen Order. Anticipación 0,25 s es cómoda para el jugador (refleja un diseño "táctico") |
| Ligero EE 0,70-0,80 s | pesado | Coherente con la sensación "pesada medieval" de Dawnwalker |
| Parada perfecta 200-250 ms | ventana | Coherente con "medio segundo o menos" de Fallen Order y el icono naranja de Dawnwalker; **más estricta** que los 0,4 s del contraataque de Witcher 3 (que es otra cosa: ventana de contraataque) |
| Parada animación 0,35-0,40 s | corta | Algo larga si se quiere encadenar; Fallen Order/Witcher permiten contraatacar casi inmediato |
| Bloqueo normal 0,25-0,30 s | corto | Coherente |
| Contraataque 0,60-0,70 s, 0,12-0,15 s de anticipación | rápido | Coherente (recompensa); la recuperación de 0,38-0,45 s es larga: castiga mucho tras una parada exitosa |
| Esqueleto guerrero 1,30-1,45 s (anticipación 0,55-0,70 s) | lento | **Se aleja**: muy telegrafiado (≈ 2x lo típico `[EST]` 0,35-0,5 s). Bueno para legibilidad, pero demasiado fácil si no hay variedad; reducir a 0,40-0,55 s en enemigos rápidos |
| Jefe caballero 1,60 s (0,70 de anticipación) | lento | Coherente con "pesado/medieval"; combo fase 2 (0,50 + 0,50) razonable |
| Fintas 0,40 + 0,40 | — | Coherente con Dawnwalker (cambios de dirección); revisar que la dirección falsa dure ≥ 0,3 s para ser legible |
| Remate 1,30-1,40 s humanoide / 2,4-2,5 s jefe | cinemático | Coherente con Witcher 3 (cámara lenta ~1,5-2,5 s `[EST]`) |
| Hit-stop | **no definido** en COMBATE.md | Falta: añadir según el perfil elegido |
| Lunge (m) | **no definido** salvo habilidad (4-5 m) | Falta: sin desplazamiento el golpe se siente "flotante" |
| Activo 0,10 s en todos | uniforme | Coherente; subir a 0,12-0,15 en arriba/abajo si se usa barrido |

## 6. Enlaces de vídeo (usuario: ábrelos para ver el movimiento)
Los marcados "búsqueda" son búsquedas de YouTube (no se verificó ningún vídeo concreto); el resto son páginas con vídeo.
- Dawnwalker, entrevista de diseño de combate: [Game Informer](https://gameinformer.com/video-interview/2026/07/10/designing-the-blood-of-dawnwalkers-combat-to-be-immersive)
- Dawnwalker, resumen del reveal de gameplay: [Bandai Namco](https://en.bandainamcoent.eu/dawnwalker/news/the-blood-of-dawnwalker-gameplay-reveal-recap)
- Dawnwalker, búsqueda: [directional combat parry](https://www.youtube.com/results?search_query=blood+of+dawnwalker+directional+combat+parry+gameplay)
- Witcher 3, mocap de combate: [Game Informer 2013](https://www.gameinformer.com/b/features/archive/2013/02/22/capturing-the-animations-and-combat-for-the-witcher-3-wild-hunt.aspx)
- Witcher 3, búsquedas: [combate espada](https://www.youtube.com/results?search_query=witcher+3+sword+combat+showcase), [finishers](https://www.youtube.com/results?search_query=witcher+3+finishers+slow+motion), [parry y counter](https://www.youtube.com/results?search_query=witcher+3+parry+counter+timing)
- Fallen Order, charla GDC (animación física): [80.lv](https://80.lv/articles/gdc-2020-talk-on-physical-animation-in-star-wars-jedi-fallen-order)
- Fallen Order, búsquedas: [parry timing](https://www.youtube.com/results?search_query=jedi+fallen+order+parry+timing), [combos](https://www.youtube.com/results?search_query=jedi+fallen+order+lightsaber+combos), [finishers](https://www.youtube.com/results?search_query=jedi+fallen+order+execution+finisher)

## 7. Perfiles de sensación (valores completos en `perfiles.json`)
Valores para **EP**; EE = ×1,17 en todas las fases salvo activo (×1,0), como ya hace COMBATE.md.
| Perfil | Idea | Inspira | Ligero lateral (ant/act/rec) | Lunge ligero | Hit-stop ligero / remate |
|---|---|---|---|---|---|
| `tactico_pesado` | Cada golpe es un compromiso; castiga el error | Dawnwalker (peso medieval, direccional), jefe Souls | 0,34 / 0,10 / 0,32 = 0,76 | 0,35 m | 70 / 140 ms |
| `fluido_agil` | Cadenas rápidas, cancelaciones tempranas | Fallen Order (cadenas), Witcher 3 (baile) | 0,20 / 0,09 / 0,19 = 0,48 | 0,50 m | 40 / 100 ms |
| `preciso_defensivo` | Parada y lectura; ritmo similar al actual (**base recomendada**) | Dawnwalker (dirección + parada), Fallen Order (postura) | 0,26 / 0,10 / 0,24 = 0,60 | 0,20 m | 55 / 120 ms |
Ventanas de cancelación sugeridas (fracción de la recuperación en la que se puede cancelar a esquiva/guardia):
tactico 60 %, fluido 30 %, preciso 45 %. Todo `[EST]`; ajustar en playtest.

## 8. Fuentes adicionales
[Fandomwire](https://fandomwire.com/the-blood-of-dawnwalker-top-10-combat-tips-tricks/), [VGC](https://www.videogameschronicle.com/guide/blood-of-dawnwalker-6-combat-tips-you-need-to-know-before-playing/),
[TweakTown](https://www.tweaktown.com/news/105953/blood-of-dawnwalker-features-an-omni-directional-sword-combat-system/index.html),
[Game Developer sobre GDC 2020](https://gamedeveloper.com/design/go-behind-the-scenes-of-i-jedi-fallen-order-i-s-design-at-gdc-2020).
