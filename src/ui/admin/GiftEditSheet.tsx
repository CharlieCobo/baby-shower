import { useId, useState } from 'react'
import {
  giftToForm,
  validateGiftForm,
  type GiftForm,
  type GiftFormErrors,
  type GiftFormField,
} from '../../domain/admin'
import { CATEGORIES, type Gift } from '../../domain/gift'
import { es } from '../../i18n/es'
import { BottomSheet } from '../components/BottomSheet'
import { Icon } from '../components/Icon'
import { errorMessage } from '../stores/appStore'
import { useAppStore, useServices } from '../services'

const t = es.admin.giftForm

interface GiftEditSheetProps {
  /** null = cerrado; { gift: undefined } = nuevo regalo */
  target: { gift?: Gift } | null
  reservationUids: string[]
  nextOrder: number
  onClose: () => void
}

export function GiftEditSheet({ target, reservationUids, nextOrder, onClose }: GiftEditSheetProps) {
  return (
    <BottomSheet
      form
      open={target !== null}
      title={target?.gift ? t.editTitle : t.newTitle}
      onClose={onClose}
    >
      {target && (
        <GiftEditForm
          key={target.gift?.id ?? 'nuevo'}
          gift={target.gift}
          reservationUids={reservationUids}
          nextOrder={nextOrder}
          onDone={onClose}
        />
      )}
    </BottomSheet>
  )
}

