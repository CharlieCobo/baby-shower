import type { EventInfo } from '../../src/domain/event'
import type { Gift } from '../../src/domain/gift'

export const makeGift = (overrides: Partial<Gift> = {}): Gift => ({
  id: 'g1',
  title: 'Pañales talla 1',
  category: 'higiene',
  quantity: 2,
  reservedCount: 0,
  order: 1,
  active: true,
  ...overrides,
})

export const makeEvent = (overrides: Partial<EventInfo> = {}): EventInfo => ({
  title: 'Baby Shower de Lucía',
  startsAt: new Date('2027-05-24T15:00:00Z'), // 17:00 Madrid
  endsAt: new Date('2027-05-24T19:00:00Z'),
  place: 'Jardines La Rosaleda',
  mapsUrl: 'https://maps.google.com/?q=Valencia',
  rsvpDeadline: new Date('2027-05-10T21:59:59Z'), // 23:59:59 Madrid
  ...overrides,
})
