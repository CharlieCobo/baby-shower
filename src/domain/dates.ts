// Todas las fechas del evento se interpretan y muestran en hora de Madrid,
// sea cual sea la zona horaria del dispositivo (design.md § 2).
export const EVENT_TIME_ZONE = 'Europe/Madrid'

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

/** Desfase (en ms) de una zona horaria respecto a UTC en un instante dado. */
function timeZoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant))
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN)
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )
  return asUtc - Math.floor(instant / 1000) * 1000
}

/** Instante UTC correspondiente a una fecha y hora "de pared" en la zona del evento. */
export function zonedTimeToDate(
  wall: { year: number; month: number; day: number; hour: number; minute: number; second?: number },
  timeZone: string = EVENT_TIME_ZONE,
): Date {
  const naive = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second ?? 0,
  )
  // Dos pasadas para acertar también en los días de cambio de hora.
  let instant = naive - timeZoneOffsetMs(naive, timeZone)
  instant = naive - timeZoneOffsetMs(instant, timeZone)
  return new Date(instant)
}

/** "2027-05-24T17:00" en hora de Madrid → Date. */
export function parseEventDateTime(value: string): Date {
  const m = LOCAL_DATE_TIME_PATTERN.exec(value)
  if (!m) throw new Error(`Fecha y hora inválida: "${value}" (formato AAAA-MM-DDTHH:MM)`)
  const [, y, mo, d, h, mi, s] = m
  return zonedTimeToDate({
    year: Number(y),
    month: Number(mo),
    day: Number(d),
    hour: Number(h),
    minute: Number(mi),
    second: Number(s ?? 0),
  })
}

/**
 * Fecha límite de RSVP a partir de un día ("2027-05-10"): último segundo de ese día
 * en hora de Madrid, para que los invitados puedan responder durante todo el día.
 */
export function rsvpDeadlineFromDay(day: string): Date {
  const m = DAY_PATTERN.exec(day)
  if (!m) throw new Error(`Día inválido: "${day}" (formato AAAA-MM-DD)`)
  const [, y, mo, d] = m
  return zonedTimeToDate({
    year: Number(y),
    month: Number(mo),
    day: Number(d),
    hour: 23,
    minute: 59,
    second: 59,
  })
}
