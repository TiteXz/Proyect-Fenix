# Magia rúnica en la maqueta — recorte implementable (1 sesión)

Recorte de `docs/COMBATE.md` §2 (fuente de verdad) para enseñarlo en `prototipo/maqueta.src.html`.
No es el juego: valores [MAQUETA] escalados a la arena (radio 14,2 m), vida/maná 100, regen. de maná 6/s.
Sustituye a `SPELL` (fuego/escarcha/luz fijos); el rayo de `vfx/rayos.js` sigue siendo de la katana.

## 1. Qué entra y qué no
| Entra | Fuera (y por qué) |
|---|---|
| 5 formas, 7 elementos, 3 modificadores | Disparadores, runas de control, arcanos, legendarias (piden más de 1 sesión) |
| Núcleo de **1–2 piezas** (2 distintas = fusión; 2 iguales = concentrado ×1,15) | Núcleos de 3–4 piezas (§2.6) |
| 6 fusiones con hechizo propio + reacción en enemigo y en suelo | Las otras 15 fusiones: el par se lanza pero sin reacción (estados de ambos coexisten) |
| Inestabilidad §2.11 (tirada con semilla) | Nivel de mago, dominio, fallo de ejecución (en la maqueta M = 0 ⇒ fallo 0 %) |
| Códice: la 1.ª vez que sale una fusión se "descubre" (aviso + inestab. del par opuesto 30 → 15) | XP, afinidad, mutación |

## 2. Fórmulas (las de §2.11 con M = 0)
```
maná        = ceil((maná_forma + 8 × piezas + Σ maná_plano) × Π mult_mod)
lanzamiento = t_forma + 0,1 × (piezas − 1)
recarga     = r_forma × (1 + 0,25 × (piezas − 1))
potencia    = 12 × piezas × (1 + 0,10 × (piezas − 1)) × factor_forma × Π mod_potencia × 1,5 [MAQUETA]
daño        = potencia × multTipo(enemigo)      (sin defensa en la maqueta; mínimo 1)
```
El ×1,5 de maqueta deja Proyectil+1 elemento en 18 (hoy la escarcha hace 10 y el fuego 26 + quemadura).

## 3. Runas
### Formas (1, obligatoria)
| Forma | Maná | Lanz. | Recarga | Factor | Forma en la maqueta |
|---|---|---|---|---|---|
| Proyectil | 10 | 0,4 s | 1,0 s | 1,0 | 18 m/s, alcance 22 m, apunta con `aimTarget` |
| Área (explosión en punto) | 18 | 0,8 s | 4,0 s | 1,2 | radio 3 m sobre el objetivo fijado (o 8 m al frente); círculo de aviso durante el lanzamiento |
| Zona (suelo) | 16 | 0,8 s | 6,0 s | 0,3/s | radio 3,5 m, 6 s, tic 0,5 s, a ≤ 12 m; máx. 2 activas (la más antigua se apaga) |
| Cono | 12 | 0,3 s | 2,0 s | 0,8 | 5 m, 60° al frente, instantáneo |
| Yo | 12 [MAQUETA] | 0,5 s | 8,0 s [MAQUETA] | — | efecto sobre el jugador; **solo 1 elemento** |
Yo sube de 8/3 s a 12/8 s para que la curación no sea gratis (hoy el Destello sagrado cuesta 35 y recarga 8 s).

### Núcleos: los 7 elementos de §2.4 (+8 maná c/u)
| Elemento | Color | Estado en enemigo [MAQUETA] | Comportamiento | Suelo (Zona/Persistencia) | Yo (8 s) |
|---|---|---|---|---|---|
| Fuego | naranja | Ardiendo 6 daño/s, 4 s, renueva | explota r 2 m al impactar (50 % del daño) | llamas 6/s | quien te golpea cuerpo a cuerpo recibe 6 + Ardiendo |
| Hielo | cian | Escarcha −15 % vel./acum., 5 s; 3 acum. ⇒ Congelado 2 s | — | hielo: enemigos −40 % vel. | quien te golpea gana 1 Escarcha |
| Luz | oro | Iluminado 6 s (sagrado ×1,5 a no-muertos) | proyectil ×1,5 vel. | consagrado: jugador +2 vida/s | cura 20 + 2/s 5 s (= 30, como hoy) |
| Rayo | violeta-blanco | Cargado 5 s; 3 acum. ⇒ Aturdido 1 s | salta 2 veces, 6 m, 70 % | charco: 1 Cargado/s | +10 % vel. de ataque |
| Tierra | ocre | Lastrado −10 %/acum.; 3 ⇒ Derribado 1,5 s | empuje 3 m | pinchos: 1 Lastrado/s | −20 % daño recibido |
| Sombra | púrpura oscuro | Maldito 6 s: pierde 2 vida/s y el jugador la gana | — | penumbra: enemigos a distancia −50 % alcance | enemigos a > 6 m te pierden |
| Aire | blanco verdoso | Desequilibrado 1,5 s: cancela su ataque en preparación | empuje 4 m | corriente: empuja hacia fuera 2 m/s | +20 % vel. de movimiento |
Jefe: Congelado, Aturdido y Derribado duran ×0,5 y no se repiten en 6 s (§2.14 simplificado).

