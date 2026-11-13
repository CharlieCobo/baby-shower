# Mapa escenario → test

Cada escenario de las specs tiene al menos un test. Tipos:

- `rules`: reglas de Firestore contra el emulador (`tests/rules/`, `pnpm test:rules`).
- `unit`: Vitest + Testing Library (`tests/unit/`, `pnpm test`).
- `e2e`: Playwright contra los emuladores (`tests/e2e/`).
- `manual`: verificación a mano con checklist (al final), solo si no es automatizable.

Estado: ✅ cubierto · ⏳ pendiente (se indica la tarea que lo cubrirá).

Abreviaturas de ficheros:

- Reglas: `GR` = `tests/rules/gift-registry.rules.test.ts`, `RS` = `tests/rules/rsvp.rules.test.ts`, `AD` = `tests/rules/admin.rules.test.ts`, `EI` = `tests/rules/event-info.rules.test.ts`.
- Adaptadores de Firestore contra el emulador (con reglas): `FA` = `tests/rules/firestore-adapters.test.ts` (tipo `rules`).
- Unitarios: `DG` = `tests/unit/domain-gift.test.ts`, `DE` = `tests/unit/domain-event.test.ts`, `DR` = `tests/unit/domain-rsvp.test.ts`, `UC` = `tests/unit/use-cases.test.ts`, `CAL` = `tests/unit/calendar.test.ts`, `FMT` = `tests/unit/format.test.ts`.
- Páginas (Testing Library + backend en memoria): `IP` = `tests/unit/invitation-page.test.tsx`, `GP` = `tests/unit/gifts-page.test.tsx`, `RP` = `tests/unit/rsvp-page.test.tsx`, `RT` = `tests/unit/router.test.tsx`.

## event-info

| Escenario | Tipo | Test | Estado |
|---|---|---|---|
| Datos del evento | rules | `EI` › Datos del evento: cualquier visitante lee… / un cliente no admin no puede escribir… | ✅ |
| Datos del evento | rules | `FA` › Datos del evento: lee y convierte las fechas | ✅ |
| Datos del evento | unit | `IP` › Datos del evento · tiene los dos CTA | ✅ |
| Evento sin configurar | rules | `EI` › Evento sin configurar: leer config/event inexistente… | ✅ |
| Evento sin configurar | rules / unit | `FA` › Evento sin configurar: devuelve null · `UC` › getEvent | ✅ |
| Evento sin configurar | unit | `IP` › Evento sin configurar: "Pronto más detalles" | ✅ |
| Fechas en hora de Madrid | unit | `tests/unit/dates.test.ts` › parseEventDateTime / rsvpDeadlineFromDay | ✅ |
| Fechas en hora de Madrid | unit | `FMT` › formatea en Europe/Madrid aunque el dispositivo esté en otra zona · `IP` › Datos del evento (17:00 h) | ✅ |
| Navegación entre secciones | unit | `RT` › Navegación entre secciones: barra inferior con la sección actual resaltada | ✅ |
| Apertura desde WhatsApp en móvil | manual | Checklist M1 (revisión automática a 360 px hecha; falta en móviles reales) | ⏳ 6.3 |
| Cuenta atrás | unit | `DE` › Cuenta atrás: días naturales de Madrid · `IP` › Cuenta atrás | ✅ |
| Día del evento | unit | `DE` › Día del evento: "¡Es hoy!" · `IP` › Día del evento | ✅ |
| Evento pasado | unit | `DE` › Evento pasado: no se muestra · `IP` › Evento pasado | ✅ |
| Descarga del .ics | unit | `CAL` › Descarga del .ics · enlace de Google Calendar · `IP` › Añadir al calendario | ✅ |
| Enlace compartido | manual | Checklist M2 (imagen generada con `pnpm og` a partir de la plantilla de Stitch) | ⏳ 6.3 |

## gift-registry

