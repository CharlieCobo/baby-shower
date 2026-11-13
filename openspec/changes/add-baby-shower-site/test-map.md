# Mapa escenario → test

Cada escenario de las specs tiene al menos un test. Tipos:

- `rules`: reglas de Firestore contra el emulador (`tests/rules/`, `pnpm test:rules`).
- `unit`: Vitest + Testing Library (`tests/unit/`, `pnpm test`).
- `e2e`: Playwright contra los emuladores (`tests/e2e/`).
- `manual`: verificación a mano con checklist (al final), solo si no es automatizable.

Estado: ✅ cubierto · ⏳ pendiente (se indica la tarea que lo cubrirá).

Abreviaturas de ficheros: `GR` = `tests/rules/gift-registry.rules.test.ts`, `RS` = `tests/rules/rsvp.rules.test.ts`, `AD` = `tests/rules/admin.rules.test.ts`, `EI` = `tests/rules/event-info.rules.test.ts`.

## event-info

| Escenario | Tipo | Test | Estado |
|---|---|---|---|
| Datos del evento | rules | `EI` › Datos del evento: cualquier visitante lee… / un cliente no admin no puede escribir… | ✅ |
| Datos del evento | unit | Landing con los datos de `config/event` | ⏳ 4.2 |
| Evento sin configurar | rules | `EI` › Evento sin configurar: leer config/event inexistente… | ✅ |
| Evento sin configurar | unit | Landing con "Pronto más detalles" | ⏳ 4.2 |
| Fechas en hora de Madrid | unit | `tests/unit/dates.test.ts` › parseEventDateTime / rsvpDeadlineFromDay | ✅ |
| Fechas en hora de Madrid | unit | Formato de fechas en la landing con otra zona horaria | ⏳ 4.2 |
| Navegación entre secciones | unit | `tests/unit/router.test.tsx` › las páginas de invitados muestran la barra… | ✅ |
| Apertura desde WhatsApp en móvil | manual | Checklist M1 | ⏳ 4.5 / 6.3 |
| Cuenta atrás | unit | Estado de la cuenta atrás (días restantes) | ⏳ 3.1 |
| Día del evento | unit | Estado de la cuenta atrás ("¡Es hoy!") | ⏳ 3.1 |
| Evento pasado | unit | Estado de la cuenta atrás (oculta) | ⏳ 3.1 |
| Descarga del .ics | unit | Generación del `.ics` (título, fechas Europe/Madrid, ubicación) | ⏳ 4.2 |
| Enlace compartido | manual | Checklist M2 | ⏳ 4.2 / 6.3 |

## gift-registry

