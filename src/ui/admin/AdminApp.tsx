import { useState } from 'react'
import { Link, NavLink, Outlet, Route, Routes } from 'react-router'
import { es } from '../../i18n/es'
import { Icon } from '../components/Icon'
import { Sprinkles } from '../components/Sprinkles'
import { ToastHost } from '../components/ToastHost'
import { useServices } from '../services'
import { AdminEventPage } from './AdminEventPage'
import { AdminGiftsPage } from './AdminGiftsPage'
import { AdminResponsesPage } from './AdminResponsesPage'
import { useAdminSession } from './hooks'

/** Panel de administración ("Zona de papás"): se carga aparte, solo al entrar en /admin. */
export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminGate />}>
        <Route index element={<AdminResponsesPage />} />
        <Route path="regalos" element={<AdminGiftsPage />} />
        <Route path="evento" element={<AdminEventPage />} />
      </Route>
    </Routes>
  )
}

const IN_APP_BROWSER = /FBAN|FBAV|Instagram|WhatsApp|Line\/|; wv\)/i

function AdminGate() {
  const session = useAdminSession()
  if (session.status === 'loading') {
    return (
      <p className="pt-24 text-center font-body-md text-body-md text-on-secondary-container">
        {es.common.loading}
      </p>
    )
  }
  if (session.status === 'signedOut') return <LoginScreen />
  if (!session.isAdmin) return <DeniedScreen email={session.email} />
  return <AdminLayout email={session.email} />
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center overflow-hidden px-gutter py-space-xl">
      <Sprinkles />
      <section className="relative z-10 flex w-full flex-col items-center gap-4 rounded-card bg-surface-container-lowest p-space-lg text-center shadow-card">
        {children}
      </section>
    </main>
  )
}

function LoginScreen() {
  const { adminAuth } = useServices()
  const [error, setError] = useState(false)
  const inApp = typeof navigator !== 'undefined' && IN_APP_BROWSER.test(navigator.userAgent)
  return (
    <Shell>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-container/40 text-primary">
        <Icon name="lock" className="text-[32px]" filled />
      </span>
      <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
        {es.admin.login.title}
      </h1>
      <p className="font-body-md text-body-md text-on-secondary-container">{es.admin.login.text}</p>
      {inApp && (
        <p
          role="alert"
          className="rounded-2xl bg-secondary-fixed p-3 font-label-md text-label-md text-on-secondary-fixed"
        >
          {es.admin.login.inAppBrowser}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          setError(false)
          adminAuth.signInWithGoogle().catch(() => setError(true))
        }}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-inverse-surface font-label-lg text-label-lg text-inverse-on-surface shadow-md active:scale-[0.98]"
      >
        <Icon name="account_circle" className="text-[20px]" />
        {es.admin.login.button}
      </button>
      {error && (
        <p role="alert" className="font-label-md text-label-md text-error">
          {es.admin.login.error}
        </p>
      )}
      <Link to="/" className="font-label-md text-label-md text-primary underline">
        {es.admin.denied.back}
      </Link>
    </Shell>
  )
}

function DeniedScreen({ email }: { email: string }) {
  const { adminAuth } = useServices()
  return (
    <Shell>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-error-container text-on-error-container">
        <Icon name="block" className="text-[32px]" />
      </span>
      <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
        {es.admin.denied.title}
      </h1>
      <p className="font-body-md text-body-md text-on-secondary-container">
        {es.admin.denied.text(email)}
      </p>
      <button
        type="button"
        onClick={() => void adminAuth.signOut()}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary-container font-label-lg text-label-lg text-on-primary-container shadow-pill"
      >
        <Icon name="switch_account" className="text-[20px]" />
        {es.admin.denied.other}
      </button>
      <Link to="/" className="font-label-md text-label-md text-primary underline">
        {es.admin.denied.back}
      </Link>
    </Shell>
  )
}

const TABS = [
  { to: '/admin', label: es.admin.tabs.responses, icon: 'how_to_reg', end: true },
  { to: '/admin/regalos', label: es.admin.tabs.gifts, icon: 'redeem', end: false },
  { to: '/admin/evento', label: es.admin.tabs.event, icon: 'event', end: false },
] as const

function AdminLayout({ email }: { email: string }) {
  const { adminAuth } = useServices()
  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30 bg-surface/85 pt-[env(safe-area-inset-top)] shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[720px] items-center justify-between gap-2 px-gutter">
          <div className="min-w-0">
            <p className="font-label-sm text-label-sm tracking-wider text-secondary uppercase">
              {es.admin.badge}
            </p>
            <h1 className="truncate font-headline-sm text-headline-sm text-on-surface">
              {es.admin.title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              to="/"
              aria-label={es.admin.viewSite}
              title={es.admin.viewSite}
              className="flex h-11 w-11 items-center justify-center rounded-full text-primary hover:bg-surface-container"
            >
              <Icon name="visibility" className="text-[22px]" />
            </Link>
            <button
              type="button"
              aria-label={`${es.admin.signOut} (${email})`}
              title={`${es.admin.signOut} (${email})`}
              onClick={() => void adminAuth.signOut()}
              className="flex h-11 w-11 items-center justify-center rounded-full text-primary hover:bg-surface-container"
            >
              <Icon name="logout" className="text-[22px]" />
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[720px] px-gutter pt-space-sm pb-space-xl">
        <nav
          aria-label={es.admin.tabsLabel}
          className="mb-space-md flex gap-1 rounded-full bg-surface-container p-1 shadow-inner"
        >
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-1.5 py-2 font-label-md text-label-md transition-all ${
                  isActive
                    ? 'bg-surface-container-lowest font-bold text-on-surface shadow-sm'
                    : 'text-secondary hover:text-on-surface'
                }`
              }
            >
              <span className="flex max-[400px]:hidden">
                <Icon name={tab.icon} className="text-[18px]" />
              </span>
              <span className="truncate">{tab.label}</span>
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </div>
      <ToastHost />
    </div>
  )
}
