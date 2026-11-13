import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

export const PROJECT_ID = 'baby-shower-ac32e'

// No estamos en Google Cloud: evita que el SDK busque el servidor de metadatos.
process.env.METADATA_SERVER_DETECTION ??= 'none'
export const EMULATOR_HOST = '127.0.0.1:8080'

/** Firestore del emulador local. Nunca toca producción. */
export function emulatorFirestore(): Firestore {
  process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOST
  return getFirestore(initializeApp({ projectId: PROJECT_ID }))
}

/**
 * Firestore de producción con la clave de una cuenta de servicio
 * (GOOGLE_APPLICATION_CREDENTIALS o ./service-account.json, fuera del repo).
 */
export function productionFirestore(): Firestore {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST está definido: quítalo o usa --emulator.')
  }
  const path = resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS ?? 'service-account.json')
  if (!existsSync(path)) {
    throw new Error(
      `No encuentro la clave de la cuenta de servicio en ${path}.\n` +
        'Consola de Firebase → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.',
    )
  }
  const key = JSON.parse(readFileSync(path, 'utf8')) as ServiceAccount & { project_id?: string }
  if (key.project_id && key.project_id !== PROJECT_ID) {
    throw new Error(`La clave es del proyecto "${key.project_id}", no de "${PROJECT_ID}".`)
  }
  return getFirestore(initializeApp({ credential: cert(key), projectId: PROJECT_ID }))
}

/** Borra todos los documentos de las colecciones indicadas (solo para el emulador). */
export async function clearCollections(db: Firestore, names: string[]): Promise<void> {
  for (const name of names) {
    await db.recursiveDelete(db.collection(name))
  }
}