| Escenario | Tipo | Test | Estado |
|---|---|---|---|
| Regalo sin imagen | unit | `GP` › Regalo sin imagen: muestra el icono de su categoría | ✅ |
| Visitante abre la lista | rules | `GR` › cualquier visitante, incluso sin sesión, puede leer los regalos | ✅ |
| Visitante abre la lista | unit | `DG` › visibleGifts · `UC` › listGifts · la sesión anónima se crea una sola vez y en silencio | ✅ |
| Visitante abre la lista | unit | `GP` › Visitante abre la lista: solo activos, con unidades restantes y precio | ✅ |
| Regalo agotado | unit | `DG` › Regalo agotado: "Ya reservado" · `UC` › Regalo agotado: no se intenta reservar | ✅ |
| Regalo agotado | unit | `GP` › Regalo agotado: "Ya reservado", sin botón y sin datos de quién | ✅ |
| Prioridad de estados de la tarjeta | unit | `DG` › Prioridad de estados | ✅ |
| Regalo agotado con reserva propia | unit | `DG` › Regalo agotado con reserva propia | ✅ |
| Actualización en tiempo real | unit / rules | `UC` › listGifts (otro invitado reserva) · `FA` › watchAll recibe los cambios de otros invitados | ✅ |
| Actualización en tiempo real | e2e | Otro contexto reserva y la lista se actualiza sin recargar | ⏳ 6.1 |
| Filtro por categoría | unit | `DG` › filtra por categoría · "Solo disponibles" | ✅ |
| Filtro por categoría | unit | `GP` › Filtro por categoría y "Solo disponibles" | ✅ |
| Reserva correcta | rules | `GR` › Reserva correcta: crea la reserva e incrementa el contador… | ✅ |
| Reserva correcta | unit / rules | `UC` › Reserva correcta · `FA` › Reserva correcta y Liberar reserva propia | ✅ |
| Reserva correcta | e2e | Reservar desde la UI | ⏳ 6.1 |
| Persistencia entre visitas | rules | `GR` › Persistencia entre visitas: el invitado puede consultar sus propias reservas | ✅ |
| Persistencia entre visitas | unit / rules | `UC` › watchMyReservations · `FA` › watchMine devuelve solo las propias | ✅ |
| Persistencia entre visitas | e2e | Recargar y seguir viendo "Lo traes tú" | ⏳ 6.1 |
| Carrera por la última unidad | rules | `GR` › Carrera por la última unidad / no se puede reservar por encima de la cantidad | ✅ |
| Carrera por la última unidad | unit / rules | `UC` › si otro se adelanta, falla con sold-out · `FA` › el segundo recibe sold-out · reservas simultáneas: solo una se completa | ✅ |
| Carrera por la última unidad | e2e | 2 contextos reservan la última unidad; mensaje "Vaya, alguien se te ha adelantado" | ⏳ 6.1 |
| Reserva duplicada desde el mismo dispositivo | rules | `GR` › Reserva duplicada desde el mismo dispositivo | ✅ |
| Reserva duplicada desde el mismo dispositivo | unit / rules | `UC` › Reserva duplicada · `FA` › Reserva duplicada: las reglas la rechazan | ✅ |
| Reserva duplicada desde el mismo dispositivo | unit | `GP` › Reserva correcta (la tarjeta pasa a "Lo traes tú" sin botón de reservar) | ✅ |
| Liberar reserva propia | rules | `GR` › Liberar reserva propia | ✅ |
| Liberar reserva propia | unit / rules | `UC` › Liberar reserva propia · `FA` › Reserva correcta y Liberar reserva propia | ✅ |
| Liberar reserva propia | e2e | Liberar desde la UI | ⏳ 6.1 |
| Intento de liberar una reserva ajena | rules | `GR` › Intento de liberar una reserva ajena / …junto con la propia en el mismo batch / decrementar sin borrar / borrar sin decrementar · `FA` › Intento de liberar una reserva ajena | ✅ |
| Dispositivo distinto | rules | `GR` › Dispositivo distinto: un UID nuevo no ve las reservas anteriores | ✅ |
| Dispositivo distinto | unit | `UC` › Dispositivo distinto: no puede liberar la reserva hecha desde otro | ✅ |
| Dispositivo distinto | unit | `GP` › Dispositivo distinto: texto de ayuda | ✅ |
| Manipulación desde la consola del navegador | rules | `GR` › un invitado no puede cambiar title / quantity / active · no puede crear ni borrar regalos | ✅ |
| Incremento sin reserva | rules | `GR` › Incremento sin reserva · crear la reserva sin incrementar · el contador no puede saltar más de 1 | ✅ |
| Lista cerrada en la UI | unit | `DG` › Lista cerrada en la UI: los propios siguen siendo "Lo traes tú", sin liberar | ✅ |
| Lista cerrada en la UI | unit | `GP` › Lista cerrada en la UI: sin acciones, con mensaje, y las propias siguen como "Lo traes tú" | ✅ |
| Reserva tras el cierre | rules / unit | `GR` › Reserva tras el cierre · Liberar tras el cierre · `UC` › Reserva tras el cierre · Liberar tras el cierre · `FA` › Reserva tras el cierre | ✅ |
| Sin fecha de cierre | rules | `GR` › Sin fecha de cierre · sin documento config/event | ✅ |
| Sin fecha de cierre | unit | `DE` › Sin fecha de cierre: la lista permanece abierta | ✅ |
| Lectura de reservas ajenas | rules | `GR` › Lectura de reservas ajenas · un invitado no puede leer una reserva ajena por su id | ✅ |

