import type { EventInfo } from '../domain/event'
import type { EventRepository } from './ports'

export const getEvent = (deps: { events: EventRepository }) => (): Promise<EventInfo | null> =>
  deps.events.get()
