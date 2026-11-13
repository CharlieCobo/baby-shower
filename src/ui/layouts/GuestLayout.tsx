import { NavLink, Outlet } from 'react-router'
import { es } from '../../i18n/es'
import { Icon } from '../components/Icon'
import { ToastHost } from '../components/ToastHost'

const tabs = [
  { to: '/', label: es.nav.invitation, icon: 'auto_stories', end: true },
  { to: '/regalos', label: es.nav.gifts, icon: 'featured_seasonal_and_gifts', end: false },
  { to: '/asistencia', label: es.nav.rsvp, icon: 'mark_email_read', end: false },
] as const

export function GuestLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-[480px] flex-1 px-gutter pt-space-md pb-32">
        <Outlet />
      </main>
      <ToastHost />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]">
        <nav
          aria-label={es.nav.label}
          className="pointer-events-auto mx-auto mb-space-sm w-[calc(100%-2.5rem)] max-w-[440px] rounded-full bg-surface-container-lowest/90 p-1.5 shadow-[0_10px_25px_-5px_rgba(74,31,61,0.12),0_8px_10px_-6px_rgba(74,31,61,0.06)] backdrop-blur-xl"
        >
          <ul className="flex items-center justify-between gap-1">
            {tabs.map((tab) => (
              <li key={tab.to} className="flex-1">
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `flex h-11 items-center justify-center gap-1.5 rounded-full font-label-md text-label-md transition-all ${
                      isActive
                        ? 'bg-primary-container text-on-primary-container shadow-[0_4px_12px_rgba(194,120,157,0.35)]'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`
                  }
                >
                  <Icon name={tab.icon} className="text-[20px]" />
                  <span className="truncate">{tab.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
