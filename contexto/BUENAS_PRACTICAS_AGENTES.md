# Buenas prácticas de agentes aplicadas a este proyecto

Resumen de lo investigado y de cómo se aplica aquí.

## 1. Patrones simples y componibles antes que frameworks complejos
Anthropic ("Building effective agents") observa que los sistemas que mejor funcionan usan patrones
sencillos: encadenamiento de prompts, enrutado, paralelización, orquestador-trabajadores y
evaluador-optimizador. **Aquí:**
- `iniciar` es un **encadenamiento con puertas** (optimizador → diseño → arquitectura → plan → scaffolding);
  el script comprueba que cada fase dejó su fichero antes de seguir, y puedes pedir aprobación humana entre fases.
- Cada sesión de construcción es **orquestador-trabajadores**: las subtareas no están predefinidas, el
  orquestador las decide según la feature.
- `qa-tester` + `revisor-codigo` forman el bucle **evaluador-optimizador** (máx. 2 iteraciones).

## 2. Agentes de larga duración: la memoria se externaliza en ficheros
Cada sesión empieza sin memoria de la anterior ("Effective harnesses for long-running agents"). Solución:
- `estado/feature_list.json`: lista exhaustiva de features con `passes: false`. Evita que el agente
  intente hacerlo todo de golpe o declare el proyecto terminado antes de tiempo. Es JSON y no Markdown
  porque el modelo tiende menos a reescribirlo. Solo se modifican `passes`/`intentos`/`notas`, y el
  harness Python **lo hace cumplir** (restaura cualquier otro cambio).
- `estado/PROGRESO.md` + historial de git: el "parte de relevo" entre turnos.
- `scripts/init.sh` y `scripts/verificar.sh`: arrancar y comprobar el entorno siempre igual.
- Protocolo de inicio: `pwd` → git log → progreso → feature list → verificación rápida → elegir UNA feature.
- Verificación de extremo a extremo con navegador (Playwright), no solo tests unitarios.

## 3. Subagentes bien definidos
- `description` concreta y orientada a la acción: el orquestador decide a quién delegar leyéndola.
- Herramientas mínimas: el revisor no puede escribir; el diseñador no ejecuta Bash.
- Modelo según la tarea: razonamiento pesado (arquitectura, plan) → opus; implementación → sonnet;
  tareas mecánicas (diario de progreso) → haiku.
- Ventana de contexto aislada: pasa rutas, no ficheros pegados; pide respuestas resumidas.

## 4. Herramientas y entorno > ajustar prompts
Invertir en buenas herramientas (scripts de verificación, hooks de seguridad, `window.__GAME__` para
inspeccionar el estado del juego) da más fiabilidad que retocar prompts.

## 5. Seguridad y control humano
- Hook `PreToolUse` que bloquea comandos destructivos (`rm -rf /`, `git push --force`, `sudo`, `curl | sh`).
- `permission_mode="acceptEdits"`: edita sin preguntar, pero Bash fuera de la lista permitida pide permiso
  en Claude Code.
- Presupuesto máximo por sesión (`--presupuesto`) y número máximo de turnos.
- Commits pequeños: cualquier sesión se puede deshacer con git.

## Fuentes
- https://www.anthropic.com/engineering/building-effective-agents
- https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- https://code.claude.com/docs/en/agent-sdk/subagents
- https://code.claude.com/docs/en/sub-agents
