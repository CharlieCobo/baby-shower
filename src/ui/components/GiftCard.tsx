import { useState } from 'react'
import type { Gift, GiftDisplayState } from '../../domain/gift'
import { es } from '../../i18n/es'
import { formatPrice } from '../format'
import { Icon } from './Icon'

interface GiftCardProps {
  gift: Gift
  state: GiftDisplayState
  onReserve: (gift: Gift) => void
  onRelease: (gift: Gift) => void
}

function GiftImage({ gift, muted }: { gift: Gift; muted: boolean }) {
  const [failed, setFailed] = useState(false)
  const category = es.categories[gift.category]
  if (gift.imageUrl && !failed) {
    return (
      <img
        src={gift.imageUrl}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={`h-14 w-14 shrink-0 rounded-2xl object-cover ${muted ? 'grayscale' : ''}`}
      />
    )
  }
  return (
    <span
      data-testid="category-icon"
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner ${
        muted
          ? 'bg-surface-container-highest text-outline'
          : 'bg-surface-container-high text-primary'
      }`}
    >
      <Icon name={category.icon} className="text-[28px]" />
    </span>
  )
}

export function GiftCard({ gift, state, onReserve, onRelease }: GiftCardProps) {
  const muted = state.kind === 'soldOut' || state.kind === 'closed'
  const mine = state.kind === 'mine'
  const left = Math.max(0, gift.quantity - gift.reservedCount)
  const freePercent = Math.round((left / gift.quantity) * 100)

  return (
    <article
      aria-label={gift.title}
      className={`flex flex-col gap-3 rounded-card p-space-md transition-all ${
        mine
          ? 'bg-gradient-to-b from-tertiary-fixed/20 to-surface-container-lowest shadow-[0_10px_25px_-5px_rgba(46,104,90,0.15)]'
          : muted
            ? 'bg-surface-container-low opacity-70'
            : 'bg-surface-container-lowest shadow-card'
      }`}
    >
      <div className="flex items-start gap-3">
        <GiftImage gift={gift} muted={muted} />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-start justify-between gap-2">
            <h3
              className={`font-title-md text-title-md text-on-surface ${state.kind === 'soldOut' ? 'line-through' : ''}`}
            >
              {gift.title}
            </h3>
            {gift.priceEur !== undefined && (
              <span
                className={`shrink-0 pt-1 font-label-sm text-label-sm font-bold ${muted ? 'text-outline' : mine ? 'text-tertiary' : 'text-primary'}`}
              >
                {formatPrice(gift.priceEur)}
              </span>
            )}
          </div>
          {gift.description && (
            <p className="line-clamp-3 font-body-sm text-body-sm text-on-surface-variant">
              {gift.description}
            </p>
          )}
          {gift.url && (
            <a
              href={gift.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-0.5 font-label-sm text-label-sm text-secondary hover:text-primary"
            >
              {es.gifts.viewExample}
              <Icon name="north_east" className="text-[13px]" />
            </a>
          )}
        </div>
      </div>

      {state.kind === 'available' && (
        <>
          <div className="flex flex-col gap-1 rounded-full bg-surface-container-low p-2">
            <div className="flex items-center justify-between px-1 font-label-sm text-label-sm text-on-surface-variant">
              <span>{es.gifts.remaining(left, gift.quantity)}</span>
              <span className="font-bold text-tertiary">{es.gifts.free(freePercent)}</span>
            </div>
            <div
              aria-hidden="true"
              className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest"
            >
              <div
                className="h-full rounded-full bg-tertiary-container"
                style={{ width: `${freePercent}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => onReserve(gift)}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-primary-container font-label-lg text-label-lg text-on-primary-container shadow-pill transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <Icon name="favorite" className="text-[18px]" />
            {es.gifts.reserve}
            <span className="sr-only">: {gift.title}</span>
          </button>
        </>
      )}

      {state.kind === 'mine' && (
        <>
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-tertiary-fixed/30 p-2 px-3">
            <span className="flex items-center gap-1 font-label-sm text-label-sm font-bold text-on-tertiary-container">
              <Icon name="check_circle" className="text-[16px] text-tertiary" filled />
              {es.gifts.mine}
            </span>
            <span className="font-label-sm text-label-sm text-tertiary">
              {es.gifts.remaining(left, gift.quantity)}
            </span>
          </div>
          {state.canRelease && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onRelease(gift)}
                className="flex items-center gap-1 rounded-full px-3 py-2 font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-error-container/40 hover:text-error"
              >
                <Icon name="cancel" className="text-[16px]" />
                {es.gifts.release}
                <span className="sr-only">: {gift.title}</span>
              </button>
            </div>
          )}
        </>
      )}

      {(state.kind === 'soldOut' || state.kind === 'closed') && (
        <div className="flex items-center justify-between rounded-full bg-surface-container px-3 py-1.5">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {es.gifts.available(left, gift.quantity)}
          </span>
          <span className="rounded-full bg-surface-container-highest px-2.5 py-0.5 font-label-sm text-label-sm font-semibold text-on-secondary-container">
            {state.kind === 'soldOut' ? es.gifts.soldOut : es.gifts.closedBadge}
          </span>
        </div>
      )}
    </article>
  )
}
