import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { es } from '../../src/i18n/es'
import { routes } from '../../src/ui/router'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

describe('router', () => {
  it.each([
    ['/', es.pages.invitation.title],
    ['/regalos', es.pages.gifts.title],
    ['/asistencia', es.pages.rsvp.title],
    ['/admin', es.pages.admin.title],
    ['/admin/regalos', es.pages.adminGifts.title],
    ['/no-existe', es.pages.notFound.title],
  ])('%s muestra su página', (path, title) => {
    renderAt(path)
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
  })

  it('las páginas de invitados muestran la barra de navegación con la sección actual resaltada', () => {
    renderAt('/regalos')
    const nav = screen.getByRole('navigation', { name: es.nav.label })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('link', { name: new RegExp(es.nav.gifts) })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('el admin no muestra la barra de invitados', () => {
    renderAt('/admin')
    expect(screen.queryByRole('navigation', { name: es.nav.label })).not.toBeInTheDocument()
  })
})
