import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import {
  deleteDoc,
  doc,
  type DocumentData,
  type Firestore,
  increment,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { afterAll, afterEach, beforeAll } from 'vitest'

export const ADMIN_EMAIL = 'mama@example.com'
export const STRANGER_EMAIL = 'curioso@example.com'

let env: RulesTestEnvironment

/** Registra el ciclo de vida del entorno de pruebas en el fichero de tests que lo llama. */
export function setupRulesEnv(): void {
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: process.env.GCLOUD_PROJECT ?? 'baby-shower-ac32e',
      firestore: {
        rules: readFileSync(resolve(import.meta.dirname, '../../firestore.rules'), 'utf8'),
      },
    })
  })
  afterEach(async () => {
    await env.clearFirestore()
  })
  afterAll(async () => {
    await env.cleanup()
  })
}

// rules-unit-testing devuelve una instancia compatible con la API modular.
const asModular = (db: unknown) => db as Firestore

/** Invitado con sesión anónima. */
export const guest = (uid = 'guest-1') =>
  asModular(
    env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore(),
  )

/** Anfitrión: email verificado presente en config/admins. */
export const admin = () =>
  asModular(
    env
      .authenticatedContext('admin-uid', {
        email: ADMIN_EMAIL,
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore(),
  )

/** Usuario con Google pero fuera de la allowlist. */
export const stranger = (emailVerified = true, email = STRANGER_EMAIL) =>
  asModular(
    env
      .authenticatedContext('stranger-uid', {
        email,
        email_verified: emailVerified,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore(),
  )

/** Visitante sin ninguna sesión. */
export const unauthenticated = () => asModular(env.unauthenticatedContext().firestore())

/** Escribe datos saltándose las reglas (preparación del escenario). */
export async function seed(fn: (db: Firestore) => Promise<void>): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await fn(asModular(ctx.firestore()))
  })
}

export const hoursFromNow = (h: number) => Timestamp.fromMillis(Date.now() + h * 3_600_000)

export function giftData(overrides: DocumentData = {}): DocumentData {
  return {
    title: 'Pañales talla 1',
    category: 'higiene',
    quantity: 2,
    reservedCount: 0,
    order: 1,
    active: true,
    updatedAt: serverTimestamp(),
    ...overrides,
  }
}

export function eventData(overrides: DocumentData = {}): DocumentData {
  return {
    title: 'Baby Shower de Lucía',
    startsAt: hoursFromNow(24 * 30),
    endsAt: hoursFromNow(24 * 30 + 4),
    place: 'Jardines La Rosaleda, Valencia',
    mapsUrl: 'https://maps.google.com/?q=Valencia',
    rsvpDeadline: hoursFromNow(24 * 20),
    babyName: 'Lucía',
    ...overrides,
  }
}

export function rsvpData(overrides: DocumentData = {}): DocumentData {
  return {
    name: 'Marta Gómez',
    attending: true,
    companions: 1,
    dietary: 'Celíaca',
    message: '¡Qué ganas de conocerla!',
    updatedAt: serverTimestamp(),
    ...overrides,
  }
}

/** Estado base: allowlist de admins, evento y un regalo `g1`. */
export async function seedBase(
  opts: { gift?: DocumentData; event?: DocumentData | null } = {},
): Promise<void> {
  await seed(async (db) => {
    await setDoc(doc(db, 'config/admins'), { emails: [ADMIN_EMAIL] })
    if (opts.event !== null) await setDoc(doc(db, 'config/event'), eventData(opts.event))
    await setDoc(doc(db, 'gifts/g1'), giftData(opts.gift))
  })
}

/** Reserva previa de `uid` sobre `giftId` (reservedCount ya debe reflejarla en el seed). */
export async function seedReservation(giftId: string, uid: string): Promise<void> {
  await seed(async (db) => {
    await setDoc(doc(db, `reservations/${giftId}_${uid}`), {
      giftId,
      uid,
      createdAt: serverTimestamp(),
    })
  })
}

/** Reservar: crea la reserva e incrementa el contador en la misma escritura atómica. */
export function reserve(db: Firestore, giftId: string, uid: string) {
  const batch = writeBatch(db)
  batch.set(doc(db, `reservations/${giftId}_${uid}`), { giftId, uid, createdAt: serverTimestamp() })
  batch.update(doc(db, `gifts/${giftId}`), {
    reservedCount: increment(1),
    updatedAt: serverTimestamp(),
  })
  return batch.commit()
}

/** Liberar: borra la reserva y decrementa el contador en la misma escritura atómica. */
export function release(db: Firestore, giftId: string, uid: string) {
  const batch = writeBatch(db)
  batch.delete(doc(db, `reservations/${giftId}_${uid}`))
  batch.update(doc(db, `gifts/${giftId}`), {
    reservedCount: increment(-1),
    updatedAt: serverTimestamp(),
  })
  return batch.commit()
}

export { deleteDoc, doc }
