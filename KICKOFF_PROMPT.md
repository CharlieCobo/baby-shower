Vamos a construir la web del baby shower siguiendo OpenSpec.

1. Lee el contexto del proyecto en `openspec/config.yaml` y todo `openspec/changes/add-baby-shower-site/` (proposal, design, specs, tasks).
2. Ejecuta `openspec validate add-baby-shower-site --strict` y corrige cualquier problema de formato antes de empezar.
3. Antes de escribir código, dime si ves huecos o contradicciones entre specs y design, y resuelve conmigo las "Open Questions" de `design.md`.
4. Implementa `tasks.md` en orden, sección por sección. Al terminar cada sección:
   - marca las tareas como `[x]`,
   - ejecuta tests y lint,
   - para y resúmeme qué has hecho antes de seguir.
5. Reglas no negociables:
   - La sección 2 (reglas de Firestore + tests en emulador) va ANTES que cualquier UI.
   - Cada escenario de las specs debe tener al menos un test (reglas, unitario o E2E; o `manual` con checklist solo si no es automatizable). Mantén un mapa escenario → test en `openspec/changes/add-baby-shower-site/test-map.md`.
   - La UI nunca importa el SDK de Firebase directamente: solo a través de los adaptadores.
   - Textos de UI en español en `src/i18n/es.ts`, tono cercano y cálido.
6. Cuando todo esté en verde y desplegado, propón `openspec archive add-baby-shower-site`.
