import { DomainError } from '../domain/errors'
import { isRegistryOpen, type EventInfo } from '../domain/event'
import { remaining, visibleGifts, type Gift } from '../domain/gift'
import type {
  AuthService,
  Clock,
  GiftRepository,
  OnError,
  ReservationRepository,
  Unsubscribe,
} from './ports'

/** Regalos visibles para los invitados (activos y ordenados), en tiempo real. */
export const listGifts =
  (deps: { gifts: GiftRepository }) =>
  (onChange: (gifts: Gift[]) => void, onError: OnError): Unsubscribe =>
    deps.gifts.watchAll((all) => onChange(visibleGifts(all)), onError)

/** Regalos reservados desde este dispositivo, en tiempo real (inicia la sesión anónima si hace falta). */
export const watchMyReservations =
  (deps: { auth: AuthService; reservations: ReservationRepository }) =>
  (onChange: (giftIds: ReadonlySet<string>) => void, onError: OnError): Unsubscribe => {
    let unsubscribe: Unsubscribe | null = null
    let cancelled = false
    deps.auth
      .ensureGuestSession()
      .then((uid) => {
        if (!cancelled) unsubscribe = deps.reservations.watchMine(uid, onChange, onError)
      })
      .catch((error: unknown) => {
        onError(error instanceof DomainError ? error : new DomainError('network', String(error)))
      })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }

interface ReservationContext {
  gift: Gift
  event: EventInfo | null
  /** Ids de los regalos que este dispositivo ya ha reservado. */
  mine: ReadonlySet<string>
}

type ReservationDeps = { auth: AuthService; reservations: ReservationRepository; clock: Clock }

/** Reserva 1 unidad. Comprueba antes lo que puede; las reglas tienen la última palabra. */
export const reserveGift =
  (deps: ReservationDeps) =>
  async ({ gift, event, mine }: ReservationContext): Promise<void> => {
    if (!isRegistryOpen(event, deps.clock.now())) throw new DomainError('registry-closed')
    if (mine.has(gift.id)) throw new DomainError('already-reserved')
    if (!gift.active) throw new DomainError('unavailable')
    if (remaining(gift) === 0) throw new DomainError('sold-out')
    const uid = await deps.auth.ensureGuestSession()
    await deps.reservations.reserve(gift.id, uid)
  }

/** Libera la reserva propia de un regalo. */
export const releaseGift =
  (deps: ReservationDeps) =>
  async ({ gift, event, mine }: ReservationContext): Promise<void> => {
    if (!isRegistryOpen(event, deps.clock.now())) throw new DomainError('registry-closed')
    if (!mine.has(gift.id)) throw new DomainError('not-reserved')
    const uid = await deps.auth.ensureGuestSession()
    await deps.reservations.release(gift.id, uid)
  }
