import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '../../src/i18n/es'
import { renderApp } from './render'

describe('router', () => {
  it.each([
    ['/', es.invitation.title],
    ['/regalos', es.gifts.title],
    ['/asistencia', es.rsvp.title],
    ['/admin', es.pages.admin.title],
    ['/admin/regalos', es.pages.adminGifts.title],
    ['/no-existe', es.pages.notFound.title],
  ])('%s muestra su página', async (path, title) => {
    renderApp(path)
    expect(
      await screen.findByRole('heading', { level: 1, name: new RegExp(title) }),
    ).toBeInTheDocument()
  })

  it('Navegación entre secciones: barra inferior con la sección actual resaltada', async () => {
    renderApp('/regalos')
    const nav = await screen.findByRole('navigation', { name: es.nav.label })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('link', { name: new RegExp(es.nav.gifts) })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: new RegExp(es.nav.invitation) })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('el admin no muestra la barra de invitados', async () => {
    renderApp('/admin')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('navigation', { name: es.nav.label })).not.toBeInTheDocument()
  })
})
