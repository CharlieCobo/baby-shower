import { describe, expect, it } from 'vitest'
import { buildIcs, googleCalendarUrl } from '../../src/domain/calendar'
import { makeEvent } from './fixtures'

describe('Añadir al calendario', () => {
  const event = makeEvent({ place: 'Jardines La Rosaleda · Calle Mayor, 42, Valencia' })

  it('enlace de Google Calendar con título, fechas en UTC y lugar', () => {
    const url = new URL(googleCalendarUrl(event, 'Info'))
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render')
    expect(url.searchParams.get('text')).toBe('Baby Shower de Alex')
    expect(url.searchParams.get('dates')).toBe('20270524T150000Z/20270524T190000Z')
    expect(url.searchParams.get('location')).toBe(event.place)
  })

  it('Descarga del .ics: fichero válido con título, fecha, hora y ubicación', () => {
    const ics = buildIcs(event, {
      uid: 'baby-shower@charliecobo.github.io',
      url: 'https://charliecobo.github.io/baby-shower/',
      description: 'Una descripción larga '.repeat(6),
      now: new Date('2027-01-01T00:00:00Z'),
    })
    const lines = ics.split('\r\n')
    expect(lines[0]).toBe('BEGIN:VCALENDAR')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    // 17:00 en Madrid (UTC+2 en mayo) = 15:00 UTC
    expect(lines).toContain('DTSTART:20270524T150000Z')
    expect(lines).toContain('DTEND:20270524T190000Z')
    expect(lines).toContain('SUMMARY:Baby Shower de Alex')
    // Las comas se escapan
    expect(lines).toContain('LOCATION:Jardines La Rosaleda · Calle Mayor\\, 42\\, Valencia')
    // Los puntos y coma y saltos de línea también
    const tricky = buildIcs(
      { ...event, title: 'Fiesta; con sorpresa', place: 'Casa\nJardín' },
      { uid: 'x', url: 'https://x.test/', description: 'd' },
    )
    expect(tricky).toContain('SUMMARY:Fiesta\\; con sorpresa')
    expect(tricky).toContain('LOCATION:Casa\\nJardín')
    // Ninguna línea supera 75 octetos y las continuaciones empiezan por espacio
    for (const line of lines) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    expect(lines.some((l) => l.startsWith(' '))).toBe(true)
  })
})
