import { DomainError } from '../domain/errors'
import { isRsvpOpen, type EventInfo } from '../domain/event'
import { validateRsvp, type Rsvp, type RsvpErrors, type RsvpInput } from '../domain/rsvp'
import type { AuthService, Clock, RsvpRepository } from './ports'

export type SubmitRsvpResult = { ok: true; rsvp: Rsvp } | { ok: false; errors: RsvpErrors }

/**
 * Valida y guarda el RSVP de este dispositivo (sobrescribe el anterior).
 * Los errores de formulario se devuelven; el plazo vencido o un fallo de red se lanzan.
 */
export const submitRsvp =
  (deps: { auth: AuthService; rsvps: RsvpRepository; clock: Clock }) =>
  async (input: RsvpInput, event: EventInfo | null): Promise<SubmitRsvpResult> => {
    const validation = validateRsvp(input)
    if (!validation.ok) return { ok: false, errors: validation.errors }
    if (!isRsvpOpen(event, deps.clock.now())) throw new DomainError('rsvp-closed')
    const uid = await deps.auth.ensureGuestSession()
    await deps.rsvps.save(uid, validation.value)
    return { ok: true, rsvp: validation.value }
  }
