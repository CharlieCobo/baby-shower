// Lógica pura del panel de administración ("Zona de papás").
import { EVENT_TIME_ZONE, parseEventDateTime, rsvpDeadlineFromDay, toEventWallTime } from './dates'
import type { EventInfo } from './event'
import { isCategory, type Category, type Gift } from './gift'
import type { Rsvp } from './rsvp'

export interface RsvpRecord extends Rsvp {
  uid: string
  updatedAt: Date
}

export interface ReservationRecord {
  giftId: string
  uid: string
  createdAt: Date
}

// ---------- Respuestas ----------

export interface RsvpSummary {
  /** Respuestas "sí" */
  attending: number
  /** Acompañantes de quienes vienen */
  companions: number
  /** Personas en total (quienes vienen + acompañantes) */
  people: number
  notAttending: number
}

export function summarizeRsvps(records: readonly RsvpRecord[]): RsvpSummary {
  const yes = records.filter((r) => r.attending)
  const companions = yes.reduce((sum, r) => sum + r.companions, 0)
  return {
    attending: yes.length,
    companions,
    people: yes.length + companions,
    notAttending: records.length - yes.length,
  }
}

export type RsvpFilter = 'all' | 'yes' | 'no'

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Filtra por asistencia y busca por nombre (sin distinguir mayúsculas ni tildes); más recientes primero. */
export function searchRsvps(
  records: readonly RsvpRecord[],
  query: string,
  filter: RsvpFilter = 'all',
): RsvpRecord[] {
  const q = normalize(query)
  return records
    .filter((r) => filter === 'all' || r.attending === (filter === 'yes'))
    .filter((r) => q === '' || normalize(r.name).includes(q))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
}

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')

const csvCell = (value: string) =>
  /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
