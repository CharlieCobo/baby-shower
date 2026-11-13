## ADDED Requirements

### Requirement: Acceso de administración
El sistema SHALL proteger `/admin` con Google Sign-In y MUST conceder acceso solo a emails verificados presentes en `config/admins.emails`.

#### Scenario: Admin autorizado
- **WHEN** uno de los anfitriones inicia sesión con Google en `/admin`
- **THEN** accede al panel

#### Scenario: Usuario no autorizado
- **WHEN** alguien inicia sesión con un email fuera de la allowlist
- **THEN** ve "No tienes acceso" y las reglas rechazan cualquier lectura de datos privados

#### Scenario: Comprobación de admin desde el cliente
- **WHEN** un usuario con sesión intenta leer `config/admins`
- **THEN** las reglas lo permiten solo si su email verificado está en la allowlist
- **AND** nadie puede escribir `config/admins` desde el cliente

### Requirement: Gestión de regalos
El sistema SHALL permitir a los admins crear, editar, reordenar, activar/desactivar (switch "Visible") y borrar regalos. El formulario de edición SHALL incluir título, descripción, categoría (lista fija), cantidad, precio orientativo en euros, enlace de referencia y URL de imagen con vista previa.

#### Scenario: Datos de regalo inválidos
- **WHEN** un admin guarda un regalo con una categoría fuera de la lista, una URL que no empieza por `https://` o un precio negativo
- **THEN** la UI muestra el error y las reglas de Firestore rechazan la escritura

#### Scenario: Reducir cantidad por debajo de lo reservado
- **WHEN** un admin intenta poner `quantity` menor que `reservedCount`
- **THEN** la UI lo impide e indica cuántas unidades hay reservadas
- **AND** las reglas de Firestore rechazan la escritura igualmente

#### Scenario: Editar un regalo mientras alguien reserva
- **WHEN** un admin guarda cambios en un regalo y, entretanto, un invitado ha reservado una unidad
- **THEN** el guardado no modifica `reservedCount` y la reserva del invitado se conserva

#### Scenario: Crear un regalo
- **WHEN** un admin crea un regalo
- **THEN** se guarda con `reservedCount == 0`; las reglas rechazan crearlo con reservas

#### Scenario: Borrar un regalo con reservas
- **WHEN** un admin borra un regalo con reservas
- **THEN** se pide confirmación y se borran también sus reservas

### Requirement: Configuración del evento
El sistema SHALL permitir a los admins editar los datos del evento en `config/event` (título, fechas, lugar, enlace a Maps, fecha límite de RSVP, fecha de cierre de la lista y nombre de la bebé), validados por las reglas.

#### Scenario: Cambiar la fecha límite de RSVP
- **WHEN** un admin cambia `rsvpDeadline` desde el panel
- **THEN** la landing y el formulario de RSVP reflejan la nueva fecha
- **AND** las reglas aplican el nuevo plazo de inmediato

#### Scenario: La fecha límite incluye el día completo
- **WHEN** un admin elige un día como fecha límite de RSVP
- **THEN** se guarda `rsvpDeadline` como las 23:59:59 de ese día en `Europe/Madrid`
- **AND** los invitados pueden responder durante todo ese día

#### Scenario: Datos del evento inválidos
- **WHEN** un admin guarda un evento con campos extra, con la hora de fin anterior a la de inicio o con un `mapsUrl` que no empieza por `https://`
- **THEN** las reglas rechazan la escritura

### Requirement: Supervisión de reservas y RSVPs
El sistema SHALL mostrar a los admins el resumen de RSVPs (vienen, con su número de acompañantes / no vienen), la lista de respuestas con búsqueda por nombre, alergias y mensajes, y el resumen de regalos (regalos, unidades reservadas, unidades libres). SHALL mostrar las reservas de cada regalo como filas anónimas con su fecha y hora, permitir liberar cualquier reserva y exportar los RSVPs a CSV. Las reservas MUST NOT mostrar ni guardar el nombre de quien reservó.

#### Scenario: Ver reservas de un regalo
- **WHEN** un admin despliega un regalo en `/admin/regalos`
- **THEN** ve una fila por reserva con el texto "Reserva" y su fecha y hora, sin datos del invitado, y un botón "Liberar" en cada una

#### Scenario: Liberar una reserva huérfana
- **WHEN** un invitado avisa de que cambió de móvil y el admin libera su reserva
- **THEN** se borra la reserva y el contador baja en 1 de forma atómica

#### Scenario: Exportar asistentes
- **WHEN** el admin pulsa "Exportar CSV"
- **THEN** se descarga un CSV con nombre, asistencia, acompañantes, alergias, mensaje y fecha