## rsvp

| Escenario | Tipo | Test | Estado |
|---|---|---|---|
| RSVP válido | rules | `RS` › RSVP válido · RSVP válido sin campos opcionales y sin asistir | ✅ |
| RSVP válido | unit / rules | `UC` › RSVP válido · `FA` › RSVP válido y Cambiar la respuesta pasan las reglas | ✅ |
| RSVP válido | unit | `RP` › RSVP válido: guarda y muestra la pantalla de gracias con enlace a regalos | ✅ |
| RSVP válido | e2e | E2E RSVP | ⏳ 6.1 |
| Validación en cliente | unit | `DR` › validateRsvp · `UC` › Validación en cliente: devuelve los errores y no guarda nada | ✅ |
| Validación en cliente | unit | `RP` › Validación en cliente: errores junto al campo y no se envía · no permite más de 10 acompañantes | ✅ |
| Cambiar la respuesta | rules / unit | `RS` › Cambiar la respuesta: sobrescribe el mismo documento · `UC` › Cambiar la respuesta | ✅ |
| Formulario precargado en el mismo navegador | unit | `RP` › Formulario precargado: "Cambiar mi respuesta" · al volver a /asistencia sale precargado | ✅ |
| Formulario vacío en otro dispositivo | rules | `RS` › Formulario vacío en otro dispositivo | ✅ |
| Formulario vacío en otro dispositivo | unit | `RP` › Formulario vacío en otro dispositivo | ✅ |
| RSVP fuera de plazo | rules | `RS` › RSVP fuera de plazo · dentro del plazo · sin config/event | ✅ |
| RSVP fuera de plazo | unit / rules | `DE` › isRsvpOpen · `UC` › RSVP fuera de plazo · `FA` › RSVP fuera de plazo | ✅ |
| RSVP fuera de plazo | unit | `RP` › RSVP fuera de plazo: formulario deshabilitado con mensaje | ✅ |
| Lectura de la lista de asistentes | rules | `RS` › Lectura de la lista de asistentes · ni su propio RSVP · no puede borrar | ✅ |
| Escritura en el RSVP de otro | rules | `RS` › Escritura en el RSVP de otro | ✅ |
| Campos no permitidos | rules | `RS` › Campos no permitidos (9 casos) · en el límite | ✅ |
| Acompañantes sin asistir | rules | `RS` › Acompañantes sin asistir | ✅ |
| Fecha manipulada | rules | `RS` › Fecha manipulada | ✅ |

