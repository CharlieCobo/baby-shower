import { describe, expect, it } from 'vitest'
import { validateRsvp, type RsvpInput } from '../../src/domain/rsvp'

const input = (overrides: Partial<RsvpInput> = {}): RsvpInput => ({
  name: 'Marta Gómez',
  attending: true,
  companions: 1,
  ...overrides,
})

describe('validateRsvp (Validación en cliente)', () => {
  it('acepta un RSVP válido y lo normaliza', () => {
    expect(
      validateRsvp(input({ name: '  Marta  ', dietary: ' Celíaca ', message: '   ' })),
    ).toEqual({
      ok: true,
      value: { name: 'Marta', attending: true, companions: 1, dietary: 'Celíaca' },
    })
  })

  it('sin nombre: error en el nombre', () => {
    expect(validateRsvp(input({ name: '   ' }))).toEqual({
      ok: false,
      errors: { name: 'required' },
    })
  })

  it('sin elegir asistencia: error', () => {
    expect(validateRsvp(input({ attending: null }))).toEqual({
      ok: false,
      errors: { attending: 'required' },
    })
  })

  it('más acompañantes de los permitidos: error', () => {
    expect(validateRsvp(input({ companions: 11 }))).toEqual({
      ok: false,
      errors: { companions: 'outOfRange' },
    })
  })

  it('textos demasiado largos: error en cada campo', () => {
    expect(
      validateRsvp(
        input({ name: 'x'.repeat(81), dietary: 'x'.repeat(201), message: 'x'.repeat(501) }),
      ),
    ).toEqual({
      ok: false,
      errors: { name: 'tooLong', dietary: 'tooLong', message: 'tooLong' },
    })
  })

  it('si no asiste, los acompañantes pasan a 0', () => {
    const result = validateRsvp(input({ attending: false, companions: 3 }))
    expect(result).toEqual({
      ok: true,
      value: { name: 'Marta Gómez', attending: false, companions: 0 },
    })
  })
})
