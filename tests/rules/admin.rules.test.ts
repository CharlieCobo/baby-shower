import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { describe, it } from 'vitest'
import {
  ADMIN_EMAIL,
  admin,
  eventData,
  giftData,
  guest,
  hoursFromNow,
  reserve,
  rsvpData,
  seed,
  seedBase,
  seedReservation,
  stranger,
  setupRulesEnv,
} from './helpers'

setupRulesEnv()

describe('admin · Acceso de administración', () => {
  it('Admin autorizado: puede leer los datos privados', async () => {
    await seedBase({ gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    await seed((db) => setDoc(doc(db, 'rsvps/ana'), rsvpData()))
    await assertSucceeds(getDocs(collection(admin(), 'rsvps')))
    await assertSucceeds(getDocs(collection(admin(), 'reservations')))
  })

  it('Usuario no autorizado: las reglas rechazan cualquier lectura de datos privados', async () => {
    await seedBase({ gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    await seed((db) => setDoc(doc(db, 'rsvps/ana'), rsvpData()))
    const db = stranger()
    await assertFails(getDocs(collection(db, 'rsvps')))
    await assertFails(getDocs(collection(db, 'reservations')))
    await assertFails(getDoc(doc(db, 'config/admins')))
  })

  it('Comprobación de admin: leer config/admins solo funciona con email verificado en la allowlist', async () => {
    await seedBase()
    await assertSucceeds(getDoc(doc(admin(), 'config/admins')))
    await assertFails(getDoc(doc(stranger(), 'config/admins')))
    await assertFails(getDoc(doc(guest(), 'config/admins')))
    // Mismo email de la allowlist pero sin verificar
    await assertFails(getDoc(doc(stranger(false, ADMIN_EMAIL), 'config/admins')))
  })

  it('Comprobación de admin: nadie puede escribir config/admins desde el cliente', async () => {
    await seedBase()
    await assertFails(
      setDoc(doc(admin(), 'config/admins'), { emails: [ADMIN_EMAIL, 'otro@x.com'] }),
    )
    await assertFails(setDoc(doc(stranger(), 'config/admins'), { emails: ['curioso@example.com'] }))
    await assertFails(deleteDoc(doc(admin(), 'config/admins')))
  })

  it('sin config/admins nadie es admin', async () => {
    await seed((db) => setDoc(doc(db, 'gifts/g1'), giftData()))
    await assertFails(getDocs(collection(admin(), 'rsvps')))
  })
})

describe('admin · Gestión de regalos', () => {
  it('Crear un regalo: se guarda con reservedCount 0', async () => {
    await seedBase()
    await assertSucceeds(
      setDoc(
        doc(admin(), 'gifts/g2'),
        giftData({
          description: 'De algodón',
          url: 'https://tienda.example.com/body',
          imageUrl: 'https://tienda.example.com/body.jpg',
          priceEur: 25,
          category: 'ropa',
        }),
      ),
    )
  })

  it('Crear un regalo: las reglas rechazan crearlo con reservas', async () => {
    await seedBase()
    await assertFails(setDoc(doc(admin(), 'gifts/g2'), giftData({ reservedCount: 1 })))
  })

  it.each([
    ['una categoría fuera de la lista', { category: 'coches' }],
    ['un enlace que no empieza por https://', { url: 'http://tienda.example.com' }],
    ['una imagen que no empieza por https://', { imageUrl: 'javascript:alert(1)' }],
    ['un precio negativo', { priceEur: -5 }],
    ['un precio con decimales', { priceEur: 9.99 }],
    ['cantidad 0', { quantity: 0 }],
    ['un título vacío', { title: '' }],
    ['un campo extra', { reservedBy: 'Ana' }],
    ['updatedAt puesto por el cliente', { updatedAt: Timestamp.now() }],
  ])('Datos de regalo inválidos: se rechaza %s', async (_desc, override) => {
    await seedBase()
    await assertFails(setDoc(doc(admin(), 'gifts/g2'), giftData(override)))
  })

  it('Reducir cantidad por debajo de lo reservado: se rechaza', async () => {
    await seedBase({ gift: { quantity: 3, reservedCount: 2 } })
    await assertFails(
      updateDoc(doc(admin(), 'gifts/g1'), { quantity: 1, updatedAt: serverTimestamp() }),
    )
    await assertSucceeds(
      updateDoc(doc(admin(), 'gifts/g1'), { quantity: 2, updatedAt: serverTimestamp() }),
    )
  })

  it('Editar un regalo mientras alguien reserva: el guardado no toca reservedCount', async () => {
    await seedBase({ gift: { quantity: 3 } })
    await assertSucceeds(reserve(guest('ana'), 'g1', 'ana'))
    await assertSucceeds(
      updateDoc(doc(admin(), 'gifts/g1'), {
        title: 'Pañales talla 2',
        order: 5,
        active: false,
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('Editar con un reservedCount desfasado (más alto) se rechaza', async () => {
    await seedBase({ gift: { quantity: 3, reservedCount: 1 } })
    await assertFails(
      updateDoc(doc(admin(), 'gifts/g1'), {
        title: 'Otro',
        reservedCount: 2,
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('Borrar un regalo con reservas: se borran también sus reservas en el mismo batch', async () => {
    await seedBase({ gift: { reservedCount: 2 } })
    await seedReservation('g1', 'ana')
    await seedReservation('g1', 'bea')
    const db = admin()
    const batch = writeBatch(db)
    batch.delete(doc(db, 'gifts/g1'))
    batch.delete(doc(db, 'reservations/g1_ana'))
    batch.delete(doc(db, 'reservations/g1_bea'))
    await assertSucceeds(batch.commit())
  })
})

describe('admin · Configuración del evento', () => {
  it('un admin puede crear y editar config/event', async () => {
    await seedBase({ event: null })
    await assertSucceeds(setDoc(doc(admin(), 'config/event'), eventData()))
    await assertSucceeds(
      setDoc(doc(admin(), 'config/event'), eventData({ registryClosesAt: hoursFromNow(48) })),
    )
  })

  it('Cambiar la fecha límite de RSVP: las reglas aplican el nuevo plazo de inmediato', async () => {
    await seedBase()
    await assertSucceeds(setDoc(doc(guest('ana'), 'rsvps/ana'), rsvpData()))
    await assertSucceeds(
      updateDoc(doc(admin(), 'config/event'), { rsvpDeadline: hoursFromNow(-1) }),
    )
    await assertFails(setDoc(doc(guest('ana'), 'rsvps/ana'), rsvpData()))
  })

  it.each([
    ['campos extra', { secret: 'x' }],
    [
      'la hora de fin anterior a la de inicio',
      { endsAt: hoursFromNow(1), startsAt: hoursFromNow(2) },
    ],
    ['un mapsUrl que no empieza por https://', { mapsUrl: 'javascript:alert(1)' }],
    ['un registryClosesAt que no es fecha', { registryClosesAt: 'mañana' }],
  ])('Datos del evento inválidos: se rechaza %s', async (_desc, override) => {
    await seedBase({ event: null })
    await assertFails(setDoc(doc(admin(), 'config/event'), eventData(override)))
  })

  it('nadie puede borrar config/event', async () => {
    await seedBase()
    await assertFails(deleteDoc(doc(admin(), 'config/event')))
  })
})

describe('admin · Supervisión de reservas y RSVPs', () => {
  it('Ver reservas de un regalo: el admin lee las reservas de cualquier invitado', async () => {
    await seedBase({ gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    await assertSucceeds(getDoc(doc(admin(), 'reservations/g1_ana')))
  })

  it('Liberar una reserva huérfana: borra la reserva y baja el contador en 1 de forma atómica', async () => {
    await seedBase({ gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    const db = admin()
    const batch = writeBatch(db)
    batch.delete(doc(db, 'reservations/g1_ana'))
    batch.update(doc(db, 'gifts/g1'), {
      reservedCount: increment(-1),
      updatedAt: serverTimestamp(),
    })
    await assertSucceeds(batch.commit())
  })

  it('el admin puede liberar aunque la lista esté cerrada', async () => {
    await seedBase({ gift: { reservedCount: 1 }, event: { registryClosesAt: hoursFromNow(-1) } })
    await seedReservation('g1', 'ana')
    const db = admin()
    const batch = writeBatch(db)
    batch.delete(doc(db, 'reservations/g1_ana'))
    batch.update(doc(db, 'gifts/g1'), {
      reservedCount: increment(-1),
      updatedAt: serverTimestamp(),
    })
    await assertSucceeds(batch.commit())
  })

  it('borrar una reserva sin bajar el contador se rechaza también para el admin', async () => {
    await seedBase({ gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    await assertFails(deleteDoc(doc(admin(), 'reservations/g1_ana')))
  })
})
