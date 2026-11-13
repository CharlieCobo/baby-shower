import { describe, expect, it } from 'vitest'
import { countdown, isRegistryOpen, isRsvpOpen } from '../../src/domain/event'
import { makeEvent } from './fixtures'

const at = (iso: string) => new Date(iso)

describe('isRegistryOpen', () => {
  it('Sin fecha de cierre: la lista permanece abierta', () => {
    expect(isRegistryOpen(makeEvent(), at('2030-01-01T00:00:00Z'))).toBe(true)
  })

  it('sin evento la lista está abierta', () => {
    expect(isRegistryOpen(null, at('2030-01-01T00:00:00Z'))).toBe(true)
  })

  it('se cierra en el instante de registryClosesAt', () => {
    const event = makeEvent({ registryClosesAt: at('2027-05-23T21:59:00Z') })
    expect(isRegistryOpen(event, at('2027-05-23T21:58:59Z'))).toBe(true)
    expect(isRegistryOpen(event, at('2027-05-23T21:59:00Z'))).toBe(false)
  })
})

describe('isRsvpOpen (RSVP fuera de plazo)', () => {
  it('abierto hasta el último segundo del día límite, incluido', () => {
    expect(isRsvpOpen(makeEvent(), at('2027-05-10T21:59:59Z'))).toBe(true)
    expect(isRsvpOpen(makeEvent(), at('2027-05-10T22:00:00Z'))).toBe(false)
  })

  it('sin evento no hay plazo', () => {
    expect(isRsvpOpen(null, at('2030-01-01T00:00:00Z'))).toBe(true)
  })
})

describe('countdown', () => {
  const event = makeEvent()

  it('Cuenta atrás: días naturales de Madrid hasta el evento', () => {
    expect(countdown(event, at('2027-05-14T10:00:00Z'))).toEqual({ kind: 'days', days: 10 })
    // 23 de mayo a las 23:30 en Madrid: queda 1 día aunque falten menos de 24 h
    expect(countdown(event, at('2027-05-23T21:30:00Z'))).toEqual({ kind: 'days', days: 1 })
  })

  it('Día del evento: "¡Es hoy!" (también durante la fiesta)', () => {
    expect(countdown(event, at('2027-05-23T22:30:00Z'))).toEqual({ kind: 'today' }) // 00:30 Madrid
    expect(countdown(event, at('2027-05-24T16:00:00Z'))).toEqual({ kind: 'today' })
  })

  it('Evento pasado: no se muestra', () => {
    expect(countdown(event, at('2027-05-24T19:00:00Z'))).toEqual({ kind: 'past' })
    expect(countdown(event, at('2027-06-01T10:00:00Z'))).toEqual({ kind: 'past' })
  })
})
