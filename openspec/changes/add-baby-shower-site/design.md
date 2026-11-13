# Design: add-baby-shower-site

## Context
Invitados anónimos (sin login) deben poder escribir en Firestore de forma muy acotada. Toda la seguridad recae en las reglas de Firestore: el cliente no es de fiar.

La app se sirve como SPA estática desde GitHub Pages (`https://charliecobo.github.io/baby-shower/`), desplegada con GitHub Actions. Firebase solo aporta Firestore y Authentication (sin Hosting, Cloud Functions ni App Check).

## Goals / Non-Goals
- Goals: reserva anónima y persistente; imposible reservar por encima de la cantidad; imposible tocar reservas ajenas; RSVP privado; plazos (RSVP y cierre de lista) impuestos por las reglas; cero backend propio (sin Cloud Functions → plan Spark).
- Non-Goals: identidad real del invitado en las reservas; anti-abuso perfecto (aceptamos el riesgo de un invitado borrando su caché y reservando de nuevo).

## Decisions

### 1. Anonymous Auth silencioso
Al cargar la app se llama a `signInAnonymously()`. El UID anónimo identifica al dispositivo y permite:
- Liberar solo las reservas propias.
- Exigir `request.auth != null` en todas las escrituras.

Alternativa descartada: escritura sin auth → no hay forma de limitar quién libera una reserva.

### 2. Modelo de datos

```
gifts/{giftId}
  title: string
  description?: string
  url?: string            // enlace de referencia ("Ver ejemplo")
  imageUrl?: string       // URL https pegada por el admin; sin imagen → icono de la categoría
  priceEur?: int          // precio orientativo, se muestra como "~25 €"
  category: 'ropa' | 'higiene' | 'paseo' | 'habitacion' | 'juguetes'
  quantity: int           // >= 1
  reservedCount: int      // 0..quantity
  order: int
  active: boolean
  updatedAt: timestamp    // siempre serverTimestamp()

reservations/{giftId}_{uid}     // id determinista: 1 reserva por regalo y dispositivo
  giftId: string
  uid: string
  createdAt: timestamp          // serverTimestamp()
  // sin nombre: anónimo por diseño

rsvps/{uid}                     // 1 RSVP por dispositivo, se sobrescribe entero
  name: string (1..80)
  attending: boolean
  companions: int (0..10, sin contar al invitado; 0 si no asiste)
  dietary?: string (<= 200)     // alergias o restricciones
  message?: string (<= 500)
  updatedAt: timestamp          // fecha de la última respuesta, serverTimestamp()

config/event                    // lectura pública, escritura admin
  title: string
  startsAt: timestamp
  endsAt: timestamp
  place: string
  mapsUrl: string               // https://
  rsvpDeadline: timestamp       // último instante válido: 23:59:59 (Europe/Madrid) del día elegido
  registryClosesAt?: timestamp  // si existe, la lista se congela a partir de esa fecha
  babyName?: string

config/admins                   // lectura solo admins, escritura solo consola / Admin SDK
  emails: string[]
```

¿Un invitado quiere 2 unidades del mismo regalo? Se resuelve con el id determinista = 1 unidad por dispositivo y regalo. Si hace falta más, puede reservar 2 regalos distintos o se amplía más adelante a un campo `units` en la reserva. Decisión: mantenerlo en 1 unidad (simplicidad de reglas).

**RSVP sin `createdAt`:** el invitado no puede leer su propio RSVP, así que no podría conservar un `createdAt` previo al sobrescribir. El RSVP se escribe siempre como `setDoc` completo (sin merge) y solo guarda `updatedAt`, que es la fecha que se muestra y exporta.

**"Cambiar mi respuesta":** al enviar, la app guarda una copia del RSVP en `localStorage` y la usa para precargar el formulario si el invitado vuelve desde el mismo navegador. Firestore nunca devuelve RSVPs a invitados; desde otro dispositivo el formulario sale vacío y la nueva respuesta sobrescribe la anterior.

**Imágenes de regalos:** sin Firebase Storage (exigiría el plan Blaze). El admin pega una URL `https://` y ve la miniatura; si no hay imagen, la UI muestra un icono según la categoría.

**Fechas y zona horaria:** todas las fechas se muestran en `Europe/Madrid`, sea cual sea la zona del dispositivo. En el admin, la fecha límite de RSVP se elige como un día y se guarda como las 23:59:59 de ese día en `Europe/Madrid`; la fecha de cierre de la lista se elige como fecha y hora.

