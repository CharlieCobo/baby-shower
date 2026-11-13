// "Añadir al calendario": enlace de Google Calendar y fichero .ics (RFC 5545).
// Las horas se escriben en UTC (sufijo Z): cada calendario las muestra en su zona,
// así que en España salen a la hora de Madrid.
import type { EventInfo } from './event'

type CalendarEvent = Pick<EventInfo, 'title' | 'startsAt' | 'endsAt' | 'place'>

const utcStamp = (date: Date): string =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

export function googleCalendarUrl(event: CalendarEvent, details: string): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${utcStamp(event.startsAt)}/${utcStamp(event.endsAt)}`,
    location: event.place,
    details,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

const escapeText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Pliega líneas de más de 75 octetos, como pide el estándar. */
function fold(line: string): string {
  const bytes = new TextEncoder()
  const parts: string[] = []
  let current = ''
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74 // las continuaciones empiezan con un espacio
    if (bytes.encode(current + char).length > limit) {
      parts.push(current)
      current = char
    } else {
      current += char
    }
  }
  parts.push(current)
  return parts.join('\r\n ')
}

export function buildIcs(
  event: CalendarEvent,
  options: { uid: string; url: string; description: string; now?: Date },
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//baby-shower//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${options.uid}`,
    `DTSTAMP:${utcStamp(options.now ?? new Date())}`,
    `DTSTART:${utcStamp(event.startsAt)}`,
    `DTEND:${utcStamp(event.endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `LOCATION:${escapeText(event.place)}`,
    `DESCRIPTION:${escapeText(options.description)}`,
    `URL:${options.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}
