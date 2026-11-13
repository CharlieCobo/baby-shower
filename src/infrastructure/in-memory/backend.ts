// Implementación en memoria de los puertos, con el mismo comportamiento que las reglas de
// Firestore. Sirve para los tests de los casos de uso y de la UI (sin emulador).
import type {
  AdminAuthService,
  AdminRepository,
  AdminSession,
  AuthService,
  EventRepository,
  GiftRepository,
  ReservationRepository,
  RsvpRepository,
} from '../../application/ports'
import type { ReservationRecord, RsvpRecord } from '../../domain/admin'
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
  rsvps?: RsvpRecord[]
  /** Sesión de Google inicial (por defecto, sin sesión). */
  admin?: { email: string; isAdmin: boolean } | null
}

export function createInMemoryBackend(initial: InMemoryState) {
  const gifts = new Map(initial.gifts.map((g) => [g.id, { ...g }]))
  const reservations = new Map<string, Reservation>()
  const rsvps = new Map<string, Rsvp & { updatedAt: Date }>(
    (initial.rsvps ?? []).map(({ uid, ...r }) => [uid, r]),
  )
  let adminSession: AdminSession = initial.admin
    ? { status: 'signedIn', ...initial.admin }
    : { status: 'signedOut' }
  let nextGiftId = 1
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

  const requireAdmin = () =>
    adminSession.status === 'signedIn' && adminSession.isAdmin
      ? Promise.resolve()
      : Promise.reject(new DomainError('permission-denied'))

  const adminAuth: AdminAuthService = {
    watchSession: (onChange) => subscribe(() => onChange(adminSession)),
    signInWithGoogle() {
      adminSession = { status: 'signedIn', email: 'mama@example.com', isAdmin: true }
      notify()
      return Promise.resolve()
    },
    signOut() {
      adminSession = { status: 'signedOut' }
      notify()
      return Promise.resolve()
    },
  }

  const adminRepository: AdminRepository = {
    watchRsvps: (onChange) =>
      subscribe(() => onChange([...rsvps.entries()].map(([uid, r]) => ({ uid, ...r })))),
    watchReservations: (onChange) =>
      subscribe(() =>
        onChange([...reservations.values()].map((r): ReservationRecord => ({ ...r }))),
      ),
    async createGift(draft, order) {
      await requireAdmin()
      const id = `nuevo-${nextGiftId++}`
      gifts.set(id, { id, ...draft, order, reservedCount: 0 })
      notify()
      return id
    },
    async updateGift(id, draft) {
      await requireAdmin()
      const gift = gifts.get(id)
      if (!gift) throw new DomainError('unavailable')
      if (draft.quantity < gift.reservedCount) throw new DomainError('permission-denied')
      const { reservedCount, order } = gift
      gifts.set(id, { id, ...draft, reservedCount, order })
      notify()
    },
    async setGiftActive(id, active) {
      await requireAdmin()
      const gift = gifts.get(id)
      if (!gift) throw new DomainError('unavailable')
      gift.active = active
      notify()
    },
    async reorderGifts(changes) {
      await requireAdmin()
      for (const { id, order } of changes) {
        const gift = gifts.get(id)
        if (gift) gift.order = order
      }
      notify()
    },
    async deleteGift(id, reservationUids) {
      await requireAdmin()
      gifts.delete(id)
      for (const owner of reservationUids) reservations.delete(reservationId(id, owner))
      notify()
    },
    async releaseReservation(giftId, owner) {
      await requireAdmin()
      const gift = gifts.get(giftId)
      if (!gift || !reservations.delete(reservationId(giftId, owner))) {
        throw new DomainError('not-reserved')
      }
      gift.reservedCount--
      notify()
    },
    async saveEvent(next) {
      await requireAdmin()
      event = next
      notify()
    },
  }

  return {
    auth,
    gifts: giftRepository,
    reservations: reservationRepository,
    rsvps: rsvpRepository,
    events: eventRepository,
    adminAuth,
    admin: adminRepository,
    /** Utilidades para preparar escenarios en los tests. */
    control: {
      /** Otro invitado reserva desde su dispositivo. */
      reserveAs: (owner: string, giftId: string) => reservationRepository.reserve(giftId, owner),
      /** Simula abrir la web en otro dispositivo o tras borrar los datos del navegador. */
      switchDevice: (next: string | null) => {
        uid = next
      },
      setAdmin: (next: { email: string; isAdmin: boolean } | null) => {
        adminSession = next ? { status: 'signedIn', ...next } : { status: 'signedOut' }
        notify()
      },
      event: () => event,
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
