import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { isRsvpOpen, type EventInfo } from '../../domain/event'
import { isDomainError } from '../../domain/errors'
import { RSVP_LIMITS, type Rsvp, type RsvpErrors, type RsvpField } from '../../domain/rsvp'
import { es } from '../../i18n/es'
import { CalendarSheet } from '../components/CalendarSheet'
import { Icon } from '../components/Icon'
import { WrappedCandy } from '../components/Sprinkles'
import { formatLongDate, formatShortDate, formatTime, splitPlace } from '../format'
import { loadRsvpDraft, saveRsvpDraft } from '../rsvpDraft'
import { errorMessage } from '../stores/appStore'
import { useAppStore } from '../services'

export function RsvpPage() {
  const [submitted, setSubmitted] = useState<Rsvp | null>(null)
  const event = useAppStore((s) => s.event)

  if (submitted)
    return <Thanks rsvp={submitted} event={event.value} onChange={() => setSubmitted(null)} />
  return <RsvpForm onSubmitted={setSubmitted} />
}

interface FormState {
  name: string
  attending: boolean | null
  companions: number
  dietary: string
  message: string
}

const fromDraft = (draft: Rsvp | null): FormState => ({
  name: draft?.name ?? '',
  attending: draft?.attending ?? null,
  companions: draft?.companions ?? 0,
  dietary: draft?.dietary ?? '',
  message: draft?.message ?? '',
})

function fieldError(errors: RsvpErrors, field: RsvpField): string | undefined {
  const code = errors[field]
  if (!code) return undefined
  const messages: Partial<Record<string, string>> = es.rsvp.fieldErrors[field]
  return messages[code]
}

