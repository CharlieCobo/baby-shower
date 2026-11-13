import { describe, expect, it } from 'vitest'
import { formatLongDate, formatPrice, formatTime, splitPlace } from '../../src/ui/format'

describe('Fechas en hora de Madrid', () => {
  it('formatea fecha y hora en Europe/Madrid aunque el dispositivo esté en otra zona', () => {
    // 15:00 UTC = 17:00 en Madrid en mayo; en Nueva York serían las 11:00
    const date = new Date('2027-05-24T15:00:00Z')
    expect(formatLongDate(date)).toBe('Lunes, 24 de mayo')
    expect(formatTime(date)).toBe('17:00 h')
  })

  it('cambia de día si en Madrid ya es el día siguiente', () => {
    expect(formatLongDate(new Date('2027-05-23T22:30:00Z'))).toBe('Lunes, 24 de mayo')
  })
})

describe('otros formatos', () => {
  it('precio orientativo', () => {
    expect(formatPrice(25)).toBe('~25 €')
  })

  it('separa nombre y dirección del lugar', () => {
    expect(splitPlace('Jardines La Rosaleda · Calle Mayor, 42')).toEqual({
      name: 'Jardines La Rosaleda',
      address: 'Calle Mayor, 42',
    })
    expect(splitPlace('Casa de los abuelos')).toEqual({ name: 'Casa de los abuelos' })
  })
})
