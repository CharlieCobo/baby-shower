// Puertos: lo que los casos de uso necesitan del exterior. La UI y los casos de uso solo
// conocen estas interfaces; las implementaciones viven en src/infrastructure/.
import type { GiftDraft, ReservationRecord, RsvpRecord } from '../domain/admin'
import type { DomainError } from '../domain/errors'
import type { EventInfo } from '../domain/event'
import type { Gift } from '../domain/gift'
import type { Rsvp } from '../domain/rsvp'

export type Unsubscribe = () => void
export type OnError = (error: DomainError) => void

export interface GiftRepository {
  /** Todos los regalos (también los ocultos), en tiempo real. */
  watchAll(onChange: (gifts: Gift[]) => void, onError: OnError): Unsubscribe
}

export interface ReservationRepository {
  /** Crea la reserva e incrementa el contador de forma atómica. */
  reserve(giftId: string, uid: string): Promise<void>
  /** Borra la reserva propia y decrementa el contador de forma atómica. */
  release(giftId: string, uid: string): Promise<void>
  /** Ids de los regalos reservados por `uid`, en tiempo real. */
  watchMine(
    uid: string,
    onChange: (giftIds: ReadonlySet<string>) => void,
    onError: OnError,
  ): Unsubscribe
}

export interface RsvpRepository {
  /** Sobrescribe el RSVP de `uid` entero; la fecha la pone el servidor. */
  save(uid: string, rsvp: Rsvp): Promise<void>
}

export interface EventRepository {
  /** Datos del evento, o null si aún no está configurado. */
  get(): Promise<EventInfo | null>
}

export interface AuthService {
  /** UID de la sesión actual; si no hay ninguna, inicia una anónima en silencio. */
  ensureGuestSession(): Promise<string>
}

export interface Clock {
  now(): Date
}

export const systemClock: Clock = { now: () => new Date() }

// ---------- Administración ----------

export type AdminSession =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; email: string; isAdmin: boolean }

export interface AdminAuthService {
  /** Sesión de Google y si su email está en la allowlist (lectura de config/admins). */
  watchSession(onChange: (session: AdminSession) => void): Unsubscribe
  signInWithGoogle(): Promise<void>
  signOut(): Promise<void>
}

export interface AdminRepository {
  watchRsvps(onChange: (rsvps: RsvpRecord[]) => void, onError: OnError): Unsubscribe
  watchReservations(
    onChange: (reservations: ReservationRecord[]) => void,
    onError: OnError,
  ): Unsubscribe
  /** Crea un regalo con reservedCount 0; devuelve su id. */
  createGift(draft: GiftDraft, order: number): Promise<string>
  /** Actualiza solo los datos editables (nunca reservedCount). */
  updateGift(id: string, draft: GiftDraft): Promise<void>
  setGiftActive(id: string, active: boolean): Promise<void>
  /** Guarda el nuevo `order` de los regalos indicados en una sola escritura. */
  reorderGifts(changes: { id: string; order: number }[]): Promise<void>
  /** Borra el regalo y sus reservas en una sola escritura. */
  deleteGift(id: string, reservationUids: string[]): Promise<void>
  /** Borra la reserva y baja el contador en 1 de forma atómica. */
  releaseReservation(giftId: string, uid: string): Promise<void>
  saveEvent(event: EventInfo): Promise<void>
}
