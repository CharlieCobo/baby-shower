import { createStore } from 'zustand/vanilla'
import { getEvent } from '../../application/event'
import { listGifts, releaseGift, reserveGift, watchMyReservations } from '../../application/gifts'
import type { Unsubscribe } from '../../application/ports'
import { submitRsvp, type SubmitRsvpResult } from '../../application/rsvp'
import { DomainError, isDomainError } from '../../domain/errors'
import type { EventInfo } from '../../domain/event'
import type { Gift } from '../../domain/gift'
import type { RsvpInput } from '../../domain/rsvp'
import { es } from '../../i18n/es'
import type { AppServices } from '../services'

export type LoadStatus = 'loading' | 'ready' | 'error'

export interface Toast {
  id: number
  tone: 'success' | 'error'
  message: string
}

export interface AppState {
  event: { status: LoadStatus; value: EventInfo | null }
  gifts: { status: LoadStatus; list: Gift[] }
  mine: ReadonlySet<string>
  toast: Toast | null
  now: () => Date

  /** Arranca la sesión anónima y carga el evento (una vez, al montar la app). */
  start: () => void
  loadEvent: () => Promise<void>
  /** Se suscribe a los regalos y a las reservas propias; devuelve la baja. */
  watchGifts: () => Unsubscribe
  reserve: (gift: Gift) => Promise<boolean>
  release: (gift: Gift) => Promise<boolean>
  submitRsvp: (input: RsvpInput) => Promise<SubmitRsvpResult>
  showToast: (tone: Toast['tone'], message: string) => void
  dismissToast: () => void
}

export type AppStore = ReturnType<typeof createAppStore>

const errorMessage = (error: unknown) =>
  es.errors[isDomainError(error) ? error.code : new DomainError('network').code]

export function createAppStore(services: AppServices) {
  let toastId = 0
  let started = false
  return createStore<AppState>()((set, get) => ({
    event: { status: 'loading', value: null },
    gifts: { status: 'loading', list: [] },
    mine: new Set(),
    toast: null,
    now: () => services.clock.now(),

    start() {
      if (started) return
      started = true
      // Si falla (sin conexión), se reintentará al reservar o enviar el RSVP.
      services.auth.ensureGuestSession().catch(() => undefined)
      void get().loadEvent()
    },

    async loadEvent() {
      set({ event: { status: 'loading', value: get().event.value } })
      try {
        const value = await getEvent(services)()
        set({ event: { status: 'ready', value } })
      } catch {
        set({ event: { status: 'error', value: null } })
      }
    },

    watchGifts() {
      const onError = () => set((s) => ({ gifts: { status: 'error', list: s.gifts.list } }))
      const unsubscribeGifts = listGifts(services)(
        (list) => set({ gifts: { status: 'ready', list } }),
        onError,
      )
      const unsubscribeMine = watchMyReservations(services)((mine) => set({ mine }), onError)
      return () => {
        unsubscribeGifts()
        unsubscribeMine()
      }
    },

    async reserve(gift) {
      try {
        await reserveGift(services)({ gift, event: get().event.value, mine: get().mine })
        set((s) => ({ mine: new Set([...s.mine, gift.id]) }))
        get().showToast('success', es.gifts.reserved(gift.title))
        return true
      } catch (error) {
        get().showToast('error', errorMessage(error))
        return false
      }
    },

    async release(gift) {
      try {
        await releaseGift(services)({ gift, event: get().event.value, mine: get().mine })
        set((s) => ({ mine: new Set([...s.mine].filter((id) => id !== gift.id)) }))
        get().showToast('success', es.gifts.released(gift.title))
        return true
      } catch (error) {
        get().showToast('error', errorMessage(error))
        return false
      }
    },

    submitRsvp(input) {
      return submitRsvp(services)(input, get().event.value)
    },

    showToast(tone, message) {
      toastId += 1
      set({ toast: { id: toastId, tone, message } })
    },

    dismissToast() {
      set({ toast: null })
    },
  }))
}

export { errorMessage }
