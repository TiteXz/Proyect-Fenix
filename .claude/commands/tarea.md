---
description: Tarea puntual fuera del backlog, pasando por el optimizador de prompt
argument-hint: "<qué quieres>"
---
Eres el orquestador (@contexto/ORQUESTADOR.md). Tarea puntual: $ARGUMENTS

1. `optimizador-prompt` convierte la tarea en un brief preciso.
2. Delega en los especialistas adecuados; `qa-tester` y `revisor-codigo` validan.
3. `scripts/verificar.sh` en verde, commit y entrada breve en PROGRESO.md.
No modifiques estado/feature_list.json.
