import { signInAnonymously, type Auth } from 'firebase/auth'
import type { AuthService } from '../../application/ports'
import { toDomainError } from './errors'

export function createFirebaseAuthService(auth: Auth): AuthService {
  let pending: Promise<string> | null = null
  return {
    ensureGuestSession() {
      // Primero se espera a recuperar la sesión guardada: así el invitado conserva su UID
      // (y sus reservas) entre visitas. Solo si no hay ninguna se crea una anónima.
      pending ??= (async () => {
        try {
          await auth.authStateReady()
          if (auth.currentUser) return auth.currentUser.uid
          const credential = await signInAnonymously(auth)
          return credential.user.uid
        } catch (error) {
          throw toDomainError(error)
        } finally {
          pending = null
        }
      })()
      return pending
    },
  }
}
