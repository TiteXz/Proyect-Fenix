# Combate — Proyecto Fénix

Documento del rol `disenador-combate`. Todo número marcado **[SUPUESTO]** es una propuesta inicial
para ajustar con simulación y pruebas de juego. Los valores definitivos vivirán como datos tipados en
`juego/src/config/combat/*.ts` y `juego/src/config/runas/` (nunca dentro de los sistemas).

---

## 1. Combate del MVP — PENDIENTE (se rellena en /iniciar)

Resumen de lo ya fijado en `contexto/CONTEXTO_PROYECTO.md`:
- **Recursos:** Vida, Aguante (ataque fuerte, esquiva, bloqueo; se recupera rápido sin atacar) y Maná (hechizos, regeneración lenta).
- **3 armas:** espada y escudo (equilibrada, combo de 3, parry ≈ 0,2 s), martillo a dos manos (lento, rompe guardias, cargado en área), arco (tensión, flechas limitadas que se recogen).
- **3 hechizos:** Bola de fuego (explosión + quemadura), Lanza de escarcha (ralentiza, acumula hasta congelar), Destello sagrado (cura y daño extra a no-muertos).
- **Interacciones:** fuego sobre congelado = gran daño; esqueletos débiles a contundente y luz; escudos resisten flechas de frente.
- **Enemigos:** esqueleto guerrero, goblin arquero, cultista mago y jefe caballero no-muerto (2 fases).
- Pendiente: fases de ataque, fórmula de daño, ventanas de esquiva/parry, tabla DPS/TTK y curva por oleada.

---

## 2. Sistema de magia (fase 2)

### 2.1 Principios
1. **Un hechizo es una receta de runas**; no hay hechizos "cerrados" salvo los del MVP, que pasan a ser recetas predefinidas.
2. **El elemento se reinterpreta según el destino** (fuego en arma ≠ fuego en armadura).
3. **Combinar es la mejor estrategia**, pero cuesta: maná, complejidad e **inestabilidad**.
4. **Determinismo:** toda tirada usa RNG con semilla (`semillaHechizo` + contador). Mismo estado ⇒ mismo resultado.
5. **Topes de seguridad** antes que fórmulas abiertas: nada de bucles, nada de explosiones de entidades.

### 2.2 Estructura del hechizo

```
Hechizo = Forma/Destino (1) + Núcleo (1–4 piezas) + Modificadores (0–3) + Disparador (0–1 → hechizo hijo)
```

| Pieza | Obligatoria | Qué decide | Límite |
|---|---|---|---|
| Forma/Destino | Sí | A quién/dónde va y cómo viaja | 1 |
| Núcleo | Sí | Elemento(s), compuesto, arcano y/o efecto de alteración | 2 → 3 → 4 piezas por nivel de mago |
| Modificadores | No | Ajustes numéricos y de comportamiento (incluye runas de control) | máx. 3 |
| Disparador | No | Lanza un **hechizo hijo** ante un evento | 1; el hijo **no** puede tener disparador |

**Escuela** = etiqueta derivada (no se elige): se calcula de destino + núcleo y sirve para afinidades,
progresión y reglas (p. ej. qué rompe la invisibilidad).

| Escuela | Se deriva de | Ejemplos |
|---|---|---|
| Ataque | Destino de ataque + elemento | Bola de fuego, Cono de cellisca |
| Encantamiento | Destino Arma/Armadura | Filo ígneo, Coraza de escarcha |
| Bendición | Destino Yo/Aliado + buff | Celeridad, Piel de piedra |
| Protección | Efecto Barrera/Reflejo/Escudo | Cúpula de prisma, Muro de permafrost defensivo |
| Curación y apoyo | Efecto Curar/Purificar | Destello sagrado, Raíz viva sobre aliados |
| Utilidad/exploración | Movimiento, Objeto/mundo, Arcanos | Destello, Planeo, Piedra de paso |
| Invocación | Efecto Invocar / Podredumbre | Espíritu elemental, cadáveres alzados |
| Sigilo | Velo, Pasos mudos, Niebla negra | Invisibilidad |

**Alteración** (no rompe la invisibilidad) = Bendición, Protección, Curación sobre uno mismo, Utilidad y Sigilo.

### 2.3 Catálogo de runas

#### Formas y destinos [SUPUESTO en todos los números]
| Forma/Destino | Maná base | Lanzamiento | Recarga base | Complejidad | Factor potencia | Notas |
|---|---|---|---|---|---|---|
| Proyectil | 10 | 0,4 s | 1,0 s | 1 | 1,0 | 25 m/s, alcance 30 m |
| Rayo (haz canalizado) | 6/s | 0,3 s | 2,0 s | 2 | 0,3 por tic (0,25 s) | 15 m, instantáneo |
| Cono | 12 | 0,3 s | 2,0 s | 1 | 0,8 | 6 m, 60° |
| Área (en punto) | 18 | 0,8 s | 4,0 s | 2 | 1,2 | radio 4 m, a ≤ 20 m |
| Muro | 20 | 0,6 s | 8,0 s | 2 | 0,5/s contacto | 8 × 3 m, 8 s; máx. 2 |
| Trampa | 14 | 0,5 s | 6,0 s | 2 | 1,5 | se arma en 1 s; máx. 3 |
| Yo (tu personaje) | 8 | 0,5 s | 3,0 s | 1 | — | buffs, curación, movimiento |
| Aliado / NPC / montura | 10 | 0,6 s | 3,0 s | 1 | — | a ≤ 15 m, requiere línea de visión |
| Arma | 15 | 1,0 s | 10 s | 2 | 0,4 por golpe | encantamiento temporal |
| Armadura | 15 | 1,0 s | 10 s | 2 | 0,4 por reacción | encantamiento temporal |
| Zona / suelo | 16 | 0,8 s | 6,0 s | 2 | 0,3/s | radio 5 m, 6 s; máx. 4 activas |
| Objeto / mundo | 8 | 0,5 s | 2,0 s | 1 | — | puertas, agua, plantas, cerraduras |

