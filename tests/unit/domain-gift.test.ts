import { describe, expect, it } from 'vitest'
import {
  filterGifts,
  giftDisplayState,
  isAvailable,
  remaining,
  visibleGifts,
} from '../../src/domain/gift'
import { makeGift } from './fixtures'

describe('remaining / isAvailable', () => {
  it('calcula las unidades restantes', () => {
    expect(remaining(makeGift({ quantity: 4, reservedCount: 1 }))).toBe(3)
    expect(remaining(makeGift({ quantity: 2, reservedCount: 2 }))).toBe(0)
  })

  it('un regalo oculto o agotado no está disponible', () => {
    expect(isAvailable(makeGift())).toBe(true)
    expect(isAvailable(makeGift({ active: false }))).toBe(false)
    expect(isAvailable(makeGift({ quantity: 1, reservedCount: 1 }))).toBe(false)
  })
})

describe('visibleGifts (Visitante abre la lista)', () => {
  it('muestra solo los activos, ordenados por order', () => {
    const gifts = [
      makeGift({ id: 'c', order: 3 }),
      makeGift({ id: 'oculto', order: 0, active: false }),
      makeGift({ id: 'a', order: 1 }),
    ]
    expect(visibleGifts(gifts).map((g) => g.id)).toEqual(['a', 'c'])
  })
})

describe('giftDisplayState', () => {
  const soldOut = makeGift({ quantity: 1, reservedCount: 1 })

  it('Regalo agotado: "Ya reservado"', () => {
    expect(giftDisplayState(soldOut, { isMine: false, registryOpen: true })).toEqual({
      kind: 'soldOut',
    })
  })

  it('disponible: indica las unidades restantes', () => {
    expect(
      giftDisplayState(makeGift({ quantity: 4, reservedCount: 1 }), {
        isMine: false,
        registryOpen: true,
      }),
    ).toEqual({ kind: 'available', remaining: 3 })
  })

  it('Regalo agotado con reserva propia: "Lo traes tú" con opción de liberar', () => {
    expect(giftDisplayState(soldOut, { isMine: true, registryOpen: true })).toEqual({
      kind: 'mine',
      canRelease: true,
    })
  })

  it('Lista cerrada en la UI: los propios siguen siendo "Lo traes tú", sin liberar', () => {
    expect(giftDisplayState(soldOut, { isMine: true, registryOpen: false })).toEqual({
      kind: 'mine',
      canRelease: false,
    })
  })

  it('Prioridad de estados: lista cerrada gana a agotado y a disponible', () => {
    expect(giftDisplayState(soldOut, { isMine: false, registryOpen: false })).toEqual({
      kind: 'closed',
    })
    expect(giftDisplayState(makeGift(), { isMine: false, registryOpen: false })).toEqual({
      kind: 'closed',
    })
  })
})

describe('filterGifts (Filtro por categoría)', () => {
  const gifts = [
    makeGift({ id: 'panales', category: 'higiene' }),
    makeGift({ id: 'body', category: 'ropa' }),
    makeGift({ id: 'sonajero', category: 'juguetes', quantity: 1, reservedCount: 1 }),
    makeGift({ id: 'mordedor', category: 'juguetes', quantity: 1, reservedCount: 1 }),
  ]
  const ctx = { mine: new Set(['mordedor']), registryOpen: true }

  it('filtra por categoría', () => {
    const ids = filterGifts(gifts, { category: 'juguetes', onlyAvailable: false }, ctx).map(
      (g) => g.id,
    )
    expect(ids).toEqual(['sonajero', 'mordedor'])
  })

  it('"Solo disponibles" oculta los agotados pero no los propios', () => {
    const ids = filterGifts(gifts, { category: 'all', onlyAvailable: true }, ctx).map((g) => g.id)
    expect(ids).toEqual(['panales', 'body', 'mordedor'])
  })
})
