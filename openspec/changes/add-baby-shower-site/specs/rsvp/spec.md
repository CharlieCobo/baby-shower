## ADDED Requirements

### Requirement: Confirmación de asistencia
El sistema SHALL ofrecer un formulario de RSVP con nombre (obligatorio, 1–80 caracteres), asistencia sí/no, número de acompañantes sin contar al invitado (0–10, solo si asiste; 0 si no asiste), alergias o restricciones opcionales (≤ 200 caracteres) y mensaje opcional (≤ 500 caracteres), guardado en `rsvps/{uid}` con la fecha de la respuesta (`updatedAt`) puesta por el servidor.

#### Scenario: RSVP válido
- **WHEN** el invitado rellena el formulario correctamente y lo envía
- **THEN** se guarda en `rsvps/{uid}`
- **AND** se muestra una pantalla de agradecimiento con enlace a la lista de regalos y botón "Añadir al calendario"

#### Scenario: Validación en cliente
- **WHEN** el invitado envía sin nombre o con más acompañantes de los permitidos
- **THEN** el formulario muestra el error junto al campo y no se envía

#### Scenario: Cambiar la respuesta
- **WHEN** el invitado vuelve desde el mismo dispositivo y reenvía el formulario
- **THEN** se sobrescribe su RSVP anterior (mismo documento) actualizando `updatedAt`

#### Scenario: Formulario precargado en el mismo navegador
- **WHEN** el invitado pulsa "Cambiar mi respuesta" en la pantalla de gracias o vuelve a `/asistencia` desde el mismo navegador
- **THEN** el formulario aparece con su última respuesta, leída de la copia guardada en el navegador (no de Firestore)

#### Scenario: Formulario vacío en otro dispositivo
- **WHEN** el invitado abre `/asistencia` desde un navegador sin copia guardada
- **THEN** el formulario aparece vacío y al enviarlo sobrescribe la respuesta anterior de ese dispositivo, si la hubiera

#### Scenario: RSVP fuera de plazo
- **WHEN** la fecha actual es posterior a `config/event.rsvpDeadline`
- **THEN** el formulario se muestra deshabilitado con un mensaje para contactar con los anfitriones
- **AND** las reglas de Firestore rechazan cualquier escritura de RSVP

### Requirement: Privacidad de los RSVPs
El sistema MUST impedir que cualquier invitado lea RSVPs, incluido el suyo, y MUST validar en las reglas tipos, tamaños, campos permitidos y coherencia entre asistencia y acompañantes.

#### Scenario: Lectura de la lista de asistentes
- **WHEN** un cliente no admin consulta la colección `rsvps`
- **THEN** las reglas rechazan la lectura

#### Scenario: Escritura en el RSVP de otro
- **WHEN** un cliente intenta escribir en `rsvps/{otroUid}`
- **THEN** las reglas rechazan la escritura

#### Scenario: Campos no permitidos
- **WHEN** un cliente envía campos extra, un nombre de más de 80 caracteres o unas alergias de más de 200 caracteres
- **THEN** las reglas rechazan la escritura

#### Scenario: Acompañantes sin asistir
- **WHEN** un cliente envía `attending == false` con `companions > 0`
- **THEN** las reglas rechazan la escritura

#### Scenario: Fecha manipulada
- **WHEN** un cliente envía un `updatedAt` distinto de la hora del servidor
- **THEN** las reglas rechazan la escritura
