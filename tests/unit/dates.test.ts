import { describe, expect, it } from 'vitest'
import { parseEventDateTime, rsvpDeadlineFromDay } from '../../src/domain/dates'

describe('rsvpDeadlineFromDay (La fecha límite incluye el día completo)', () => {
  it('en horario de verano (UTC+2) devuelve las 23:59:59 de Madrid', () => {
    expect(rsvpDeadlineFromDay('2027-05-10').toISOString()).toBe('2027-05-10T21:59:59.000Z')
  })

  it('en horario de invierno (UTC+1) devuelve las 23:59:59 de Madrid', () => {
    expect(rsvpDeadlineFromDay('2027-01-15').toISOString()).toBe('2027-01-15T22:59:59.000Z')
  })

  it('acierta el día del cambio de hora', () => {
    // 28 de marzo de 2027: a las 02:00 pasa a ser las 03:00 (UTC+1 → UTC+2)
    expect(rsvpDeadlineFromDay('2027-03-28').toISOString()).toBe('2027-03-28T21:59:59.000Z')
    // 31 de octubre de 2027: a las 03:00 vuelve a ser las 02:00 (UTC+2 → UTC+1)
    expect(rsvpDeadlineFromDay('2027-10-31').toISOString()).toBe('2027-10-31T22:59:59.000Z')
  })

  it('rechaza formatos inválidos', () => {
    expect(() => rsvpDeadlineFromDay('10/05/2027')).toThrow()
  })
})

describe('parseEventDateTime (Fechas en hora de Madrid)', () => {
  it('interpreta la hora como hora de Madrid', () => {
    expect(parseEventDateTime('2027-05-24T17:00').toISOString()).toBe('2027-05-24T15:00:00.000Z')
    expect(parseEventDateTime('2027-12-05T11:30').toISOString()).toBe('2027-12-05T10:30:00.000Z')
  })

  it('rechaza formatos inválidos', () => {
    expect(() => parseEventDateTime('2027-05-24 17:00')).toThrow()
  })
})
