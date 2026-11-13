// Adaptador de admin real contra el emulador con las reglas activadas (sección 5).
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { describe, expect, it, vi } from 'vitest'
import type { GiftDraft } from '../../src/domain/admin'
import { isDomainError } from '../../src/domain/errors'
import { createFirestoreAdminRepository } from '../../src/infrastructure/firebase/admin'
import { createFirestoreReservationRepository } from '../../src/infrastructure/firebase/repositories'
import {
  admin,
  guest,
  hoursFromNow,
  rsvpData,
  seed,
  seedBase,
  seedReservation,
  setupRulesEnv,
  stranger,
} from './helpers'

setupRulesEnv()

const draft: GiftDraft = {
  title: 'Mantita para bebé',
  category: 'paseo',
  quantity: 2,
  active: true,
  description: 'Suave',
  priceEur: 20,
  url: 'https://example.com/mantita',
}

const read = async (path: string) => {
  let data: Record<string, unknown> | undefined
  await seed(async (db) => {
    data = (await getDoc(doc(db, path))).data()
  })
  return data
}

describe('AdminRepository (Firestore)', () => {
  it('Crear un regalo: pasa las reglas con reservedCount 0', async () => {
    await seedBase()
    const id = await createFirestoreAdminRepository(admin()).createGift(draft, 7)
    expect(await read(`gifts/${id}`)).toMatchObject({ ...draft, order: 7, reservedCount: 0 })
  })

  it('un usuario fuera de la allowlist no puede crear regalos', async () => {
    await seedBase()
    const error: unknown = await createFirestoreAdminRepository(stranger())
      .createGift(draft, 1)
      .catch((e: unknown) => e)
    expect(isDomainError(error, 'permission-denied')).toBe(true)
  })

  it('Editar un regalo mientras alguien reserva: no pisa reservedCount y borra los opcionales vaciados', async () => {
    await seedBase({ gift: { quantity: 3, description: 'Vieja', priceEur: 9 } })
    await createFirestoreReservationRepository(guest('ana')).reserve('g1', 'ana')
    const { description: _d, priceEur: _p, ...withoutOptional } = draft
    await createFirestoreAdminRepository(admin()).updateGift('g1', {
      ...withoutOptional,
      quantity: 3,
    })
    const gift = await read('gifts/g1')
    expect(gift).toMatchObject({ title: 'Mantita para bebé', reservedCount: 1, quantity: 3 })
    expect(gift).not.toHaveProperty('description')
    expect(gift).not.toHaveProperty('priceEur')
  })

  it('Reducir cantidad por debajo de lo reservado: las reglas lo rechazan', async () => {
    await seedBase({ gift: { quantity: 3, reservedCount: 2 } })
    const error: unknown = await createFirestoreAdminRepository(admin())
      .updateGift('g1', { ...draft, quantity: 1 })
      .catch((e: unknown) => e)
    expect(isDomainError(error, 'permission-denied')).toBe(true)
  })

  it('switch Visible y reordenación', async () => {
    await seedBase()
    await seed((db) =>
      setDoc(doc(db, 'gifts/g2'), { ...draft, order: 2, reservedCount: 0, updatedAt: new Date() }),
    )
    const repo = createFirestoreAdminRepository(admin())
    await repo.setGiftActive('g1', false)
    await repo.reorderGifts([
      { id: 'g2', order: 0 },
      { id: 'g1', order: 1 },
    ])
    expect(await read('gifts/g1')).toMatchObject({ active: false, order: 1 })
    expect(await read('gifts/g2')).toMatchObject({ order: 0 })
  })

  it('Borrar un regalo con reservas: borra el regalo y sus reservas', async () => {
    await seedBase({ gift: { reservedCount: 2 } })
    await seedReservation('g1', 'ana')
    await seedReservation('g1', 'bea')
    await createFirestoreAdminRepository(admin()).deleteGift('g1', ['ana', 'bea'])
    expect(await read('gifts/g1')).toBeUndefined()
    expect(await read('reservations/g1_ana')).toBeUndefined()
  })

  it('Liberar una reserva huérfana: borra la reserva y baja el contador (también con la lista cerrada)', async () => {
    await seedBase({ gift: { reservedCount: 1 }, event: { registryClosesAt: hoursFromNow(-1) } })
    await seedReservation('g1', 'ana')
    await createFirestoreAdminRepository(admin()).releaseReservation('g1', 'ana')
    expect(await read('gifts/g1')).toMatchObject({ reservedCount: 0 })
    expect(await read('reservations/g1_ana')).toBeUndefined()
  })

  it('Ver reservas y RSVPs: el admin recibe las listas completas', async () => {
    await seedBase({ gift: { reservedCount: 1 } })
    await seedReservation('g1', 'ana')
    await seed((db) => setDoc(doc(db, 'rsvps/ana'), { ...rsvpData(), updatedAt: new Date() }))
    const repo = createFirestoreAdminRepository(admin())
    const onReservations = vi.fn()
    const onRsvps = vi.fn()
    const stop1 = repo.watchReservations(onReservations, vi.fn())
    const stop2 = repo.watchRsvps(onRsvps, vi.fn())
    await vi.waitFor(() =>
      expect(onReservations).toHaveBeenLastCalledWith([
        expect.objectContaining({ giftId: 'g1', uid: 'ana' }),
      ]),
    )
    await vi.waitFor(() =>
      expect(onRsvps).toHaveBeenLastCalledWith([
        expect.objectContaining({ uid: 'ana', name: 'Marta Gómez' }),
      ]),
    )
    stop1()
    stop2()
  })

  it('Cambiar la fecha límite de RSVP: saveEvent pasa las reglas y el nuevo plazo se aplica', async () => {
    await seedBase()
    await createFirestoreAdminRepository(admin()).saveEvent({
      title: 'Baby Shower de Alex',
      startsAt: new Date('2026-12-06T14:00:00Z'),
      endsAt: new Date('2026-12-06T18:00:00Z'),
      place: 'Parque Turia',
      mapsUrl: 'https://maps.google.com/?q=Gulliver',
      rsvpDeadline: new Date(Date.now() - 60_000),
      babyName: 'Alex',
    })
    expect(await read('config/event')).toMatchObject({
      title: 'Baby Shower de Alex',
      babyName: 'Alex',
    })
    const error: unknown = await setDoc(doc(guest('ana'), 'rsvps/ana'), rsvpData()).catch(
      (e: unknown) => e,
    )
    expect(error).toBeDefined()
  })
})
