# Change: Web del baby shower con lista de regalos anónima y RSVP

## Why
Notion no permite que visitantes sin cuenta marquen elementos de una página publicada, y los formularios no actualizan la lista original. Necesitamos una web propia donde los invitados reserven regalos de forma anónima y persistente, sin poder romper la lista, y confirmen asistencia.

## What Changes
- **ADDED** `event-info`: landing con datos del evento (fecha, lugar, mapa, añadir a calendario), leídos de `config/event`.
- **ADDED** `gift-registry`: lista pública de regalos con precio orientativo, reserva anónima por unidades, liberación desde el mismo dispositivo, protección ante concurrencia y fecha de cierre opcional.
- **ADDED** `rsvp`: formulario de confirmación de asistencia, solo escritura para invitados, con fecha límite impuesta por las reglas.
- **ADDED** `admin`: panel protegido (Google Sign-In + allowlist) para gestionar regalos y datos del evento, y ver RSVPs y reservas.
- Reglas de seguridad de Firestore como fuente de verdad de los permisos, con tests en emulador.
- Despliegue en GitHub Pages (GitHub Actions).

## Impact
- Specs afectadas: `event-info`, `gift-registry`, `rsvp`, `admin` (todas nuevas).
- Código: se reemplaza el andamiaje actual (Vite + React en JS) por el proyecto TypeScript definitivo (`src/`, `firestore.rules`, `firebase.json`, `tests/`). Se mantiene el workflow de despliegue a GitHub Pages, ampliado con lint y tests.
- Sin migraciones: no hay datos previos. Seed inicial de regalos mediante script.

## Out of Scope
- Pagos o aportaciones económicas en la web.
- Notificaciones por email o WhatsApp.
- Multi-idioma (solo español; textos centralizados por si acaso).
