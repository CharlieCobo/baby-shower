import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { RsvpRecord } from '../../src/domain/admin'
import type { EventInfo } from '../../src/domain/event'
import type { Gift } from '../../src/domain/gift'
import { createInMemoryBackend } from '../../src/infrastructure/in-memory/backend'
import { routes } from '../../src/ui/router'
import { AppProvider } from '../../src/ui/services'

export const NOW = new Date('2027-05-01T10:00:00Z')

/** Renderiza la app en `path` con el backend en memoria. */
export function renderApp(
  path: string,
  options: {
    gifts?: Gift[]
    event?: EventInfo | null
    now?: Date
    uid?: string
    rsvps?: RsvpRecord[]
    admin?: { email: string; isAdmin: boolean } | null
  } = {},
) {
  const now = options.now ?? NOW
  const backend = createInMemoryBackend({
    gifts: options.gifts ?? [],
    event: options.event === undefined ? null : options.event,
    now: () => now,
    ...(options.uid ? { uid: options.uid } : {}),
    ...(options.rsvps ? { rsvps: options.rsvps } : {}),
    ...(options.admin ? { admin: options.admin } : {}),
  })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  render(
    <AppProvider services={{ ...backend, clock: { now: () => now } }}>
      <RouterProvider router={router} />
    </AppProvider>,
  )
  return { backend, router, user }
}
