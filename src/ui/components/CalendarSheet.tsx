import { buildIcs, googleCalendarUrl } from '../../domain/calendar'
import type { EventInfo } from '../../domain/event'
import { es } from '../../i18n/es'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'

const SITE_URL = 'https://charliecobo.github.io/baby-shower/'

function downloadIcs(event: EventInfo) {
  const ics = buildIcs(event, {
    uid: `baby-shower-${event.startsAt.getTime()}@charliecobo.github.io`,
    url: SITE_URL,
    description: es.calendar.details(SITE_URL),
  })
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = es.calendar.icsFile
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

interface CalendarSheetProps {
  event: EventInfo
  open: boolean
  onClose: () => void
}

export function CalendarSheet({ event, open, onClose }: CalendarSheetProps) {
  const option =
    'flex h-12 w-full items-center justify-center gap-2 rounded-full font-label-lg text-label-lg active:scale-[0.98] transition-transform'
  return (
    <BottomSheet open={open} title={es.calendar.title} onClose={onClose}>
      <div className="mt-space-sm flex w-full flex-col gap-2">
        <a
          href={googleCalendarUrl(event, es.calendar.details(SITE_URL))}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className={`${option} bg-primary-container text-on-primary-container shadow-pill`}
        >
          <Icon name="calendar_month" className="text-[20px]" />
          {es.calendar.google}
        </a>
        <button
          type="button"
          onClick={() => {
            downloadIcs(event)
            onClose()
          }}
          className={`${option} bg-surface-container-lowest text-on-secondary-container shadow-[inset_0_0_0_2px_#C2789D]`}
        >
          <Icon name="download" className="text-[20px]" />
          {es.calendar.ics}
        </button>
      </div>
    </BottomSheet>
  )
}