**multTipo:** Luz ×1,5 a esqueleto y jefe (no-muertos); Tierra ×1,25 a esqueleto (contundente, §2.4);
Sombra ×0,5 a no-muertos; Aire ×1,25 a goblin (ligero). Resto ×1.

### Modificadores (0–3, cada uno 1 vez)
| Mod. | Maná | Efecto | Inestab. | Válido en |
|---|---|---|---|---|
| Potencia | ×1,3 | +25 % daño/efecto | +10 | todas |
| Multiplicar | ×1,5 | +2 proyectiles en abanico 20°, cada uno al 60 % | +10 | Proyectil |
| Persistencia | +6 | deja suelo del núcleo r 2 m, 4 s, al impactar | 0 | Proyectil, Área |
Combinación inválida ⇒ la runa sale apagada en el grimorio con el motivo; nunca se lanza una receta inválida.

## 4. Fusiones (6 de §2.5; cubren los 7 elementos)
Como **hechizo**: núcleo con los 2 elementos ⇒ aplica el estado de la fusión y su comportamiento.
Como **reacción en enemigo**: golpe del elemento B a un objetivo con estado A ⇒ consume A, +50 % del daño del
golpe como daño extra y aplica el efecto; recarga 1,5 s por objetivo (M-09). Fuego sobre Congelado = ×2 (+100 %).
Como **reacción en suelo**: un impacto B dentro de un suelo A lo convierte (1 vez) en el suelo de la fusión el tiempo que le quede.

| Fusión | Par | Hechizo fusionado | Reacción en enemigo | Reacción en suelo | Visual |
|---|---|---|---|---|---|
| Vapor | Fuego+Hielo | nube r 3→4 m, 4 s: Cegado 2 s (no atacan) | estallido + nube r 2,5 m 3 s | hielo + fuego ⇒ nube de vapor | nube blanca que se expande |
| Magma | Fuego+Tierra | Ardiendo + Lastrado; deja charco r 2 m 5 s (6/s + Lastrado) | Costra: inmóvil 1,5 s + charco | pinchos + fuego ⇒ charco de magma | suelo negro con grietas naranjas |
| Incendio | Aire+Fuego | Ardiendo 6 s | Ardiendo salta a todos a 4 m | llamas + aire ⇒ radio ×1,5 | llamas que se extienden |
| Escarcha eléctrica | Hielo+Rayo | Escarcha + Cargado; salta solo entre enemigos con Escarcha (máx. 4) | cadena (50 %) a todos con Escarcha/Congelado a 8 m | hielo + rayo ⇒ 1 Escarcha + 1 Cargado/s | arcos cian entre enemigos |
| Juicio | Luz+Rayo | Aturdido 1 s; rayo del cielo tras señal de 0,6 s | segundo rayo del cielo (0,6 s) | consagrado + rayo ⇒ 1 rayo/s al enemigo más cercano | columna dorada |
| Niebla negra | Aire+Sombra | nube r 3 m, 5 s: Cegado 3 s; dentro, los enemigos a > 6 m no te ven | nube 3 s sobre el objetivo | penumbra + aire ⇒ nube | humo púrpura |
Inestabilidad: Vapor es par opuesto ⇒ +30 (+15 tras descubrirla). Luz+Sombra (opuesto, sin reacción aquí) +30.

## 5. Tirada de inestabilidad (semilla `hash(semillaReceta, nºLanzamiento)`)
I = opuesto + mods agresivos, tope [0, 100]. Sobrecarga 0,25·I (×1,5 potencia); Contragolpe 0,5·I (el
jugador pierde 10 vida, número rojo "Contragolpe"); resto Normal. Círculo de runas: I < 20 estable, 20–50 parpadea (§2.11).