| Escenario | Tipo | Test | Estado |
|---|---|---|---|
| Regalo sin imagen | unit | Tarjeta con icono de categoría | ⏳ 4.3 |
| Visitante abre la lista | rules | `GR` › cualquier visitante, incluso sin sesión, puede leer los regalos | ✅ |
| Visitante abre la lista | unit | Sesión anónima silenciosa + solo regalos activos | ⏳ 3.3 / 4.1 |
| Regalo agotado | unit | `giftDisplayState` → "Ya reservado"; tarjeta sin botón ni datos de quién | ⏳ 3.1 / 4.3 |
| Prioridad de estados de la tarjeta | unit | `giftDisplayState` con varias condiciones a la vez | ⏳ 3.1 |
| Regalo agotado con reserva propia | unit | `giftDisplayState` → "Lo traes tú" | ⏳ 3.1 |
| Actualización en tiempo real | e2e | Otro contexto reserva y la lista se actualiza sin recargar | ⏳ 6.1 |
| Filtro por categoría | unit | Filtro por categoría y "Solo disponibles" | ⏳ 4.3 |
| Reserva correcta | rules | `GR` › Reserva correcta: crea la reserva e incrementa el contador… | ✅ |
| Reserva correcta | unit / e2e | Caso de uso `reserveGift` (in-memory) · E2E reservar | ⏳ 3.3 / 6.1 |
| Persistencia entre visitas | rules | `GR` › Persistencia entre visitas: el invitado puede consultar sus propias reservas | ✅ |
| Persistencia entre visitas | e2e | Recargar y seguir viendo "Lo traes tú" | ⏳ 6.1 |
| Carrera por la última unidad | rules | `GR` › Carrera por la última unidad / no se puede reservar por encima de la cantidad | ✅ |
| Carrera por la última unidad | e2e | 2 contextos reservan la última unidad; mensaje "Vaya, alguien se te ha adelantado" | ⏳ 6.1 |
| Reserva duplicada desde el mismo dispositivo | rules | `GR` › Reserva duplicada desde el mismo dispositivo | ✅ |
| Reserva duplicada desde el mismo dispositivo | unit | `reserveGift` rechaza el duplicado; la UI no ofrece la acción | ⏳ 3.3 / 4.3 |
| Liberar reserva propia | rules | `GR` › Liberar reserva propia | ✅ |
| Liberar reserva propia | unit / e2e | Caso de uso `releaseGift` · E2E liberar | ⏳ 3.3 / 6.1 |
| Intento de liberar una reserva ajena | rules | `GR` › Intento de liberar una reserva ajena / …junto con la propia en el mismo batch / decrementar sin borrar / borrar sin decrementar | ✅ |
| Dispositivo distinto | rules | `GR` › Dispositivo distinto: un UID nuevo no ve las reservas anteriores | ✅ |
| Dispositivo distinto | unit | Texto de ayuda para contactar con los anfitriones | ⏳ 4.3 |
| Manipulación desde la consola del navegador | rules | `GR` › un invitado no puede cambiar title / quantity / active · no puede crear ni borrar regalos | ✅ |
| Incremento sin reserva | rules | `GR` › Incremento sin reserva · crear la reserva sin incrementar · el contador no puede saltar más de 1 | ✅ |
| Lista cerrada en la UI | unit | Lista sin acciones + mensaje; reservas propias como "Lo traes tú" | ⏳ 3.1 / 4.3 |
| Reserva tras el cierre | rules | `GR` › Reserva tras el cierre · Liberar tras el cierre | ✅ |
| Sin fecha de cierre | rules | `GR` › Sin fecha de cierre · sin documento config/event | ✅ |
| Sin fecha de cierre | unit | `isRegistryOpen` sin `registryClosesAt` | ⏳ 3.1 |
| Lectura de reservas ajenas | rules | `GR` › Lectura de reservas ajenas · un invitado no puede leer una reserva ajena por su id | ✅ |

## rsvp

| Escenario | Tipo | Test | Estado |
|---|---|---|---|
| RSVP válido | rules | `RS` › RSVP válido · RSVP válido sin campos opcionales y sin asistir | ✅ |
| RSVP válido | unit / e2e | Caso de uso `submitRsvp` · pantalla de gracias · E2E RSVP | ⏳ 3.3 / 4.4 / 6.1 |
| Validación en cliente | unit | Validación de RSVP (dominio) + errores junto al campo | ⏳ 3.1 / 4.4 |
| Cambiar la respuesta | rules | `RS` › Cambiar la respuesta: sobrescribe el mismo documento | ✅ |
| Formulario precargado en el mismo navegador | unit | Copia en `localStorage` y precarga | ⏳ 4.4 |
| Formulario vacío en otro dispositivo | rules | `RS` › Formulario vacío en otro dispositivo | ✅ |
| Formulario vacío en otro dispositivo | unit | Sin copia local → formulario vacío | ⏳ 4.4 |
| RSVP fuera de plazo | rules | `RS` › RSVP fuera de plazo · dentro del plazo · sin config/event | ✅ |
| RSVP fuera de plazo | unit | `isRsvpOpen` + formulario deshabilitado | ⏳ 3.1 / 4.4 |
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
- [ ] Abrir el enlace desde WhatsApp en Android y en iPhone.
- [ ] En 360 px de ancho: sin scroll horizontal ni zoom; título, fecha, lugar y los dos CTA visibles y pulsables.
- [ ] La barra inferior no tapa contenido ni el botón de enviar.

### M2 · Vista previa al compartir
- [ ] Pegar `https://charliecobo.github.io/baby-shower/` en WhatsApp: aparece la imagen 600×900, el título y la descripción.
- [ ] Comprobar también en el depurador de Open Graph (p. ej. opengraph.xyz).