#### Núcleos
| Pieza de núcleo | Maná | Complejidad | Notas |
|---|---|---|---|
| Elemento base (7) | +8 | 2 | Potencia base 12 por pieza [SUPUESTO] |
| Compuesto descubierto (21 fusiones) | +14 | 2 | Ocupa 1 hueco, cuenta como 2 elementos para daño |
| Arcano descubierto (Espacio, Tiempo) | +25 | 4 | Ocupa 1 hueco; solo con destinos de su tabla |
| Efecto de alteración | ver tabla | 1–3 | Puede ir solo o junto a un elemento |

**Efectos de alteración** (núcleo sin daño):
| Efecto | Maná | C | Qué hace |
|---|---|---|---|
| Curar | +12 | 1 | 25 vida instantánea (o 4/s 6 s con Duración) |
| Purificar | +10 | 1 | Quita 1 debuff (2 con Potencia) |
| Barrera | +14 | 2 | Absorbe 30 daño, 6 s |
| Reflejo | +16 | 2 | Devuelve el siguiente proyectil (ventana 3 s) |
| Revelar | +8 | 1 | Anula invisibilidad y marca en radio 12 m, 8 s |
| Velo | ver 2.9 | 3 | Invisibilidad |
| Pasos mudos | +6 | 1 | Radio de ruido −60 %, 60 s |
| Destello / Intercambio / Llamada / Impulso / Planeo / Levitar | ver 2.10 | 1–2 | Movimiento |
| Iluminar | +4 | 1 | Luz flotante 120 s |
| Invocar | +30 | 3 | Espíritu del elemento del núcleo, 30 s; máx. 2 invocaciones |
| Disipar | +12 | 2 | Quita 1 buff enemigo o anula una zona/muro |
| Buff (ver 2.8) | ver tabla | 1–2 | Solo con destino Yo/Aliado |

#### Modificadores (máx. 3, incluidas las runas de control) [SUPUESTO]
| Modificador | C | Maná | Efecto | Inestab. |
|---|---|---|---|---|
| Potencia | 1 | ×1,3 | +25 % daño/efecto | +10 (agresivo) |
| Alcance | 1 | +4 | +50 % alcance | 0 |
| Radio | 1 | ×1,2 | +40 % radio/cono | 0 |
| Velocidad | 1 | +3 | +50 % velocidad de proyectil, −20 % lanzamiento | 0 |
| Multiplicar | 2 | ×1,5 | +2 proyectiles (abanico 20°) al 60 % de potencia | +10 (agresivo) |
| Perforar | 1 | +5 | Atraviesa 2 objetivos | 0 |
| Rebote | 1 | +5 | Rebota 2 veces en superficies, 70 % por rebote | 0 |
| Buscador | 2 | +6 | Teledirigido suave (90°/s) | 0 |
| Duración | 1 | ×1,2 | +50 % duración de estados, zonas y buffs | 0 |
| Carga | 1 | +0 | Mantener hasta 1,5 s: potencia ×1,0→×1,8 | +5 (agresivo) |
| Eco | 2 | ×1,4 | Se repite 1 s después al 50 % | +10 (agresivo) |
| Persistencia | 1 | +6 | Deja zona del núcleo 4 s al impactar | 0 |
| Silencioso | 1 | +3 | Sin sonido ni círculo visible; no alerta a quien no impacta | 0 |
| Eficiencia | 1 | ×0,75 | −20 % potencia | 0 |
| **Ancla** (control) | 1 | +0 | −15 % potencia | −20 |
| **Catalizador** (control) | 1 | +0 | +25 % potencia | +15 |
| **Sangre** (control) | 1 | 50 % del maná se paga en vida | — | −25 |

#### Disparadores (máx. 1; el hijo se paga al 50 % al lanzar el padre) [SUPUESTO]
| Disparador | C | Válido en | Condición |
|---|---|---|---|
| Al impactar | 2 | Ataques | El padre toca a un objetivo o superficie |
| Al expirar | 2 | Proyectil, zona, muro, trampa | Fin de vida del padre |
| Temporizador | 2 | Cualquiera | 1–5 s tras el lanzamiento |
| Proximidad | 2 | Trampa, zona, objeto | Enemigo a ≤ 3 m |
| Al recibir golpe | 2 | Yo, armadura | Golpe cuerpo a cuerpo recibido (recarga interna 3 s) |
| Al matar | 2 | Ataques, arma | El padre mata a un objetivo |
| Al esquivar | 2 | Yo | Esquiva con i-frames que evita daño |
| Al parar | 2 | Arma, yo | Parry correcto |

**Topes de seguridad:** profundidad de disparo 1 (el hijo no dispara nada); recarga interna de cada
disparador 0,5 s; máx. 8 instancias de efecto por lanzamiento; máx. 24 proyectiles activos por lanzador
y 64 globales (los más antiguos se disipan); máx. 6 saltos de cadena; máx. 2 muros, 3 trampas, 4 zonas,
2 invocaciones por lanzador.

### 2.4 Elementos base