const csvDate = new Intl.DateTimeFormat('es-ES', {
  timeZone: EVENT_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** CSV para Excel en español: separador ";", BOM UTF-8 y fechas en hora de Madrid. */
export function rsvpsToCsv(records: readonly RsvpRecord[]): string {
  const header = ['Nombre', 'Asistencia', 'Acompañantes', 'Alergias', 'Mensaje', 'Fecha']
  const rows = [...records]
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .map((r) => [
      r.name,
      r.attending ? 'Sí' : 'No',
      String(r.companions),
      r.dietary ?? '',
      r.message ?? '',
      csvDate.format(r.updatedAt),
    ])
  return '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n') + '\r\n'
}

// ---------- Regalos ----------

export interface GiftsSummary {
  gifts: number
  reservedUnits: number
  freeUnits: number
  /** % de unidades reservadas */
  covered: number
}

export function summarizeGifts(gifts: readonly Gift[]): GiftsSummary {
  const total = gifts.reduce((sum, g) => sum + g.quantity, 0)
  const reservedUnits = gifts.reduce((sum, g) => sum + g.reservedCount, 0)
  return {
    gifts: gifts.length,
    reservedUnits,
    freeUnits: total - reservedUnits,
    covered: total === 0 ? 0 : Math.round((reservedUnits / total) * 100),
  }
}

/** Datos editables de un regalo (nunca incluye reservedCount ni order). */
export interface GiftDraft {
  title: string
  category: Category
  quantity: number
  active: boolean
  description?: string
  url?: string
  imageUrl?: string
  priceEur?: number
}

/** Lo que llega del formulario "Editar regalo". */
export interface GiftForm {
  title: string
  description: string
  category: string
  quantity: number
  priceEur: string
  url: string
  imageUrl: string
  active: boolean
}

export type GiftFormField =
  'title' | 'description' | 'category' | 'quantity' | 'priceEur' | 'url' | 'imageUrl'
export type GiftFormErrorCode = 'required' | 'tooLong' | 'invalid' | 'notHttps' | 'belowReserved'
export type GiftFormErrors = Partial<Record<GiftFormField, GiftFormErrorCode>>

const isHttps = (v: string) => /^https:\/\/.+/.test(v) && v.length <= 2000

/** Valida con las mismas restricciones que firestore.rules; `reservedCount` impide bajar la cantidad. */
export function validateGiftForm(
  form: GiftForm,
  reservedCount = 0,
): { ok: true; value: GiftDraft } | { ok: false; errors: GiftFormErrors } {
  const errors: GiftFormErrors = {}
  const title = form.title.trim()
  const description = form.description.trim()
  const url = form.url.trim()
  const imageUrl = form.imageUrl.trim()
  const price = form.priceEur.trim()

  if (!title) errors.title = 'required'
  else if (title.length > 120) errors.title = 'tooLong'
  if (description.length > 1000) errors.description = 'tooLong'
  if (!isCategory(form.category)) errors.category = 'invalid'
  if (!Number.isInteger(form.quantity) || form.quantity < 1) errors.quantity = 'invalid'
  else if (form.quantity < reservedCount) errors.quantity = 'belowReserved'
  const priceEur = price === '' ? undefined : Number(price)
  if (priceEur !== undefined && (!Number.isInteger(priceEur) || priceEur < 0 || priceEur > 10000)) {
    errors.priceEur = 'invalid'
  }
  if (url && !isHttps(url)) errors.url = 'notHttps'
  if (imageUrl && !isHttps(imageUrl)) errors.imageUrl = 'notHttps'

  if (Object.keys(errors).length > 0 || !isCategory(form.category)) return { ok: false, errors }
  return {
    ok: true,
    value: {
      title,
      category: form.category,
      quantity: form.quantity,
      active: form.active,
      ...(description ? { description } : {}),
      ...(url ? { url } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      ...(priceEur !== undefined ? { priceEur } : {}),
    },
  }
}

export const giftToForm = (gift?: Gift): GiftForm => ({
  title: gift?.title ?? '',
  description: gift?.description ?? '',
  category: gift?.category ?? 'ropa',
  quantity: gift?.quantity ?? 1,
  priceEur: gift?.priceEur === undefined ? '' : String(gift.priceEur),
  url: gift?.url ?? '',
  imageUrl: gift?.imageUrl ?? '',
  active: gift?.active ?? true,
})

/** Nuevo orden tras mover un regalo: devuelve solo los que cambian de `order`. */
export function reorder(
  gifts: readonly Gift[],
  fromId: string,
  toId: string,
): { id: string; order: number }[] {
  const ids = gifts.map((g) => g.id)
  const from = ids.indexOf(fromId)
  const to = ids.indexOf(toId)
  if (from < 0 || to < 0 || from === to) return []
  const [moved] = ids.splice(from, 1)
  ids.splice(to, 0, moved as string)
  const current = new Map(gifts.map((g) => [g.id, g.order]))
  return ids
    .map((id, order) => ({ id, order }))
    .filter(({ id, order }) => current.get(id) !== order)
}

// ---------- Evento ----------

export interface EventForm {
  title: string
  babyName: string
  date: string // AAAA-MM-DD
  startTime: string // HH:MM
  endTime: string // HH:MM
  place: string
  mapsUrl: string
  rsvpDeadline: string // AAAA-MM-DD
  registryClosesAt: string // "" o AAAA-MM-DDTHH:MM
}

export type EventFormField = keyof EventForm
export type EventFormErrorCode = 'required' | 'tooLong' | 'invalid' | 'notHttps' | 'endBeforeStart'
export type EventFormErrors = Partial<Record<EventFormField, EventFormErrorCode>>

const tryParse = (fn: () => Date): Date | null => {
  try {
    return fn()
  } catch {
    return null
  }
}

export function validateEventForm(
  form: EventForm,
): { ok: true; value: EventInfo } | { ok: false; errors: EventFormErrors } {
  const errors: EventFormErrors = {}
  const title = form.title.trim()
  const babyName = form.babyName.trim()
  const place = form.place.trim()
  const mapsUrl = form.mapsUrl.trim()

  if (!title) errors.title = 'required'
  else if (title.length > 120) errors.title = 'tooLong'
  if (babyName.length > 60) errors.babyName = 'tooLong'
  if (place.length > 300) errors.place = 'tooLong'
  if (!mapsUrl) errors.mapsUrl = 'required'
  else if (!isHttps(mapsUrl)) errors.mapsUrl = 'notHttps'

  const startsAt = tryParse(() => parseEventDateTime(`${form.date}T${form.startTime}`))
  const endsAt = tryParse(() => parseEventDateTime(`${form.date}T${form.endTime}`))
  if (!form.date || !startsAt) errors.date = 'required'
  if (!form.startTime || !startsAt) errors.startTime = 'required'
  if (!form.endTime || !endsAt) errors.endTime = 'required'
  else if (startsAt && endsAt <= startsAt) errors.endTime = 'endBeforeStart'
  const rsvpDeadline = tryParse(() => rsvpDeadlineFromDay(form.rsvpDeadline))
  if (!rsvpDeadline) errors.rsvpDeadline = 'required'
  const registryClosesAt = form.registryClosesAt
    ? tryParse(() => parseEventDateTime(form.registryClosesAt))
    : undefined
  if (registryClosesAt === null) errors.registryClosesAt = 'invalid'

  if (Object.keys(errors).length > 0 || !startsAt || !endsAt || !rsvpDeadline) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    value: {
      title,
      startsAt,
      endsAt,
      place,
      mapsUrl,
      rsvpDeadline,
      ...(registryClosesAt ? { registryClosesAt } : {}),
      ...(babyName ? { babyName } : {}),
    },
  }
}

export function eventToForm(event: EventInfo | null): EventForm {
  if (!event) {
    return {
      title: '',
      babyName: '',
      date: '',
      startTime: '',
      endTime: '',
      place: '',
      mapsUrl: '',
      rsvpDeadline: '',
      registryClosesAt: '',
    }
  }
  const start = toEventWallTime(event.startsAt)
  const closes = event.registryClosesAt ? toEventWallTime(event.registryClosesAt) : null
  return {
    title: event.title,
    babyName: event.babyName ?? '',
    date: start.date,
    startTime: start.time,
    endTime: toEventWallTime(event.endsAt).time,
    place: event.place,
    mapsUrl: event.mapsUrl,
    rsvpDeadline: toEventWallTime(event.rsvpDeadline).date,
    registryClosesAt: closes ? `${closes.date}T${closes.time}` : '',
  }
}
