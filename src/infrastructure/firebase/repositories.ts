import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore'
import type {
  EventRepository,
  GiftRepository,
  ReservationRepository,
  RsvpRepository,
} from '../../application/ports'
import { DomainError } from '../../domain/errors'
import type { Gift } from '../../domain/gift'
import { reservationId } from '../../domain/reservation'
import { toDomainError } from './errors'
import { toEventInfo, toGift } from './mappers'

export function createFirestoreGiftRepository(db: Firestore): GiftRepository {
  return {
    watchAll(onChange, onError) {
      // Sin where('active'): así no hace falta índice compuesto (design.md § 5).
      return onSnapshot(
        query(collection(db, 'gifts'), orderBy('order')),
        (snapshot) => {
          const gifts = snapshot.docs
            .map((d) => toGift(d.id, d.data()))
            .filter((g): g is Gift => g !== null)
          onChange(gifts)
        },
        (error) => onError(toDomainError(error)),
      )
    },
  }
}

export function createFirestoreReservationRepository(db: Firestore): ReservationRepository {
  return {
    async reserve(giftId, uid) {
      const giftRef = doc(db, 'gifts', giftId)
      try {
        await runTransaction(db, async (tx) => {
          // La reserva no se lee: si no existe, la regla de lectura falla (design.md § 3).
          const snapshot = await tx.get(giftRef)
          const gift = snapshot.exists() ? toGift(snapshot.id, snapshot.data()) : null
          if (!gift || !gift.active) throw new DomainError('unavailable')
          if (gift.reservedCount >= gift.quantity) throw new DomainError('sold-out')
          tx.set(doc(db, 'reservations', reservationId(giftId, uid)), {
            giftId,
            uid,
            createdAt: serverTimestamp(),
          })
          tx.update(giftRef, {
            reservedCount: gift.reservedCount + 1,
            updatedAt: serverTimestamp(),
          })
        })
      } catch (error) {
        throw toDomainError(error)
      }
    },

    async release(giftId, uid) {
      const giftRef = doc(db, 'gifts', giftId)
      try {
        await runTransaction(db, async (tx) => {
          const snapshot = await tx.get(giftRef)
          const gift = snapshot.exists() ? toGift(snapshot.id, snapshot.data()) : null
          if (!gift || gift.reservedCount === 0) throw new DomainError('not-reserved')
          tx.delete(doc(db, 'reservations', reservationId(giftId, uid)))
          tx.update(giftRef, {
            reservedCount: gift.reservedCount - 1,
            updatedAt: serverTimestamp(),
          })
        })
      } catch (error) {
        throw toDomainError(error)
      }
    },

    watchMine(uid, onChange, onError) {
      return onSnapshot(
        query(collection(db, 'reservations'), where('uid', '==', uid)),
        (snapshot) => {
          onChange(new Set(snapshot.docs.map((d) => String(d.get('giftId')))))
        },
        (error) => onError(toDomainError(error)),
      )
    },
  }
}

export function createFirestoreRsvpRepository(db: Firestore): RsvpRepository {
  return {
    async save(uid, rsvp) {
      try {
        // Documento completo (sin merge) y sin claves vacías: así lo exigen las reglas.
        await setDoc(doc(db, 'rsvps', uid), {
          name: rsvp.name,
          attending: rsvp.attending,
          companions: rsvp.companions,
          ...(rsvp.dietary ? { dietary: rsvp.dietary } : {}),
          ...(rsvp.message ? { message: rsvp.message } : {}),
          updatedAt: serverTimestamp(),
        })
      } catch (error) {
        throw toDomainError(error)
      }
    },
  }
}

export function createFirestoreEventRepository(db: Firestore): EventRepository {
  return {
    async get() {
      try {
        const snapshot = await getDoc(doc(db, 'config', 'event'))
        return snapshot.exists() ? toEventInfo(snapshot.data()) : null
      } catch (error) {
        throw toDomainError(error)
      }
    },
  }
}
