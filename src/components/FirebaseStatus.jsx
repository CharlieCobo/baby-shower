import { useEffect, useState } from 'react'
import { doc, getDocFromServer } from 'firebase/firestore'
import { app, db } from '../lib/firebase'

// Comprueba la conexión con Firestore leyendo un documento directamente del servidor.
// "permission-denied" también cuenta como conectado: el servidor respondió,
// pero las reglas de seguridad no permiten la lectura.
function FirebaseStatus() {
  const [status, setStatus] = useState({ state: 'checking' })

  useEffect(() => {
    getDocFromServer(doc(db, '_healthcheck', 'ping'))
      .then(() => setStatus({ state: 'ok', detail: 'Lectura permitida' }))
      .catch((err) =>
        setStatus(
          err.code === 'permission-denied'
            ? { state: 'ok', detail: 'Las reglas de seguridad bloquean la lectura' }
            : { state: 'error', detail: `${err.code}: ${err.message}` },
        ),
      )
  }, [])

  const styles = {
    checking: 'bg-gray-100 text-gray-700',
    ok: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
  }
  const labels = {
    checking: 'Comprobando conexión con Firebase…',
    ok: 'Conectado a Firebase',
    error: 'Sin conexión con Firebase',
  }

  return (
    <div className={`max-w-md rounded-lg px-4 py-3 text-sm ${styles[status.state]}`}>
      <p className="font-semibold">{labels[status.state]}</p>
      <p>Proyecto: {app.options.projectId || '(sin configurar)'}</p>
      {status.detail && <p className="mt-1 break-words">{status.detail}</p>}
    </div>
  )
}

export default FirebaseStatus