| Elemento | Tipo de daño | Estado (dur. / acumul.) | Comportamiento |
|---|---|---|---|
| Fuego | Ardiente | **Ardiendo**: 3 % vida máx/s, 4 s, renueva | Explota (radio 2,5 m al impactar) |
| Hielo | Frío | **Escarcha**: −15 % vel. por acumul., 5 s, 3 acumul. → **Congelado** 2 s | Cristaliza (deja hielo, congela agua) |
| Luz | Sagrado (×1,5 a no-muertos) | **Iluminado**: revela, −1 buff, 6 s; en aliados cura 3/s | Haz rápido (×1,5 vel.), revela |
| Rayo | Eléctrico | **Cargado**: 3 acumul. → **Aturdido** 1 s, 5 s | Salta en cadena (2 saltos, 6 m, 70 %) |
| Tierra | Físico (contundente) | **Lastrado**: −10 % vel. por acumul., 3 acumul. → **Derribado** 1,5 s | Empuja y persiste (fragmentos 4 s) |
| Sombra | Necrótico | **Maldito**: drena 2 vida/s al lanzador, −20 % curación, 6 s | Maldice/oculta (reduce detección) |
| Aire | Cortante | **Desequilibrado**: interrumpe ataque en preparación, 1,5 s | Velocidad, empuje, dispersa nubes y gases |

Tierra y Aire usan los tipos físicos del MVP (contundente/cortante), así que heredan las debilidades y
resistencias de la tabla de enemigos (esqueleto débil a Tierra, por ejemplo).

**Pares opuestos:** Fuego/Hielo y Luz/Sombra.

#### Reinterpretación por destino
| Elemento | Arma (por golpe) | Armadura (al ser golpeado) | Yo / aliado | Zona / suelo |
|---|---|---|---|---|
| Fuego | +4 ardiente y aplica Ardiendo | El atacante cuerpo a cuerpo recibe 6 + Ardiendo | Inmune a Escarcha, +30 % res. frío | Suelo en llamas 4 daño/s |
| Hielo | +1 Escarcha | El atacante gana 1 Escarcha | +30 % res. fuego; congela agua al pisar | Hielo resbaladizo (enemigos −40 % control) |
| Luz | +4 sagrado; revela al golpeado | Bloquear cura 2 vida | Regenera 2/s y quita 1 debuff | Consagrada: aliados 2 vida/s, no-muertos −20 % vel. |
| Rayo | 1 de cada 4 golpes salta a otro enemigo | Descarga que aturde 0,3 s (recarga 5 s) | +10 % vel. de ataque | Charco eléctrico: aplica Cargado |
| Tierra | +25 % daño a guardia y retroceso | −15 % daño físico, −5 % vel. | Inmune a empuje/derribo | Pinchos: Lastrado por segundo |
| Sombra | Robo de vida 8 % | El atacante recibe Debilidad 4 s | Radio de detección −50 % | Penumbra: enemigos −50 % visión |
| Aire | +0,5 m alcance, +10 % vel. de ataque | 25 % de desviar proyectiles | +15 % vel. de movimiento, caída lenta | Corriente: empuja enemigos, acelera aliados |

### 2.5 Fusiones de dos elementos (y tabla de reacciones)

**Descubrimiento:** la primera vez que lanzas un núcleo con los dos elementos (2 huecos) o provocas la
reacción en combate, el compuesto entra en el **Códice elemental**. Desde entonces ocupa **1 hueco** y su
penalización por par opuesto baja a la mitad (+15).

**Reacción en combate (misma tabla):** si un golpe del elemento B alcanza a un objetivo con el estado del
elemento A (A ≠ B), se dispara la reacción A+B: consume el estado A, hace 50 % del daño del golpe como
daño extra del compuesto y aplica el efecto. Recarga de reacción por objetivo: 1,5 s. Caso del MVP:
**Fuego sobre Congelado = estallido de Vapor a ×2**.

| # | Fusión | Elementos | Daño | Estado | Comportamiento | Reacción en combate |
|---|---|---|---|---|---|---|
| 1 | Vapor | Fuego+Hielo | Escaldadura (ardiente+frío) | Cegado 2 s | Nube que crece a 4 m | Estallido de vapor (×2 si Congelado), nube ciega 3 s |
| 2 | Llama sagrada | Fuego+Luz | Sagrado+ardiente | Ardiendo que quita 1 buff/s | Haz con estela ígnea | Pira: ×1,5 a no-muertos, quita 1 buff |
| 3 | Plasma | Fuego+Rayo | Ardiente+eléctrico | Ardiendo + Cargado | ×2 velocidad, perfora 3 | Lanza perforante en línea de 6 m |
| 4 | Magma | Fuego+Tierra | Ardiente+contundente | Ardiendo + Lastrado | Charcos 5 s | Costra: inmoviliza 1,5 s y deja charco |
| 5 | Fuego negro | Fuego+Sombra | Ardiente+necrótico | **Sin curación** 6 s | No se apaga con agua | Sin curación 8 s, salta a 1 vecino |
| 6 | Prisma | Hielo+Luz | Frío+sagrado | Deslumbrado (−30 % precisión) 4 s | Refracta en 3 al tocar superficie; escudos de cristal (absorben 30) | Abanico de 3 fragmentos |
| 7 | Escarcha eléctrica | Hielo+Rayo | Frío+eléctrico | Escarcha + Cargado | Salta solo entre objetivos con Escarcha (hasta 6) | Cadena a todos los congelados a 8 m |
| 8 | Permafrost | Hielo+Tierra | Frío+contundente | Escarcha + Lastrado | Muros y pinchos de hielo 8 s | Pinchos desde el suelo, Derribado |
| 9 | Vacío helado | Hielo+Sombra | Frío+necrótico | Agotamiento | Drena 20 aguante | Roba 20 aguante para el lanzador |
| 10 | Juicio | Luz+Rayo | Sagrado+eléctrico | Aturdido 1 s | Rayo del cielo tras señal de 0,6 s | Segundo rayo del cielo |
| 11 | Raíz viva | Luz+Tierra | Sagrado+contundente | Enraizado 2 s / aliados 4 vida/s | Persiste 6 s | Raíces atrapan 2 s |
| 12 | Crepúsculo | Luz+Sombra | Sagrado+necrótico | Anulado | Zona 5 m que borra buffs y debuffs 4 s | Disipa todo; +10 daño por estado quitado |
| 13 | Magnetismo | Rayo+Tierra | Eléctrico+contundente | Imantado 5 s | Atrae o repele; desvía flechas y armas metálicas | Tirón hacia el lanzador; flechas cercanas lo buscan |
| 14 | Caos | Rayo+Sombra | Eléctrico+necrótico | Confusión 3 s | Saltos a objetivos al azar (con semilla; nunca al lanzador) | Confusión 3 s |
| 15 | Podredumbre | Tierra+Sombra | Contundente+necrótico | Veneno 2 %/s, 8 s, 3 acumul. | Alza cadáveres aliados 20 s (máx. 2) | Veneno; si muere en 5 s, se alza |
| 16 | Incendio | Aire+Fuego | Ardiente+cortante | Ardiendo extendido 6 s | Se propaga por hierba y crece con viento | Ardiendo salta a todos a 4 m |
| 17 | Cellisca | Aire+Hielo | Frío+cortante | 2 Escarcha por impacto | Tormenta móvil, −40 % vel. | +2 Escarcha y empuje |
| 18 | Aurora | Aire+Luz | Sagrado+cortante | Cegado 2 s; aliados +20 % vel. | Cortina de luz | Ceguera 2 s; aliados a 6 m Celeridad 4 s |
| 19 | Tempestad | Aire+Rayo | Eléctrico+cortante | Cargado + Desequilibrado | Rayos al azar en zona móvil | Empuje + Aturdido 0,5 s |
| 20 | Tormenta de arena | Aire+Tierra | Contundente+cortante | Cegado + Desgaste (−5 defensa, 5 acumul.) | Zona que oculta | Desgaste ×2 acumulaciones |
| 21 | Niebla negra | Aire+Sombra | Necrótico+cortante | Cegado 3 s | Nube: aliados dentro indetectables a > 6 m | Nube de 3 s alrededor del objetivo |

