// Datos de prueba realistas para el emulador local (nunca producción).
//
//   pnpm emulators            # en otra terminal
//   pnpm seed:dev             # lista abierta y RSVP en plazo
//   pnpm seed:dev --lista-cerrada --rsvp-cerrado --sin-evento
//
// Admins: SEED_ADMIN_EMAILS="a@x.com,b@y.com" (por defecto admin@example.com).
// En el emulador de Auth, "Iniciar sesión con Google" permite inventar una cuenta con ese email.
import { fakerES as faker } from '@faker-js/faker'
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore'
import { EVENT_TIME_ZONE, parseEventDateTime, rsvpDeadlineFromDay } from '../src/domain/dates'
import type { Category } from './seed/schema'
import { clearCollections, emulatorFirestore } from './seed/firestore'

faker.seed(2027) // mismos datos en cada ejecución

const args = new Set(process.argv.slice(2))
const registryClosed = args.has('--lista-cerrada')
const rsvpClosed = args.has('--rsvp-cerrado')
const withoutEvent = args.has('--sin-evento')
const adminEmails = (process.env.SEED_ADMIN_EMAILS ?? 'admin@example.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

const GIFT_POOL: Record<Category, string[]> = {
  ropa: [
    'Body de algodón manga larga (0-3 meses)',
    'Pijama de punto con pies',
    'Gorrito y manoplas',
    'Saco de dormir de verano',
    'Pack de calcetines antideslizantes',
  ],
  higiene: [
    'Pañales talla 1',
    'Pañales talla 2',
    'Toallitas sin perfume',
    'Bañera plegable',
    'Termómetro de baño',
    'Crema para el culito',
  ],
  paseo: [
    'Portabebés ergonómico',
    'Bolso cambiador',
    'Saco para el carrito',
    'Sombrilla para el carrito',
  ],
  habitacion: [
    'Móvil de cuna',
    'Vigilabebés con cámara',
    'Luz quitamiedos',
    'Juego de sábanas de cuna',
  ],
  juguetes: [
    'Sonajero de madera',
    'Gimnasio de actividades',
    'Libro de tela',
    'Mordedor de silicona',
  ],
}

const DESCRIPTIONS = [
  'De algodón orgánico, suave para su piel.',
  'Cualquier marca nos vale, ¡gracias!',
  'Si puede ser, en tonos neutros.',
  'Lo usaremos muchísimo los primeros meses.',
  'Nos encanta el que sale en el enlace, pero cualquiera parecido sirve.',
]
const DIETARY = [
  'Celíaca',
  'Vegetariano',
  'Intolerante a la lactosa',
  'Alergia a los frutos secos',
  'Vegana',
]
const MESSAGES = [
  '¡Qué ganas de conocerla!',
  'Os queremos mucho, ¡nos vemos allí!',
  'Lo siento muchísimo, ese día estoy fuera. ¡Un abrazo enorme!',
  'Llevamos el postre 🍰',
  '¡Vaya aventura os espera!',
]

const madridDay = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: EVENT_TIME_ZONE }).format(date) // AAAA-MM-DD
const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000)
const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

async function seedEvent(db: Firestore) {
  const eventDay = madridDay(daysFromNow(30))
  const place = `${faker.helpers.arrayElement(['Jardines', 'Finca', 'Casa'])} ${faker.person.lastName()}`
  const address = `${faker.location.street()}, ${faker.location.buildingNumber()}, ${faker.location.city()}`
  await db.doc('config/event').set({
    title: 'Baby Shower de Alex',
    startsAt: Timestamp.fromDate(parseEventDateTime(`${eventDay}T17:00`)),
    endsAt: Timestamp.fromDate(parseEventDateTime(`${eventDay}T21:00`)),
    place: `${place} · ${address}`,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    rsvpDeadline: Timestamp.fromDate(
      rsvpDeadlineFromDay(madridDay(daysFromNow(rsvpClosed ? -1 : 20))),
    ),
    ...(registryClosed ? { registryClosesAt: Timestamp.fromDate(daysFromNow(-1 / 24)) } : {}),
    babyName: 'Alex',
  })
}

