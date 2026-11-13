import { describe, expect, it, vi } from 'vitest'
import { getEvent } from '../../src/application/event'
import {
  listGifts,
  releaseGift,
  reserveGift,
  watchMyReservations,
} from '../../src/application/gifts'
import { submitRsvp } from '../../src/application/rsvp'
import { DomainError, isDomainError } from '../../src/domain/errors'
import type { Gift } from '../../src/domain/gift'
import { createInMemoryBackend } from '../../src/infrastructure/in-memory/backend'
import { makeEvent, makeGift } from './fixtures'

const NOW = new Date('2027-05-01T10:00:00Z')

function setup(gifts: Gift[] = [makeGift()], event = makeEvent()) {
  const backend = createInMemoryBackend({ gifts, event, now: () => NOW })
  const deps = { ...backend, clock: { now: () => NOW } }
  return {
    backend,
    reserve: reserveGift(deps),
    release: releaseGift(deps),
    submit: submitRsvp(deps),
    mine: async () => backend.control.reservationsOf(await backend.auth.ensureGuestSession()),
  }
}

const expectCode = async (promise: Promise<unknown>, code: DomainError['code']) => {
  const error: unknown = await promise.catch((e: unknown) => e)
  expect(isDomainError(error, code)).toBe(true)
}

describe('listGifts', () => {
  it('Visitante abre la lista: solo regalos activos, ordenados, en tiempo real', async () => {
    const { backend } = setup([
      makeGift({ id: 'b', order: 2 }),
      makeGift({ id: 'oculto', active: false }),
      makeGift({ id: 'a', order: 1, quantity: 1 }),
    ])
    const onChange = vi.fn()
    const unsubscribe = listGifts(backend)(onChange, vi.fn())
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'a' }),
      expect.objectContaining({ id: 'b' }),
    ])

    // Actualización en tiempo real: otro invitado reserva
    await backend.control.reserveAs('otra', 'a')
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'a', reservedCount: 1 }),
      expect.objectContaining({ id: 'b' }),
    ])
    unsubscribe()
  })
})

describe('reserveGift', () => {
  it('Reserva correcta: crea la reserva e incrementa el contador', async () => {
    const { backend, reserve, mine } = setup()
    await reserve({ gift: makeGift(), event: makeEvent(), mine: new Set() })
    expect(backend.control.gift('g1')?.reservedCount).toBe(1)
    expect(await mine()).toEqual(new Set(['g1']))
  })

  it('Visitante abre la lista: la sesión anónima se crea una sola vez y en silencio', async () => {
    const { backend, reserve } = setup([makeGift({ id: 'a' }), makeGift({ id: 'b' })])
    await reserve({ gift: makeGift({ id: 'a' }), event: null, mine: new Set() })
    await reserve({ gift: makeGift({ id: 'b' }), event: null, mine: new Set(['a']) })
    expect(backend.control.sessionsCreated).toBe(1)
  })

  it('Carrera por la última unidad: si otro se adelanta, falla con sold-out', async () => {
    const { backend, reserve } = setup([makeGift({ quantity: 1 })])
    const staleGift = makeGift({ quantity: 1, reservedCount: 0 }) // lo que ve la UI
    await backend.control.reserveAs('otra', 'g1')
    await expectCode(reserve({ gift: staleGift, event: null, mine: new Set() }), 'sold-out')
    expect(backend.control.gift('g1')?.reservedCount).toBe(1)
  })

  it('Reserva duplicada desde el mismo dispositivo: se rechaza', async () => {
    const { reserve } = setup([makeGift({ quantity: 3 })])
    await reserve({ gift: makeGift({ quantity: 3 }), event: null, mine: new Set() })
    await expectCode(
      reserve({ gift: makeGift({ quantity: 3 }), event: null, mine: new Set(['g1']) }),
      'already-reserved',
    )
    // Aunque la UI no lo supiera, el backend también lo rechaza
    await expectCode(
      reserve({ gift: makeGift({ quantity: 3 }), event: null, mine: new Set() }),
      'already-reserved',
    )
  })

  it('Regalo agotado: no se intenta reservar', async () => {
    const { reserve } = setup([makeGift({ quantity: 1, reservedCount: 1 })])
    await expectCode(
      reserve({ gift: makeGift({ quantity: 1, reservedCount: 1 }), event: null, mine: new Set() }),
      'sold-out',
    )
  })

  it('Reserva tras el cierre: se rechaza', async () => {
    const closed = makeEvent({ registryClosesAt: new Date('2027-04-30T00:00:00Z') })
    const { reserve } = setup([makeGift()], closed)
    await expectCode(
      reserve({ gift: makeGift(), event: closed, mine: new Set() }),
      'registry-closed',
    )
  })
})

