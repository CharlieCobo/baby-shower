export const CATEGORIES = ['ropa', 'higiene', 'paseo', 'habitacion', 'juguetes'] as const
export type Category = (typeof CATEGORIES)[number]

export interface Gift {
  id: string
  title: string
  description?: string
  url?: string
  imageUrl?: string
  priceEur?: number
  category: Category
  quantity: number
  reservedCount: number
  order: number
  active: boolean
}

export const isCategory = (value: unknown): value is Category =>
  CATEGORIES.includes(value as Category)

/** Unidades que aún se pueden reservar. */
export const remaining = (gift: Gift): number => Math.max(0, gift.quantity - gift.reservedCount)

/** Se puede reservar: visible y con unidades libres. */
export const isAvailable = (gift: Gift): boolean => gift.active && remaining(gift) > 0

/** Regalos que ven los invitados: activos y ordenados por `order`. */
export const visibleGifts = (gifts: readonly Gift[]): Gift[] =>
  gifts.filter((g) => g.active).sort((a, b) => a.order - b.order)

/**
 * Estado de la tarjeta de un regalo, por prioridad (design.md § 5):
 * "Lo traes tú" > "Lista cerrada" > "Ya reservado" > "Disponible".
 */
export type GiftDisplayState =
  | { kind: 'mine'; canRelease: boolean }
  | { kind: 'closed' }
  | { kind: 'soldOut' }
  | { kind: 'available'; remaining: number }

export function giftDisplayState(
  gift: Gift,
  context: { isMine: boolean; registryOpen: boolean },
): GiftDisplayState {
  if (context.isMine) return { kind: 'mine', canRelease: context.registryOpen }
  if (!context.registryOpen) return { kind: 'closed' }
  if (remaining(gift) === 0) return { kind: 'soldOut' }
  return { kind: 'available', remaining: remaining(gift) }
}

export interface GiftFilter {
  category: Category | 'all'
  onlyAvailable: boolean
}

/** Filtro por categoría y "Solo disponibles" (oculta los agotados, nunca los propios). */
export function filterGifts(
  gifts: readonly Gift[],
  filter: GiftFilter,
  context: { mine: ReadonlySet<string>; registryOpen: boolean },
): Gift[] {
  return gifts.filter((gift) => {
    if (filter.category !== 'all' && gift.category !== filter.category) return false
    if (!filter.onlyAvailable) return true
    const state = giftDisplayState(gift, {
      isMine: context.mine.has(gift.id),
      registryOpen: context.registryOpen,
    })
    return state.kind !== 'soldOut'
  })
}