**Categorías:** lista fija (`ropa`, `higiene`, `paseo`, `habitacion`, `juguetes`), con sus etiquetas e iconos en `src/i18n/es.ts`.

### 3. Reserva atómica: transacción + `getAfter`
Reservar = una transacción que lee el regalo (para tener `reservedCount` fresco) y:
1. Crea `reservations/{giftId}_{uid}`.
2. Incrementa `gifts/{giftId}.reservedCount` en +1.

Liberar = transacción inversa (borra la reserva y decrementa en −1).

Las reglas validan la coherencia entre ambos documentos con `existsAfter` / `getAfter`, de modo que no se puede incrementar el contador sin crear la reserva, ni crear la reserva sin incrementar. La transacción del cliente evita sobre-reservas por concurrencia; las reglas lo garantizan igualmente (`reservedCount <= quantity`).

**Lectura de reservas propias:** el cliente consulta `reservations` con `where('uid', '==', uid)`. No usa `getDoc` sobre un id concreto, porque si la reserva no existe la regla de lectura (`resource.data.uid`) falla.

**Edición de regalos por el admin:** se guarda con `updateDoc` enviando solo los campos editados más `updatedAt`, nunca `reservedCount`. Así, si un invitado reserva mientras el admin edita, el guardado no pisa el contador (y si lo enviara con un valor viejo, las reglas lo rechazarían).

**Liberación por el admin:** el admin borra la reserva y decrementa el contador en la misma transacción. Al borrar un regalo con reservas, borra el regalo y sus reservas en un mismo batch.

