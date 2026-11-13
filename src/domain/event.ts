import { EVENT_TIME_ZONE } from './dates'

export interface EventInfo {
  title: string
  startsAt: Date
  endsAt: Date
  place: string
  mapsUrl: string
  rsvpDeadline: Date
  registryClosesAt?: Date
  babyName?: string
}

/** Sin evento o sin fecha de cierre, la lista está abierta (igual que en las reglas). */
export const isRegistryOpen = (event: EventInfo | null, now: Date): boolean =>
  !event?.registryClosesAt || now.getTime() < event.registryClosesAt.getTime()

/** El plazo incluye el instante límite (23:59:59 del día elegido), igual que en las reglas. */
export const isRsvpOpen = (event: EventInfo | null, now: Date): boolean =>
  !event || now.getTime() <= event.rsvpDeadline.getTime()

export type Countdown = { kind: 'days'; days: number } | { kind: 'today' } | { kind: 'past' }

const madridDayNumber = (date: Date): number => {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: EVENT_TIME_ZONE })
    .format(date)
    .split('-')
    .map(Number)
  return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1) / 86_400_000
}

/** Cuenta atrás en días naturales de Madrid: días restantes, "¡Es hoy!" o nada si ya pasó. */
export function countdown(event: Pick<EventInfo, 'startsAt' | 'endsAt'>, now: Date): Countdown {
  if (now.getTime() >= event.endsAt.getTime()) return { kind: 'past' }
  const days = madridDayNumber(event.startsAt) - madridDayNumber(now)
  return days <= 0 ? { kind: 'today' } : { kind: 'days', days }
}
