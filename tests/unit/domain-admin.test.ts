import { describe, expect, it } from 'vitest'
import {
  eventToForm,
  giftToForm,
  initials,
  reorder,
  rsvpsToCsv,
  searchRsvps,
  summarizeGifts,
  summarizeRsvps,
  validateEventForm,
  validateGiftForm,
  type RsvpRecord,
} from '../../src/domain/admin'
import { makeEvent, makeGift } from './fixtures'

const rsvp = (overrides: Partial<RsvpRecord>): RsvpRecord => ({
  uid: 'u',
  name: 'Marta Gómez',
  attending: true,
  companions: 0,
  updatedAt: new Date('2026-11-10T10:00:00Z'),
  ...overrides,
})

const records = [
  rsvp({
    uid: '1',
    name: 'Marta Gómez',
    companions: 1,
    dietary: 'Celíaca',
    updatedAt: new Date('2026-11-12T17:40:00Z'),
  }),
  rsvp({ uid: '2', name: 'Sofía Valero', attending: false, message: 'De viaje; ¡os quiero!' }),
  rsvp({ uid: '3', name: 'Carlos "Charlie" Ruiz', companions: 2 }),
]

describe('Supervisión de RSVPs', () => {
  it('resumen: vienen (con acompañantes) / no vienen', () => {
    expect(summarizeRsvps(records)).toEqual({
      attending: 2,
      companions: 3,
      people: 5,
      notAttending: 1,
    })
  })

  it('búsqueda por nombre sin tildes ni mayúsculas, y filtro por asistencia', () => {
    expect(searchRsvps(records, 'sofia').map((r) => r.uid)).toEqual(['2'])
    expect(searchRsvps(records, '', 'yes').map((r) => r.uid)).toEqual(['1', '3'])
    expect(searchRsvps(records, '', 'no').map((r) => r.uid)).toEqual(['2'])
  })

  it('iniciales para el avatar', () => {
    expect(initials('Marta Gómez Pérez')).toBe('MG')
    expect(initials('ana')).toBe('A')
  })

  it('Exportar asistentes: CSV con nombre, asistencia, acompañantes, alergias, mensaje y fecha', () => {
    const csv = rsvpsToCsv(records)
    expect(csv.startsWith('﻿')).toBe(true)
    const lines = csv.slice(1).trimEnd().split('\r\n')
    expect(lines[0]).toBe('Nombre;Asistencia;Acompañantes;Alergias;Mensaje;Fecha')
    expect(lines).toContain('Marta Gómez;Sí;1;Celíaca;;12/11/2026, 18:40')
    // Los ";" y las comillas se escapan
    expect(lines).toContain('Sofía Valero;No;0;;"De viaje; ¡os quiero!";10/11/2026, 11:00')
    expect(lines).toContain('"Carlos ""Charlie"" Ruiz";Sí;2;;;10/11/2026, 11:00')
  })
})

describe('Gestión de regalos', () => {
  it('resumen de regalos: unidades reservadas y libres', () => {
    expect(
      summarizeGifts([
        makeGift({ quantity: 4, reservedCount: 3 }),
        makeGift({ quantity: 1, reservedCount: 0 }),
      ]),
    ).toEqual({ gifts: 2, reservedUnits: 3, freeUnits: 2, covered: 60 })
  })

  it('valida y normaliza un regalo correcto', () => {
    expect(
      validateGiftForm({
        ...giftToForm(),
        title: '  Body  ',
        quantity: 2,
        priceEur: '25',
        url: 'https://tienda.example.com',
      }),
    ).toEqual({
      ok: true,
      value: {
        title: 'Body',
        category: 'ropa',
        quantity: 2,
        active: true,
        priceEur: 25,
        url: 'https://tienda.example.com',
      },
    })
  })

  it('Datos de regalo inválidos: categoría, URL sin https y precio negativo', () => {
    expect(
      validateGiftForm({
        ...giftToForm(),
        title: 'X',
        category: 'coches',
        url: 'http://x.com',
        imageUrl: 'javascript:alert(1)',
        priceEur: '-5',
      }),
    ).toEqual({
      ok: false,
      errors: { category: 'invalid', url: 'notHttps', imageUrl: 'notHttps', priceEur: 'invalid' },
    })
    expect(validateGiftForm({ ...giftToForm(), title: '' })).toEqual({
      ok: false,
      errors: { title: 'required' },
    })
  })

  it('Reducir cantidad por debajo de lo reservado: error', () => {
    expect(validateGiftForm({ ...giftToForm(), title: 'X', quantity: 1 }, 2)).toEqual({
      ok: false,
      errors: { quantity: 'belowReserved' },
    })
  })

  it('reordenar devuelve solo los regalos que cambian de posición', () => {
    const gifts = ['a', 'b', 'c', 'd'].map((id, order) => makeGift({ id, order }))
    expect(reorder(gifts, 'd', 'b')).toEqual([
      { id: 'd', order: 1 },
      { id: 'b', order: 2 },
      { id: 'c', order: 3 },
    ])
    expect(reorder(gifts, 'a', 'a')).toEqual([])
  })
})

describe('Configuración del evento', () => {
  const event = makeEvent({ registryClosesAt: new Date('2027-05-23T21:59:00Z'), babyName: 'Alex' })

  it('ida y vuelta: evento → formulario (hora de Madrid) → evento', () => {
    const form = eventToForm(event)
    expect(form).toMatchObject({
      date: '2027-05-24',
      startTime: '17:00',
      endTime: '21:00',
      rsvpDeadline: '2027-05-10',
      registryClosesAt: '2027-05-23T23:59',
    })
    expect(validateEventForm(form)).toEqual({ ok: true, value: event })
  })

  it('La fecha límite incluye el día completo: se guarda a las 23:59:59 de Madrid', () => {
    const result = validateEventForm({ ...eventToForm(event), rsvpDeadline: '2026-11-29' })
    expect(result.ok && result.value.rsvpDeadline.toISOString()).toBe('2026-11-29T22:59:59.000Z')
  })

  it('Datos del evento inválidos: fin anterior al inicio y Maps sin https', () => {
    expect(
      validateEventForm({ ...eventToForm(event), endTime: '16:00', mapsUrl: 'http://maps' }),
    ).toEqual({
      ok: false,
      errors: { endTime: 'endBeforeStart', mapsUrl: 'notHttps' },
    })
  })

  it('sin evento, el formulario sale vacío y exige los obligatorios', () => {
    const result = validateEventForm(eventToForm(null))
    expect(result.ok).toBe(false)
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(
      ['date', 'endTime', 'mapsUrl', 'rsvpDeadline', 'startTime', 'title'].sort(),
    )
  })
})
