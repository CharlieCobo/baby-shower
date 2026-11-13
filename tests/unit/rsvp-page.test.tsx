import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { es } from '../../src/i18n/es'
import { makeEvent } from './fixtures'
import { renderApp } from './render'

const event = makeEvent({ place: 'Jardines La Rosaleda · Calle Mayor, 42' })

beforeEach(() => {
  localStorage.clear()
})

async function fillValid(user: ReturnType<typeof renderApp>['user']) {
  await user.type(await screen.findByLabelText(es.rsvp.name), 'Marta Gómez')
  await user.click(screen.getByRole('radio', { name: es.rsvp.yes }))
  await user.click(screen.getByRole('button', { name: es.rsvp.moreCompanions }))
  await user.type(screen.getByLabelText(/Alergias/), 'Celíaca')
}

describe('RsvpPage', () => {
  it('RSVP válido: guarda y muestra la pantalla de gracias con enlace a regalos', async () => {
    const { user, backend } = renderApp('/asistencia', { event, uid: 'yo' })
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: es.rsvp.submit }))

    expect(await screen.findByRole('heading', { name: es.rsvp.thanksTitle })).toBeInTheDocument()
    expect(screen.getByText(es.rsvp.thanksAttending)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: new RegExp(es.rsvp.toGifts) })).toHaveAttribute(
      'href',
      '/regalos',
    )
    expect(
      screen.getByRole('button', { name: new RegExp(es.rsvp.saveToCalendar) }),
    ).toBeInTheDocument()
    expect(backend.control.rsvp('yo')).toMatchObject({
      name: 'Marta Gómez',
      attending: true,
      companions: 1,
      dietary: 'Celíaca',
    })
  })

  it('Validación en cliente: errores junto al campo y no se envía', async () => {
    const { user, backend } = renderApp('/asistencia', { event, uid: 'yo' })
    await user.click(await screen.findByRole('button', { name: es.rsvp.submit }))
    expect(screen.getByLabelText(es.rsvp.name)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(es.rsvp.fieldErrors.name.required)).toBeInTheDocument()
    expect(screen.getByText(es.rsvp.fieldErrors.attending.required)).toBeInTheDocument()
    expect(screen.getByLabelText(es.rsvp.name)).toHaveFocus()
    expect(backend.control.rsvp('yo')).toBeUndefined()
  })

  it('no permite más de 10 acompañantes y los oculta si no asiste', async () => {
    const { user } = renderApp('/asistencia', { event })
    await user.click(await screen.findByRole('radio', { name: es.rsvp.yes }))
    const more = screen.getByRole('button', { name: es.rsvp.moreCompanions })
    for (let i = 0; i < 12; i++) await user.click(more)
    expect(more).toBeDisabled()
    expect(screen.getByRole('status', { name: es.rsvp.companions })).toHaveTextContent('10')
    await user.click(screen.getByRole('radio', { name: es.rsvp.no }))
    expect(screen.queryByRole('button', { name: es.rsvp.moreCompanions })).not.toBeInTheDocument()
  })

  it('Formulario precargado en el mismo navegador: "Cambiar mi respuesta" y al volver a /asistencia', async () => {
    const { user } = renderApp('/asistencia', { event })
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: es.rsvp.submit }))
    await user.click(await screen.findByRole('button', { name: new RegExp(es.rsvp.change) }))
    expect(screen.getByLabelText(es.rsvp.name)).toHaveValue('Marta Gómez')
    expect(screen.getByRole('radio', { name: es.rsvp.yes })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText(/Alergias/)).toHaveValue('Celíaca')
  })

  it('al volver a /asistencia en el mismo navegador el formulario sale precargado', async () => {
    localStorage.setItem(
      'baby-shower:rsvp',
      JSON.stringify({ name: 'Ana', attending: false, companions: 0, message: '¡Un abrazo!' }),
    )
    renderApp('/asistencia', { event })
    expect(await screen.findByLabelText(es.rsvp.name)).toHaveValue('Ana')
    expect(screen.getByRole('radio', { name: es.rsvp.no })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText(/mensaje/)).toHaveValue('¡Un abrazo!')
  })

  it('Formulario vacío en otro dispositivo: sin copia local, sale vacío', async () => {
    renderApp('/asistencia', { event })
    expect(await screen.findByLabelText(es.rsvp.name)).toHaveValue('')
    expect(screen.getByRole('radio', { name: es.rsvp.yes })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('RSVP fuera de plazo: formulario deshabilitado con mensaje', async () => {
    renderApp('/asistencia', { event, now: new Date('2027-05-11T10:00:00Z') })
    expect(await screen.findByText(es.rsvp.closedTitle)).toBeInTheDocument()
    expect(screen.getByLabelText(es.rsvp.name)).toBeDisabled()
    expect(screen.getByRole('button', { name: es.rsvp.submit })).toBeDisabled()
  })
})
