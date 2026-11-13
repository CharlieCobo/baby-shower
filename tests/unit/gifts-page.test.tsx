import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '../../src/i18n/es'
import { makeEvent, makeGift } from './fixtures'
import { renderApp } from './render'

const gifts = [
  makeGift({
    id: 'panales',
    title: 'Pañales talla 1',
    category: 'higiene',
    quantity: 4,
    reservedCount: 1,
    priceEur: 12,
    order: 1,
  }),
  makeGift({
    id: 'body',
    title: 'Body de algodón',
    category: 'ropa',
    quantity: 1,
    imageUrl: 'https://example.com/body.jpg',
    url: 'https://example.com/body',
    order: 2,
  }),
  makeGift({
    id: 'sonajero',
    title: 'Sonajero',
    category: 'juguetes',
    quantity: 1,
    reservedCount: 1,
    order: 3,
  }),
  makeGift({ id: 'oculto', title: 'Regalo oculto', active: false, order: 4 }),
]

const card = (title: string) => screen.getByRole('article', { name: title })

describe('GiftsPage', () => {
  it('Visitante abre la lista: solo activos, con unidades restantes y precio', async () => {
    renderApp('/regalos', { gifts })
    expect(await screen.findByRole('article', { name: 'Pañales talla 1' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Regalo oculto' })).not.toBeInTheDocument()
    expect(within(card('Pañales talla 1')).getByText('Quedan 3 de 4')).toBeInTheDocument()
    expect(within(card('Pañales talla 1')).getByText('~12 €')).toBeInTheDocument()
    expect(
      within(card('Body de algodón')).getByRole('link', { name: /Ver ejemplo/ }),
    ).toHaveAttribute('href', 'https://example.com/body')
  })

  it('Regalo sin imagen: muestra el icono de su categoría', async () => {
    renderApp('/regalos', { gifts })
    await screen.findByRole('article', { name: 'Pañales talla 1' })
    expect(within(card('Pañales talla 1')).getByTestId('category-icon')).toHaveTextContent(
      es.categories.higiene.icon,
    )
    expect(within(card('Body de algodón')).queryByTestId('category-icon')).not.toBeInTheDocument()
  })

  it('Regalo agotado: "Ya reservado", sin botón y sin datos de quién', async () => {
    renderApp('/regalos', { gifts })
    const sonajero = await screen.findByRole('article', { name: 'Sonajero' })
    expect(within(sonajero).getByText(es.gifts.soldOut)).toBeInTheDocument()
    expect(within(sonajero).queryByRole('button')).not.toBeInTheDocument()
  })

  it('Reserva correcta: confirma en el diálogo y queda como "Lo traes tú"', async () => {
    const { user, backend } = renderApp('/regalos', { gifts })
    const body = await screen.findByRole('article', { name: 'Body de algodón' })
    await user.click(within(body).getByRole('button', { name: /Lo regalo yo/ }))
    const dialog = screen.getByRole('dialog', {
      name: es.gifts.confirmReserveTitle('Body de algodón'),
    })
    await user.click(
      within(dialog).getByRole('button', { name: new RegExp(es.gifts.confirmReserve) }),
    )

    expect(await within(card('Body de algodón')).findByText(es.gifts.mine)).toBeInTheDocument()
    expect(
      within(card('Body de algodón')).getByRole('button', { name: /Ya no lo traigo/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(es.gifts.reserved('Body de algodón'))
    expect(backend.control.gift('body')?.reservedCount).toBe(1)
  })

  it('"Mejor no" cierra el diálogo sin reservar', async () => {
    const { user, backend } = renderApp('/regalos', { gifts })
    const body = await screen.findByRole('article', { name: 'Body de algodón' })
    await user.click(within(body).getByRole('button', { name: /Lo regalo yo/ }))
    await user.click(screen.getByRole('button', { name: es.gifts.cancel }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(backend.control.gift('body')?.reservedCount).toBe(0)
  })

  it('Liberar reserva propia: confirma y vuelve a estar disponible', async () => {
    const { user, backend } = renderApp('/regalos', { gifts, uid: 'yo' })
    await backend.control.reserveAs('yo', 'body')
    const body = await screen.findByRole('article', { name: 'Body de algodón' })
    await user.click(await within(body).findByRole('button', { name: /Ya no lo traigo/ }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: new RegExp(es.gifts.confirmRelease),
      }),
    )
    expect(
      await within(card('Body de algodón')).findByRole('button', { name: /Lo regalo yo/ }),
    ).toBeInTheDocument()
    expect(backend.control.gift('body')?.reservedCount).toBe(0)
  })

  it('Carrera por la última unidad: "Vaya, alguien se te ha adelantado" y lista actualizada', async () => {
    const { user, backend } = renderApp('/regalos', { gifts })
    const body = await screen.findByRole('article', { name: 'Body de algodón' })
    await user.click(within(body).getByRole('button', { name: /Lo regalo yo/ }))
    // Otra persona reserva mientras el diálogo está abierto
    await backend.control.reserveAs('otra', 'body')
    await user.click(screen.getByRole('button', { name: new RegExp(es.gifts.confirmReserve) }))
    expect(await screen.findByRole('alert')).toHaveTextContent(es.errors['sold-out'])
    expect(within(card('Body de algodón')).getByText(es.gifts.soldOut)).toBeInTheDocument()
  })

  it('Regalo agotado con reserva propia: "Lo traes tú" en vez de "Ya reservado"', async () => {
    const { backend } = renderApp('/regalos', { gifts, uid: 'yo' })
    await backend.control.reserveAs('yo', 'body')
    expect(
      await within(await screen.findByRole('article', { name: 'Body de algodón' })).findByText(
        es.gifts.mine,
      ),
    ).toBeInTheDocument()
    expect(within(card('Body de algodón')).queryByText(es.gifts.soldOut)).not.toBeInTheDocument()
  })

  it('Filtro por categoría y "Solo disponibles"', async () => {
    const { user } = renderApp('/regalos', { gifts })
    await screen.findByRole('article', { name: 'Pañales talla 1' })
    const filters = screen.getByRole('group', { name: es.gifts.filtersLabel })

    await user.click(within(filters).getByRole('button', { name: 'Juguetes' }))
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual([
      'Sonajero',
    ])

    await user.click(within(filters).getByRole('button', { name: es.gifts.all }))
    await user.click(screen.getByRole('switch', { name: es.gifts.onlyAvailable }))
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual([
      'Pañales talla 1',
      'Body de algodón',
    ])
  })

  it('Lista cerrada en la UI: sin acciones, con mensaje, y las propias siguen como "Lo traes tú"', async () => {
    const closed = makeEvent({ registryClosesAt: new Date('2027-04-30T00:00:00Z') })
    const { backend } = renderApp('/regalos', { gifts, event: closed, uid: 'yo' })
    // la reserva se hizo antes del cierre
    backend.control.setEvent(null)
    await backend.control.reserveAs('yo', 'panales')
    backend.control.setEvent(closed)

    expect(await screen.findByText(es.gifts.closedBanner)).toBeInTheDocument()
    expect(await within(card('Pañales talla 1')).findByText(es.gifts.mine)).toBeInTheDocument()
    expect(within(card('Pañales talla 1')).queryByRole('button')).not.toBeInTheDocument()
    expect(within(card('Body de algodón')).getByText(es.gifts.closedBadge)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Lo regalo yo/ })).not.toBeInTheDocument()
  })

  it('Dispositivo distinto: texto de ayuda para escribir a los anfitriones', async () => {
    renderApp('/regalos', { gifts })
    expect(await screen.findByText(es.gifts.otherDevice)).toBeInTheDocument()
  })
})
