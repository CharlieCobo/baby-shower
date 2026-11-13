// Implementación en memoria de los puertos, con el mismo comportamiento que las reglas de
// Firestore. Sirve para los tests de los casos de uso y de la UI (sin emulador).
import type {
  AuthService,
  EventRepository,
  GiftRepository,
  ReservationRepository,
  RsvpRepository,
} from '../../application/ports'
import { DomainError } from '../../domain/errors'
import { isRegistryOpen, isRsvpOpen, type EventInfo } from '../../domain/event'
import { remaining, type Gift } from '../../domain/gift'
import { reservationId, type Reservation } from '../../domain/reservation'
import type { Rsvp } from '../../domain/rsvp'

export interface InMemoryState {
  gifts: Gift[]
  event?: EventInfo | null
  now?: () => Date
  uid?: string
}

export function createInMemoryBackend(initial: InMemoryState) {
  const gifts = new Map(initial.gifts.map((g) => [g.id, { ...g }]))
  const reservations = new Map<string, Reservation>()
  const rsvps = new Map<string, Rsvp & { updatedAt: Date }>()
  let event = initial.event ?? null
  let uid: string | null = initial.uid ?? null
  let sessionsCreated = 0
  const now = initial.now ?? (() => new Date())
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((l) => l())
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    listener()
    return () => {
      listeners.delete(listener)
    }
  }
  const mineOf = (owner: string) =>
    new Set([...reservations.values()].filter((r) => r.uid === owner).map((r) => r.giftId))

  const auth: AuthService = {
    ensureGuestSession() {
      if (!uid) {
        sessionsCreated++
        uid = `anon-${sessionsCreated}`
      }
      return Promise.resolve(uid)
    },
  }

  const giftRepository: GiftRepository = {
    watchAll: (onChange) => subscribe(() => onChange([...gifts.values()].map((g) => ({ ...g })))),
  }

  const reservationRepository: ReservationRepository = {
    reserve(giftId, owner) {
      const gift = gifts.get(giftId)
      if (!isRegistryOpen(event, now())) return Promise.reject(new DomainError('registry-closed'))
      if (!gift || !gift.active) return Promise.reject(new DomainError('unavailable'))
      if (reservations.has(reservationId(giftId, owner))) {
        return Promise.reject(new DomainError('already-reserved'))
      }
      if (remaining(gift) === 0) return Promise.reject(new DomainError('sold-out'))
      reservations.set(reservationId(giftId, owner), { giftId, uid: owner, createdAt: now() })
      gift.reservedCount++
      notify()
      return Promise.resolve()
    },
    release(giftId, owner) {
      const gift = gifts.get(giftId)
      if (!isRegistryOpen(event, now())) return Promise.reject(new DomainError('registry-closed'))
      if (!gift || !reservations.delete(reservationId(giftId, owner))) {
        return Promise.reject(new DomainError('not-reserved'))
      }
      gift.reservedCount--
      notify()
      return Promise.resolve()
    },
    watchMine: (owner, onChange) => subscribe(() => onChange(mineOf(owner))),
  }

  const rsvpRepository: RsvpRepository = {
    save(owner, rsvp) {
      if (!isRsvpOpen(event, now())) return Promise.reject(new DomainError('rsvp-closed'))
      rsvps.set(owner, { ...rsvp, updatedAt: now() })
      return Promise.resolve()
    },
  }

  const eventRepository: EventRepository = {
    get: () => Promise.resolve(event),
  }

  return {
    auth,
    gifts: giftRepository,
    reservations: reservationRepository,
    rsvps: rsvpRepository,
    events: eventRepository,
    /** Utilidades para preparar escenarios en los tests. */
    control: {
      /** Otro invitado reserva desde su dispositivo. */
      reserveAs: (owner: string, giftId: string) => reservationRepository.reserve(giftId, owner),
      /** Simula abrir la web en otro dispositivo o tras borrar los datos del navegador. */
      switchDevice: (next: string | null) => {
        uid = next
      },
      setEvent: (next: EventInfo | null) => {
        event = next
        notify()
      },
      gift: (id: string) => gifts.get(id),
      rsvp: (owner: string) => rsvps.get(owner),
      reservationsOf: mineOf,
      get sessionsCreated() {
        return sessionsCreated
      },
    },
  }
}

export type InMemoryBackend = ReturnType<typeof createInMemoryBackend>