### 2.6 Combinaciones de 3–4 piezas (generadas por rasgos)

Prioridad de resolución: **Arcano** (conjunto exacto de 3) > **Legendaria** (multiconjunto exacto) > **Generada**.

**Reglas de generación** (el núcleo es un multiconjunto; se pueden repetir elementos):
1. **Dominante** = elemento con más piezas; empate ⇒ se decide con `semillaHechizo` (estable para siempre en ese hechizo).
2. **Comportamiento** = el del dominante.
3. **Estados** = los de los **dos elementos más presentes**; si forman una fusión del Códice, se usa el estado de la fusión.
4. **Daño** repartido por proporción de piezas entre sus tipos; potencia total = 12 × piezas × (1 + 0,10 × (piezas − 1)) [SUPUESTO].
5. Núcleo de un solo elemento repetido ("concentrado"): sin estados extra, potencia ×1,15 adicional.
6. **Nombre** = raíz del dominante + sufijo del segundo + epíteto del tercero (si hay); si la raíz acaba en la letra con la que empieza el sufijo, se funden (Terr- + -rino = Terrino). Renombrable.
7. **Visual** = color mezclado por proporción + máx. 3 capas de partículas (las de los 3 más presentes).

| Elemento | Raíz | Sufijo | Epíteto |
|---|---|---|---|
| Fuego | Ascu- | -ardo | de ceniza |
| Hielo | Gelv- | -rino | de escarcha |
| Luz | Clar- | -elio | del alba |
| Rayo | Fulg- | -ástico | del trueno |
| Tierra | Terr- | -olito | de piedra |
| Sombra | Umbr- | -umbra | de la penumbra |
| Aire | Vent- | -ento | del viento |

**Ejemplo 1 — Proyectil + [Fuego, Fuego, Rayo] + Multiplicar** (nivel de mago 3)
- Dominante Fuego ⇒ explota. Estados: Fuego+Rayo = Plasma ⇒ Ardiendo + Cargado. Daño 67 % ardiente / 33 % eléctrico.
- Potencia de núcleo 12 × 3 × 1,2 = 43,2 (× factor Proyectil 1,0) ⇒ con Multiplicar: 3 proyectiles de 25,9.
- Maná (10 + 24) × 1,5 = **51**. Complejidad 1 + 6 + 2 = **9** (límite nivel 3: 10).
- Inestabilidad: 3.ª pieza +15, Multiplicar +10 = **25 %**. Nombre: «Ascuástico».

**Ejemplo 2 — Muro + [Hielo, Tierra, Aire]**
- Empate triple ⇒ la semilla ordena Tierra, Hielo, Aire: dominante Tierra (persiste). Estados de los 2 primeros: Tierra+Hielo = Permafrost (Escarcha + Lastrado).
- Muro de 8 s que lanza ráfagas cortantes heladas. Maná 20 + 24 = **44**; C = 2 + 6 = **8**; inestabilidad **15 %**. Nombre: «Terrino del viento».

**Ejemplo 3 — Área + [Sombra, Sombra, Fuego, Hielo] + Ancla** (nivel 5)
- Dominante Sombra (maldice). Estados: Sombra + (empate Fuego/Hielo ⇒ semilla: Fuego) = Fuego negro ⇒ Sin curación.
- Inestabilidad: par Fuego/Hielo +30, piezas 3.ª y 4.ª +30, Ancla −20 = **40 %**. Potencia de núcleo 12 × 4 × 1,3 × 0,85 = 53 (× factor Área 1,2 = 64).
- Maná 18 + 32 = **50**; C = 2 + 8 + 1 = **11**. Nombre: «Umbrardo de escarcha».

