import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { describe, it } from 'vitest'
import { eventData, guest, seedBase, stranger, unauthenticated, setupRulesEnv } from './helpers'

setupRulesEnv()

describe('event-info · Landing del evento', () => {
  it('Datos del evento: cualquier visitante lee config/event sin permisos especiales', async () => {
    await seedBase()
    await assertSucceeds(getDoc(doc(unauthenticated(), 'config/event')))
    await assertSucceeds(getDoc(doc(guest(), 'config/event')))
  })

  it('Evento sin configurar: leer config/event inexistente no da error de permisos', async () => {
    await seedBase({ event: null })
    await assertSucceeds(getDoc(doc(unauthenticated(), 'config/event')))
  })

  it('Datos del evento: un cliente no admin no puede escribir config/event', async () => {
    await seedBase()
    await assertFails(updateDoc(doc(guest(), 'config/event'), { title: 'Fiesta' }))
    await assertFails(setDoc(doc(stranger(), 'config/event'), eventData()))
    await assertFails(setDoc(doc(unauthenticated(), 'config/event'), eventData()))
    await assertFails(deleteDoc(doc(guest(), 'config/event')))
  })
})