## 6. Hechizos precompuestos (los usa la demo automática)
| # | Nombre | Receta | Maná | Lanz. | Rec. | Daño | Estado | Demo lo usa cuando… |
|---|---|---|---|---|---|---|---|---|
| 1 | Ascua | Proyectil+[Fuego] | 18 | 0,4 | 1,0 | 18 + 24 (quemar) | Ardiendo | objetivo a > 4 m sin estado |
| 2 | Lanza gélida | Proyectil+[Hielo]+Multiplicar | 27 | 0,4 | 1,0 | 3 × 11 | 1 Escarcha c/u | prepara congelación |
| 3 | Destello sagrado | Yo+[Luz] | 20 | 0,5 | 8,0 | cura 30 | — | vida < 50 % |
| 4 | Estallido de vapor | Área+[Fuego,Hielo] | 34 | 0,9 | 5,0 | 48 | Cegado 2 s | ≥ 3 enemigos juntos (I 30/15) |
| 5 | Cadena helada | Proyectil+[Hielo,Rayo] | 26 | 0,5 | 1,25 | 40 | Escarcha + Cargado | ≥ 2 enemigos con Escarcha |
| 6 | Juicio | Área+[Luz,Rayo]+Potencia | 45 | 0,9 | 5,0 | 59 (89 a no-muertos) | Aturdido 1 s | jefe o esqueleto (I 10) |
| 7 | Charco de magma | Zona+[Fuego,Tierra] | 32 | 0,9 | 7,5 | 11,9/s × 6 s | Ardiendo + Lastrado | grupo cuerpo a cuerpo cerca |
| 8 | Aliento de incendio | Cono+[Aire,Fuego] | 28 | 0,4 | 2,5 | 32 en 5 m | Ardiendo 6 s | ≥ 2 enemigos a < 5 m |
| 9 | Niebla negra | Zona+[Aire,Sombra] | 32 | 0,9 | 7,5 | 11,9/s | Cegado 3 s | ≥ 2 goblins/cultistas disparando |
| 10 | Pedrada | Proyectil+[Tierra]+Persistencia | 24 | 0,4 | 1,0 | 18 (22 a esqueleto) | Lastrado + pinchos 4 s | prepara Magma (luego Ascua) |
Ranuras iniciales: página 1 = 1, 2, 3 (equivalen a los 3 de hoy); página 2 = 4, 5, 6.
La demo encadena reacciones a propósito: Pedrada→Ascua (Magma), Lanza gélida→Ascua (Vapor ×2), Lanza gélida→Cadena helada.
TTK orientativo (maná lleno): goblin 40 = 1 Estallido; esqueleto 60 = Pedrada + Ascua con reacción ≈ 2 s;
jefe 640 ≈ 30 s solo con magia (regen. 6/s limita: ~9 daño/s sostenido) ⇒ las armas siguen siendo necesarias.

## 7. Grimorio (DOM, pausa el juego)
- **Abrir:** tecla **B**, o en el menú de pausa (Esc / OPTIONS) la entrada **Grimorio**. Cerrar: B, Esc u ○.
- **Panel** de 5 columnas: Forma (5) · Núcleo (7; elegir 1–2, o el mismo dos veces) · Modificadores (3) ·
  Vista previa (nombre, maná, lanzamiento, recarga, daño contra cada tipo de enemigo, estados, % inestabilidad,
  círculo de runas animado) · Ranuras (6, en 2 páginas de 3) + lista de los 10 precompuestos.
- **Ratón:** clic alterna runa; clic en precompuesto lo carga; arrastrar la vista previa a una ranura (o clic en
  "Equipar" y luego en la ranura).
- **Teclado:** ←/→ columna, ↑/↓ elemento, Enter/Espacio alterna, 1–6 equipa en esa ranura, Supr vacía la receta.
- **Mando PS5:** cruceta navega, L1/R1 cambia de columna, ✕ alterna, □ vacía, △ "equipar" (luego cruceta elige ranura y ✕ confirma), ○ volver.
- **Nombre:** fusión ⇒ "<Forma> de <Fusión>"; un elemento ⇒ "<Forma> de <Elemento>" (+ "potente", "múltiple", "persistente").
- Sin renombrar ni guardar en disco (sí en `localStorage` si sobra tiempo).

