import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useStore } from 'zustand'
import type {
  AuthService,
  Clock,
  EventRepository,
  GiftRepository,
  ReservationRepository,
  RsvpRepository,
} from '../application/ports'
import { createAppStore, type AppState, type AppStore } from './stores/appStore'

export interface AppServices {
  auth: AuthService
  gifts: GiftRepository
  reservations: ReservationRepository
  rsvps: RsvpRepository
  events: EventRepository
  clock: Clock
}

const StoreContext = createContext<AppStore | null>(null)

/** Crea el store de la app sobre los servicios (Firebase en producción, memoria en tests). */
export function AppProvider({
  services,
  children,
}: {
  services: AppServices
  children: ReactNode
}) {
  const [store] = useState(() => createAppStore(services))

  useEffect(() => {
    // Sesión anónima silenciosa al abrir la web + datos del evento.
    store.getState().start()
  }, [store])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useAppStore<T>(selector: (state: AppState) => T): T {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useAppStore debe usarse dentro de <AppProvider>')
  return useStore(store, selector)
}