function RsvpForm({ onSubmitted }: { onSubmitted: (rsvp: Rsvp) => void }) {
  const ids = { name: useId(), dietary: useId(), message: useId(), companions: useId() }
  const event = useAppStore((s) => s.event.value)
  const now = useAppStore((s) => s.now)()
  const submitRsvp = useAppStore((s) => s.submitRsvp)
  const [form, setForm] = useState<FormState>(() => fromDraft(loadRsvpDraft()))
  const [errors, setErrors] = useState<RsvpErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const focusField = useRef<RsvpField | null>(null)
  const open = isRsvpOpen(event, now)

  // El foco va al primer campo con error cuando el formulario vuelve a estar habilitado.
  useEffect(() => {
    if (sending || !focusField.current) return
    document.querySelector<HTMLElement>(`[data-field="${focusField.current}"]`)?.focus()
    focusField.current = null
  }, [sending])

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSending(true)
    try {
      const result = await submitRsvp({
        name: form.name,
        attending: form.attending,
        companions: form.companions,
        dietary: form.dietary,
        message: form.message,
      })
      if (!result.ok) {
        setErrors(result.errors)
        const first = (['name', 'attending', 'companions', 'dietary', 'message'] as const).find(
          (f) => result.errors[f],
        )
        focusField.current = first ?? null
        return
      }
      setErrors({})
      saveRsvpDraft(result.rsvp)
      onSubmitted(result.rsvp)
    } catch (error) {
      setSubmitError(isDomainError(error) ? errorMessage(error) : es.errors.network)
    } finally {
      setSending(false)
    }
  }

  const input =
    'w-full rounded-[14px] bg-surface-container-low px-4 font-body-md text-body-md text-on-background shadow-sm transition-all placeholder:text-on-secondary-container/60 focus:bg-surface-container-lowest disabled:opacity-60 aria-[invalid=true]:shadow-[inset_0_0_0_2px_var(--color-error)]'
  const label = 'pl-1 font-label-md text-label-md font-bold text-on-background'
  const errorText = 'pl-1 font-label-sm text-label-sm text-error'
  const nameError = fieldError(errors, 'name')
  const attendingError = fieldError(errors, 'attending')
  const companionsError = fieldError(errors, 'companions')
  const dietaryError = fieldError(errors, 'dietary')
  const messageError = fieldError(errors, 'message')

  return (
    <div className="pt-space-sm">
      <section className="flex flex-col gap-4 rounded-card bg-surface-container-lowest p-5 shadow-card">
        <h1 className="pt-1 text-center font-headline-md text-headline-md text-on-background">
          {es.rsvp.title}
        </h1>

        {!open && (
          <div
            role="status"
            className="rounded-2xl bg-secondary-fixed p-space-md text-center text-on-secondary-fixed"
          >
            <p className="font-label-lg text-label-lg">{es.rsvp.closedTitle}</p>
            <p className="mt-1 font-body-sm text-body-sm">{es.rsvp.closedText}</p>
          </div>
        )}

        <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
          <fieldset disabled={!open || sending} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.name} className={label}>
                {es.rsvp.name}
              </label>
              <input
                id={ids.name}
                data-field="name"
                type="text"
                autoComplete="name"
                maxLength={RSVP_LIMITS.name + 20}
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder={es.rsvp.namePlaceholder}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? `${ids.name}-error` : undefined}
                className={`${input} h-12`}
              />
              {nameError && (
                <p id={`${ids.name}-error`} className={errorText}>
                  {nameError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span id={`${ids.name}-attending`} className={label}>
                {es.rsvp.attendance}
              </span>
              <div
                role="radiogroup"
                aria-labelledby={`${ids.name}-attending`}
                aria-describedby={attendingError ? `${ids.name}-attending-error` : undefined}
                className="grid grid-cols-2 gap-2.5"
              >
                {([true, false] as const).map((value) => {
                  const checked = form.attending === value
                  return (
                    <button
                      key={String(value)}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      data-field={value ? 'attending' : undefined}
                      onClick={() => update({ attending: value })}
                      className={`flex h-11 items-center justify-center gap-1.5 rounded-full px-2 font-label-md text-label-md shadow-sm transition-all ${
                        checked
                          ? 'bg-on-background text-on-primary'
                          : 'bg-surface-container-lowest text-on-background hover:bg-surface-container-low'
                      }`}
                    >
                      {checked && (
                        <Icon name={value ? 'check_circle' : 'cancel'} className="text-[18px]" />
                      )}
                      {value ? es.rsvp.yes : es.rsvp.no}
                    </button>
                  )
                })}
              </div>
              {attendingError && (
                <p id={`${ids.name}-attending-error`} className={errorText}>
                  {attendingError}
                </p>
              )}
            </div>

            {form.attending !== false && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between px-1 py-1">
                  <div className="flex flex-col">
                    <span
                      id={ids.companions}
                      className="font-label-md text-label-md font-bold text-on-background"
                    >
                      {es.rsvp.companions}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-secondary-container">
                      {es.rsvp.companionsHint}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={es.rsvp.lessCompanions}
                      disabled={form.companions <= 0}
                      onClick={() => update({ companions: form.companions - 1 })}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-fixed text-on-background shadow-sm active:scale-95 disabled:opacity-40"
                    >
                      <Icon name="remove" className="text-[20px]" />
                    </button>
                    <output
                      aria-labelledby={ids.companions}
                      aria-live="polite"
                      data-field="companions"
                      tabIndex={-1}
                      className="w-6 text-center font-headline-sm text-headline-sm text-on-background"
                    >
                      {form.companions}
                    </output>
                    <button
                      type="button"
                      aria-label={es.rsvp.moreCompanions}
                      disabled={form.companions >= RSVP_LIMITS.companions}
                      onClick={() => update({ companions: form.companions + 1 })}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-tertiary-fixed text-on-background shadow-sm active:scale-95 disabled:opacity-40"
                    >
                      <Icon name="add" className="text-[20px]" />
                    </button>
                  </div>
                </div>
                {companionsError && <p className={errorText}>{companionsError}</p>}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.dietary} className={label}>
                {es.rsvp.dietary}{' '}
                <span className="font-body-sm font-normal text-on-secondary-container">
                  {es.rsvp.optional}
                </span>
              </label>
              <input
                id={ids.dietary}
                data-field="dietary"
                type="text"
                value={form.dietary}
                onChange={(e) => update({ dietary: e.target.value })}
                placeholder={es.rsvp.dietaryPlaceholder}
                aria-invalid={dietaryError ? true : undefined}
                aria-describedby={dietaryError ? `${ids.dietary}-error` : undefined}
                className={`${input} h-12`}
              />
              {dietaryError && (
                <p id={`${ids.dietary}-error`} className={errorText}>
                  {dietaryError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.message} className={label}>
                {es.rsvp.message}{' '}
                <span className="font-body-sm font-normal text-on-secondary-container">
                  {es.rsvp.optional}
                </span>
              </label>
              <textarea
                id={ids.message}
                data-field="message"
                rows={3}
                value={form.message}
                onChange={(e) => update({ message: e.target.value })}
                placeholder={es.rsvp.messagePlaceholder}
                aria-invalid={messageError ? true : undefined}
                aria-describedby={messageError ? `${ids.message}-error` : undefined}
                className={`${input} resize-none p-4`}
              />
              {messageError && (
                <p id={`${ids.message}-error`} className={errorText}>
                  {messageError}
                </p>
              )}
            </div>
          </fieldset>

          {submitError && (
            <p
              role="alert"
              className="rounded-2xl bg-error-container px-4 py-3 font-label-md text-label-md text-on-error-container"
            >
              {submitError}
            </p>
          )}

          <div className="flex flex-col items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!open || sending}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-on-background py-3.5 font-label-lg text-label-lg text-on-primary shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <Icon name="favorite" className="text-[20px]" />
              {sending ? es.rsvp.sending : es.rsvp.submit}
            </button>
            {open && event && (
              <span className="font-label-sm text-label-sm font-semibold text-on-secondary-container">
                {es.rsvp.deadline(formatShortDate(event.rsvpDeadline))}
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  )
}

function Thanks({
  rsvp,
  event,
  onChange,
}: {
  rsvp: Rsvp
  event: EventInfo | null
  onChange: () => void
}) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const place = event ? splitPlace(event.place) : null
  return (
    <section className="relative mt-space-sm flex flex-col items-center overflow-hidden rounded-card bg-surface-container-lowest p-6 text-center shadow-card">
      <div className="my-3">
        <WrappedCandy />
      </div>
      <h1 className="mt-2 mb-2 font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
        {es.rsvp.thanksTitle}
      </h1>
      <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-tertiary-container/30 px-3 py-1 font-label-sm text-label-sm text-on-tertiary-container">
        <Icon name="check_circle" className="text-[16px]" filled />
        {rsvp.attending ? es.rsvp.thanksAttending : es.rsvp.thanksNotAttending}
      </p>
      <p className="mb-6 max-w-[280px] font-body-md text-body-md leading-relaxed text-on-secondary-container">
        {rsvp.attending ? es.rsvp.thanksAttendingText : es.rsvp.thanksNotAttendingText}
      </p>

      {event && place && (
        <div className="mb-6 flex w-full flex-col gap-2.5 rounded-2xl bg-surface-container-low p-4 text-left">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-candy-lemon/40 text-on-surface">
              <Icon name="calendar_today" className="text-[18px]" />
            </span>
            <p className="min-w-0">
              <span className="block font-label-sm text-label-sm text-on-secondary-container">
                {es.rsvp.when}
              </span>
              <span className="block font-label-md text-label-md text-on-surface">
                {`${formatLongDate(event.startsAt)} · ${formatTime(event.startsAt)}`}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tertiary-container/40 text-on-tertiary-container">
              <Icon name="location_on" className="text-[18px]" />
            </span>
            <p className="min-w-0">
              <span className="block font-label-sm text-label-sm text-on-secondary-container">
                {es.rsvp.where}
              </span>
              <span className="block font-label-md text-label-md text-on-surface">
                {place.name}
              </span>
            </p>
          </div>
        </div>
      )}

      <div className="flex w-full flex-col gap-2">
        <Link
          to="/regalos"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary-container px-6 font-label-lg text-label-lg text-on-primary-container shadow-pill"
        >
          <Icon name="redeem" className="text-[18px]" />
          {es.rsvp.toGifts}
        </Link>
        <button
          type="button"
          onClick={onChange}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-surface-container-lowest px-6 font-label-lg text-label-lg text-on-secondary-container shadow-[inset_0_0_0_2px_#C2789D]"
        >
          <Icon name="edit" className="text-[18px]" />
          {es.rsvp.change}
        </button>
      </div>
      {event && (
        <>
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-label-sm text-label-sm text-primary hover:bg-surface-container"
          >
            <Icon name="event" className="text-[16px]" />
            {es.rsvp.saveToCalendar}
          </button>
          <CalendarSheet event={event} open={calendarOpen} onClose={() => setCalendarOpen(false)} />
        </>
      )}
    </section>
  )
}
