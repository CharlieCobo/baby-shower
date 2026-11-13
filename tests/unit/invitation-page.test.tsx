import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '../../src/i18n/es'
import { makeEvent } from './fixtures'
import { renderApp } from './render'

const event = makeEvent({
  place: 'Jardines La Rosaleda · Calle Mayor, 42, Valencia',
  babyName: 'Alex',
})

describe('InvitationPage', () => {
  it('Datos del evento: muestra título, fecha y hora de Madrid, lugar y fecha límite', async () => {
    renderApp('/', { event })
    expect(await screen.findByText('Lunes, 24 de mayo')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Baby Shower')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('de Alex')
    expect(screen.getByText('17:00 h')).toBeInTheDocument()
    expect(screen.getByText('Jardines La Rosaleda')).toBeInTheDocument()
    expect(screen.getByText('Calle Mayor, 42, Valencia')).toBeInTheDocument()
    expect(screen.getByText('Confirma antes del 10 de mayo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: new RegExp(es.invitation.viewMap) })).toHaveAttribute(
      'href',
      event.mapsUrl,
    )
  })

  it('tiene los dos CTA: confirmar asistencia y lista de regalos', async () => {
    renderApp('/', { event })
    expect(
      await screen.findByRole('link', { name: new RegExp(es.invitation.ctaRsvp) }),
    ).toHaveAttribute('href', '/asistencia')
    expect(screen.getByRole('link', { name: new RegExp(es.invitation.ctaGifts) })).toHaveAttribute(
      'href',
      '/regalos',
    )
  })

  it('Cuenta atrás: días hasta el evento', async () => {
    renderApp('/', { event, now: new Date('2027-05-14T10:00:00Z') })
    expect(await screen.findByText('Faltan 10 días')).toBeInTheDocument()
  })

  it('Día del evento: "¡Es hoy!"', async () => {
    renderApp('/', { event, now: new Date('2027-05-24T08:00:00Z') })
    expect(await screen.findByText(es.invitation.countdownToday)).toBeInTheDocument()
  })

  it('Evento pasado: no hay cuenta atrás', async () => {
    renderApp('/', { event, now: new Date('2027-06-01T08:00:00Z') })
    await screen.findByText('Lunes, 24 de mayo')
    expect(screen.queryByText(/Faltan|¡Es hoy!/)).not.toBeInTheDocument()
  })

  it('Evento sin configurar: "Pronto más detalles"', async () => {
    renderApp('/', { event: null })
    expect(await screen.findByText(es.invitation.comingSoon)).toBeInTheDocument()
  })

  it('Añadir al calendario: ofrece Google Calendar y Apple / Outlook (.ics)', async () => {
    const { user } = renderApp('/', { event })
    await user.click(
      await screen.findByRole('button', { name: new RegExp(es.invitation.addToCalendar) }),
    )
    const dialog = screen.getByRole('dialog', { name: es.calendar.title })
    expect(
      within(dialog).getByRole('link', { name: new RegExp(es.calendar.google) }),
    ).toHaveAttribute('href', expect.stringContaining('calendar.google.com'))
    expect(
      within(dialog).getByRole('button', { name: new RegExp(es.calendar.ics) }),
    ).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
