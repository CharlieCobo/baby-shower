export const RSVP_LIMITS = { name: 80, dietary: 200, message: 500, companions: 10 } as const

export interface Rsvp {
  name: string
  attending: boolean
  /** Acompañantes sin contar al invitado; 0 si no asiste. */
  companions: number
  dietary?: string
  message?: string
}

/** Lo que llega del formulario, antes de validar. */
export interface RsvpInput {
  name: string
  attending: boolean | null
  companions: number
  dietary?: string
  message?: string
}

export type RsvpField = 'name' | 'attending' | 'companions' | 'dietary' | 'message'
export type RsvpErrorCode = 'required' | 'tooLong' | 'outOfRange'
export type RsvpErrors = Partial<Record<RsvpField, RsvpErrorCode>>

export type RsvpValidation = { ok: true; value: Rsvp } | { ok: false; errors: RsvpErrors }

/** Valida y normaliza (recorta espacios, quita opcionales vacíos, 0 acompañantes si no asiste). */
export function validateRsvp(input: RsvpInput): RsvpValidation {
  const errors: RsvpErrors = {}
  const name = input.name.trim()
  const dietary = input.dietary?.trim() ?? ''
  const message = input.message?.trim() ?? ''

  if (name.length === 0) errors.name = 'required'
  else if (name.length > RSVP_LIMITS.name) errors.name = 'tooLong'

  if (input.attending === null) errors.attending = 'required'

  const companions = input.attending === false ? 0 : input.companions
  if (!Number.isInteger(companions) || companions < 0 || companions > RSVP_LIMITS.companions) {
    errors.companions = 'outOfRange'
  }
  if (dietary.length > RSVP_LIMITS.dietary) errors.dietary = 'tooLong'
  if (message.length > RSVP_LIMITS.message) errors.message = 'tooLong'

  if (Object.keys(errors).length > 0 || input.attending === null) return { ok: false, errors }
  return {
    ok: true,
    value: {
      name,
      attending: input.attending,
      companions,
      ...(dietary ? { dietary } : {}),
      ...(message ? { message } : {}),
    },
  }
}