### 2.7 Legendarias y arcanos

**Legendarias** (sustituyen al resultado generado; se obtienen en santuarios ocultos o por mutación rara ≈ 1 %):
| Legendaria | Receta exacta | Efecto |
|---|---|---|
| Obsidiana | Fuego + Tierra + Hielo | El magma se templa en cristal negro: muro/proyectil que al romperse lanza esquirlas perforantes (×1,4) |
| Tormenta solar | Luz + Fuego + Rayo | Columna de luz que cae 3 veces en 2 s; ciega y quema; ×2 a no-muertos |
| Eclipse ceniciento | Sombra + Sombra + Luz + Fuego | Disco oscuro que absorbe luz 4 s y estalla según el daño absorbido |
| Ciclón de cristal | Aire + Aire + Hielo + Luz | Remolino móvil de esquirlas que refleja proyectiles 5 s |
| Jardín de hierro | Tierra + Tierra + Luz + Rayo | Bosque de lanzas metálicas que imanta flechas aliadas y cura a quien está dentro |
| Coro de almas | Sombra + Hielo + Aire | Espectros helados persiguen a 3 enemigos; drenan aguante |
| Corazón de volcán | Fuego + Fuego + Tierra + Tierra | Grieta de 12 m que entra en erupción tras 1,2 s de señal |
| Faro del vendaval | Luz + Aire + Rayo + Rayo | Haz giratorio de 360° durante 3 s que empuja y carga |

**Arcanos** (fusiones de 3; se descubren lanzándolos una vez y luego ocupan 1 hueco; C 4).

**ESPACIO = Aire + Sombra + Tierra**
| Hechizo | Maná | Recarga | Efecto |
|---|---|---|---|
| Salto lejano | 40 | 30 s | Teletransporte a punto visible ≤ 150 m; transición 1 s |
| Intercambio mayor | 25 | 12 s | Cambia de lugar con objetivo ≤ 40 m |
| Ancla rúnica | 20 | 20 s | Marca un punto; reactivar en ≤ 60 s te devuelve |
| **Piedra de paso** | 60 crear / 30 viajar | 120 s viajar | Crea tu propio punto de viaje rápido (máx. 3–5 por nivel). Viajar: fuera de combate, transición 2–3 s con precarga de celdas |
| Portal | 80 | 180 s | Une dos piedras de paso 15 s; pasan aliados y caballo |
| Gravedad | 25 | 10 s | Atrae o repele en radio 8 m durante 2 s |
| Vacío | 30 | 15 s | Esfera de 3 m que traga proyectiles 4 s |
| Zancada | 20 | 8 s | 3 destellos de 6 m encadenados en 2 s |

No existe red de viaje rápido predefinida: solo las piedras que crea el jugador. Una nueva piedra por
encima del máximo exige borrar una existente.

**TIEMPO = Luz + Rayo + Hielo**
| Hechizo | Maná | Recarga | Efecto |
|---|---|---|---|
| Burbuja lenta | 35 | 20 s | Radio 6 m: enemigos y proyectiles a ×0,4 de velocidad, 5 s |
| Acelerar | 25 | 15 s | Yo/aliado a escala de tiempo ×1,3, 4 s |
| Estasis | 30 | 25 s | Objetivo detenido e invulnerable 3 s (jefes 1 s); sirve para salvar a un aliado |
| Rebobinar | 40 | 90 s | Vuelves a posición, vida y aguante de hace 3 s (no maná, no muertes enemigas) |
| Eco del tiempo | 20 fijo | 12 s | Repite tu último hechizo (≤ 10 s) al 60 % |
| Envejecer | 20 | 10 s | Enemigo −30 % defensa 8 s; objeto: pudre madera, oxida cerraduras |
| Crecer | 15 | 10 s | Plantas: liana-puente de 10 m o cobertura 20 s |

### 2.8 Bendiciones (buffs) y debuffs

**Reglas:** máx. **3 bendiciones** activas; el mismo buff **no se acumula** (renueva duración); los buffs de
duración ≥ 60 s **reservan** un % del maná máximo mientras duran (el maná actual no supera máx. − reserva);
los más cortos pagan coste normal. Si un buff sufre contragolpe, se aplica su **inverso** a ti (½ duración).

| Buff | Duración | Valor | Reserva / coste | Inverso (contragolpe) |
|---|---|---|---|---|
| Celeridad | 30 s | +20 % movimiento, +10 % vel. ataque | 20 maná | Torpeza |
| Piel de piedra | 60 s | −20 % daño físico, −10 % movimiento | 10 % | Fragilidad |
| Furia | 20 s | +20 % daño cuerpo a cuerpo, +15 % daño recibido | 20 maná | Debilidad |
| Regeneración | 30 s | +2 vida/s | 25 maná | Sangrado |
| Arma encantada | 60–120 s | Ver 2.4 (arma) | 10 % | Arma apagada (sin encantamiento 10 s) |
| Reflejo | 20 s | Refleja 1 proyectil cada 5 s | 25 maná | Marca |
| Levitación | 10 s | Caída lenta 2 m/s, flota 1 m | 15 maná | Agotamiento |
| Resistencia (elegir elemento) | 120 s | −40 % daño de ese elemento | 10 % | Vulnerabilidad elemental |
| Visión nocturna | 300 s | Ve en oscuridad, ve rastros | 5 % | Ceguera |
| +Maná máx. / +Aguante máx. | 120 s | +25 | 10 % | Agotamiento |
| Mente clara | 60 s | Contragolpe mental ⇒ resultado Normal; −50 % duración de debuffs mentales | 10 % | Confusión |

