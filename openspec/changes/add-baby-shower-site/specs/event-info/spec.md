## ADDED Requirements

### Requirement: Landing del evento
El sistema SHALL mostrar en `/` la información del baby shower: título, fecha y hora, lugar con enlace a Google Maps, fecha límite de RSVP y accesos a "Confirmar asistencia" y "Lista de regalos". Los datos SHALL leerse de `config/event`, de lectura pública.

#### Scenario: Datos del evento
- **WHEN** cualquier visitante abre `/`
- **THEN** la app lee `config/event` sin necesidad de permisos especiales y muestra sus datos
- **AND** las reglas rechazan cualquier escritura en `config/event` de un cliente no admin

#### Scenario: Evento sin configurar
- **WHEN** un visitante abre `/` y `config/event` aún no existe
- **THEN** ve la invitación con un mensaje "Pronto más detalles" en lugar de los datos del evento

#### Scenario: Fechas en hora de Madrid
- **WHEN** un invitado abre la web desde un dispositivo con otra zona horaria
- **THEN** las fechas y horas se muestran en hora de `Europe/Madrid`

#### Scenario: Navegación entre secciones
- **WHEN** un invitado está en cualquier página pública
- **THEN** ve una barra de navegación inferior con Invitación, Regalos y RSVP, con la sección actual resaltada

#### Scenario: Apertura desde WhatsApp en móvil
- **WHEN** un invitado abre el enlace en un móvil de 360 px de ancho
- **THEN** toda la información y los dos CTA son visibles y usables sin zoom ni scroll horizontal

#### Scenario: Cuenta atrás
- **WHEN** el evento aún no ha ocurrido
- **THEN** se muestra una cuenta atrás en días hasta el evento

#### Scenario: Día del evento
- **WHEN** la fecha actual (Europe/Madrid) es el día del evento
- **THEN** la cuenta atrás muestra "¡Es hoy!"

#### Scenario: Evento pasado
- **WHEN** el evento ya ha terminado
- **THEN** no se muestra la cuenta atrás

### Requirement: Añadir al calendario
El sistema SHALL ofrecer añadir el evento al calendario mediante un enlace de Google Calendar y un fichero `.ics` descargable.

#### Scenario: Descarga del .ics
- **WHEN** el invitado pulsa "Añadir al calendario" → "Apple / Outlook"
- **THEN** se descarga un `.ics` válido con título, fecha, hora (Europe/Madrid) y ubicación

### Requirement: Vista previa al compartir
El sistema SHALL incluir metadatos Open Graph (título, descripción, imagen) para que el enlace se vea bien al compartirlo por WhatsApp. La imagen SHALL ser la invitación de 600×900 del diseño de Stitch, servida con URL absoluta.

#### Scenario: Enlace compartido
- **WHEN** se pega la URL en WhatsApp
- **THEN** aparece la vista previa con imagen y título del evento
