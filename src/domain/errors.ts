export type DomainErrorCode =
  | 'registry-closed' // la lista ya está cerrada
  | 'rsvp-closed' // fuera de plazo
  | 'sold-out' // no quedan unidades (p. ej. alguien se adelantó)
  | 'unavailable' // el regalo no existe o está oculto
  | 'already-reserved' // ya lo reservaste desde este dispositivo
  | 'not-reserved' // no hay reserva propia que liberar
  | 'invalid-rsvp' // datos del formulario inválidos
  | 'permission-denied' // las reglas lo han rechazado por otro motivo
  | 'network' // sin conexión o servicio no disponible

export class DomainError extends Error {
  readonly code: DomainErrorCode

  constructor(code: DomainErrorCode, message: string = code, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DomainError'
    this.code = code
  }
}

export const isDomainError = (error: unknown, code?: DomainErrorCode): error is DomainError =>
  error instanceof DomainError && (code === undefined || error.code === code)
