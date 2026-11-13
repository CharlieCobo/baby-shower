import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { describe, it } from 'vitest'
import {
  giftData,
  guest,
  hoursFromNow,
  release,
  reserve,
  seedBase,
  seedReservation,
  unauthenticated,
  setupRulesEnv,
} from './helpers'

setupRulesEnv()

describe('gift-registry · Listado público de regalos', () => {
  it('cualquier visitante, incluso sin sesión, puede leer los regalos', async () => {
    await seedBase()
    await assertSucceeds(getDocs(collection(unauthenticated(), 'gifts')))
    await assertSucceeds(getDoc(doc(guest(), 'gifts/g1')))
  })
})

describe('gift-registry · Reserva anónima de un regalo', () => {
  it('Reserva correcta: crea la reserva e incrementa el contador de forma atómica', async () => {
    await seedBase()
    await assertSucceeds(reserve(guest('ana'), 'g1', 'ana'))
  })

  it('Carrera por la última unidad: solo una reserva se completa', async () => {
    await seedBase({ gift: { quantity: 1 } })
    await assertSucceeds(reserve(guest('ana'), 'g1', 'ana'))
    await assertFails(reserve(guest('bea'), 'g1', 'bea'))
  })

  it('no se puede reservar por encima de la cantidad', async () => {
    await seedBase({ gift: { quantity: 2, reservedCount: 2 } })
    await assertFails(reserve(guest('ana'), 'g1', 'ana'))
  })

  it('Reserva duplicada desde el mismo dispositivo: se rechaza', async () => {
    await seedBase({ gift: { quantity: 3, reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    await assertFails(reserve(guest('ana'), 'g1', 'ana'))
  })

  it('no se puede reservar un regalo oculto (active == false)', async () => {
    await seedBase({ gift: { active: false } })
    await assertFails(reserve(guest('ana'), 'g1', 'ana'))
  })

  it('no se puede reservar sin sesión', async () => {
    await seedBase()
    await assertFails(reserve(unauthenticated(), 'g1', 'ana'))
  })

  it('no se puede crear una reserva a nombre de otro UID', async () => {
    await seedBase()
    await assertFails(reserve(guest('ana'), 'g1', 'bea'))
  })

  it('la reserva no admite campos extra ni una fecha puesta por el cliente', async () => {
    await seedBase()
    const db = guest('ana')
    const withName = writeBatch(db)
    withName.set(doc(db, 'reservations/g1_ana'), {
      giftId: 'g1',
      uid: 'ana',
      createdAt: serverTimestamp(),
      name: 'Ana',
    })
    withName.update(doc(db, 'gifts/g1'), {
      reservedCount: increment(1),
      updatedAt: serverTimestamp(),
    })
    await assertFails(withName.commit())

    const clientDate = writeBatch(db)
    clientDate.set(doc(db, 'reservations/g1_ana'), {
      giftId: 'g1',
      uid: 'ana',
      createdAt: Timestamp.now(),
    })
    clientDate.update(doc(db, 'gifts/g1'), {
      reservedCount: increment(1),
      updatedAt: serverTimestamp(),
    })
    await assertFails(clientDate.commit())
  })

  it('una reserva no se puede modificar', async () => {
    await seedBase({ gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    await assertFails(updateDoc(doc(guest('ana'), 'reservations/g1_ana'), { giftId: 'g2' }))
  })
})

describe('gift-registry · Liberar una reserva propia', () => {
  it('Liberar reserva propia: borra la reserva y decrementa el contador de forma atómica', async () => {
    await seedBase({ gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    await assertSucceeds(release(guest('ana'), 'g1', 'ana'))
  })

  it('Intento de liberar una reserva ajena: se rechaza', async () => {
    await seedBase({ gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    await assertFails(release(guest('bea'), 'g1', 'ana'))
  })

  it('Intento de liberar una reserva ajena junto con la propia en el mismo batch: se rechaza', async () => {
    await seedBase({ gift: { quantity: 3, reservedCount: 2 } })
    await seedReservation('g1', 'ana')
    await seedReservation('g1', 'bea')
    const db = guest('bea')
    const batch = writeBatch(db)
    batch.delete(doc(db, 'reservations/g1_bea'))
    batch.delete(doc(db, 'reservations/g1_ana'))
    batch.update(doc(db, 'gifts/g1'), {
      reservedCount: increment(-1),
      updatedAt: serverTimestamp(),
    })
    await assertFails(batch.commit())
  })

  it('Intento de decrementar el contador sin borrar la reserva: se rechaza', async () => {
    await seedBase({ gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    await assertFails(
      updateDoc(doc(guest('ana'), 'gifts/g1'), {
        reservedCount: increment(-1),
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('borrar la reserva propia sin decrementar el contador: se rechaza', async () => {
    await seedBase({ gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    await assertFails(deleteDoc(doc(guest('ana'), 'reservations/g1_ana')))
  })
})

describe('gift-registry · Integridad de la lista', () => {
  it.each([
    ['title', { title: 'Hackeado' }],
    ['quantity', { quantity: 99 }],
    ['active', { active: false }],
  ])('Manipulación desde la consola: un invitado no puede cambiar %s', async (_field, change) => {
    await seedBase()
    await assertFails(
      updateDoc(doc(guest(), 'gifts/g1'), { ...change, updatedAt: serverTimestamp() }),
    )
  })

  it('Manipulación desde la consola: un invitado no puede crear ni borrar regalos', async () => {
    await seedBase()
    await assertFails(addDoc(collection(guest(), 'gifts'), giftData()))
    await assertFails(setDoc(doc(guest(), 'gifts/nuevo'), giftData()))
    await assertFails(deleteDoc(doc(guest(), 'gifts/g1')))
  })

  it('Incremento sin reserva: se rechaza', async () => {
    await seedBase()
    await assertFails(
      updateDoc(doc(guest('ana'), 'gifts/g1'), {
        reservedCount: increment(1),
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('crear la reserva sin incrementar el contador: se rechaza', async () => {
    await seedBase()
    await assertFails(
      setDoc(doc(guest('ana'), 'reservations/g1_ana'), {
        giftId: 'g1',
        uid: 'ana',
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('el contador no puede saltar más de 1 ni la fecha la pone el cliente', async () => {
    await seedBase({ gift: { quantity: 5 } })
    const db = guest('ana')
    const jump = writeBatch(db)
    jump.set(doc(db, 'reservations/g1_ana'), {
      giftId: 'g1',
      uid: 'ana',
      createdAt: serverTimestamp(),
    })
    jump.update(doc(db, 'gifts/g1'), { reservedCount: increment(2), updatedAt: serverTimestamp() })
    await assertFails(jump.commit())

    const clientDate = writeBatch(db)
    clientDate.set(doc(db, 'reservations/g1_ana'), {
      giftId: 'g1',
      uid: 'ana',
      createdAt: serverTimestamp(),
    })
    clientDate.update(doc(db, 'gifts/g1'), {
      reservedCount: increment(1),
      updatedAt: Timestamp.now(),
    })
    await assertFails(clientDate.commit())
  })
})

describe('gift-registry · Cierre de la lista', () => {
  it('Reserva tras el cierre: se rechaza', async () => {
    await seedBase({ event: { registryClosesAt: hoursFromNow(-1) } })
    await assertFails(reserve(guest('ana'), 'g1', 'ana'))
  })

  it('Liberar tras el cierre: se rechaza', async () => {
    await seedBase({ event: { registryClosesAt: hoursFromNow(-1) }, gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    await assertFails(release(guest('ana'), 'g1', 'ana'))
  })

  it('antes de la fecha de cierre se puede reservar', async () => {
    await seedBase({ event: { registryClosesAt: hoursFromNow(1) } })
    await assertSucceeds(reserve(guest('ana'), 'g1', 'ana'))
  })

  it('Sin fecha de cierre: la lista permanece abierta', async () => {
    await seedBase()
    await assertSucceeds(reserve(guest('ana'), 'g1', 'ana'))
  })

  it('sin documento config/event la lista permanece abierta', async () => {
    await seedBase({ event: null })
    await assertSucceeds(reserve(guest('ana'), 'g1', 'ana'))
  })
})

describe('gift-registry · Privacidad de las reservas', () => {
  it('Lectura de reservas ajenas: la consulta sin filtrar por UID se rechaza', async () => {
    await seedBase({ gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    await assertFails(getDocs(collection(guest('bea'), 'reservations')))
    await assertFails(getDocs(collection(unauthenticated(), 'reservations')))
  })

  it('un invitado no puede leer una reserva ajena por su id', async () => {
    await seedBase({ gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    await assertFails(getDoc(doc(guest('bea'), 'reservations/g1_ana')))
  })

  it('Persistencia entre visitas: el invitado puede consultar sus propias reservas', async () => {
    await seedBase({ gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    const db = guest('ana')
    await assertSucceeds(getDocs(query(collection(db, 'reservations'), where('uid', '==', 'ana'))))
  })

  it('Dispositivo distinto: un UID nuevo no ve las reservas anteriores como propias', async () => {
    await seedBase({ gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    const db = guest('ana-movil-nuevo')
    await assertFails(getDocs(query(collection(db, 'reservations'), where('uid', '==', 'ana'))))
  })
})
