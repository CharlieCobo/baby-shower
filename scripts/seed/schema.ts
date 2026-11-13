// Validación del JSON de datos reales (seed-data.local.json).
// Replica las restricciones de firestore.rules para fallar antes de escribir.
import { parseEventDateTime, rsvpDeadlineFromDay } from '../../src/domain/dates'

import { CATEGORIES, type Category } from '../../src/domain/gift'

export { CATEGORIES, type Category }

export interface SeedGift {
  id: string
  title: string
  category: Category
  quantity: number
  description?: string
  url?: string
  imageUrl?: string
  priceEur?: number
  active?: boolean
}

// Cada sección es opcional: solo se escribe lo que venga en el fichero.
export interface SeedData {
  admins?: string[]
  event?: {
    title: string
    startsAt: string // "AAAA-MM-DDTHH:MM", hora de Madrid
    endsAt: string
    place: string
    mapsUrl: string
    rsvpDeadline: string // "AAAA-MM-DD": se guarda como 23:59:59 de ese día
    registryClosesAt?: string // "AAAA-MM-DDTHH:MM"
    babyName?: string
  }
  gifts?: SeedGift[]
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isString = (v: unknown, min: number, max: number): v is string =>
  typeof v === 'string' && v.length >= min && v.length <= max
const isHttps = (v: unknown) => typeof v === 'string' && v.length <= 2000 && /^https:\/\/.+/.test(v)
const isEmail = (v: unknown) => typeof v === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)
const tryDate = (fn: () => Date) => {
  try {
    return fn()
  } catch {
    return null
  }
}

/** Devuelve la lista de errores (vacía si los datos son válidos). */
export function validateSeedData(data: unknown): string[] {
  const errors: string[] = []
  if (!isObject(data)) return ['El fichero debe contener un objeto con admins, event y/o gifts.']

  const { admins, event, gifts } = data
  for (const key of Object.keys(data)) {
    if (!['admins', 'event', 'gifts'].includes(key)) errors.push(`${key}: sección no permitida.`)
  }
  if (admins === undefined && event === undefined && gifts === undefined) {
    errors.push('El fichero no tiene ninguna sección (admins, event o gifts).')
  }
  if (
    admins !== undefined &&
    (!Array.isArray(admins) || admins.length === 0 || !admins.every(isEmail))
  ) {
    errors.push('admins: lista de emails con al menos uno.')
  }

  if (event === undefined) {
    // sin evento: no se toca config/event
  } else if (!isObject(event)) {
    errors.push('event: debe ser un objeto.')
  } else {
    const allowed = [
      'title',
      'startsAt',
      'endsAt',
      'place',
      'mapsUrl',
      'rsvpDeadline',
      'registryClosesAt',
      'babyName',
    ]
    for (const key of Object.keys(event)) {
      if (!allowed.includes(key)) errors.push(`event.${key}: campo no permitido.`)
    }
    if (!isString(event.title, 1, 120)) errors.push('event.title: texto de 1 a 120 caracteres.')
    if (!isString(event.place, 0, 300)) errors.push('event.place: texto de hasta 300 caracteres.')
    if (!isHttps(event.mapsUrl)) errors.push('event.mapsUrl: URL que empiece por https://.')
    if (event.babyName !== undefined && !isString(event.babyName, 0, 60)) {
      errors.push('event.babyName: texto de hasta 60 caracteres.')
    }
    const startsAt = tryDate(() => parseEventDateTime(String(event.startsAt)))
    const endsAt = tryDate(() => parseEventDateTime(String(event.endsAt)))
    if (!startsAt) errors.push('event.startsAt: formato AAAA-MM-DDTHH:MM (hora de Madrid).')
    if (!endsAt) errors.push('event.endsAt: formato AAAA-MM-DDTHH:MM (hora de Madrid).')
    if (startsAt && endsAt && endsAt <= startsAt)
      errors.push('event.endsAt debe ser posterior a startsAt.')
    if (!tryDate(() => rsvpDeadlineFromDay(String(event.rsvpDeadline)))) {
      errors.push('event.rsvpDeadline: formato AAAA-MM-DD.')
    }
    if (
      event.registryClosesAt !== undefined &&
      !tryDate(() => parseEventDateTime(String(event.registryClosesAt)))
    ) {
      errors.push('event.registryClosesAt: formato AAAA-MM-DDTHH:MM (hora de Madrid).')
    }
  }

  if (gifts === undefined) {
    // sin regalos: no se tocan
  } else if (!Array.isArray(gifts)) {
    errors.push('gifts: debe ser una lista.')
  } else {
    const ids = new Set<string>()
    gifts.forEach((g: unknown, i) => {
      const at = `gifts[${i}]`
      if (!isObject(g)) return errors.push(`${at}: debe ser un objeto.`)
      const allowed = [
        'id',
        'title',
        'category',
        'quantity',
        'description',
        'url',
        'imageUrl',
        'priceEur',
        'active',
      ]
      for (const key of Object.keys(g)) {
        if (!allowed.includes(key)) errors.push(`${at}.${key}: campo no permitido.`)
      }
      if (typeof g.id !== 'string' || !/^[a-z0-9-]{1,60}$/.test(g.id)) {
        errors.push(`${at}.id: minúsculas, números y guiones (p. ej. "panales-talla-1").`)
      } else if (ids.has(g.id)) {
        errors.push(`${at}.id: "${g.id}" está repetido.`)
      } else {
        ids.add(g.id)
      }
      if (!isString(g.title, 1, 120)) errors.push(`${at}.title: texto de 1 a 120 caracteres.`)
      if (!CATEGORIES.includes(g.category as Category)) {
        errors.push(`${at}.category: una de ${CATEGORIES.join(', ')}.`)
      }
      if (!Number.isInteger(g.quantity) || (g.quantity as number) < 1) {
        errors.push(`${at}.quantity: entero mayor o igual que 1.`)
      }
      if (g.description !== undefined && !isString(g.description, 0, 1000)) {
        errors.push(`${at}.description: texto de hasta 1000 caracteres.`)
      }
      if (g.url !== undefined && !isHttps(g.url))
        errors.push(`${at}.url: debe empezar por https://.`)
      if (g.imageUrl !== undefined && !isHttps(g.imageUrl)) {
        errors.push(`${at}.imageUrl: debe empezar por https://.`)
      }
      if (
        g.priceEur !== undefined &&
        (!Number.isInteger(g.priceEur) ||
          (g.priceEur as number) < 0 ||
          (g.priceEur as number) > 10000)
      ) {
        errors.push(`${at}.priceEur: euros enteros entre 0 y 10000.`)
      }
      if (g.active !== undefined && typeof g.active !== 'boolean') {
        errors.push(`${at}.active: true o false.`)
      }
    })
  }
  return errors
}