**Debuffs físicos** [SUPUESTO]
| Debuff | Duración | Efecto | Acumul. |
|---|---|---|---|
| Lentitud | 4 s | −30 % movimiento y vel. de ataque | 1 |
| Debilidad | 8 s | −25 % daño infligido | 1 |
| Marca | 10 s | +15 % daño recibido de todo; visible a través de paredes | 1 |
| Vulnerabilidad elemental | 8 s | +30 % daño de un elemento | 1 por elemento |
| Sangrado | 6 s | 2 % vida máx/s | 3 |
| Sacrificio | 6 s | Cada acción cuesta 3 vida | 1 |
| Agotamiento | 8 s | −50 % regeneración de aguante | 1 |
| Torpeza | 6 s | −20 % vel. ataque, +30 % recuperación | 1 |
| Fragilidad | 8 s | −30 % defensa; cualquier golpe rompe guardia | 1 |

**Debuffs mentales** [SUPUESTO]
| Debuff | Duración | En enemigos | En el jugador |
|---|---|---|---|
| Miedo | 3 s | Huye | Sin control 3 s (opción accesible) |
| Confusión | 4 s | Ataca al objetivo más cercano, sea quien sea | Ejes de movimiento invertidos (opción accesible) |
| Alucinación | 6 s | Ve 2 dobles falsos del jugador | Ves 2 enemigos falsos sin colisión |
| Olvido | 8 s | Pierde su habilidad especial | Bloquea 1 hechizo equipado (al azar con semilla) |
| Silencio | 4 s | No lanza hechizos | No lanzas hechizos |
| Ceguera | 3 s | Pierde objetivo; detección −70 % | Viñeta fuerte |
| Sueño | 6 s | Inactivo; despierta al recibir daño (×1,5 ese golpe) | Inactivo; despiertas con daño |

**Revelar** anula Velo, Niebla negra y Alucinación en su radio.

### 2.9 Invisibilidad (Velo)

| Regla | Valor [SUPUESTO] |
|---|---|
| Coste | 10 maná al activar + 6 maná/s |
| Duración máxima / recarga | 10 s / 20 s (desde que termina) |
| Se rompe | Al atacar o lanzar un hechizo que no sea de alteración; al recibir daño; al agotar maná |
| Primer golpe desde invisible | ×1,5 daño (no se combina con crítico de espalda: se toma el mayor) |
| Detección por ruido | Correr 8 m, andar 4 m, agachado 1,5 m (Pasos mudos −60 %) |
| Detección por proximidad | Enemigos normales 2 m; **cultista mago 5 m**; jefes 4 m |
| Al ser detectado | El enemigo te ve 3 s (contorno) sin romper el Velo |
| Contra | Revelar (y Luz en arma/zona) |
| Visual | Refracción translúcida (distorsión de pantalla), sin sombra proyectada |

### 2.10 Movimiento mágico

| Hechizo | Maná | Recarga | Valores |
|---|---|---|---|
| Destello | 15 | 4 s | 8 m (5–12 m con Alcance/Eficiencia); 0,15 s de invulnerabilidad |
| Intercambio | 15 | 8 s | Cambia de sitio con objetivo ≤ 25 m |
| Llamada | 10 | 20 s | Trae caballo, aliado u objeto suelto ≤ 40 m (caballo: desde cualquier distancia en el mundo, llega en 3 s) |
| Impulso | 12 | 2 cargas, 3 s c/u | Salto de 6 m vertical o 10 m horizontal |
| Planeo | 5 + 3/s | — | Caída 2 m/s; horizontal 14 m/s (Aire 18 m/s) |
| Levitación | ver buff | — | Caída lenta / flotar |

**Variantes de Destello por elemento:** Sombra = solo entre zonas en sombra pero alcance ×1,5 y sin sonido;
Rayo = Aturdido 0,5 s a 2 m al llegar; Luz = Cegado 2 s a 4 m al llegar; Fuego = explosión en el origen;
Hielo = deja un clon de hielo que atrae ataques 3 s; Tierra = emerges del suelo derribando a 2 m; Aire = +40 % alcance.

**Aéreo:** solo levitación, planeo e impulsos (no hay vuelo libre). Aire es el elemento principal; otros dan
variantes (Fuego: impulso con explosión; Rayo: impulso instantáneo; Hielo: plataforma de hielo 3 s).

**Límites:**
- Velocidad aérea ≤ 1,5 × galope (galope ≈ 14 m/s [SUPUESTO] ⇒ ≤ 21 m/s).
- Techo ≈ 300 m sobre el terreno (por encima, planeo e impulso no suben).
- Viajes largos: transición de 1–3 s con precarga de celdas destino.
- **Daño por caída:** a partir de 10 m, 4 % vida máx. por metro extra; letal a ≥ 35 m. Planeo/Levitación activos lo anulan.
- **Zonas de anulación** (dungeons, salas de jefe, santuarios marcados): bloquean Salto lejano, Piedra de paso
  (crear y viajar), Portal, Ancla rúnica, Planeo e Impulso. **Destello, Intercambio y Zancada sí funcionan.**
  El HUD muestra esas runas apagadas con aviso; lanzar una bloqueada no gasta maná.

### 2.11 Fórmulas: coste, complejidad, inestabilidad [SUPUESTO]

```
maná       = (maná_forma + Σ maná_núcleo + Σ maná_mod_plano) × Π mult_mod   (redondeo arriba)
lanzamiento = t_forma + 0,1 s × (piezas_núcleo − 1) + Σ ajustes_mod          (mín. 0,2 s)
recarga    = r_forma × (1 + 0,25 × (piezas_núcleo − 1)) + Σ ajustes_mod     (mín. 0,5 s)
complejidad = C_forma + Σ C_núcleo + Σ C_mod + C_disparador + C_hijo / 2
potencia   = 12 × piezas × (1 + 0,10 × (piezas − 1)) × factor_forma × Π mod_potencia
```

