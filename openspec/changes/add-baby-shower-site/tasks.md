## 1. Setup
- [x] 1.1 Migrar el andamiaje actual a Vite + React + TS (strict) con pnpm, ESLint, Prettier y Tailwind; retirar `FirebaseStatus.jsx`, el store de ejemplo, `.oxlintrc.json` y `package-lock.json`
- [ ] 1.2 En el proyecto Firebase existente (`baby-shower-ac32e`): activar Auth (Anonymous + Google), añadir `charliecobo.github.io` a dominios autorizados
- [x] 1.3 Configurar `firebase.json`, `.firebaserc`, emuladores (auth, firestore) y variables `VITE_FIREBASE_*`
- [x] 1.4 Estructura de carpetas hexagonal (`domain`, `application`, `infrastructure/firebase`, `ui`, `i18n`) y router con `basename` `/baby-shower`
- [x] 1.5 Trasladar el design system "Dulce Espera" de Stitch al `@theme` de Tailwind (colores, radios, espaciados, tipografías Comfortaa y Nunito Sans, Material Symbols)
- [ ] 1.6 Workflow de GitHub Actions con pnpm: lint, typecheck, tests unitarios, tests de reglas en emulador, build con `404.html` y despliegue a GitHub Pages

## 2. Seguridad primero
- [ ] 2.1 Escribir `firestore.rules` según `design.md`
- [ ] 2.2 Tests de reglas con `@firebase/rules-unit-testing` cubriendo TODOS los escenarios permitidos y denegados de las specs `gift-registry`, `rsvp`, `admin` y `event-info`
- [ ] 2.3 Script `seed` (Admin SDK) para crear `config/admins`, `config/event` y regalos iniciales desde un JSON (credenciales fuera del repo)
- [ ] 2.4 Crear `test-map.md` (escenario → test, con tipo `rules` / `unit` / `e2e` / `manual`; los `manual` con su checklist) y desplegar las reglas

## 3. Dominio y casos de uso
- [ ] 3.1 Tipos y funciones puras (`remaining`, `isAvailable`, `isRegistryOpen`, `isRsvpOpen`, `giftDisplayState`, `daysUntil` / estado de la cuenta atrás, `rsvpDeadlineFromDay` en Europe/Madrid, validación de RSVP)
- [ ] 3.2 Puertos (`GiftRepository`, `ReservationRepository`, `RsvpRepository`, `EventRepository`, `AuthService`) + adaptadores in-memory
- [ ] 3.3 Casos de uso `listGifts`, `reserveGift`, `releaseGift`, `submitRsvp`, `getEvent` con tests unitarios
- [ ] 3.4 Adaptadores Firestore (reserva/liberación con transacción, `onSnapshot`)

## 4. UI invitados
- [ ] 4.1 Bootstrap de auth anónima silenciosa; layout con barra de navegación inferior (Invitación · Regalos · RSVP)
- [ ] 4.2 Invitación (`event-info`), según la pantalla de Stitch: datos de `config/event`, cuenta atrás, Maps, añadir a calendario (.ics + Google), Open Graph con la invitación 600×900
- [ ] 4.3 Lista de regalos, según las pantallas de Stitch: tarjetas con imagen o icono y precio orientativo, filtros, estados (disponible / lo traes tú / agotado / lista cerrada), bottom sheet de confirmación, errores de concurrencia
- [ ] 4.4 Formulario RSVP con alergias, validación, fuera de plazo, pantalla de gracias y copia local para "Cambiar mi respuesta"
- [ ] 4.5 Accesibilidad básica (foco, labels, contraste) y revisión mobile a 360 px

## 5. Admin
- [ ] 5.1 Login Google + guard por allowlist (lectura de `config/admins`), con las pantallas de inicio de sesión y acceso denegado de Stitch
- [ ] 5.2 Pestaña Respuestas: resumen, búsqueda, lista con alergias y mensajes, export CSV
- [ ] 5.3 Pestaña Regalos: resumen, CRUD con bottom sheet "Editar regalo", switch Visible, reordenación por arrastre
- [ ] 5.4 Reservas por regalo como filas anónimas con liberación
- [ ] 5.5 Edición de los datos del evento (`config/event`)

## 6. Calidad y despliegue
- [ ] 6.1 E2E Playwright contra emuladores: reservar, liberar, carrera por última unidad (2 contextos), RSVP, acceso admin denegado
- [ ] 6.2 Despliegue a GitHub Pages y comprobar que recargar `/baby-shower/regalos` no da 404
- [ ] 6.3 Prueba real con 2–3 móviles antes de enviar el enlace, completando los checklists `manual` de `test-map.md` (vista previa en WhatsApp, 360 px)
