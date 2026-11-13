import { FirebaseError } from 'firebase/app'
import { DomainError } from '../../domain/errors'

/** Traduce errores de Firebase a errores de dominio (los de dominio pasan tal cual). */
export function toDomainError(error: unknown): DomainError {
  if (error instanceof DomainError) return error
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
      case 'auth/admin-restricted-operation':
        return new DomainError('permission-denied', error.message, { cause: error })
      case 'not-found':
        return new DomainError('unavailable', error.message, { cause: error })
      default:
        return new DomainError('network', error.message, { cause: error })
    }
  }
  return new DomainError('network', String(error), { cause: error })
}
