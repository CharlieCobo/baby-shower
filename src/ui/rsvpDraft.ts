// Copia local del último RSVP enviado desde este navegador, para precargar el formulario.
// Firestore nunca devuelve RSVPs a los invitados (design.md § 2).
import type { Rsvp } from '../domain/rsvp'

const KEY = 'baby-shower:rsvp'

export function loadRsvpDraft(): Rsvp | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<Rsvp>
    if (typeof data.name !== 'string' || typeof data.attending !== 'boolean') return null
    return {
      name: data.name,
      attending: data.attending,
      companions: typeof data.companions === 'number' ? data.companions : 0,
      ...(typeof data.dietary === 'string' ? { dietary: data.dietary } : {}),
      ...(typeof data.message === 'string' ? { message: data.message } : {}),
    }
  } catch {
    return null
  }
}

export function saveRsvpDraft(rsvp: Rsvp): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(rsvp))
  } catch {
    // Modo privado o almacenamiento lleno: no es imprescindible.
  }
}
