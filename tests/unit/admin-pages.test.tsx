import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RsvpRecord } from '../../src/domain/admin'
import { es } from '../../src/i18n/es'
import { makeEvent, makeGift } from './fixtures'
import { renderApp } from './render'

const ADMIN = { email: 'mama@example.com', isAdmin: true }

const rsvps: RsvpRecord[] = [
  {
    uid: 'r1',
    name: 'Marta Gómez',
    attending: true,
    companions: 1,
    dietary: 'Celíaca',
    updatedAt: new Date('2026-11-12T17:40:00Z'),
  },
  {
    uid: 'r2',
    name: 'Sofía Valero',
    attending: false,
    companions: 0,
    message: 'De viaje',
    updatedAt: new Date('2026-11-10T10:00:00Z'),
  },
]

const gifts = [
  makeGift({ id: 'panales', title: 'Pañales talla 1', quantity: 4, reservedCount: 2, order: 0 }),
  makeGift({ id: 'mantita', title: 'Mantita', category: 'paseo', quantity: 1, order: 1 }),
]

describe('Acceso de administración', () => {
  it('sin sesión muestra el inicio de sesión con Google', async () => {
    const { user, backend } = renderApp('/admin')
    await user.click(await screen.findByRole('button', { name: new RegExp(es.admin.login.button) }))
    expect(
      await screen.findByRole('heading', { name: es.admin.responses.title }),
    ).toBeInTheDocument()
    expect(backend.control).toBeDefined()
  })

  it('Usuario no autorizado: ve "No tienes acceso"', async () => {
    renderApp('/admin', { admin: { email: 'curioso@example.com', isAdmin: false } })
    expect(await screen.findByRole('heading', { name: es.admin.denied.title })).toBeInTheDocument()
    expect(screen.getByText(/curioso@example.com/)).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: es.admin.responses.title }),
    ).not.toBeInTheDocument()
  })

  it('Admin autorizado: accede al panel con pestañas', async () => {
    renderApp('/admin', { admin: ADMIN })
    const tabs = await screen.findByRole('navigation', { name: es.admin.tabsLabel })
    expect(within(tabs).getByRole('link', { name: /Respuestas/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(tabs).getByRole('link', { name: /Regalos/ })).toBeInTheDocument()
    expect(within(tabs).getByRole('link', { name: /Evento/ })).toBeInTheDocument()
  })

  it('cerrar sesión vuelve a la pantalla de inicio de sesión', async () => {
    const { user } = renderApp('/admin', { admin: ADMIN })
    await user.click(await screen.findByRole('button', { name: new RegExp(es.admin.signOut) }))
    expect(
      await screen.findByRole('button', { name: new RegExp(es.admin.login.button) }),
    ).toBeInTheDocument()
  })
})

describe('Pestaña Respuestas', () => {
  it('resumen, lista con alergias y mensajes', async () => {
    renderApp('/admin', { admin: ADMIN, rsvps })
    const summary = await screen.findByRole('region', { name: es.admin.responses.summaryLabel })
    expect(within(summary).getByText('+1 acomp.')).toBeInTheDocument()
    const marta = screen.getByRole('article', { name: 'Marta Gómez' })
    expect(within(marta).getByText('Celíaca')).toBeInTheDocument()
    expect(within(marta).getByText('1 acompañante')).toBeInTheDocument()
    expect(
      within(screen.getByRole('article', { name: 'Sofía Valero' })).getByText(/De viaje/),
    ).toBeInTheDocument()
  })

  it('búsqueda por nombre y filtro "No vienen"', async () => {
    const { user } = renderApp('/admin', { admin: ADMIN, rsvps })
    await user.type(await screen.findByLabelText(es.admin.responses.searchLabel), 'marta')
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual([
      'Marta Gómez',
    ])
    await user.clear(screen.getByLabelText(es.admin.responses.searchLabel))
    await user.click(screen.getByRole('button', { name: /No vienen/ }))
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual([
      'Sofía Valero',
    ])
  })

  it('Exportar asistentes: descarga un CSV', async () => {
    const createObjectURL = vi.fn(() => 'blob:csv')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const { user } = renderApp('/admin', { admin: ADMIN, rsvps })
    await user.click(await screen.findByRole('button', { name: es.admin.responses.exportLabel }))
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(click).toHaveBeenCalled()
    click.mockRestore()
  })
})

