import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useId, useMemo, useState } from 'react'
import { reorder, summarizeGifts, type ReservationRecord } from '../../domain/admin'
import type { Gift } from '../../domain/gift'
import { es } from '../../i18n/es'
import { BottomSheet } from '../components/BottomSheet'
import { Icon } from '../components/Icon'
import { LoadError } from '../components/LoadError'
import { formatPrice, formatShortDate, formatTime } from '../format'
import { errorMessage } from '../stores/appStore'
import { useAppStore, useServices } from '../services'
import { GiftEditSheet } from './GiftEditSheet'
import { useAllGifts, useReservations } from './hooks'

const t = es.admin.gifts

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function AdminGiftsPage() {
  const gifts = useAllGifts()
  const reservations = useReservations()
  const { admin } = useServices()
  const showToast = useAppStore((s) => s.showToast)
  const searchId = useId()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<{ gift?: Gift } | null>(null)
  const [releasing, setReleasing] = useState<ReservationRecord | null>(null)
  const [busy, setBusy] = useState(false)
  // Orden optimista mientras se guarda el arrastre
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null)

  const byGift = useMemo(() => {
    const map = new Map<string, ReservationRecord[]>()
    for (const r of reservations.value) map.set(r.giftId, [...(map.get(r.giftId) ?? []), r])
    for (const list of map.values())
      list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    return map
  }, [reservations.value])

  const ordered = useMemo(() => {
    if (!pendingOrder) return gifts.value
    const index = new Map(pendingOrder.map((id, i) => [id, i]))
    return [...gifts.value].sort((a, b) => (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0))
  }, [gifts.value, pendingOrder])

  const q = normalize(query.trim())
  const shown = q
    ? ordered.filter((g) => normalize(`${g.title} ${es.categories[g.category].label}`).includes(q))
    : ordered
  const summary = summarizeGifts(gifts.value)
  const nextOrder = gifts.value.reduce((max, g) => Math.max(max, g.order), -1) + 1

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const changes = reorder(ordered, String(active.id), String(over.id))
    if (changes.length === 0) return
    const ids = ordered.map((g) => g.id)
    setPendingOrder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
    try {
      await admin.reorderGifts(changes)
    } catch (e) {
      showToast('error', errorMessage(e))
    } finally {
      setPendingOrder(null)
    }
  }

  const toggleActive = (gift: Gift) => {
    admin
      .setGiftActive(gift.id, !gift.active)
      .catch((e: unknown) => showToast('error', errorMessage(e)))
  }

  const release = async () => {
    if (!releasing) return
    setBusy(true)
    try {
      await admin.releaseReservation(releasing.giftId, releasing.uid)
      showToast('success', t.released)
    } catch (e) {
      showToast('error', errorMessage(e))
    } finally {
      setBusy(false)
      setReleasing(null)
    }
  }

  return (
    <div>
      <h2 className="mb-3 px-1 font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
        {t.title}
      </h2>

      <section className="mb-space-md grid grid-cols-3 gap-2.5">
        <Pod
          label={t.summary.gifts}
          value={summary.gifts}
          note={t.summary.inList}
          icon="inventory_2"
          tone="text-on-surface"
        />
        <Pod
          label={t.summary.reserved}
          value={summary.reservedUnits}
          note={t.summary.covered(summary.covered)}
          icon="favorite"
          tone="text-tertiary"
        />
        <Pod
          label={t.summary.free}
          value={summary.freeUnits}
          note={t.summary.toPick}
          icon="card_giftcard"
          tone="text-primary"
        />
      </section>

      <div className="mb-space-md flex flex-col gap-space-sm">
        <button
          type="button"
          onClick={() => setEditing({})}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-inverse-surface font-label-lg text-label-lg text-inverse-on-surface shadow-md active:scale-95"
        >
          <Icon name="add_circle" className="text-[20px]" />
          {t.add}
        </button>
        <div className="relative">
          <label htmlFor={searchId} className="sr-only">
            {t.searchLabel}
          </label>
          <Icon
            name="search"
            className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[20px] text-secondary"
          />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            className="h-11 w-full rounded-full bg-surface-container-lowest pr-4 pl-10 font-body-sm text-body-sm shadow-sm placeholder:text-secondary/70"
          />
        </div>
      </div>

      {(gifts.status === 'loading' || reservations.status === 'loading') && (
        <p className="text-center text-on-secondary-container">{es.common.loading}</p>
      )}
      {(gifts.status === 'error' || reservations.status === 'error') && (
        <LoadError onRetry={() => window.location.reload()} />
      )}
      {gifts.status === 'ready' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => void onDragEnd(e)}
        >
          <SortableContext items={shown.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-space-sm">
              {gifts.value.length === 0 && (
                <li className="py-8 text-center text-on-secondary-container">{t.empty}</li>
              )}
              {gifts.value.length > 0 && shown.length === 0 && (
                <li className="py-8 text-center text-on-secondary-container">{t.noResults}</li>
              )}
              {shown.map((gift) => (
                <SortableGift
                  key={gift.id}
                  gift={gift}
                  reservations={byGift.get(gift.id) ?? []}
                  canDrag={q === ''}
                  onEdit={() => setEditing({ gift })}
                  onToggle={() => toggleActive(gift)}
                  onRelease={setReleasing}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <p className="mt-space-lg flex items-center gap-3 rounded-2xl bg-surface-container p-space-md font-body-sm text-body-sm text-on-surface">
        <Icon name="lock" className="text-[20px] text-primary" filled />
        {t.tip}
      </p>

      <GiftEditSheet
        target={editing}
        reservationUids={editing?.gift ? (byGift.get(editing.gift.id) ?? []).map((r) => r.uid) : []}
        nextOrder={nextOrder}
        onClose={() => setEditing(null)}
      />

      <BottomSheet
        open={releasing !== null}
        title={t.releaseTitle}
        onClose={() => !busy && setReleasing(null)}
      >
        <p className="mb-space-lg max-w-[300px] font-body-sm text-body-sm text-on-surface-variant">
          {t.releaseText}
        </p>
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void release()}
            className="h-12 w-full rounded-full bg-primary-container font-label-lg text-label-lg text-on-primary-container shadow-pill disabled:opacity-60"
          >
            {t.releaseConfirm}
          </button>
          <button
            type="button"
            onClick={() => setReleasing(null)}
            className="h-11 w-full rounded-full font-label-md text-label-md text-on-surface-variant"
          >
            {es.gifts.cancel}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

function Pod(props: { label: string; value: number; note: string; icon: string; tone: string }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`font-label-sm text-label-sm ${props.tone}`}>{props.label}</span>
        <Icon name={props.icon} className={`text-[16px] ${props.tone}`} />
      </div>
      <span className={`mt-2 font-headline-md text-headline-md ${props.tone}`}>{props.value}</span>
      <span className="font-label-sm text-[11px] text-on-secondary-container">{props.note}</span>
    </div>
  )
}

function SortableGift(props: {
  gift: Gift
  reservations: ReservationRecord[]
  canDrag: boolean
  onEdit: () => void
  onToggle: () => void
  onRelease: (r: ReservationRecord) => void
}) {
  const { gift, reservations, canDrag } = props
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: gift.id,
    disabled: !canDrag,
  })
  const percent = Math.round((gift.reservedCount / gift.quantity) * 100)

  return (
    <li
      ref={setNodeRef}
      aria-label={gift.title}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm ${isDragging ? 'relative z-10 shadow-lg' : ''} ${gift.active ? '' : 'opacity-70'}`}
    >
      <div className="flex items-center gap-2.5 p-3">
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label={t.reorder(gift.title)}
          disabled={!canDrag}
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none p-1 text-secondary/60 hover:text-secondary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Icon name="drag_indicator" className="text-[22px]" />
        </button>
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-container text-primary">
          {gift.imageUrl ? (
            <img src={gift.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon name={es.categories[gift.category].icon} className="text-[26px]" />
          )}
          <span className="absolute right-1 bottom-1 rounded-full bg-surface-container-lowest/90 px-1.5 py-0.5 font-label-sm text-[10px] font-bold text-on-surface">
            ×{gift.quantity}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-primary-fixed px-2 py-0.5 font-label-sm text-[11px] text-on-primary-fixed">
              {es.categories[gift.category].label}
            </span>
            {gift.priceEur !== undefined && (
              <span className="font-label-sm text-label-sm font-bold text-secondary">
                {formatPrice(gift.priceEur)}
              </span>
            )}
            {!gift.active && (
              <span className="rounded-full bg-surface-container-highest px-2 py-0.5 font-label-sm text-[11px] text-on-secondary-container">
                {t.hidden}
              </span>
            )}
          </div>
          <h3 className="line-clamp-2 font-title-md text-title-md break-words text-on-surface">
            {gift.title}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <div
              aria-hidden="true"
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container"
            >
              <div className="h-full rounded-full bg-tertiary" style={{ width: `${percent}%` }} />
            </div>
            <span className="font-label-sm text-label-sm whitespace-nowrap text-tertiary">
              {gift.reservedCount === 0
                ? t.available
                : gift.reservedCount >= gift.quantity
                  ? t.fullyReserved
                  : t.progress(gift.reservedCount, gift.quantity)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <input
            type="checkbox"
            role="switch"
            aria-label={t.visible(gift.title)}
            checked={gift.active}
            onChange={props.onToggle}
            className="h-5 w-5 accent-[var(--color-tertiary)]"
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={t.showReservations(gift.title)}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((o) => !o)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-low text-primary"
            >
              <Icon
                name="expand_more"
                className={`text-[18px] transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>
            <button
              type="button"
              aria-label={t.edit(gift.title)}
              onClick={props.onEdit}
              className="flex h-8 w-8 items-center justify-center rounded-full text-secondary hover:bg-surface-container"
            >
              <Icon name="edit" className="text-[18px]" />
            </button>
          </div>
        </div>
      </div>
      {open && (
        <div id={panelId} className="bg-surface-container-low/70 px-space-md py-space-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-bold text-on-surface-variant">
              <Icon name="lock" className="text-[16px] text-tertiary" filled />
              {t.reservationsTitle}
            </span>
            {reservations.length > 0 && (
              <span className="rounded-full bg-tertiary-fixed px-2 py-0.5 font-label-sm text-[11px] font-bold text-tertiary">
                {t.reservationsCount(reservations.length)}
              </span>
            )}
          </div>
          {reservations.length === 0 && (
            <p className="font-body-sm text-body-sm text-on-secondary-container">
              {t.noReservations}
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {reservations.map((r) => (
              <li
                key={r.uid}
                className="flex items-center justify-between rounded-xl bg-surface-container-lowest p-2.5"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary-fixed text-on-secondary-fixed">
                    <Icon name="redeem" className="text-[15px]" filled />
                  </span>
                  <span className="font-label-md text-label-md text-on-surface">
                    {t.reservationRow}
                    <span className="font-label-sm text-[11px] text-secondary">
                      {` · ${formatShortDate(r.createdAt)}, ${formatTime(r.createdAt)}`}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => props.onRelease(r)}
                  className="rounded-full bg-surface-container px-3 py-1.5 font-label-sm text-label-sm text-primary hover:bg-primary-container"
                >
                  {t.release}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}
