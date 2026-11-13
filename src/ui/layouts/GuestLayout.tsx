import { NavLink, Outlet } from 'react-router'
import { es } from '../../i18n/es'

const tabs = [
  { to: '/', label: es.nav.invitation, icon: 'mail', end: true },
  { to: '/regalos', label: es.nav.gifts, icon: 'redeem', end: false },
  { to: '/asistencia', label: es.nav.rsvp, icon: 'favorite', end: false },
] as const

export function GuestLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-[760px] flex-1 px-4 pb-28">
        <Outlet />
      </main>
      <nav
        aria-label={es.nav.label}
        className="fixed inset-x-0 bottom-0 border-t border-outline-variant bg-surface-container-lowest pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex max-w-[760px] justify-around">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex min-w-20 flex-col items-center gap-0.5 py-2 text-label-sm font-label-sm ${
                    isActive ? 'text-primary' : 'text-on-secondary-container'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={`material-symbols-outlined rounded-full px-4 py-0.5 text-[22px] ${
                        isActive ? 'filled bg-primary-fixed' : ''
                      }`}
                    >
                      {tab.icon}
                    </span>
                    {tab.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
