# Equipo de agentes para construir un videojuego web 3D

Un **orquestador** que reparte el trabajo entre 15 subagentes especializados y construye el juego
**una feature verificada cada vez**, guardando la memoria del proyecto en ficheros para que cada
sesión pueda continuar donde lo dejó la anterior.

```
                    ┌──────────────────────────┐
     tu idea ─────▶ │       ORQUESTADOR        │ ◀── contexto/ORQUESTADOR.md
                    │ (orchestrator-workers)   │
                    └──────────┬───────────────┘
   inicio (cadena con puertas) │ cada sesión (una feature)
  ┌────────────────────────────┼───────────────────────────────────────────┐
  ▼                            ▼                                           ▼
optimizador-prompt     programador-motor / programador-gameplay      qa-tester ─┐ evaluador-
disenador-juego        interfaz-ui / audio / director-arte           revisor ───┘ optimizador
disenador-combate      optimizador-rendimiento
director-arte       artista-3d      guardian-contexto
interfaz-ui (doc)
arquitecto ─▶ planificador ─▶ estado/feature_list.json  (la definición de "terminado")
```

## Estructura
```
CLAUDE.md                     reglas comunes (se carga en todas las sesiones)
.claude/agents/*.md           los 15 subagentes (frontmatter: name, description, tools, model)
.claude/commands/*.md         /iniciar /siguiente /tarea /estado para Claude Code
.claude/settings.json         permisos de Bash permitidos/denegados
contexto/                     contexto del proyecto, procedimiento del orquestador, buenas prácticas
docs/                         GDD, arquitectura, guías visual y de UI (las escriben los agentes)
estado/feature_list.json      backlog verificable (lo crea el planificador)
estado/PROGRESO.md            diario de relevo entre sesiones
estado/decisiones/            ADRs
orquestador/                  harness en Python con el Claude Agent SDK
scripts/init.sh, verificar.sh arranque y verificación del entorno
juego/                        el juego (lo crea la feature F-001)
```

## Opción A — dentro de Claude Code (lo más rápido)
```bash
cd agente-juego-3d && git init && git add -A && git commit -m "plantilla"
claude
> /iniciar un plataformas 3D low-poly donde un zorro recoge cristales en islas flotantes
> /siguiente          # repítelo; cada vez cierra una feature con tests y commit
> /tarea añade un selector de calidad gráfica en ajustes
> /estado
```
Claude Code detecta automáticamente los subagentes de `.claude/agents/` y lee `CLAUDE.md`.

## Opción B — harness autónomo en Python (sesiones sin supervisión)
```bash
pip install -r orquestador/requirements.txt     # requiere Claude Code instalado y autenticado
python orquestador/orquestador.py agentes        # comprueba que carga los 15 subagentes
python orquestador/orquestador.py iniciar "tu idea" --aprobar   # pausa para revisar cada fase
python orquestador/orquestador.py bucle --max 5 --presupuesto 5
python orquestador/orquestador.py estado         # progreso sin gastar tokens
python orquestador/orquestador.py replanificar "añade un modo contrarreloj"
```
Lo que añade el harness respecto a la opción A:
- **Puertas** entre fases de `iniciar`: si una fase no deja su fichero, se para.
- **Guardia del backlog:** tras cada sesión restaura cualquier cambio en `feature_list.json` que no
  sea `passes/intentos/notas`; las features nuevas que se invente un agente van a
  `estado/features_propuestas.json` para que las revises.
- **Hook de seguridad** que bloquea `rm -rf /`, `git push --force`, `git reset --hard`, `sudo`, `curl | sh`…
- **Corte automático** si hay dos sesiones seguidas sin progreso, y tope de presupuesto/turnos.

## Cómo personalizarlo
- **Añadir un rol** (p. ej. `narrativa`, `red-multijugador`, `niveles`): crea `.claude/agents/<nombre>.md`
  con una `description` que diga *cuándo* usarlo y añádelo a la tabla de `CLAUDE.md`.
- **Abaratar:** cambia `model: opus` por `sonnet` en arquitecto/planificador/diseñador, o usa `--modelo sonnet`.
- **Más control humano:** usa `/siguiente` en Claude Code en lugar del `bucle`, o `--aprobar`.
- **Otro stack** (React Three Fiber, Babylon.js, PlayCanvas): cámbialo en `contexto/CONTEXTO_PROYECTO.md`
  antes de `iniciar`; el arquitecto lo recogerá en un ADR.

## Por qué está hecho así
Ver `contexto/BUENAS_PRACTICAS_AGENTES.md` y `contexto/BUENAS_PRACTICAS_JUEGOS_WEB_3D.md`.
