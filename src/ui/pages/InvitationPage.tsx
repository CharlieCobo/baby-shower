import { useState } from 'react'
import { Link } from 'react-router'
import { countdown, isRsvpOpen, type EventInfo } from '../../domain/event'
import { es } from '../../i18n/es'
import { CalendarSheet } from '../components/CalendarSheet'
import { Icon } from '../components/Icon'
import { LoadError } from '../components/LoadError'
import { Lollipop, Sprinkles } from '../components/Sprinkles'
import { formatLongDate, formatShortDate, formatTime, splitPlace } from '../format'
import { useAppStore } from '../services'

export function InvitationPage() {
  const event = useAppStore((s) => s.event)
  const loadEvent = useAppStore((s) => s.loadEvent)
  const now = useAppStore((s) => s.now)()

  return (
    <div className="relative">
      <Sprinkles />
      <Lollipop />
      <header className="relative z-10 pt-5 pb-6 text-center">
        <p className="mb-1 font-label-md text-label-md tracking-wider text-on-secondary-container uppercase">
          {es.invitation.greeting}
        </p>
        <h1 className="m-0 font-display-hero-mobile text-display-hero-mobile text-on-background sm:font-display-hero sm:text-display-hero">
          {es.invitation.title}
          {event.value?.babyName && (
            <span className="mt-0.5 block font-headline-md text-headline-md font-bold">
              {es.invitation.of(event.value.babyName)}
            </span>
          )}
        </h1>
      </header>

      {event.status === 'loading' && (
        <p className="text-center font-body-md text-body-md text-on-secondary-container">
          {es.common.loading}
        </p>
      )}
      {event.status === 'error' && <LoadError onRetry={() => void loadEvent()} />}
      {event.status === 'ready' && event.value === null && <ComingSoon />}
      {event.status === 'ready' && event.value && <EventDetails event={event.value} now={now} />}
    </div>
  )
}

function ComingSoon() {
  return (
    <section className="flex flex-col items-center gap-2 rounded-card bg-surface-container-lowest p-space-lg text-center shadow-card">
      <Icon name="hourglass_top" className="text-[32px] text-primary" />
      <h2 className="font-headline-sm text-headline-sm">{es.invitation.comingSoon}</h2>
      <p className="font-body-md text-body-md text-on-secondary-container">
        {es.invitation.comingSoonText}
      </p>
      <Link to="/regalos" className="mt-2 font-label-lg text-label-lg text-primary underline">
        {es.invitation.ctaGifts}
      </Link>
    </section>
  )
}

function EventDetails({ event, now }: { event: EventInfo; now: Date }) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const remaining = countdown(event, now)
  const place = splitPlace(event.place)
  const rsvpOpen = isRsvpOpen(event, now)
  const pill =
    'flex h-11 items-center justify-center gap-1.5 rounded-full bg-surface-container-lowest px-3 font-label-md text-label-md text-on-background shadow-sm transition-all hover:bg-surface-container-low active:scale-[0.98]'

  return (
    <>
      {remaining.kind !== 'past' && (
        <p className="mb-3 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-candy-peppermint px-4 py-1.5 font-label-md text-label-md text-[#1F4A3F] shadow-sm">
            <Icon name="celebration" className="text-[18px]" />
            {remaining.kind === 'today'
              ? es.invitation.countdownToday
              : es.invitation.countdownDays(remaining.days)}
          </span>
        </p>
      )}

      <section className="mb-3 flex flex-col gap-4 rounded-card bg-surface-container-lowest p-5 shadow-card">
        <div className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-secondary-container">
            <Icon name="calendar_today" className="text-[22px]" />
          </span>
          <p className="flex flex-col">
            <span className="font-title-md text-body-md font-bold text-on-background">
              {formatLongDate(event.startsAt)}
            </span>
            <span className="font-body-sm text-body-sm text-on-secondary-container">
              {formatTime(event.startsAt)}
            </span>
          </p>
        </div>
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-secondary-container">
            <Icon name="location_on" className="text-[22px]" />
          </span>
          <p className="flex flex-col pt-0.5">
            <span className="font-title-md text-body-md font-bold text-on-background">
              {place.name}
            </span>
            {place.address && (
              <span className="font-body-sm text-body-sm text-on-secondary-container">
                {place.address}
              </span>
            )}
          </p>
        </div>
        <div
          aria-hidden="true"
          className="h-[1.5px] w-full rounded-full bg-surface-container-highest"
        />
        <div className="grid grid-cols-2 gap-2.5">
          {event.mapsUrl && (
            <a href={event.mapsUrl} target="_blank" rel="noopener noreferrer" className={pill}>
              <Icon name="map" className="text-[18px] text-secondary" />
              {es.invitation.viewMap}
            </a>
          )}
          <button type="button" onClick={() => setCalendarOpen(true)} className={pill}>
            <Icon name="event" className="text-[18px] text-secondary" />
            {es.invitation.addToCalendar}
          </button>
        </div>
      </section>

      <section className="flex flex-col items-center gap-3 rounded-card bg-surface-container-lowest p-5 shadow-card">
        <Link
          to="/asistencia"
          className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-on-background py-3.5 font-label-lg text-label-lg text-on-primary shadow-md transition-all active:scale-[0.99]"
        >
          <Icon name="favorite" className="text-[20px]" />
          {es.invitation.ctaRsvp}
        </Link>
        <Link
          to="/regalos"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-surface-container-lowest font-label-lg text-label-lg text-on-secondary-container shadow-[inset_0_0_0_2px_#C2789D] transition-colors hover:bg-surface-container-low"
        >
          <Icon name="redeem" className="text-[20px]" />
          {es.invitation.ctaGifts}
        </Link>
        <p className="font-label-sm text-label-sm font-semibold text-on-secondary-container">
          {rsvpOpen
            ? es.invitation.rsvpBy(formatShortDate(event.rsvpDeadline))
            : es.invitation.rsvpClosed}
        </p>
      </section>

      <CalendarSheet event={event} open={calendarOpen} onClose={() => setCalendarOpen(false)} />
    </>
  )
}