| Nivel de mago | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Complejidad máx. | 6 | 8 | 10 | 12 | 14 |
| Piezas de núcleo | 2 | 2 | 3 | 3 | 4 |
| Hechizos equipados | 4 | 4 | 5 | 5 | 6 |
| Piedras de paso | — | — | 3 | 4 | 5 |

**Inestabilidad I (0–100 %):** +30 por par opuesto (+15 si es fusión descubierta), +15 por cada pieza de
núcleo a partir de la 3.ª, +modificadores agresivos (tabla 2.3), ± runas de control. Se limita a [0, 100].

Tirada por lanzamiento (semilla = `hash(semillaHechizo, nºLanzamiento)`):
| Resultado | Probabilidad | Efecto en ataque | En buff | En teletransporte |
|---|---|---|---|---|
| Sobrecarga | 0,25·I | ×1,5 potencia + debuff físico o mental extra 4 s al objetivo | +50 % duración | +50 % alcance + estallido en origen |
| Normal | resto | — | — | — |
| Contragolpe físico | 0,35·I | Pagas 10 % de vida máx. **o** debuff físico propio 4 s | Se aplica el inverso | Apareces desviado 2–4 m y −30 aguante |
| Contragolpe mental | 0,15·I | Debuff mental propio 3 s (Mente clara ⇒ Normal) | Se aplica el inverso | Desorientación (Confusión 2 s) |

Con I = 100: 25 % sobrecarga, 25 % normal, 50 % contragolpe. **Visual:** I < 20 círculo estable; 20–50 parpadea;
> 50 se agrieta (el círculo de runas de `prototipo/vfx/vfx.js` se parametriza con `inestabilidad`).

### 2.12 Encantamientos e inscripciones

| | Temporal (hechizo) | Permanente (inscripción rúnica) |
|---|---|---|
| Dónde | En cualquier lugar (destino Arma/Armadura) | Altar rúnico o forja de asentamiento |
| Duración | 30–120 s (60 s base; Duración la sube) | Indefinida |
| Límite | 1 por arma y 1 por armadura | 1 / 2 / 3 huecos según calidad (común / fina / maestra) |
| Coste | Maná; reserva 10 % si ≥ 60 s | Materiales: tinta rúnica + esquirla del elemento (+ polvo arcano para compuestos) |
| Potencia | 100 % de la tabla 2.4 | 60 % de la tabla 2.4 |
| Contenido | Núcleo + modificadores | 1 pieza de núcleo por hueco (elemento, compuesto o efecto pasivo) |
| Cambiar | Se sustituye al relanzar | Borrar y regrabar; borrar devuelve 50 % de materiales |

Temporal y permanente se suman; si comparten elemento, gana el de mayor potencia (no se duplica). Los
encantamientos temporales **no** cuentan para el tope de 3 bendiciones.

### 2.13 Creación de hechizos: grimorio y mutación

**(A) Grimorio:** combinar libremente runas conocidas; solo en altares y campamentos (no en combate). Grimorio
ilimitado con favoritos y archivo; equipados 4–6 según nivel. Código compartible (p. ej. `FX-3F7A`), nombres
generados y renombrables. Las runas se aprenden explorando (santuarios, ruinas, cultistas) y por mutación.

**(C) Mutación:**
1. Cada impacto en combate real (enemigo hostil que pueda dañarte; no muñecos ni enemigos ya derrotados de nivel
   muy inferior) suma **resonancia**: +1 por impacto, +3 si provoca reacción. Umbral 100 [SUPUESTO].
2. Al llenarse se ofrecen **3 variantes** deterministas (`hash(semillaHechizo, nºMutación)`):
   - Cambio de una pieza (misma categoría: forma por forma, elemento por elemento…).
   - +1 modificador (si ya hay 3, se convierte en cambio de pieza).
   - Rareza ≈ 5 %: una variante incluye una **runa desconocida** que se aprende al elegirla (≈ 1 % legendaria).
3. La elegida se guarda como **hechizo nuevo**; el **original nunca se borra** y su resonancia vuelve a 0.
4. Si no eliges, queda como **propuesta pendiente** (máx. 5; la sexta sustituye a la más antigua).
5. **Árbol genealógico** por hechizo (padre → hijos), visible en el grimorio.
6. Las variantes respetan el nivel de mago: si superan la complejidad, aparecen bloqueadas con candado.

### 2.14 Reglas de jefes

- Duración de control ×0,5. Rendimientos decrecientes por categoría (aturdir, inmovilizar, ralentizar, mental)
  en ventana de 20 s: 100 % → 50 % → 25 % → **inmune 10 s**.
- Inmunes a Miedo, Confusión, Sueño y Alucinación: se sustituyen por **Vacilación** (interrumpe 0,5 s).
- Debuffs de estadística (Debilidad, Marca, Vulnerabilidad, Sangrado, Fragilidad) al 60 %.
- Estasis 1 s; Congelado 1 s; Derribado solo con la barra de aturdimiento de jefe llena.
- Reflejo y Vacío no afectan a sus ataques marcados como **imparables** (señal roja).
- El cambio de fase limpia todos sus debuffs y le da 3 s de inmunidad a control.
- Detecta invisibilidad a 4 m y al recibir daño.

### 2.15 Accesibilidad

- **Ajustes → "Efectos de control suaves"** (desactivado por defecto): Confusión ⇒ −30 % movimiento + viñeta;
  Miedo ⇒ −25 % daño 4 s; Alucinación ⇒ los dobles se marcan con contorno; Ceguera ⇒ viñeta suave.
- Elementos identificables por **icono y forma de partícula**, no solo por color (daltonismo).
- Opción para reducir parpadeo del círculo inestable y la distorsión del Velo (fotosensibilidad).
- Avisos de inestabilidad también en texto/icono en el HUD.