async function seedGiftsAndReservations(db: Firestore) {
  const entries = Object.entries(GIFT_POOL).flatMap(([category, titles]) =>
    titles.map((title) => ({ category: category as Category, title })),
  )
  const batch = db.batch()
  let reservations = 0
  faker.helpers.shuffle(entries).forEach(({ category, title }, order) => {
    const id = slug(title)
    const quantity = faker.helpers.weightedArrayElement([
      { weight: 6, value: 1 },
      { weight: 3, value: faker.number.int({ min: 2, max: 4 }) },
    ])
    // El primero, agotado; el segundo, oculto; el resto, al azar.
    const reservedCount = order === 0 ? quantity : faker.number.int({ min: 0, max: quantity })
    const gift = {
      title,
      category,
      quantity,
      reservedCount,
      order,
      active: order !== 1,
      updatedAt: FieldValue.serverTimestamp(),
      ...(faker.datatype.boolean(0.7)
        ? { description: faker.helpers.arrayElement(DESCRIPTIONS) }
        : {}),
      ...(faker.datatype.boolean(0.7) ? { url: `https://www.example.com/regalos/${id}` } : {}),
      ...(faker.datatype.boolean(0.6)
        ? { imageUrl: `https://picsum.photos/seed/${id}/400/300` }
        : {}),
      ...(faker.datatype.boolean(0.85) ? { priceEur: faker.number.int({ min: 5, max: 180 }) } : {}),
    }
    batch.set(db.doc(`gifts/${id}`), gift)
    for (let i = 0; i < reservedCount; i++) {
      const uid = `dev-guest-${faker.string.alphanumeric(8)}`
      batch.set(db.doc(`reservations/${id}_${uid}`), {
        giftId: id,
        uid,
        createdAt: Timestamp.fromDate(faker.date.recent({ days: 14 })),
      })
      reservations++
    }
  })
  await batch.commit()
  return { gifts: entries.length, reservations }
}

async function seedRsvps(db: Firestore, count: number) {
  const batch = db.batch()
  for (let i = 0; i < count; i++) {
    const attending = faker.datatype.boolean(0.8)
    batch.set(db.doc(`rsvps/dev-guest-rsvp-${i}`), {
      name: faker.person.fullName(),
      attending,
      companions: attending
        ? faker.helpers.weightedArrayElement([
            { weight: 4, value: 0 },
            { weight: 4, value: 1 },
            { weight: 2, value: faker.number.int({ min: 2, max: 4 }) },
          ])
        : 0,
      ...(faker.datatype.boolean(0.2) ? { dietary: faker.helpers.arrayElement(DIETARY) } : {}),
      ...(faker.datatype.boolean(0.5) ? { message: faker.helpers.arrayElement(MESSAGES) } : {}),
      updatedAt: Timestamp.fromDate(faker.date.recent({ days: 20 })),
    })
  }
  await batch.commit()
}

async function main() {
  const db = emulatorFirestore()
  await clearCollections(db, ['gifts', 'reservations', 'rsvps', 'config'])
  await db.doc('config/admins').set({ emails: adminEmails })
  if (!withoutEvent) await seedEvent(db)
  const { gifts, reservations } = await seedGiftsAndReservations(db)
  await seedRsvps(db, 30)

  console.log('✔ Emulador sembrado')
  console.log(`  admins: ${adminEmails.join(', ')}`)
  console.log(`  evento: ${withoutEvent ? 'sin evento' : 'en 30 días'}`)
  console.log(
    `  lista: ${registryClosed ? 'cerrada' : 'abierta'} · RSVP: ${rsvpClosed ? 'fuera de plazo' : 'en plazo'}`,
  )
  console.log(`  ${gifts} regalos (1 agotado, 1 oculto) · ${reservations} reservas · 30 RSVPs`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  if (error instanceof Error && /ECONNREFUSED|UNAVAILABLE/.test(String(error))) {
    console.error('¿Está arrancado el emulador? Ejecuta `pnpm emulators` en otra terminal.')
  }
  process.exit(1)
})
