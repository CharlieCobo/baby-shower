import { Timestamp, type DocumentData } from 'firebase/firestore'
import type { EventInfo } from '../../domain/event'
import { isCategory, type Gift } from '../../domain/gift'

const optString = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : undefined)
const optInt = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : undefined)
const toDate = (v: unknown) => (v instanceof Timestamp ? v.toDate() : undefined)

/** Documento de `gifts` → Gift, o null si no tiene la forma esperada. */
export function toGift(id: string, d: DocumentData): Gift | null {
  if (
    typeof d.title !== 'string' ||
    !isCategory(d.category) ||
    optInt(d.quantity) === undefined ||
    optInt(d.reservedCount) === undefined ||
    typeof d.active !== 'boolean'
  ) {
    return null
  }
  const description = optString(d.description)
  const url = optString(d.url)
  const imageUrl = optString(d.imageUrl)
  const priceEur = optInt(d.priceEur)
  return {
    id,
    title: d.title,
    category: d.category,
    quantity: d.quantity as number,
    reservedCount: d.reservedCount as number,
    order: optInt(d.order) ?? 0,
    active: d.active,
    ...(description ? { description } : {}),
    ...(url ? { url } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(priceEur !== undefined ? { priceEur } : {}),
  }
}

/** `config/event` → EventInfo, o null si falta algún dato obligatorio. */
export function toEventInfo(d: DocumentData): EventInfo | null {
  const startsAt = toDate(d.startsAt)
  const endsAt = toDate(d.endsAt)
  const rsvpDeadline = toDate(d.rsvpDeadline)
  if (typeof d.title !== 'string' || !startsAt || !endsAt || !rsvpDeadline) return null
  const registryClosesAt = toDate(d.registryClosesAt)
  const babyName = optString(d.babyName)
  return {
    title: d.title,
    startsAt,
    endsAt,
    place: typeof d.place === 'string' ? d.place : '',
    mapsUrl: typeof d.mapsUrl === 'string' ? d.mapsUrl : '',
    rsvpDeadline,
    ...(registryClosesAt ? { registryClosesAt } : {}),
    ...(babyName ? { babyName } : {}),
  }
}