function GiftEditForm(props: {
  gift: Gift | undefined
  reservationUids: string[]
  nextOrder: number
  onDone: () => void
}) {
  const { gift, reservationUids, nextOrder, onDone } = props
  const { admin } = useServices()
  const showToast = useAppStore((s) => s.showToast)
  const id = useId()
  const [form, setForm] = useState<GiftForm>(() => giftToForm(gift))
  const [errors, setErrors] = useState<GiftFormErrors>({})
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const reserved = gift?.reservedCount ?? 0
  const update = (patch: Partial<GiftForm>) => setForm((f) => ({ ...f, ...patch }))

  const error = (field: GiftFormField) => {
    const code = errors[field]
    const messages: Partial<Record<string, string>> = t.errors[field]
    return code ? messages[code] : undefined
  }

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true)
    try {
      await action()
      showToast('success', done)
      onDone()
    } catch (e) {
      showToast('error', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const save = () => {
    const result = validateGiftForm(form, reserved)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    void run(
      () =>
        gift ? admin.updateGift(gift.id, result.value) : admin.createGift(result.value, nextOrder),
      t.saved,
    )
  }

  if (confirmDelete && gift) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="font-headline-sm text-headline-sm">{t.deleteTitle(gift.title)}</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {t.deleteText(reservationUids.length)}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => admin.deleteGift(gift.id, reservationUids), t.deleted)}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-error font-label-lg text-label-lg text-on-error disabled:opacity-60"
        >
          <Icon name="delete" className="text-[20px]" />
          {t.deleteConfirm}
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(false)}
          className="h-11 rounded-full font-label-md text-label-md text-on-surface-variant"
        >
          {t.cancel}
        </button>
      </div>
    )
  }

  const input =
    'h-11 w-full rounded-full bg-surface-container-low px-4 font-body-md text-body-md text-on-surface focus:bg-surface-container aria-[invalid=true]:shadow-[inset_0_0_0_2px_var(--color-error)]'
  const label = 'font-label-sm text-label-sm text-secondary'
  const field = (name: GiftFormField, text: string, control: React.ReactNode, hint?: string) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${id}-${name}`} className={label}>
        {text}
      </label>
      {control}
      {hint && !error(name) && (
        <p className="pl-2 font-label-sm text-[11px] text-on-secondary-container">{hint}</p>
      )}
      {error(name) && (
        <p id={`${id}-${name}-error`} className="pl-2 font-label-sm text-label-sm text-error">
          {error(name)}
        </p>
      )}
    </div>
  )
  const aria = (name: GiftFormField) => ({
    id: `${id}-${name}`,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${id}-${name}-error` : undefined,
  })

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
      className="flex flex-col gap-space-md"
    >
      {field(
        'title',
        t.title,
        <input
          {...aria('title')}
          value={form.title}
          onChange={(e) => update({ title: e.target.value })}
          className={input}
        />,
      )}
      {field(
        'description',
        `${t.description} ${t.optional}`,
        <textarea
          {...aria('description')}
          rows={2}
          value={form.description}
          onChange={(e) => update({ description: e.target.value })}
          className={`${input} h-auto resize-none rounded-2xl p-3`}
        />,
      )}
      {field(
        'category',
        t.category,
        <select
          {...aria('category')}
          value={form.category}
          onChange={(e) => update({ category: e.target.value })}
          className={input}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {es.categories[c].label}
            </option>
          ))}
        </select>,
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span id={`${id}-quantity-label`} className={label}>
            {t.quantity}
          </span>
          {reserved > 0 && (
            <span className="font-label-sm text-[11px] font-bold text-tertiary">
              {t.reservedHint(reserved)}
            </span>
          )}
        </div>
        <div className="flex max-w-[170px] items-center justify-between rounded-full bg-surface-container-low p-1">
          <button
            type="button"
            aria-label={t.lessQuantity}
            disabled={form.quantity <= Math.max(1, reserved)}
            onClick={() => update({ quantity: form.quantity - 1 })}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-sm disabled:opacity-40"
          >
            <Icon name="remove" className="text-[18px]" />
          </button>
          <output
            aria-labelledby={`${id}-quantity-label`}
            className="px-2 font-headline-sm text-headline-sm text-on-surface"
          >
            {form.quantity}
          </output>
          <button
            type="button"
            aria-label={t.moreQuantity}
            onClick={() => update({ quantity: form.quantity + 1 })}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-sm"
          >
            <Icon name="add" className="text-[18px]" />
          </button>
        </div>
        {reserved > 0 && (
          <p className="mt-1 flex items-start gap-2 rounded-xl bg-surface-container p-2.5 font-label-sm text-[11px] leading-tight text-on-secondary-container">
            <Icon name="info" className="text-[18px] text-primary" />
            {t.reservedWarning(reserved)}
          </p>
        )}
        {error('quantity') && (
          <p className="pl-2 font-label-sm text-label-sm text-error">{error('quantity')}</p>
        )}
      </div>

      {field(
        'priceEur',
        `${t.price} ${t.optional}`,
        <input
          {...aria('priceEur')}
          inputMode="numeric"
          value={form.priceEur}
          onChange={(e) => update({ priceEur: e.target.value })}
          className={input}
        />,
      )}
      {field(
        'url',
        `${t.url} ${t.optional}`,
        <input
          {...aria('url')}
          type="url"
          inputMode="url"
          placeholder="https://"
          value={form.url}
          onChange={(e) => update({ url: e.target.value })}
          className={input}
        />,
      )}
      {field(
        'imageUrl',
        `${t.imageUrl} ${t.optional}`,
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-container text-primary">
            {/^https:\/\/.+/.test(form.imageUrl.trim()) ? (
              <img src={form.imageUrl.trim()} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon
                name={es.categories[form.category as keyof typeof es.categories]?.icon ?? 'redeem'}
                className="text-[28px]"
              />
            )}
          </span>
          <input
            {...aria('imageUrl')}
            type="url"
            inputMode="url"
            placeholder="https://"
            value={form.imageUrl}
            onChange={(e) => update({ imageUrl: e.target.value })}
            className={input}
          />
        </div>,
        t.imageHint,
      )}

      <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-surface-container-low px-4 py-3">
        <span className="font-label-md text-label-md text-on-surface">{t.visible}</span>
        <input
          type="checkbox"
          role="switch"
          checked={form.active}
          onChange={(e) => update({ active: e.target.checked })}
          className="h-5 w-5 accent-[var(--color-tertiary)]"
        />
      </label>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onDone}
          className="h-12 flex-1 rounded-full bg-surface-container font-label-lg text-label-lg text-secondary"
        >
          {t.cancel}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-full bg-primary-container font-label-lg text-label-lg text-on-primary-container shadow-md disabled:opacity-60"
        >
          <Icon name="check_circle" className="text-[20px]" filled />
          {busy ? t.saving : gift ? t.save : t.create}
        </button>
      </div>
      {gift && (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="mx-auto flex items-center gap-1 rounded-full px-4 py-2 font-label-md text-label-md text-error hover:bg-error-container/40"
        >
          <Icon name="delete" className="text-[18px]" />
          {t.delete}
        </button>
      )}
    </form>
  )
}
