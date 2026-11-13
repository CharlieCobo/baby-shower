// Adaptadores de Firestore reales contra el emulador con las reglas activadas:
// comprueba que lo que escribe la app cumple firestore.rules (tarea 3.4).
import { describe, expect, it, vi } from 'vitest'
import { DomainError, isDomainError } from '../../src/domain/errors'
import {
  createFirestoreEventRepository,
  createFirestoreGiftRepository,
  createFirestoreReservationRepository,
  createFirestoreRsvpRepository,
} from '../../src/infrastructure/firebase/repositories'
import {
  guest,
  hoursFromNow,
  seed,
  seedBase,
  seedReservation,
  setupRulesEnv,
  unauthenticated,
} from './helpers'
import { doc, getDoc } from 'firebase/firestore'

setupRulesEnv()

const expectCode = async (promise: Promise<unknown>, code: DomainError['code']) => {
  const error: unknown = await promise.catch((e: unknown) => e)
  expect(isDomainError(error, code), String(error)).toBe(true)
}

const readGift = async (id = 'g1') => {
  let data: Record<string, unknown> | undefined
  await seed(async (db) => {
    data = (await getDoc(doc(db, `gifts/${id}`))).data()
  })
  return data
}

describe('ReservationRepository (Firestore)', () => {
  it('Reserva correcta y Liberar reserva propia pasan las reglas', async () => {
    await seedBase()
    const repo = createFirestoreReservationRepository(guest('ana'))
    await repo.reserve('g1', 'ana')
    expect(await readGift()).toMatchObject({ reservedCount: 1 })
    await repo.release('g1', 'ana')
    expect(await readGift()).toMatchObject({ reservedCount: 0 })
  })

  it('Carrera por la última unidad: el segundo recibe sold-out', async () => {
    await seedBase({ gift: { quantity: 1 } })
    await createFirestoreReservationRepository(guest('ana')).reserve('g1', 'ana')
    await expectCode(
      createFirestoreReservationRepository(guest('bea')).reserve('g1', 'bea'),
      'sold-out',
    )
  })

  it('reservas simultáneas de la última unidad: solo una se completa', async () => {
    await seedBase({ gift: { quantity: 1 } })
    const results = await Promise.allSettled([
      createFirestoreReservationRepository(guest('ana')).reserve('g1', 'ana'),
      createFirestoreReservationRepository(guest('bea')).reserve('g1', 'bea'),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(await readGift()).toMatchObject({ reservedCount: 1 })
  })

  it('Reserva duplicada: las reglas la rechazan', async () => {
    await seedBase({ gift: { quantity: 3 } })
    const repo = createFirestoreReservationRepository(guest('ana'))
    await repo.reserve('g1', 'ana')
    await expectCode(repo.reserve('g1', 'ana'), 'permission-denied')
    expect(await readGift()).toMatchObject({ reservedCount: 1 })
  })

  it('regalo oculto o inexistente: unavailable', async () => {
    await seedBase({ gift: { active: false } })
    const repo = createFirestoreReservationRepository(guest('ana'))
    await expectCode(repo.reserve('g1', 'ana'), 'unavailable')
    await expectCode(repo.reserve('no-existe', 'ana'), 'unavailable')
  })

  it('Reserva tras el cierre: permission-denied', async () => {
    await seedBase({ event: { registryClosesAt: hoursFromNow(-1) } })
    await expectCode(
      createFirestoreReservationRepository(guest('ana')).reserve('g1', 'ana'),
      'permission-denied',
    )
  })

  it('Intento de liberar una reserva ajena: permission-denied', async () => {
    await seedBase({ gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    await expectCode(
      createFirestoreReservationRepository(guest('bea')).release('g1', 'bea'),
      'permission-denied',
    )
  })

  it('Persistencia entre visitas: watchMine devuelve solo las propias', async () => {
    await seedBase({ gift: { quantity: 3, reservedCount: 2 } })
    await seedReservation('g1', 'ana')
    await seedReservation('g1', 'bea')
    const onChange = vi.fn()
    const unsubscribe = createFirestoreReservationRepository(guest('ana')).watchMine(
      'ana',
      onChange,
      vi.fn(),
    )
    await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith(new Set(['g1'])))
    unsubscribe()
  })
})

describe('GiftRepository (Firestore)', () => {
  it('Actualización en tiempo real: watchAll recibe los cambios de otros invitados', async () => {
    await seedBase()
    const onChange = vi.fn()
    const unsubscribe = createFirestoreGiftRepository(unauthenticated()).watchAll(onChange, vi.fn())
    await vi.waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({ id: 'g1', reservedCount: 0 }),
      ]),
    )
    await createFirestoreReservationRepository(guest('bea')).reserve('g1', 'bea')
    await vi.waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({ id: 'g1', reservedCount: 1 }),
      ]),
    )
    unsubscribe()
  })
})

describe('RsvpRepository (Firestore)', () => {
  it('RSVP válido y Cambiar la respuesta pasan las reglas (sin opcionales vacíos)', async () => {
    await seedBase()
    const repo = createFirestoreRsvpRepository(guest('ana'))
    await repo.save('ana', { name: 'Ana', attending: true, companions: 2, dietary: 'Celíaca' })
    await repo.save('ana', { name: 'Ana', attending: false, companions: 0 })
  })

  it('RSVP fuera de plazo: permission-denied', async () => {
    await seedBase({ event: { rsvpDeadline: hoursFromNow(-1) } })
    await expectCode(
      createFirestoreRsvpRepository(guest('ana')).save('ana', {
        name: 'Ana',
        attending: true,
        companions: 0,
      }),
      'permission-denied',
    )
  })
})

describe('EventRepository (Firestore)', () => {
  it('Datos del evento: lee y convierte las fechas', async () => {
    await seedBase({ event: { registryClosesAt: hoursFromNow(5) } })
    const event = await createFirestoreEventRepository(unauthenticated()).get()
    expect(event).toMatchObject({ title: 'Baby Shower de Alex', babyName: 'Alex' })
    expect(event?.startsAt).toBeInstanceOf(Date)
    expect(event?.registryClosesAt).toBeInstanceOf(Date)
  })

  it('Evento sin configurar: devuelve null', async () => {
    await seedBase({ event: null })
    expect(await createFirestoreEventRepository(unauthenticated()).get()).toBeNull()
  })
})
