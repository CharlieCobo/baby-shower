import { useEffect, useState } from 'react'
import type { AdminSession, OnError, Unsubscribe } from '../../application/ports'
import type { ReservationRecord, RsvpRecord } from '../../domain/admin'
import type { Gift } from '../../domain/gift'
import { useServices } from '../services'

type Status = 'loading' | 'ready' | 'error'

/** Se suscribe a una fuente en tiempo real mientras el componente está montado. */
function useLive<T>(
  subscribe: (onChange: (value: T) => void, onError: OnError) => Unsubscribe,
  initial: T,
) {
  const [state, setState] = useState<{ status: Status; value: T }>({
    status: 'loading',
    value: initial,
  })
  useEffect(
    () =>
      subscribe(
        (value) => setState({ status: 'ready', value }),
        () => setState((s) => ({ status: 'error', value: s.value })),
      ),
    [subscribe],
  )
  return state
}

export function useAdminSession(): AdminSession {
  const { adminAuth } = useServices()
  const [session, setSession] = useState<AdminSession>({ status: 'loading' })
  useEffect(() => adminAuth.watchSession(setSession), [adminAuth])
  return session
}

export function useRsvps() {
  const { admin } = useServices()
  return useLive<RsvpRecord[]>(admin.watchRsvps, [])
}

export function useReservations() {
  const { admin } = useServices()
  return useLive<ReservationRecord[]>(admin.watchReservations, [])
}

/** Todos los regalos (también los ocultos), ordenados por `order`. */
export function useAllGifts() {
  const { gifts } = useServices()
  const state = useLive<Gift[]>(gifts.watchAll, [])
  return { ...state, value: [...state.value].sort((a, b) => a.order - b.order) }
}