describe('releaseGift', () => {
  it('Liberar reserva propia: borra la reserva y decrementa el contador', async () => {
    const { backend, reserve, release, mine } = setup()
    await reserve({ gift: makeGift(), event: null, mine: new Set() })
    await release({ gift: makeGift(), event: null, mine: new Set(['g1']) })
    expect(backend.control.gift('g1')?.reservedCount).toBe(0)
    expect(await mine()).toEqual(new Set())
  })

  it('Dispositivo distinto: no puede liberar la reserva hecha desde otro', async () => {
    const { backend, reserve, release } = setup()
    await reserve({ gift: makeGift(), event: null, mine: new Set() })
    backend.control.switchDevice(null) // nuevo navegador → nueva sesión anónima
    await expectCode(
      release({ gift: makeGift(), event: null, mine: new Set(['g1']) }),
      'not-reserved',
    )
    expect(backend.control.gift('g1')?.reservedCount).toBe(1)
  })

  it('Liberar tras el cierre: se rechaza', async () => {
    const closed = makeEvent({ registryClosesAt: new Date('2027-04-30T00:00:00Z') })
    const { release } = setup([makeGift({ reservedCount: 1 })], closed)
    await expectCode(
      release({ gift: makeGift(), event: closed, mine: new Set(['g1']) }),
      'registry-closed',
    )
  })
})

describe('watchMyReservations', () => {
  it('Persistencia entre visitas: devuelve las reservas propias de la sesión', async () => {
    const { backend, reserve } = setup([makeGift({ id: 'a' }), makeGift({ id: 'b' })])
    await reserve({ gift: makeGift({ id: 'a' }), event: null, mine: new Set() })
    await backend.control.reserveAs('otra', 'b')
    const onChange = vi.fn()
    const unsubscribe = watchMyReservations(backend)(onChange, vi.fn())
    await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith(new Set(['a'])))
    unsubscribe()
  })
})

describe('submitRsvp', () => {
  const valid = { name: 'Marta', attending: true, companions: 2, dietary: 'Celíaca' }

  it('RSVP válido: se guarda en el documento de la sesión', async () => {
    const { backend, submit } = setup()
    const result = await submit(valid, makeEvent())
    expect(result).toEqual({
      ok: true,
      rsvp: { name: 'Marta', attending: true, companions: 2, dietary: 'Celíaca' },
    })
    expect(backend.control.rsvp(await backend.auth.ensureGuestSession())).toMatchObject({
      name: 'Marta',
      updatedAt: NOW,
    })
  })

  it('Validación en cliente: devuelve los errores y no guarda nada', async () => {
    const { backend, submit } = setup()
    const result = await submit({ ...valid, name: '' }, makeEvent())
    expect(result).toEqual({ ok: false, errors: { name: 'required' } })
    expect(backend.control.rsvp(await backend.auth.ensureGuestSession())).toBeUndefined()
  })

  it('Cambiar la respuesta: sobrescribe el RSVP anterior', async () => {
    const { backend, submit } = setup()
    await submit(valid, makeEvent())
    await submit({ ...valid, attending: false }, makeEvent())
    expect(backend.control.rsvp(await backend.auth.ensureGuestSession())).toEqual({
      name: 'Marta',
      attending: false,
      companions: 0,
      dietary: 'Celíaca',
      updatedAt: NOW,
    })
  })

  it('RSVP fuera de plazo: se rechaza', async () => {
    const late = makeEvent({ rsvpDeadline: new Date('2027-04-30T21:59:59Z') })
    const { submit } = setup([makeGift()], late)
    await expectCode(submit(valid, late), 'rsvp-closed')
  })
})

describe('getEvent', () => {
  it('devuelve el evento o null si no está configurado', async () => {
    const backend = createInMemoryBackend({ gifts: [], event: null })
    expect(await getEvent(backend)()).toBeNull()
    backend.control.setEvent(makeEvent())
    expect(await getEvent(backend)()).toMatchObject({ title: 'Baby Shower de Alex' })
  })
})
