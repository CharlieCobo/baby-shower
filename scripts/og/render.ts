// Genera public/og.png (vista previa al compartir por WhatsApp) a partir de
// scripts/og/template.svg con los datos reales del evento.
//
//   pnpm og                       # usa el "event" de scripts/seed-data.local.json
//   pnpm og datos.json salida.png
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { parseEventDateTime, rsvpDeadlineFromDay } from '../../src/domain/dates'
import { formatLongDate, formatShortDate, formatTime, splitPlace } from '../../src/ui/format'
import { validateSeedData, type SeedData } from '../seed/schema'

const [file = 'scripts/seed-data.local.json', output = 'public/og.png'] = process.argv.slice(2)
const data = JSON.parse(readFileSync(file, 'utf8')) as SeedData
const errors = validateSeedData(data)
if (errors.length > 0 || !data.event) {
  console.error(
    `Faltan datos del evento en ${file}:\n  - ${(errors.length ? errors : ['event']).join('\n  - ')}`,
  )
  process.exit(1)
}

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const { event } = data
const startsAt = parseEventDateTime(event.startsAt)
const place = splitPlace(event.place)
const values: Record<string, string> = {
  SUBTITLE: event.babyName ? `de ${event.babyName}` : '¡Te esperamos!',
  DATE: formatLongDate(startsAt),
  TIME: formatTime(startsAt),
  PLACE_NAME: place.name,
  PLACE_ADDRESS: place.address ?? '',
  DEADLINE: `antes del ${formatShortDate(rsvpDeadlineFromDay(event.rsvpDeadline))}`,
}
const svg = readFileSync(resolve(import.meta.dirname, 'template.svg'), 'utf8').replace(
  /\{\{(\w+)\}\}/g,
  (_, key: string) => escape(values[key] ?? ''),
)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 600, height: 900 } })
await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`, {
  waitUntil: 'networkidle',
})
await page.evaluate('document.fonts.ready')
await page.screenshot({ path: output, clip: { x: 0, y: 0, width: 600, height: 900 } })
await browser.close()
console.log(`✔ ${output} generado (${values.DATE}, ${values.PLACE_NAME})`)
