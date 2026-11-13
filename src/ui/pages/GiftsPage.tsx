import { useEffect, useMemo, useState } from 'react'
import { isRegistryOpen } from '../../domain/event'
import {
  CATEGORIES,
  filterGifts,
  giftDisplayState,
  type Gift,
  type GiftFilter,
} from '../../domain/gift'
import { es } from '../../i18n/es'
import { BottomSheet } from '../components/BottomSheet'
import { GiftCard } from '../components/GiftCard'
import { Icon } from '../components/Icon'
import { LoadError } from '../components/LoadError'
import { formatPrice } from '../format'
import { useAppStore } from '../services'

type PendingAction = { kind: 'reserve' | 'release'; gift: Gift } | null

export function GiftsPage() {
  const gifts = useAppStore((s) => s.gifts)
  const mine = useAppStore((s) => s.mine)
  const event = useAppStore((s) => s.event.value)
  const now = useAppStore((s) => s.now)()
  const watchGifts = useAppStore((s) => s.watchGifts)
  const reserve = useAppStore((s) => s.reserve)
  const release = useAppStore((s) => s.release)

  const [filter, setFilter] = useState<GiftFilter>({ category: 'all', onlyAvailable: false })
  const [pending, setPending] = useState<PendingAction>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => watchGifts(), [watchGifts])

  const registryOpen = isRegistryOpen(event, now)
  const shown = useMemo(
    () => filterGifts(gifts.list, filter, { mine, registryOpen }),
    [gifts.list, filter, mine, registryOpen],
  )

  const confirm = async () => {
    if (!pending) return
    setBusy(true)
    if (pending.kind === 'reserve') await reserve(pending.gift)
    else await release(pending.gift)
    setBusy(false)
    setPending(null)
  }

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-1.5 font-label-md text-label-md transition-transform active:scale-95 ${
      active
        ? 'bg-inverse-surface text-surface-container-lowest shadow-[0_4px_12px_rgba(74,31,61,0.2)]'
        : 'bg-surface-container-lowest text-on-secondary-container shadow-sm hover:bg-surface-container-low'
    }`

  return (
    <div>
      <header className="mb-space-lg flex flex-col items-center text-center">
        <Icon name="cake" className="mb-1.5 text-[22px] text-primary" />
        {event?.babyName && (
          <p className="mb-1 font-label-sm text-label-sm font-bold tracking-widest text-primary uppercase">
            {`${es.appName} ${es.invitation.of(event.babyName)}`}
          </p>
        )}
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          {es.gifts.title}
        </h1>
        <p className="mt-1.5 max-w-[320px] px-2 font-body-sm text-body-sm text-on-secondary-container">
          {es.gifts.intro}
        </p>
      </header>

      {!registryOpen && (
        <p
          role="status"
          className="mb-space-md flex items-center gap-2 rounded-2xl bg-secondary-fixed px-space-md py-3 font-label-md text-label-md text-on-secondary-fixed"
        >
          <Icon name="lock" className="text-[20px]" />
          {es.gifts.closedBanner}
        </p>
      )}

      <section className="mb-space-md flex flex-col gap-space-sm">
        <div
          role="group"
          aria-label={es.gifts.filtersLabel}
          className="-mx-gutter flex items-center gap-2 overflow-x-auto px-gutter py-1 [scrollbar-width:none]"
        >
          <button
            type="button"
            aria-pressed={filter.category === 'all'}
            className={chip(filter.category === 'all')}
            onClick={() => setFilter((f) => ({ ...f, category: 'all' }))}
          >
            {es.gifts.all}
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={filter.category === category}
              className={chip(filter.category === category)}
              onClick={() => setFilter((f) => ({ ...f, category }))}
            >
              {es.categories[category].label}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center justify-between px-1 pt-1">
          <span className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-tertiary" />
            {es.gifts.onlyAvailable}
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={filter.onlyAvailable}
            onChange={(e) => setFilter((f) => ({ ...f, onlyAvailable: e.target.checked }))}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="flex h-7 w-12 items-center rounded-full bg-surface-container-highest p-0.5 shadow-inner transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary [&>span]:transition-transform peer-checked:[&>span]:translate-x-5"
          >
            <span className="h-6 w-6 rounded-full bg-surface-container-lowest shadow-[0_2px_6px_rgba(74,31,61,0.25)]" />
          </span>
        </label>
      </section>

      {gifts.status === 'loading' && (
        <p className="text-center font-body-md text-body-md text-on-secondary-container">
          {es.common.loading}
        </p>
      )}
      {gifts.status === 'error' && <LoadError onRetry={() => window.location.reload()} />}
      {gifts.status === 'ready' && (
        <section className="flex flex-col gap-space-md">
          {gifts.list.length === 0 && (
            <p className="text-center font-body-md text-body-md text-on-secondary-container">
              {es.gifts.noGifts}
            </p>
          )}
          {gifts.list.length > 0 && shown.length === 0 && (
            <p className="text-center font-body-md text-body-md text-on-secondary-container">
              {es.gifts.empty}
            </p>
          )}
          {shown.map((gift) => (
            <GiftCard
              key={gift.id}
              gift={gift}
              state={giftDisplayState(gift, { isMine: mine.has(gift.id), registryOpen })}
              onReserve={(g) => setPending({ kind: 'reserve', gift: g })}
              onRelease={(g) => setPending({ kind: 'release', gift: g })}
            />
          ))}
        </section>
      )}

      <footer className="mt-space-lg mb-space-sm px-4 text-center">
        <p className="font-label-sm text-label-sm leading-relaxed text-on-secondary-container">
          {es.gifts.otherDevice}
        </p>
      </footer>

      <BottomSheet
        open={pending !== null}
        title={
          pending?.kind === 'release'
            ? es.gifts.confirmReleaseTitle(pending.gift.title)
            : es.gifts.confirmReserveTitle(pending?.gift.title ?? '')
        }
        onClose={() => {
          if (!busy) setPending(null)
        }}
      >
        {pending && (
          <>
            {pending.gift.priceEur !== undefined && (
              <span className="mb-2 rounded-full bg-surface-container px-3 py-1 font-label-sm text-label-sm font-bold text-secondary">
                {`${formatPrice(pending.gift.priceEur)} · ${es.categories[pending.gift.category].label}`}
              </span>
            )}
            <p className="mb-space-lg max-w-[300px] font-body-sm text-body-sm text-on-surface-variant">
              {pending.kind === 'reserve'
                ? es.gifts.confirmReserveText
                : es.gifts.confirmReleaseText}
            </p>
            <div className="flex w-full flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirm()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary-container font-label-lg text-label-lg text-on-primary-container shadow-pill transition-all active:scale-[0.98] disabled:opacity-60"
              >
                <Icon
                  name={pending.kind === 'reserve' ? 'favorite' : 'cancel'}
                  className="text-[20px]"
                />
                {pending.kind === 'reserve' ? es.gifts.confirmReserve : es.gifts.confirmRelease}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setPending(null)}
                className="h-11 w-full rounded-full font-label-md text-label-md text-on-surface-variant hover:bg-surface-container"
              >
                {es.gifts.cancel}
              </button>
            </div>
          </>
        )}
      </BottomSheet>
    </div>
  )
}
