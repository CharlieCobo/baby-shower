import { EVENT_TIME_ZONE } from '../domain/dates'

// Siempre en hora de Madrid, sea cual sea la zona del dispositivo.
const dateFormat = new Intl.DateTimeFormat('es-ES', {
  timeZone: EVENT_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const shortDateFormat = new Intl.DateTimeFormat('es-ES', {
  timeZone: EVENT_TIME_ZONE,
  day: 'numeric',
  month: 'long',
})
const timeFormat = new Intl.DateTimeFormat('es-ES', {
  timeZone: EVENT_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** "Sábado, 24 de mayo" */
export const formatLongDate = (date: Date): string => capitalize(dateFormat.format(date))
/** "10 de mayo" */
export const formatShortDate = (date: Date): string => shortDateFormat.format(date)
/** "17:00 h" */
export const formatTime = (date: Date): string => `${timeFormat.format(date)} h`
/** "~25 €" */
export const formatPrice = (euros: number): string => `~${euros} €`

/** Separa "Nombre del sitio · Dirección" en dos líneas. */
export function splitPlace(place: string): { name: string; address?: string } {
  const [name = '', ...rest] = place.split(' · ')
  const address = rest.join(' · ').trim()
  return address ? { name: name.trim(), address } : { name: name.trim() }
}
