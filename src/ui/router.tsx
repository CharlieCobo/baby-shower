import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router'
import { es } from '../i18n/es'
import { GuestLayout } from './layouts/GuestLayout'
import { GiftsPage } from './pages/GiftsPage'
import { InvitationPage } from './pages/InvitationPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RsvpPage } from './pages/RsvpPage'

// El panel de admin va en su propio fichero JS: los invitados no lo descargan.
const AdminApp = lazy(() => import('./admin/AdminApp'))

export const routes = [
  {
    element: <GuestLayout />,
    children: [
      { index: true, element: <InvitationPage /> },
      { path: 'regalos', element: <GiftsPage /> },
      { path: 'asistencia', element: <RsvpPage /> },
    ],
  },
  {
    path: 'admin/*',
    element: (
      <Suspense
        fallback={
          <p className="pt-24 text-center font-body-md text-body-md">{es.common.loading}</p>
        }
      >
        <AdminApp />
      </Suspense>
    ),
  },
  { path: '*', element: <NotFoundPage /> },
]

// BASE_URL viene de `base` en vite.config.ts ("/baby-shower/").
export const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })
