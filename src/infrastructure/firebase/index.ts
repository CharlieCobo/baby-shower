// Punto de composición: conecta los puertos con Firebase.
import { auth, db } from './app'
import { createFirebaseAuthService } from './auth-service'
import {
  createFirestoreEventRepository,
  createFirestoreGiftRepository,
  createFirestoreReservationRepository,
  createFirestoreRsvpRepository,
} from './repositories'

export function createFirebaseServices() {
  return {
    auth: createFirebaseAuthService(auth),
    gifts: createFirestoreGiftRepository(db),
    reservations: createFirestoreReservationRepository(db),
    rsvps: createFirestoreRsvpRepository(db),
    events: createFirestoreEventRepository(db),
  }
}
