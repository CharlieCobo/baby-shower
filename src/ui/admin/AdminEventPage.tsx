import { useEffect, useId, useState } from 'react'
import {
  eventToForm,
  validateEventForm,
  type EventForm,
  type EventFormErrors,
  type EventFormField,
} from '../../domain/admin'
import { es } from '../../i18n/es'
import { Icon } from '../components/Icon'
import { errorMessage } from '../stores/appStore'
import { useAppStore, useServices } from '../services'

const t = es.admin.event

export function AdminEventPage() {
  const event = useAppStore((s) => s.event)
  const loadEvent = useAppStore((s) => s.loadEvent)
  // Al entrar en la pestaña, recarga por si alguien lo cambió desde otro móvil.
  useEffect(() => {
    void loadEvent()
  }, [loadEvent])
  if (event.status === 'loading')
    return <p className="text-center text-on-secondary-container">{es.common.loading}</p>
  // La key reinicia el formulario si el evento cambia desde otro dispositivo antes de editar.
  return (
    <EventFormView
      key={event.value?.startsAt.getTime() ?? 'nuevo'}
      initial={eventToForm(event.value)}
    />
  )
}

function EventFormView({ initial }: { initial: EventForm }) {
  const { admin } = useServices()
  const showToast = useAppStore((s) => s.showToast)
  const loadEvent = useAppStore((s) => s.loadEvent)
  const id = useId()
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<EventFormErrors>({})
  const [busy, setBusy] = useState(false)
  const update = (patch: Partial<EventForm>) => setForm((f) => ({ ...f, ...patch }))

  const save = async () => {
    const result = validateEventForm(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setBusy(true)
    try {
      await admin.saveEvent(result.value)
      await loadEvent()
      showToast('success', t.saved)
    } catch (e) {
      showToast('error', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const input =
    'h-11 w-full rounded-full bg-surface-container-low px-4 font-body-md text-body-md text-on-surface focus:bg-surface-container aria-[invalid=true]:shadow-[inset_0_0_0_2px_var(--color-error)]'
  const field = (
    name: EventFormField,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement>,
    hint?: string,
  ) => {
    const code = errors[name]
    const messages: Partial<Record<string, string>> = t.errors[name]
    const message = code ? messages[code] : undefined
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={`${id}-${name}`} className="font-label-sm text-label-sm text-secondary">
          {label}
        </label>
        <input
          id={`${id}-${name}`}
          value={form[name]}
          onChange={(e) => update({ [name]: e.target.value } as Partial<EventForm>)}
          aria-invalid={message ? true : undefined}
          aria-describedby={
            message ? `${id}-${name}-error` : hint ? `${id}-${name}-hint` : undefined
          }
          className={input}
          {...props}
        />
        {hint && !message && (
          <p
            id={`${id}-${name}-hint`}
            className="pl-2 font-label-sm text-[11px] text-on-secondary-container"
          >
            {hint}
          </p>
        )}
        {message && (
          <p id={`${id}-${name}-error`} className="pl-2 font-label-sm text-label-sm text-error">
            {message}
          </p>
        )}
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
      className="flex flex-col gap-space-md rounded-card bg-surface-container-lowest p-space-lg shadow-card"
    >
      <div>
        <h2 className="font-headline-md text-headline-md text-on-surface">{t.title}</h2>
        <p className="font-body-sm text-body-sm text-on-secondary-container">{t.intro}</p>
      </div>
      {field('title', t.name, { type: 'text' })}
      {field('babyName', `${t.babyName} ${es.admin.giftForm.optional}`, { type: 'text' })}
      <div className="grid grid-cols-1 gap-space-md sm:grid-cols-3">
        {field('date', t.date, { type: 'date' })}
        {field('startTime', t.startTime, { type: 'time' })}
        {field('endTime', t.endTime, { type: 'time' })}
      </div>
      {field('place', t.place, { type: 'text' }, t.placeHint)}
      {field('mapsUrl', t.mapsUrl, { type: 'url', inputMode: 'url', placeholder: 'https://' })}
      {field('rsvpDeadline', t.rsvpDeadline, { type: 'date' }, t.rsvpDeadlineHint)}
      {field(
        'registryClosesAt',
        `${t.registryClosesAt} ${es.admin.giftForm.optional}`,
        { type: 'datetime-local' },
        t.registryClosesAtHint,
      )}
      <button
        type="submit"
        disabled={busy}
        className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary-container font-label-lg text-label-lg text-on-primary-container shadow-md disabled:opacity-60"
      >
        <Icon name="check_circle" className="text-[20px]" filled />
        {busy ? t.saving : t.save}
      </button>
    </form>
  )
}
