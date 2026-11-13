import { initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'

// Único punto de entrada al SDK de Firebase. El resto de la app usa los adaptadores
// de esta carpeta a través de los puertos de application/.

export const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true'

const env = import.meta.env
const required = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([key]) => key)

if (missing.length > 0 && !useEmulators) {
  throw new Error(`Falta configuración de Firebase: ${missing.join(', ')}. Revisa .env.local.`)
}

export const firebaseApp: FirebaseApp = initializeApp({
  ...required,
  apiKey: required.apiKey || 'demo-api-key',
  projectId: required.projectId || 'baby-shower-ac32e',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
})

export const auth: Auth = getAuth(firebaseApp)
export const db: Firestore = getFirestore(firebaseApp)

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