describe('Pestaña Regalos', () => {
  it('resumen y lista con todos los regalos', async () => {
    renderApp('/admin/regalos', { admin: ADMIN, gifts })
    expect(await screen.findByRole('listitem', { name: 'Pañales talla 1' })).toBeInTheDocument()
    expect(screen.getByText('2/4 res.')).toBeInTheDocument()
    expect(screen.getByText('40% cubierto')).toBeInTheDocument()
  })

  it('Crear un regalo desde la hoja "Nuevo regalo"', async () => {
    const { user, backend } = renderApp('/admin/regalos', { admin: ADMIN, gifts })
    await user.click(await screen.findByRole('button', { name: new RegExp(es.admin.gifts.add) }))
    const dialog = screen.getByRole('dialog', { name: es.admin.giftForm.newTitle })
    await user.type(within(dialog).getByLabelText(es.admin.giftForm.title), 'Sonajero')
    await user.selectOptions(within(dialog).getByLabelText(es.admin.giftForm.category), 'juguetes')
    await user.type(within(dialog).getByLabelText(/Precio/), '12')
    await user.click(
      within(dialog).getByRole('button', { name: new RegExp(es.admin.giftForm.create) }),
    )
    expect(await screen.findByRole('listitem', { name: 'Sonajero' })).toBeInTheDocument()
    expect(backend.control.gift('nuevo-1')).toMatchObject({
      title: 'Sonajero',
      category: 'juguetes',
      priceEur: 12,
      reservedCount: 0,
      order: 2,
    })
  })

  it('Datos de regalo inválidos: la UI muestra el error', async () => {
    const { user } = renderApp('/admin/regalos', { admin: ADMIN, gifts })
    await user.click(await screen.findByRole('button', { name: new RegExp(es.admin.gifts.add) }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(es.admin.giftForm.title), 'X')
    await user.type(within(dialog).getByLabelText(/Enlace/), 'http://tienda.com')
    await user.type(within(dialog).getByLabelText(/Precio/), '-3')
    await user.click(
      within(dialog).getByRole('button', { name: new RegExp(es.admin.giftForm.create) }),
    )
    expect(within(dialog).getAllByText('Debe empezar por https://')).toHaveLength(1)
    expect(within(dialog).getByText(es.admin.giftForm.errors.priceEur.invalid)).toBeInTheDocument()
  })

  it('Reducir cantidad por debajo de lo reservado: la UI lo impide e indica cuántas hay', async () => {
    const { user } = renderApp('/admin/regalos', { admin: ADMIN, gifts })
    await user.click(
      await screen.findByRole('button', { name: es.admin.gifts.edit('Pañales talla 1') }),
    )
    const dialog = screen.getByRole('dialog', { name: es.admin.giftForm.editTitle })
    expect(within(dialog).getByText(es.admin.giftForm.reservedHint(2))).toBeInTheDocument()
    const less = within(dialog).getByRole('button', { name: es.admin.giftForm.lessQuantity })
    await user.click(less)
    await user.click(less)
    expect(less).toBeDisabled()
    expect(within(dialog).getByText('2', { selector: 'output' })).toBeInTheDocument()
  })

  it('switch Visible oculta el regalo a los invitados', async () => {
    const { user, backend } = renderApp('/admin/regalos', { admin: ADMIN, gifts })
    await user.click(await screen.findByRole('switch', { name: es.admin.gifts.visible('Mantita') }))
    expect(backend.control.gift('mantita')?.active).toBe(false)
  })

  it('Ver reservas de un regalo y Liberar una reserva huérfana', async () => {
    const { user, backend } = renderApp('/admin/regalos', {
      admin: ADMIN,
      gifts: [makeGift({ id: 'mantita', title: 'Mantita', quantity: 1 })],
    })
    await backend.control.reserveAs('invitada', 'mantita')
    await user.click(
      await screen.findByRole('button', { name: es.admin.gifts.showReservations('Mantita') }),
    )
    const row = screen.getByText(es.admin.gifts.reservationRow).closest('li') as HTMLElement
    expect(row).toHaveTextContent(/Reserva · \d+ de \w+, \d\d:\d\d h/)
    expect(row).not.toHaveTextContent('invitada')
    await user.click(within(row).getByRole('button', { name: es.admin.gifts.release }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: es.admin.gifts.releaseConfirm,
      }),
    )
    expect(await screen.findByText(es.admin.gifts.noReservations)).toBeInTheDocument()
    expect(backend.control.gift('mantita')?.reservedCount).toBe(0)
  })

  it('Borrar un regalo con reservas: pide confirmación y borra también las reservas', async () => {
    const { user, backend } = renderApp('/admin/regalos', {
      admin: ADMIN,
      gifts: [makeGift({ id: 'mantita', title: 'Mantita', quantity: 2 })],
    })
    await backend.control.reserveAs('invitada', 'mantita')
    await user.click(await screen.findByRole('button', { name: es.admin.gifts.edit('Mantita') }))
    await user.click(screen.getByRole('button', { name: new RegExp(es.admin.giftForm.delete) }))
    expect(screen.getByText(es.admin.giftForm.deleteText(1))).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: new RegExp(es.admin.giftForm.deleteConfirm) }),
    )
    expect(await screen.findByText(es.admin.gifts.empty)).toBeInTheDocument()
    expect(backend.control.reservationsOf('invitada')).toEqual(new Set())
  })
})

describe('Pestaña Evento', () => {
  it('Cambiar la fecha límite de RSVP: se guarda y la landing la refleja', async () => {
    const { user, backend, router } = renderApp('/admin/evento', {
      admin: ADMIN,
      event: makeEvent({ babyName: 'Alex' }),
    })
    const deadline = await screen.findByLabelText(es.admin.event.rsvpDeadline)
    expect(deadline).toHaveValue('2027-05-10')
    await user.clear(deadline)
    await user.type(deadline, '2027-05-15')
    await user.click(screen.getByRole('button', { name: new RegExp(es.admin.event.save) }))
    expect(await screen.findByRole('status')).toHaveTextContent(es.admin.event.saved)
    expect(backend.control.event()?.rsvpDeadline.toISOString()).toBe('2027-05-15T21:59:59.000Z')
    await router.navigate('/')
    expect(await screen.findByText('Confirma antes del 15 de mayo')).toBeInTheDocument()
  })

  it('Datos del evento inválidos: errores junto al campo', async () => {
    const { user } = renderApp('/admin/evento', { admin: ADMIN, event: makeEvent() })
    const end = await screen.findByLabelText(es.admin.event.endTime)
    await user.clear(end)
    await user.type(end, '10:00')
    await user.click(screen.getByRole('button', { name: new RegExp(es.admin.event.save) }))
    expect(screen.getByText(es.admin.event.errors.endTime.endBeforeStart)).toBeInTheDocument()
  })
})
