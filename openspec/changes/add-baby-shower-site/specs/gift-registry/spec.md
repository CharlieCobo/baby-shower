## ADDED Requirements

### Requirement: Listado público de regalos
El sistema SHALL mostrar a cualquier visitante con el enlace los regalos activos, ordenados por `order`, con título, imagen (o el icono de su categoría si no tiene), descripción, enlace de referencia, precio orientativo ("~25 €") y unidades restantes (`quantity - reservedCount`), sin pedir login visible.

#### Scenario: Regalo sin imagen
- **WHEN** un regalo no tiene `imageUrl`
- **THEN** la tarjeta muestra el icono asociado a su categoría

#### Scenario: Visitante abre la lista
- **WHEN** un invitado abre `/regalos` por primera vez
- **THEN** la app inicia sesión anónima de forma silenciosa
- **AND** muestra todos los regalos con `active == true` y sus unidades restantes

#### Scenario: Regalo agotado
- **WHEN** un regalo tiene `reservedCount == quantity`
- **THEN** se muestra como "Ya reservado", atenuado y sin botón de reservar
- **AND** no se muestra ningún dato de quién lo reservó

#### Scenario: Prioridad de estados de la tarjeta
- **WHEN** un regalo cumple varias condiciones a la vez (reserva propia, lista cerrada, agotado)
- **THEN** la tarjeta muestra un único estado con esta prioridad: "Lo traes tú" > "Lista cerrada" > "Ya reservado" > "Disponible"

#### Scenario: Regalo agotado con reserva propia
- **WHEN** el invitado reservó la última unidad de un regalo
- **THEN** ve el regalo como "Lo traes tú" con la opción "Ya no lo traigo", no como "Ya reservado"

#### Scenario: Actualización en tiempo real
- **WHEN** otro invitado reserva un regalo mientras la lista está abierta
- **THEN** las unidades restantes se actualizan sin recargar la página

#### Scenario: Filtro por categoría
- **WHEN** el invitado selecciona una categoría
- **THEN** solo se muestran los regalos de esa categoría
- **AND** existe una opción "Solo disponibles" para ocultar los agotados

### Requirement: Reserva anónima de un regalo
El sistema SHALL permitir a un invitado reservar 1 unidad de un regalo disponible, de forma anónima y persistente, creando la reserva e incrementando el contador de forma atómica.

#### Scenario: Reserva correcta
- **WHEN** el invitado pulsa "Lo regalo yo" en un regalo con unidades disponibles y confirma en el diálogo
- **THEN** se crea `reservations/{giftId}_{uid}` y `reservedCount` aumenta en 1 en la misma operación atómica
- **AND** el regalo se marca para ese invitado como "Lo traes tú" con opción de liberar

#### Scenario: Persistencia entre visitas
- **WHEN** el invitado cierra el navegador y vuelve más tarde desde el mismo dispositivo
- **THEN** sigue viendo sus reservas marcadas como "Lo traes tú"

#### Scenario: Carrera por la última unidad
- **WHEN** dos invitados intentan reservar la última unidad a la vez
- **THEN** solo una reserva se completa
- **AND** el otro invitado ve el mensaje "Vaya, alguien se te ha adelantado" y la lista actualizada

#### Scenario: Reserva duplicada desde el mismo dispositivo
- **WHEN** el invitado intenta reservar un regalo que ya ha reservado
- **THEN** la operación se rechaza y la UI no ofrece esa acción

### Requirement: Liberar una reserva propia
El sistema SHALL permitir que un invitado libere únicamente las reservas creadas desde su dispositivo (mismo UID anónimo), decrementando el contador de forma atómica.

#### Scenario: Liberar reserva propia
- **WHEN** el invitado pulsa "Ya no lo traigo" en un regalo que reservó y confirma
- **THEN** se borra su reserva y `reservedCount` disminuye en 1 en la misma operación atómica

#### Scenario: Intento de liberar una reserva ajena
- **WHEN** un cliente intenta borrar una reserva cuyo `uid` no es el suyo o decrementar el contador sin borrar su reserva
- **THEN** las reglas de Firestore rechazan la escritura

#### Scenario: Dispositivo distinto
- **WHEN** el invitado accede desde otro dispositivo o tras borrar datos del navegador
- **THEN** no ve sus reservas anteriores como propias
- **AND** la UI muestra un texto de ayuda indicando que contacte con los anfitriones para liberarlas

### Requirement: Integridad de la lista
El sistema MUST impedir que un invitado modifique cualquier campo de un regalo distinto de `reservedCount`/`updatedAt`, que el contador supere `quantity` o baje de 0, y que cree o borre regalos.

#### Scenario: Manipulación desde la consola del navegador
- **WHEN** un cliente no admin intenta cambiar `title`, `quantity` o `active`, crear o borrar un regalo
- **THEN** las reglas de Firestore rechazan la escritura

#### Scenario: Incremento sin reserva
- **WHEN** un cliente incrementa `reservedCount` sin crear su documento de reserva en el mismo batch
- **THEN** las reglas rechazan la escritura

### Requirement: Cierre de la lista
El sistema SHALL permitir configurar una fecha de cierre opcional (`config/event.registryClosesAt`). A partir de esa fecha la lista MUST quedar congelada para los invitados: ni reservar ni liberar, impuesto por las reglas de Firestore. Los admins MAY seguir gestionándola.

#### Scenario: Lista cerrada en la UI
- **WHEN** un invitado abre `/regalos` después de `registryClosesAt`
- **THEN** ve la lista sin botones de reservar ni liberar y un mensaje indicando que la lista está cerrada
- **AND** sus reservas propias siguen marcadas como "Lo traes tú", sin opción de liberar

#### Scenario: Reserva tras el cierre
- **WHEN** un cliente no admin intenta reservar o liberar después de `registryClosesAt`
- **THEN** las reglas de Firestore rechazan la escritura

#### Scenario: Sin fecha de cierre
- **WHEN** `config/event` no tiene `registryClosesAt`
- **THEN** la lista permanece abierta

### Requirement: Privacidad de las reservas
El sistema MUST garantizar que un invitado solo pueda leer sus propias reservas y nunca la identidad o UID de quien reservó otros regalos.

#### Scenario: Lectura de reservas ajenas
- **WHEN** un cliente no admin consulta la colección `reservations` sin filtrar por su UID
- **THEN** las reglas rechazan la consulta