### 2.16 Notas técnicas (para el arquitecto; requieren ADR)

- Runas como datos JSON en `juego/src/config/runas/` validados contra tipos TS (o `.ts` tipados, coherente con
  la regla de `config/combat/*.ts`): **decidir en ADR**.
- **Compilación:** receta → `PlanHechizo` (lista de pasos: `Emitir`, `Mover`, `Impactar`, `AplicarEstado`,
  `Reaccionar`, `Disparar(hijo)`), calculado una vez al guardar en el grimorio. Lógica pura, testeable con Vitest.
- RNG con semilla por hechizo y por lanzamiento; mutación con `hash(semilla, nºMutación)`.
- **Escala de tiempo por entidad** (`timeScale`) en todos los sistemas; en Rapier se aproxima escalando velocidades
  dentro de burbujas.
- **Rebobinar:** búfer circular solo del jugador, 5 s a 10 Hz (50 instantáneas de posición, vida y aguante).
- **Viaje largo:** transición 1–3 s con precarga de celdas destino; el streaming debe exponer una "precarga forzada".
- **Zonas de anulación:** volúmenes de datos en celdas y dungeons; la consulta la hace el sistema de magia.
- **VFX compartidos** (~15–25 piezas parametrizadas por color/intensidad): círculo de runas, núcleo, estela,
  impacto, explosión, zona, muro, haz, cadena, aura de arma, aura de armadura, cúpula, nube, refracción, portal,
  piedra de paso, chispas. Partir de `prototipo/vfx/vfx.js`.
- Código compartible: serialización compacta de la receta (base32 + checksum); `FX-3F7A` solo sirve para recetas
  simples; las complejas necesitarán un código más largo (ver preguntas).

### 2.17 Reglas comprobables (para qa-tester y planificador)

| ID | Regla | Test |
|---|---|---|
| M-01 | Máx. 3 modificadores, 1 disparador, hijo sin disparador | Validador rechaza recetas que lo violan |
| M-02 | Complejidad > límite de nivel ⇒ no equipable | Unitario sobre `calcularComplejidad` |
| M-03 | Coste, lanzamiento y recarga según 2.11 | Ejemplos 1–3 dan 51/44/50 de maná y C 9/8/11 |
| M-04 | Inestabilidad según 2.11 | Ejemplos 1–3 dan 25/15/40 % |
| M-05 | Tirada determinista | Misma semilla y nº de lanzamiento ⇒ mismo resultado |
| M-06 | Distribución de resultados | 10 000 tiradas con I = 100 ⇒ sobrecarga 25 / normal 25 / físico 35 / mental 15 % (± 1 %) |
| M-07 | Prioridad arcano > legendaria > generada | Resolver núcleos de prueba |
| M-08 | Fusión descubierta ocupa 1 hueco y par opuesto +15 | Unitario de núcleo |
| M-09 | Reacción consume estado y respeta recarga 1,5 s | Simulación de 2 golpes seguidos |
| M-10 | Fuego sobre Congelado = Vapor ×2 | Daño esperado en unitario |
| M-11 | Topes de entidades (24/64 proyectiles, 6 saltos, 8 instancias) | Estrés con Multiplicar + Eco |
| M-12 | Máx. 3 bendiciones; mismo buff renueva | Aplicar 4 buffs y repetir uno |
| M-13 | Reserva de maná de buffs ≥ 60 s | Maná actual ≤ máx. − reserva |
| M-14 | Contragolpe en buff aplica inverso | Forzar resultado y comprobar estado |
| M-15 | Velo: rompe al atacar, no al lanzar alteración; máx. 10 s | e2e con `?test=1` |
| M-16 | Zona de anulación bloquea lo listado y no gasta maná; Destello funciona | e2e en dungeon |
| M-17 | Velocidad aérea ≤ 21 m/s y techo 300 m | Simulación de planeo + impulso |
| M-18 | Mutación: original intacto, nuevo hechizo, resonancia a 0 | Unitario de grimorio |
| M-19 | Mutación determinista | Mismas 3 variantes con misma semilla y nº |
| M-20 | Jefes: rendimientos decrecientes y sustitución mental | Aplicar 4 aturdimientos en 20 s |
| M-21 | Opción accesible sustituye Confusión/Miedo | Unitario con ajuste activo |
| M-22 | Piedras de paso ≤ máximo por nivel | Crear una de más ⇒ pide borrar |

### 2.18 Preguntas abiertas

1. ¿Las runas de control (Ancla, Catalizador, Sangre) deben ocupar hueco de modificador o tener un hueco propio?
2. ¿Cómo se sube de nivel de mago: experiencia por uso, por descubrimientos del Códice o por ambos?
3. Formato del código compartible: ¿se acepta un código largo para recetas complejas o se guarda en servidor (fuera de alcance sin backend)?
4. ¿Los enemigos (cultista mago, jefes) usan también recetas de runas y pueden sufrir inestabilidad?
5. ¿El Velo y la Niebla negra se pueden usar a caballo? ¿Y el planeo con el caballo (propuesta: no)?
6. Piedra de paso: ¿se permite crear piedras dentro de asentamientos y en islas? ¿Persisten entre partidas (sí, en `localStorage`)?
7. Rebobinar y Estasis en jefes: ¿se desactivan en salas de jefe para evitar abusos?
8. ¿La mutación puede proponer un cambio de forma que cambie la escuela (p. ej. ataque → encantamiento)?
9. Materiales de inscripción: dependen de inventario/crafteo (fuera del MVP); hay que alinearlo con las armaduras modulares de fase 2.
10. Raíces de nombres generados: validar con `disenador-juego` el tono (idioma inventado vs. castellano).
