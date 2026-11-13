import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
} from 'firebase/auth'
import {
  collection,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'
import type { AdminAuthService, AdminRepository } from '../../application/ports'
import type { GiftDraft, ReservationRecord, RsvpRecord } from '../../domain/admin'
import { DomainError } from '../../domain/errors'
import { reservationId } from '../../domain/reservation'
import { toDomainError } from './errors'

export function createFirebaseAdminAuth(auth: Auth, db: Firestore): AdminAuthService {
  return {
    watchSession(onChange) {
      onChange({ status: 'loading' })
      let latest = 0
      return onAuthStateChanged(auth, (user) => {
        const check = ++latest
        if (!user || user.isAnonymous || !user.email) {
          onChange({ status: 'signedOut' })
          return
        }
        const email = user.email
        // Si las reglas dejan leer config/admins, el email está en la allowlist (design.md § 5).
        getDoc(doc(db, 'config', 'admins'))
          .then(() => check === latest && onChange({ status: 'signedIn', email, isAdmin: true }))
          .catch(() => check === latest && onChange({ status: 'signedIn', email, isAdmin: false }))
      })
    },
    async signInWithGoogle() {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      try {
        await signInWithPopup(auth, provider)
      } catch (error) {
        const code = error instanceof FirebaseError ? error.code : ''
        if (
          code === 'auth/popup-blocked' ||
          code === 'auth/operation-not-supported-in-this-environment'
        ) {
          await signInWithRedirect(auth, provider)
          return
        }
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return
        throw toDomainError(error)
      }
    },
    signOut: () => signOut(auth),
  }
}

/** Campos del regalo para Firestore: los opcionales vacíos se borran al actualizar. */
function giftFields(draft: GiftDraft, forUpdate: boolean) {
  const optional = (value: string | number | undefined) =>
    value === undefined ? (forUpdate ? deleteField() : undefined) : value
  const fields: Record<string, unknown> = {
    title: draft.title,
    category: draft.category,
    quantity: draft.quantity,
    active: draft.active,
    description: optional(draft.description),
    url: optional(draft.url),
    imageUrl: optional(draft.imageUrl),
    priceEur: optional(draft.priceEur),
    updatedAt: serverTimestamp(),
  }
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined))
}

const toDate = (value: unknown) => (value instanceof Timestamp ? value.toDate() : new Date(0))

export function createFirestoreAdminRepository(db: Firestore): AdminRepository {
  const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn()
    } catch (error) {
      throw toDomainError(error)
    }
  }

  return {
    watchRsvps(onChange, onError) {
      return onSnapshot(
        collection(db, 'rsvps'),
        (snapshot) =>
          onChange(
            snapshot.docs.map((d): RsvpRecord => {
              const data = d.data()
              return {
                uid: d.id,
                name: String(data.name ?? ''),
                attending: data.attending === true,
                companions: typeof data.companions === 'number' ? data.companions : 0,
                ...(typeof data.dietary === 'string' ? { dietary: data.dietary } : {}),
                ...(typeof data.message === 'string' ? { message: data.message } : {}),
                updatedAt: toDate(data.updatedAt),
              }
            }),
          ),
        (error) => onError(toDomainError(error)),
      )
    },

    watchReservations(onChange, onError) {
      return onSnapshot(
        collection(db, 'reservations'),
        (snapshot) =>
          onChange(
            snapshot.docs.map((d): ReservationRecord => ({
              giftId: String(d.get('giftId')),
              uid: String(d.get('uid')),
              createdAt: toDate(d.get('createdAt')),
            })),
          ),
        (error) => onError(toDomainError(error)),
      )
    },

    createGift: (draft, order) =>
      wrap(async () => {
        const ref = doc(collection(db, 'gifts'))
        await setDoc(ref, { ...giftFields(draft, false), order, reservedCount: 0 })
        return ref.id
      }),

    // updateDoc sin reservedCount: si un invitado reserva mientras tanto, no se pisa (design.md § 3).
    updateGift: (id, draft) => wrap(() => updateDoc(doc(db, 'gifts', id), giftFields(draft, true))),

    setGiftActive: (id, active) =>
      wrap(() => updateDoc(doc(db, 'gifts', id), { active, updatedAt: serverTimestamp() })),

    reorderGifts: (changes) =>
      wrap(async () => {
        const batch = writeBatch(db)
        for (const { id, order } of changes) {
          batch.update(doc(db, 'gifts', id), { order, updatedAt: serverTimestamp() })
        }
        await batch.commit()
      }),

    deleteGift: (id, reservationUids) =>
      wrap(async () => {
        const batch = writeBatch(db)
        batch.delete(doc(db, 'gifts', id))
        for (const uid of reservationUids)
          batch.delete(doc(db, 'reservations', reservationId(id, uid)))
        await batch.commit()
      }),

    releaseReservation: (giftId, uid) =>
      wrap(() =>
        runTransaction(db, async (tx) => {
          const giftRef = doc(db, 'gifts', giftId)
          const gift = await tx.get(giftRef)
          const count = gift.exists() ? Number(gift.get('reservedCount')) : 0
          if (count < 1) throw new DomainError('not-reserved')
          tx.delete(doc(db, 'reservations', reservationId(giftId, uid)))
          tx.update(giftRef, { reservedCount: count - 1, updatedAt: serverTimestamp() })
        }),
      ),

    saveEvent: (event) =>
      wrap(() =>
        setDoc(doc(db, 'config', 'event'), {
          title: event.title,
          startsAt: Timestamp.fromDate(event.startsAt),
          endsAt: Timestamp.fromDate(event.endsAt),
          place: event.place,
          mapsUrl: event.mapsUrl,
          rsvpDeadline: Timestamp.fromDate(event.rsvpDeadline),
          ...(event.registryClosesAt
            ? { registryClosesAt: Timestamp.fromDate(event.registryClosesAt) }
            : {}),
          ...(event.babyName ? { babyName: event.babyName } : {}),
        }),
      ),
  }
}