### 4. Reglas de Firestore

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    function signedIn() { return request.auth != null; }

    function adminsPath() { return /databases/$(db)/documents/config/admins; }
    function isAdmin() {
      return signedIn()
        && request.auth.token.email_verified == true
        && exists(adminsPath())
        && request.auth.token.email in get(adminsPath()).data.emails;
    }

    function onlyChanged(keys) {
      return request.resource.data.diff(resource.data).affectedKeys().hasOnly(keys);
    }

    // config/event es opcional: sin documento o sin la fecha, no hay plazo.
    function eventPath() { return /databases/$(db)/documents/config/event; }
    function registryOpen() {
      return !exists(eventPath())
        || !('registryClosesAt' in get(eventPath()).data)
        || request.time < get(eventPath()).data.registryClosesAt;
    }
    function rsvpOpen() {
      return !exists(eventPath())
        || !('rsvpDeadline' in get(eventPath()).data)
        || request.time <= get(eventPath()).data.rsvpDeadline;
    }

    function giftPath(giftId) { return /databases/$(db)/documents/gifts/$(giftId); }
    function myReservationPath(giftId) {
      return /databases/$(db)/documents/reservations/$(giftId + '_' + request.auth.uid);
    }

    function optString(d, key, max) {
      return !(key in d) || (d[key] is string && d[key].size() <= max);
    }
    function optHttpsUrl(d, key) {
      return !(key in d) || (d[key] is string && d[key].size() <= 2000 && d[key].matches('https://.+'));
    }
    function validGift(d) {
      return d.keys().hasOnly(['title', 'description', 'url', 'imageUrl', 'priceEur',
                               'category', 'quantity', 'reservedCount', 'order', 'active', 'updatedAt'])
        && d.title is string && d.title.size() > 0 && d.title.size() <= 120
        && optString(d, 'description', 1000)
        && optHttpsUrl(d, 'url')
        && optHttpsUrl(d, 'imageUrl')
        && (!('priceEur' in d) || (d.priceEur is int && d.priceEur >= 0 && d.priceEur <= 10000))
        && d.category in ['ropa', 'higiene', 'paseo', 'habitacion', 'juguetes']
        && d.quantity is int && d.quantity >= 1
        && d.reservedCount is int && d.reservedCount >= 0 && d.reservedCount <= d.quantity
        && d.order is int
        && d.active is bool
        && d.updatedAt == request.time;
    }

    match /gifts/{giftId} {
      allow read: if true;
      allow create: if isAdmin()
        && validGift(request.resource.data)
        && request.resource.data.reservedCount == 0;
      allow delete: if isAdmin();
      allow update: if
        // admin: edita cualquier campo; el contador solo se mantiene o baja en 1 (liberación)
        (isAdmin()
          && validGift(request.resource.data)
          && (request.resource.data.reservedCount == resource.data.reservedCount
              || request.resource.data.reservedCount == resource.data.reservedCount - 1))
        ||
        // invitado: solo reservar o liberar 1 unidad, con la lista abierta
        (signedIn()
          && registryOpen()
          && onlyChanged(['reservedCount', 'updatedAt'])
          && request.resource.data.updatedAt == request.time
          && (
            // reservar
            (request.resource.data.reservedCount == resource.data.reservedCount + 1
              && request.resource.data.reservedCount <= resource.data.quantity
              && resource.data.active == true
              && !exists(myReservationPath(giftId))
              && existsAfter(myReservationPath(giftId)))
            ||
            // liberar
            (request.resource.data.reservedCount == resource.data.reservedCount - 1
              && request.resource.data.reservedCount >= 0
              && exists(myReservationPath(giftId))
              && !existsAfter(myReservationPath(giftId)))
          ));
    }

    match /reservations/{resId} {
      // el invitado solo puede leer las suyas (para saber qué puede liberar)
      allow read: if isAdmin() || (signedIn() && resource.data.uid == request.auth.uid);
      allow create: if signedIn()
        && registryOpen()
        && request.resource.data.keys().hasOnly(['giftId', 'uid', 'createdAt'])
        && request.resource.data.giftId is string
        && request.resource.data.uid == request.auth.uid
        && resId == request.resource.data.giftId + '_' + request.auth.uid
        && request.resource.data.createdAt == request.time
        && getAfter(giftPath(request.resource.data.giftId)).data.reservedCount
           == get(giftPath(request.resource.data.giftId)).data.reservedCount + 1;
      allow delete: if
        // admin: libera cualquier reserva (contador −1) o la borra junto con su regalo
        (isAdmin()
          && (!existsAfter(giftPath(resource.data.giftId))
              || getAfter(giftPath(resource.data.giftId)).data.reservedCount
                 == get(giftPath(resource.data.giftId)).data.reservedCount - 1))
        ||
        // invitado: solo la suya, con la lista abierta y decrementando el contador
        (signedIn()
          && registryOpen()
          && resource.data.uid == request.auth.uid
          && getAfter(giftPath(resource.data.giftId)).data.reservedCount
             == get(giftPath(resource.data.giftId)).data.reservedCount - 1);
      allow update: if false;
    }

    match /rsvps/{uid} {
      function validRsvp(d) {
        return d.keys().hasOnly(['name', 'attending', 'companions', 'dietary', 'message', 'updatedAt'])
          && d.name is string && d.name.size() > 0 && d.name.size() <= 80
          && d.attending is bool
          && d.companions is int && d.companions >= 0 && d.companions <= 10
          && (d.attending == true || d.companions == 0)
          && optString(d, 'dietary', 200)
          && optString(d, 'message', 500)
          && d.updatedAt == request.time;
      }
      allow read, delete: if isAdmin();
      allow create, update: if signedIn()
        && uid == request.auth.uid
        && rsvpOpen()
        && validRsvp(request.resource.data);
    }

    match /config/event {
      function validEvent(d) {
        return d.keys().hasOnly(['title', 'startsAt', 'endsAt', 'place', 'mapsUrl',
                                 'rsvpDeadline', 'registryClosesAt', 'babyName'])
          && d.title is string && d.title.size() > 0 && d.title.size() <= 120
          && d.startsAt is timestamp
          && d.endsAt is timestamp && d.endsAt > d.startsAt
          && d.place is string && d.place.size() <= 300
          && d.mapsUrl is string && d.mapsUrl.size() <= 2000 && d.mapsUrl.matches('https://.+')
          && d.rsvpDeadline is timestamp
          && (!('registryClosesAt' in d) || d.registryClosesAt is timestamp)
          && optString(d, 'babyName', 60);
      }
      allow read: if true;
      allow create, update: if isAdmin() && validEvent(request.resource.data);
      allow delete: if false;
    }

    match /config/admins {
      // el cliente detecta si es admin intentando leer este documento
      allow read: if isAdmin();
      allow write: if false; // solo consola / Admin SDK
    }
  }
}
```

### 5. Arquitectura del front
```
src/
  domain/        Gift, Reservation, Rsvp, EventInfo, reglas puras (isAvailable, remaining, isRegistryOpen, isRsvpOpen)
  application/   reserveGift, releaseGift, submitRsvp, listGifts, getEvent… (dependen de puertos)
  infrastructure/firebase/  adaptadores Firestore + auth (único sitio que importa el SDK)
  ui/            páginas, componentes y stores de Zustand (estado de UI sobre los casos de uso)
  i18n/es.ts
