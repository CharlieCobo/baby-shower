import { createBrowserRouter } from 'react-router'
import { GuestLayout } from './layouts/GuestLayout'
import { AdminGiftsPage } from './pages/AdminGiftsPage'
import { AdminPage } from './pages/AdminPage'
import { GiftsPage } from './pages/GiftsPage'
import { InvitationPage } from './pages/InvitationPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RsvpPage } from './pages/RsvpPage'

export const routes = [
  {
    element: <GuestLayout />,
    children: [
      { index: true, element: <InvitationPage /> },
      { path: 'regalos', element: <GiftsPage /> },
      { path: 'asistencia', element: <RsvpPage /> },
    ],
  },
  { path: 'admin', element: <AdminPage /> },
  { path: 'admin/regalos', element: <AdminGiftsPage /> },
  { path: '*', element: <NotFoundPage /> },
]

// BASE_URL viene de `base` en vite.config.ts ("/baby-shower/").
export const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })
