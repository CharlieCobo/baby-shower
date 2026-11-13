// Carga los datos reales (admins, evento y regalos) desde un JSON.
//
//   pnpm seed:prod                          # usa scripts/seed-data.local.json
//   pnpm seed:prod ruta/a/datos.json
//   pnpm seed:prod --emulator               # prueba contra el emulador local
//
// No crea RSVPs ni reservas. Los regalos se identifican por su `id`: si ya existen,
// se actualizan sus datos sin tocar `reservedCount`; los que no estén en el JSON no se borran.
import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore'
import { parseEventDateTime, rsvpDeadlineFromDay } from '../src/domain/dates'
import { emulatorFirestore, PROJECT_ID, productionFirestore } from './seed/firestore'
import { type SeedData, validateSeedData } from './seed/schema'

const argv = process.argv.slice(2)
const useEmulator = argv.includes('--emulator')
const skipConfirm = argv.includes('--yes')
const file = argv.find((a) => !a.startsWith('--')) ?? 'scripts/seed-data.local.json'

function loadData(): SeedData {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    throw new Error(
      `No puedo leer ${file}: ${error instanceof Error ? error.message : String(error)}\n` +
        'Copia scripts/seed-data.example.json a scripts/seed-data.local.json y rellénalo.',
      { cause: error },
    )
  }
  const errors = validateSeedData(raw)
  if (errors.length > 0)
    throw new Error(`Datos inválidos en ${file}:\n  - ${errors.join('\n  - ')}`)
  return raw as SeedData
}

async function confirm(data: SeedData): Promise<boolean> {
  console.log(`Destino: ${useEmulator ? 'EMULADOR local' : `PRODUCCIÓN (${PROJECT_ID})`}`)
  console.log(`  admins: ${data.admins.join(', ')}`)
  console.log(
    `  evento: ${data.event.title} · ${data.event.startsAt} · RSVP hasta ${data.event.rsvpDeadline}`,
  )
  console.log(`  regalos: ${data.gifts.length}`)
  if (useEmulator || skipConfirm) return true
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`Escribe "${PROJECT_ID}" para confirmar: `)
  rl.close()
  return answer.trim() === PROJECT_ID
}

async function write(db: Firestore, data: SeedData) {
  await db.doc('config/admins').set({ emails: data.admins.map((e) => e.trim().toLowerCase()) })

  const { event } = data
  await db.doc('config/event').set({
    title: event.title,
    startsAt: Timestamp.fromDate(parseEventDateTime(event.startsAt)),
    endsAt: Timestamp.fromDate(parseEventDateTime(event.endsAt)),
    place: event.place,
    mapsUrl: event.mapsUrl,
    rsvpDeadline: Timestamp.fromDate(rsvpDeadlineFromDay(event.rsvpDeadline)),
    ...(event.registryClosesAt
      ? { registryClosesAt: Timestamp.fromDate(parseEventDateTime(event.registryClosesAt)) }
      : {}),
    ...(event.babyName ? { babyName: event.babyName } : {}),
  })

  let created = 0
  let updated = 0
  for (const [order, gift] of data.gifts.entries()) {
    const { id, ...fields } = gift
    const ref = db.doc(`gifts/${id}`)
    await db.runTransaction(async (tx) => {
      const current = await tx.get(ref)
      const optional = ['description', 'url', 'imageUrl', 'priceEur'] as const
      const base = {
        title: fields.title,
        category: fields.category,
        quantity: fields.quantity,
        order,
        updatedAt: FieldValue.serverTimestamp(),
      }
      if (!current.exists) {
        const extras = Object.fromEntries(
          optional.flatMap((k) => (fields[k] === undefined ? [] : [[k, fields[k]]])),
        )
        tx.create(ref, { ...base, ...extras, reservedCount: 0, active: fields.active ?? true })
        created++
        return
      }
      const reserved = Number(current.get('reservedCount') ?? 0)
      if (fields.quantity < reserved) {
        throw new Error(
          `"${id}": quantity ${fields.quantity} es menor que las ${reserved} unidades ya reservadas.`,
        )
      }
      // Los opcionales que ya no están en el JSON se borran; reservedCount no se toca.
      const extras = Object.fromEntries(
        optional.map((k) => [k, fields[k] === undefined ? FieldValue.delete() : fields[k]]),
      )
      tx.update(ref, {
        ...base,
        ...extras,
        ...(fields.active === undefined ? {} : { active: fields.active }),
      })
      updated++
    })
  }

  const known = new Set(data.gifts.map((g) => g.id))
  const orphans = (await db.collection('gifts').get()).docs
    .map((d) => d.id)
    .filter((id) => !known.has(id))
  return { created, updated, orphans }
}

async function main() {
  const data = loadData()
  if (!(await confirm(data))) {
    console.log('Cancelado: no se ha escrito nada.')
    return
  }
  const db = useEmulator ? emulatorFirestore() : productionFirestore()
  const { created, updated, orphans } = await write(db, data)
  console.log(`✔ Hecho: ${created} regalos creados, ${updated} actualizados.`)
  if (orphans.length > 0) {
    console.log(
      `  Aviso: en Firestore hay regalos que no están en el JSON (no se han borrado): ${orphans.join(', ')}`,
    )
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