```
Rutas (`react-router`, `basename` `/baby-shower`):
- Invitados, con barra de navegación inferior Invitación · Regalos · RSVP: `/` (invitación), `/regalos`, `/asistencia` (formulario y pantalla de gracias).
- Admin ("Zona de papás"), con pestañas Respuestas | Regalos | Evento: `/admin` (login, acceso denegado o respuestas), `/admin/regalos` y `/admin/evento` (edición de `config/event`). El panel se carga en un chunk aparte (`React.lazy`), así los invitados no descargan su código.

Suscripción en tiempo real (`onSnapshot`) a `gifts` para que, si otro invitado reserva, la UI se actualice al momento. La consulta es `orderBy('order')` y los regalos inactivos se filtran en el cliente: así no hace falta índice compuesto (`active` + `order`), y no se pierde privacidad porque `gifts` es de lectura pública de todos modos.

**Estado de cada tarjeta de regalo** (función pura `giftDisplayState`), por orden de prioridad:
1. "Lo traes tú": el invitado tiene una reserva propia. Con la lista abierta ofrece "Ya no lo traigo"; con la lista cerrada, sin acciones.
2. "Lista cerrada": `registryClosesAt` ya pasó; sin acciones.
3. "Ya reservado": `reservedCount == quantity`; atenuado y sin acciones.
4. "Disponible": botón "Lo regalo yo".

**Landing:** si `config/event` aún no existe, muestra un estado "Pronto más detalles". La cuenta atrás muestra los días restantes, "¡Es hoy!" el día del evento y desaparece cuando ya ha pasado.

**Detección de admin:** tras el login con Google, el cliente intenta leer `config/admins`. Si la lectura funciona es admin; si devuelve `permission-denied`, la UI muestra "No tienes acceso".

### 6. Despliegue en GitHub Pages
- `vite.config.ts` con `base: '/baby-shower/'`.
- Rutas SPA: el build copia `index.html` a `404.html`, para que GitHub Pages sirva la app al recargar `/baby-shower/regalos` o `/baby-shower/admin`.
- La configuración de Firebase llega al build como variables `VITE_FIREBASE_*` del entorno `github-pages`.
- Las metaetiquetas Open Graph usan URLs absolutas (`https://charliecobo.github.io/baby-shower/...`).
- `charliecobo.github.io` debe estar en los dominios autorizados de Firebase Auth.
- Las reglas de Firestore se despliegan con `firebase deploy --only firestore:rules`, independientemente de la web.

### 7. Anti-abuso
- Sin App Check ni reCAPTCHA: la clave web de Firebase es pública, así que un script podría crear sesiones anónimas y reservar en masa o enviar RSVPs falsos. Para un evento privado con enlace compartido por WhatsApp se acepta ese riesgo.
- Lo que sigue limitando el abuso: las reglas de Firestore (nadie lee RSVPs ni reservas ajenas, ni toca o borra regalos), 1 reserva por regalo y sesión, 1 RSVP por sesión y la cuota de creación de cuentas de Firebase Auth (por defecto ~100 cuentas anónimas por hora e IP).
- Limpieza: el admin puede liberar cualquier reserva y borrar RSVPs desde el panel.
- Si hubiera abusos, App Check se puede añadir más adelante sin cambiar las reglas ni el modelo de datos.

### 8. Diseño visual (Stitch)
Fuente de verdad visual: proyecto de Stitch **"Baby Shower Dulce Espera RSVP"** (`projects/16777157230264645811`), con el design system "Dulce Espera".

| Pantalla de Stitch | Ruta / componente |
|---|---|
| Invitación Baby Shower - Dulce Espera | `/` |
| Lista de regalos · Dulce Espera | `/regalos` |
| Lista de regalos · Confirmar reserva (Bottom Sheet) | diálogo de reserva en `/regalos` |
| Confirmación RSVP - Baby Shower Dulce Espera | pantalla de gracias en `/asistencia` |
| Zona de papás · Iniciar sesión | `/admin` sin sesión |
| Acceso denegado · Zona de papás | `/admin` sin permiso |
| Respuestas · Baby Shower de Lucía | `/admin` (pestaña Respuestas) |
| Regalos · Zona de papás | `/admin/regalos` (pestaña Regalos y bottom sheet "Editar regalo") |
| Invitación Baby Shower 600x900 | imagen Open Graph (`public/og.png`) |

