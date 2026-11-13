import { useId, useMemo, useState } from 'react'
import {
  initials,
  rsvpsToCsv,
  searchRsvps,
  summarizeRsvps,
  type RsvpFilter,
} from '../../domain/admin'
import { es } from '../../i18n/es'
import { Icon } from '../components/Icon'
import { LoadError } from '../components/LoadError'
import { formatShortDate, formatTime } from '../format'
import { downloadText } from './download'
import { useRsvps } from './hooks'

const t = es.admin.responses

export function AdminResponsesPage() {
  const rsvps = useRsvps()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<RsvpFilter>('all')
  const searchId = useId()
  const summary = summarizeRsvps(rsvps.value)
  const shown = useMemo(() => searchRsvps(rsvps.value, query, filter), [rsvps.value, query, filter])

  const counts: Record<RsvpFilter, number> = {
    all: rsvps.value.length,
    yes: summary.attending,
    no: summary.notAttending,
  }

  return (
    <div>
      <h2 className="mb-3 px-1 font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
        {t.title}
      </h2>

      <section aria-label={t.summaryLabel} className="mb-5 grid grid-cols-3 gap-2.5">
        <Stat
          label={t.coming}
          value={summary.attending}
          dot="bg-tertiary"
          note={t.companions(summary.companions)}
          noteClass="text-tertiary"
        />
        <Stat
          label={t.notComing}
          value={summary.notAttending}
          dot="bg-secondary"
          note={t.declined}
          noteClass="text-secondary"
        />
        <Stat
          label={t.people}
          value={summary.people}
          dot="bg-primary"
          note={t.total}
          noteClass="text-primary"
        />
      </section>

      <section className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
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
              className="h-11 w-full rounded-full bg-surface-container-lowest pr-4 pl-10 font-body-sm text-body-sm text-on-surface shadow-sm placeholder:text-secondary/60"
            />
          </div>
          <button
            type="button"
            aria-label={t.exportLabel}
            disabled={rsvps.value.length === 0}
            onClick={() =>
              downloadText(rsvpsToCsv(rsvps.value), t.csvFile, 'text/csv;charset=utf-8')
            }
            className="flex h-11 items-center gap-1.5 rounded-full bg-surface-container-lowest px-4 font-label-md text-label-md text-primary shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Icon name="download" className="text-[18px]" />
            {t.exportCsv}
          </button>
        </div>
        <div
          role="group"
          aria-label={t.filtersLabel}
          className="flex items-center gap-2 overflow-x-auto py-1"
        >
          {(['all', 'yes', 'no'] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 font-label-sm text-label-sm font-bold whitespace-nowrap shadow-sm active:scale-95 ${
                filter === f
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant'
              }`}
            >
              {t.filters[f]}
              <span
                className={`rounded-full px-1.5 text-[11px] ${filter === f ? 'bg-on-primary/20' : 'bg-surface-container text-secondary'}`}
              >
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
      </section>

      {rsvps.status === 'loading' && (
        <p className="text-center text-on-secondary-container">{es.common.loading}</p>
      )}
      {rsvps.status === 'error' && <LoadError onRetry={() => window.location.reload()} />}
      {rsvps.status === 'ready' && (
        <section className="flex flex-col gap-3">
          {rsvps.value.length === 0 && (
            <p className="py-8 text-center text-on-secondary-container">{t.empty}</p>
          )}
          {rsvps.value.length > 0 && shown.length === 0 && (
            <p className="py-8 text-center text-on-secondary-container">{t.noResults}</p>
          )}
          {shown.map((r) => (
            <article
              key={r.uid}
              aria-label={r.name}
              className="flex flex-col gap-2.5 rounded-2xl bg-surface-container-lowest p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-title-md text-title-md ${
                      r.attending
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                        : 'bg-secondary-fixed text-on-secondary-fixed'
                    }`}
                  >
                    {initials(r.name)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-title-md text-title-md break-words text-on-surface">
                      {r.name}
                    </h3>
                    <p className="flex items-center gap-1 font-body-sm text-body-sm text-secondary">
                      <Icon name={r.companions > 0 ? 'group' : 'person'} className="text-[15px]" />
                      {t.companionsLine(r.attending ? r.companions : 0)}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-3 font-label-sm text-label-sm font-bold ${
                    r.attending
                      ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                      : 'bg-surface-variant text-on-secondary-fixed-variant'
                  }`}
                >
                  <Icon name={r.attending ? 'check_circle' : 'cancel'} className="text-[16px]" />
                  {r.attending ? t.statusYes : t.statusNo}
                </span>
              </div>
              {r.dietary && (
                <p className="flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1.5 font-body-sm text-[13px] text-on-secondary-container">
                  <Icon name="spa" className="text-[15px] text-primary" />
                  <span className="font-semibold text-primary">{t.dietary}</span>
                  <span className="font-bold">{r.dietary}</span>
                </p>
              )}
              {r.message && (
                <p className="rounded-2xl bg-surface-container-low px-3 py-2 font-body-sm text-body-sm text-on-surface-variant italic">
                  “{r.message}”
                </p>
              )}
              <p className="text-right font-label-sm text-[11px] text-outline">
                {`${formatShortDate(r.updatedAt)}, ${formatTime(r.updatedAt)}`}
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

function Stat(props: {
  label: string
  value: number
  dot: string
  note?: string
  noteClass?: string
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-label-sm font-bold text-on-surface-variant">
          {props.label}
        </span>
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${props.dot}`} />
      </div>
      <span className="my-1.5 block font-headline-md text-headline-md leading-none font-bold text-on-surface">
        {props.value}
      </span>
      {props.note && (
        <span
          className={`w-fit rounded-full bg-surface-container-low px-2 py-0.5 font-label-sm text-[11px] font-bold whitespace-nowrap ${props.noteClass ?? ''}`}
        >
          {props.note}
        </span>
      )}
    </div>
  )
}