**Lanzar (controles actuales intactos):** mando L2 mantener + □/△/○ = ranuras 1/2/3 de la página activa;
L2 + ▲/▼ cambia de página; L2 + ✕ = habilidad del arma (sin cambios); L2 soltado solo = ranura seleccionada;
cruceta ◀ ▶ = seleccionar ranura. Teclado Q/E/R = ranuras 1/2/3 (E conserva montar al mantener junto al caballo),
F = seleccionada, rueda = seleccionar, **Tab** = cambiar de página. El HUD muestra las 3 ranuras de la página
con icono por color del núcleo, coste y recarga; ranura vacía o sin maná se ve apagada.

## 8. Necesidades técnicas (para quien lo implemente)
- `SPELL` pasa a ser **derivado**: `compilar(receta) → {mana, lanz, rec, potencia, estados, I, nombre}` puro, sin Three.js.
- `P.cds` por ranura (no por elemento); recarga de reacción `e.reacCd`; estados en `e.est` (ardiendo, escarcha,
  congelado, iluminado, cargado, lastrado, maldito, desequilibrado, cegado). Las reglas viejas del arma
  (Hecho añicos del martillo, Terremoto ×2 a congelado) se mantienen leyendo `e.est.congelado`.
- `vfx.js` solo tiene `KINDS` fuego/escarcha/luz: añadir rayo, tierra, sombra, aire y que `castStart(kind, {inestabilidad})`
  acepte un color mezclado para fusiones. Juicio puede reutilizar `RAYOS.burst` u otro arco vertical.
- Suelos y nubes con pool fijo (máx. 2 zonas del jugador + 6 suelos de reacción; los más antiguos se apagan).
- RNG con semilla para la inestabilidad (no `Math.random`).

## 9. Criterios comprobables (Playwright, `?test=1`, `window.__GAME__.MAGIA`)
API esperada: `MAGIA.compilar(r)`, `MAGIA.equipar(slot, r)`, `MAGIA.lanzar(slot)`, `MAGIA.ranuras`, `MAGIA.pagina`,
`MAGIA.codice`, `MAGIA.estados(e)`, `MAGIA.semilla`, `MAGIA.precompuestos`, `MAGIA.abierto`.
| ID | Criterio |
|---|---|
| MQ-01 | `compilar` de los 10 precompuestos da exactamente maná/lanz./rec./daño de la tabla §6 |
| MQ-02 | Recetas inválidas rechazadas: sin forma, 0 o 3 piezas, Multiplicar fuera de Proyectil, Yo con 2 elementos, mod repetido |
| MQ-03 | `lanzar` resta el maná y fija la recarga de la ranura; sin maná o en recarga devuelve false y no cambia nada |
| MQ-04 | Proyectil de Hielo 3 veces a un esqueleto ⇒ `congelado` > 0; al jefe nunca lo congela 2 veces en 6 s |
| MQ-05 | Ascua sobre esqueleto congelado ⇒ daño = 18 × 2 (100 % extra) y el congelado se consume |
| MQ-06 | Reacción con recarga: 2 reacciones al mismo objetivo en < 1,5 s ⇒ solo cuenta la 1.ª |
| MQ-07 | Cada una de las 6 fusiones, lanzada como hechizo, aplica su estado y se añade a `codice` una sola vez |
| MQ-08 | Suelo de hielo + impacto de Fuego ⇒ el suelo pasa a `vapor`; pinchos + Fuego ⇒ `magma` |
| MQ-09 | Inestabilidad: Estallido de vapor I = 30 antes y 15 después de descubrir Vapor; Juicio I = 10 |
| MQ-10 | Misma semilla y nº de lanzamiento ⇒ mismo resultado de inestabilidad; 10 000 tiradas con I = 50 ⇒ sobrecarga 12,5 % y contragolpe 25 % (± 1 %) |
| MQ-11 | Máx. 2 Zonas activas: la 3.ª apaga la más antigua |
| MQ-12 | Grimorio: B abre y pausa (`paused` true); equipar en ranura 4 y cambiar página ⇒ Q lanza ese hechizo |
| MQ-13 | L2 + ✕ sigue disparando la habilidad del arma con el grimorio activo |
| MQ-14 | La demo automática lanza ≥ 6 hechizos distintos y provoca ≥ 2 reacciones distintas en 90 s (semilla fija) |
