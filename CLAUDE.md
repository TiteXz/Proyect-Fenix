# Proyecto: videojuego web 3D construido por un equipo de agentes

Este fichero se carga en TODAS las sesiones (orquestador y subagentes). Es corto a propósito:
el detalle vive en los ficheros enlazados. Léelos bajo demanda, no todos de golpe.

## Mapa del repositorio
| Ruta | Qué es | Quién lo escribe |
|---|---|---|
| `contexto/CONTEXTO_PROYECTO.md` | Fuente de verdad: visión, alcance, restricciones, stack | optimizador-prompt (y humano) |
| `contexto/ORQUESTADOR.md` | Procedimiento del orquestador | humano |
| `contexto/BUENAS_PRACTICAS_*.md` | Referencia de agentes y de juegos web 3D | humano |
| `docs/GDD.md` | Documento de diseño del juego | disenador-juego |
| `docs/COMBATE.md` | Armas, magias, enemigos y balance | disenador-combate |
| `docs/ARQUITECTURA.md` + `estado/decisiones/ADR-*.md` | Arquitectura técnica y decisiones | arquitecto |
| `docs/GUIA_VISUAL.md` | Dirección de arte, paleta, materiales, pipeline de assets | director-arte |
| `juego/public/assets/` + `CREDITOS.md` | Modelos, texturas y su licencia | artista-3d |
| `docs/GUIA_UI.md` | HUD, menús, flujo de pantallas, accesibilidad | interfaz-ui |
| `estado/feature_list.json` | Backlog verificable (la definición de "terminado") | planificador |
| `estado/PROGRESO.md` | Diario de sesiones, solo se añade al final | guardian-contexto |
| `juego/` | Código del juego (Vite + TypeScript + Three.js) | programadores |
| `prototipo/` | Maqueta visual de referencia (estilo, combate, `vfx/vfx.js` de hechizos con runas); no es el juego | humano / director-arte |
| `scripts/init.sh` / `scripts/verificar.sh` | Arranque del entorno / verificación completa | arquitecto |

## Reglas de oro (no negociables)
1. **Una feature por sesión.** Se elige la de mayor prioridad con `passes: false` y dependencias cumplidas.
2. **"Terminado" = verificado.** Solo se pone `passes: true` tras ejecutar `scripts/verificar.sh`
   y los `pasos_verificacion` de la feature (tests + navegador). Nunca por intuición.
3. **En `feature_list.json` solo se tocan `passes`, `intentos` y `notas`.** Títulos, descripciones y
   criterios son inmutables fuera de una replanificación explícita. Si algo no cuadra, se anota en `notas`.
4. **Repo limpio al terminar:** compila, tests en verde, commit pequeño y descriptivo
   (`feat(F-012): salto con coyote time`). Nada a medias sin commitear.
5. **Pregunta antes de inventar:** si el GDD o la arquitectura no cubren algo, decide lo mínimo,
   regístralo como ADR o en `notas` y sigue. No reescribas documentos de otro rol.
6. **Contexto mínimo:** cada subagente recibe solo lo que necesita (rutas concretas, no "lee todo").

## Estilo visual (afecta a todos los roles)
**Fantasía realista luminosa** (no fantasía oscura) con referencias de tono en *Ghost of Tsushima* y *Dragon's Dogma 2*:
mundo vivo y colorido, materiales PBR, ciclo día/noche e iluminación cinematográfica. **Nunca low-poly ni cartoon** en el arte final.
Son referencias de sensación: no se copia ningún personaje, nombre, lugar, UI ni asset de esos juegos.
Detalle en `contexto/CONTEXTO_PROYECTO.md` y `docs/GUIA_VISUAL.md`.

## Convenciones de código (resumen; detalle en docs/ARQUITECTURA.md)
- TypeScript estricto. Módulos ES. Sin `any` salvo justificado.
- Bucle con **paso fijo** para la simulación (p. ej. 60 Hz) y render interpolado; la lógica no depende del FPS.
- **Lógica separada del render:** sistemas puros sobre datos; Three.js solo en la capa de render.
- **Determinismo para tests:** RNG con semilla, `?test=1` permite avanzar frames a mano,
  y en dev/test se expone `window.__GAME__` (estado legible) para Playwright.
- Sin asignaciones en el bucle caliente (reutiliza `Vector3`, pools de objetos). `dispose()` de todo lo que se crea.
- UI en DOM/HTML encima del canvas, no dibujada en WebGL salvo que el GDD lo pida.

## Equipo de agentes (`.claude/agents/`)
| Agente | Úsalo para |
|---|---|
| optimizador-prompt | Convertir una idea o petición vaga en un brief preciso |
| arquitecto | Stack, estructura de carpetas, patrones, ADRs, scripts de entorno |
| planificador | Crear/replanificar `feature_list.json` (hitos, dependencias, criterios) |
| disenador-juego | Mecánicas, reglas, progresión, niveles → `docs/GDD.md` |
| disenador-combate | Armas, magias, elementos, enemigos, fórmulas de daño y balance → `docs/COMBATE.md` |
| director-arte | Estilo visual, iluminación, materiales, assets glTF → `docs/GUIA_VISUAL.md` |
| artista-3d | Conseguir/generar modelos, animaciones y texturas gratuitos (CC0, procedurales) y optimizarlos |
| interfaz-ui | Diseñar e implementar HUD, menús, pausa, ajustes, accesibilidad |
| programador-motor | Bucle, render, cámara, input, física, carga de assets, escenas |
| programador-gameplay | Entidades, componentes y sistemas de juego concretos |
| audio | Música, efectos, mezcla, Web Audio |
| optimizador-rendimiento | FPS, draw calls, memoria, tamaño de bundle |
| qa-tester | Tests unitarios y e2e (Playwright), verificación de features |
| revisor-codigo | Revisión de solo lectura antes de cerrar una feature |
| guardian-contexto | Actualizar PROGRESO.md, mantener el contexto conciso y coherente |
