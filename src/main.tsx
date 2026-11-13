import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { systemClock } from './application/ports'
import { createFirebaseServices } from './infrastructure/firebase'
import { router } from './ui/router'
import { AppProvider } from './ui/services'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('No se encontró el elemento #root')

createRoot(root).render(
  <StrictMode>
    <AppProvider services={{ ...createFirebaseServices(), clock: systemClock }}>
      <RouterProvider router={router} />
    </AppProvider>
  </StrictMode>,
)
