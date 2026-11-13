// Puertos: lo que los casos de uso necesitan del exterior. La UI y los casos de uso solo
// conocen estas interfaces; las implementaciones viven en src/infrastructure/.
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