## admin

| Escenario | Tipo | Test | Estado |
|---|---|---|---|
| Admin autorizado | rules | `AD` › Admin autorizado: puede leer los datos privados | ✅ |
| Admin autorizado | unit / e2e | Guard de `/admin` con allowlist | ⏳ 5.1 |
| Usuario no autorizado | rules | `AD` › Usuario no autorizado: las reglas rechazan cualquier lectura… | ✅ |
| Usuario no autorizado | e2e | Pantalla "No tienes acceso" | ⏳ 6.1 |
| Comprobación de admin desde el cliente | rules | `AD` › solo funciona con email verificado en la allowlist · nadie puede escribir config/admins · sin config/admins nadie es admin | ✅ |
| Datos de regalo inválidos | rules | `AD` › Datos de regalo inválidos (9 casos) | ✅ |
| Datos de regalo inválidos | unit | Errores en el formulario "Editar regalo" | ⏳ 5.3 |
| Reducir cantidad por debajo de lo reservado | rules | `AD` › Reducir cantidad por debajo de lo reservado | ✅ |
| Reducir cantidad por debajo de lo reservado | unit | La UI lo impide e indica las unidades reservadas | ⏳ 5.3 |
| Editar un regalo mientras alguien reserva | rules | `AD` › Editar un regalo mientras alguien reserva · Editar con un reservedCount desfasado | ✅ |
| Crear un regalo | rules | `AD` › Crear un regalo: se guarda con reservedCount 0 · …rechazan crearlo con reservas | ✅ |
| Borrar un regalo con reservas | rules | `AD` › Borrar un regalo con reservas | ✅ |
| Borrar un regalo con reservas | unit | Confirmación antes de borrar | ⏳ 5.3 |
| Cambiar la fecha límite de RSVP | rules | `AD` › Cambiar la fecha límite de RSVP: las reglas aplican el nuevo plazo | ✅ |
| La fecha límite incluye el día completo | unit | `tests/unit/dates.test.ts` › rsvpDeadlineFromDay (verano, invierno, cambio de hora) | ✅ |
| Datos del evento inválidos | rules | `AD` › Datos del evento inválidos (4 casos) · nadie puede borrar config/event | ✅ |
| Ver reservas de un regalo | rules | `AD` › Ver reservas de un regalo | ✅ |
| Ver reservas de un regalo | unit | Filas anónimas "Reserva · fecha, hora" con "Liberar" | ⏳ 5.4 |
| Liberar una reserva huérfana | rules | `AD` › Liberar una reserva huérfana · con la lista cerrada · sin bajar el contador se rechaza | ✅ |
| Exportar asistentes | unit | Generación del CSV | ⏳ 5.2 |

## Checklists manuales

### M1 · Apertura desde WhatsApp en móvil (360 px)
- [x] Revisión automática a 360 px con Playwright contra emuladores (2026-11-14): sin scroll horizontal en `/`, `/regalos` y `/asistencia`, sin errores de consola, reserva persistente tras recargar.
- [ ] Abrir el enlace desde WhatsApp en Android y en iPhone.
- [ ] En 360 px de ancho: sin scroll horizontal ni zoom; título, fecha, lugar y los dos CTA visibles y pulsables.
- [ ] La barra inferior no tapa contenido ni el botón de enviar.

### M2 · Vista previa al compartir
- [ ] Pegar `https://charliecobo.github.io/baby-shower/` en WhatsApp: aparece la imagen 600×900, el título y la descripción.
- [ ] Comprobar también en el depurador de Open Graph (p. ej. opengraph.xyz).