Implementación:
- Los tokens del design system (colores Material 3, radios, espaciados y escalas tipográficas `display-hero`, `headline-*`, `title-md`, `body-*`, `label-*`) se trasladan al `@theme` de Tailwind v4 en `src/index.css`, con los mismos nombres que usa el HTML de Stitch.
- Tipografías: Comfortaa (titulares) y Nunito Sans (texto), desde Google Fonts. Iconos: Material Symbols Outlined.
- Formas: botones, chips e inputs en píldora; tarjetas con radio de 20 px; bottom sheets para confirmaciones y edición.
- Las pantallas de Stitch son referencia visual, no código a copiar: se reconstruyen como componentes React tipados, con textos en `src/i18n/es.ts` y sin el Tailwind por CDN ni los scripts inline.

Desviaciones deliberadas respecto a los diseños:
- Saludo genérico en la invitación (no "¡Hola, tía Marta!"): hay un único enlace para todos.
- El panel de Respuestas muestra Vienen / No vienen (con acompañantes); sin "Pendientes" ni "Recordar", porque no hay lista de invitados.
- El selector de acompañantes llega a 10 y no cuenta al propio invitado.
- La imagen del regalo se pega como URL (sin zona de subida).
- Se elimina el texto "los nombres se revelan si activas el modo apertura": las reservas no guardan nombres.
- Las filas de reserva del admin muestran solo "Reserva · fecha, hora" (sin estados como "Vía enlace web" o "Confirmado").
- Se añade una tercera pestaña "Evento" para editar `config/event` (requisito "Configuración del evento"), que no tiene pantalla en Stitch.
- La hoja "Editar regalo" no tiene selector de unidades al reservar ni zona de subida: la cantidad se edita con un contador que no baja de las unidades reservadas.

## Risks / Trade-offs
- **Borrar caché = nuevo UID** → el invitado pierde la posibilidad de liberar su reserva desde ese navegador. Mitigación: texto en la UI ("si cambias de móvil, escríbenos para liberarlo") + liberación desde el admin.
- **Login de admin en el mismo navegador** → iniciar sesión con Google sustituye la sesión anónima, así que ese navegador deja de ver como propias las reservas hechas como invitado. Aceptable: el admin puede gestionarlas desde el panel.
- **Reservas "basura"** de alguien con mala fe → aceptable en un evento privado con enlace compartido; el admin las limpia.
- **Lista congelada** tras `registryClosesAt` → los invitados ya no pueden ni reservar ni liberar; cualquier cambio lo hace el admin.
- `get`/`exists`/`getAfter`/`existsAfter` cuentan como lecturas en las reglas: irrelevante a esta escala.

## Resolved Questions
- **Precio orientativo:** se muestra (`priceEur`, como "~25 €") en la tarjeta, junto al enlace.
- **Reservar sin confirmar asistencia:** sí, son flujos independientes.
- **Cierre de la lista:** campo opcional `config/event.registryClosesAt`, impuesto en las reglas.
- **Precargar el RSVP propio:** no desde Firestore (el invitado nunca lee RSVPs, ni el suyo); sí desde una copia en `localStorage` del mismo navegador.
- **Lista de invitados / invitaciones personalizadas:** no; enlace único para todos.
- **Fotos de regalos:** URL pegada por el admin, con icono de categoría como alternativa; sin Firebase Storage.
- **Alergias o restricciones:** campo opcional `dietary` en el RSVP.
- **Datos del evento:** en `config/event`, lectura pública y edición desde el admin.
- **Hosting:** GitHub Pages en lugar de Firebase Hosting.
- **Dominio propio:** no por ahora.
- **App Check / reCAPTCHA:** no. El riesgo de abuso se acepta y se mitiga con las reglas, la cuota de Auth y la limpieza desde el admin (ver § 7).
- **Semántica de `rsvpDeadline`:** el admin elige un día; se guarda como 23:59:59 de ese día en `Europe/Madrid`.
- **Escenarios no automatizables** (vista previa en WhatsApp, 360 px, prueba con móviles reales): se cubren con verificación manual con checklist, registrada en `test-map.md` como tipo `manual`.
- **Consulta de regalos:** `orderBy('order')` + filtro de `active` en el cliente, sin índice compuesto.
