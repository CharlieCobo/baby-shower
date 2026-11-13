import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { describe, it } from 'vitest'
import {
  admin,
  guest,
  hoursFromNow,
  rsvpData,
  seed,
  seedBase,
  unauthenticated,
  setupRulesEnv,
} from './helpers'

setupRulesEnv()

const saveRsvp = (uid: string, data = rsvpData(), as = guest(uid)) =>
  setDoc(doc(as, `rsvps/${uid}`), data)

describe('rsvp · Confirmación de asistencia', () => {
  it('RSVP válido: se guarda en rsvps/{uid}', async () => {
    await seedBase()
    await assertSucceeds(saveRsvp('ana'))
  })

  it('RSVP válido sin campos opcionales y sin asistir', async () => {
    await seedBase()
    const {
      dietary: _dietary,
      message: _message,
      ...minimal
    } = rsvpData({
      attending: false,
      companions: 0,
    })
    await assertSucceeds(saveRsvp('ana', minimal))
  })

  it('Cambiar la respuesta: sobrescribe el mismo documento', async () => {
    await seedBase()
    await assertSucceeds(saveRsvp('ana'))
    await assertSucceeds(saveRsvp('ana', rsvpData({ attending: false, companions: 0 })))
  })

  it('Formulario vacío en otro dispositivo: el nuevo UID escribe su propio documento', async () => {
    await seedBase()
    await assertSucceeds(saveRsvp('ana'))
    await assertSucceeds(saveRsvp('ana-movil-nuevo'))
  })

  it('RSVP fuera de plazo: las reglas rechazan la escritura', async () => {
    await seedBase({ event: { rsvpDeadline: hoursFromNow(-1) } })
    await assertFails(saveRsvp('ana'))
  })

  it('dentro del plazo se puede responder', async () => {
    await seedBase({ event: { rsvpDeadline: hoursFromNow(1) } })
    await assertSucceeds(saveRsvp('ana'))
  })

  it('sin config/event no hay plazo', async () => {
    await seedBase({ event: null })
    await assertSucceeds(saveRsvp('ana'))
  })

  it('sin sesión no se puede responder', async () => {
    await seedBase()
    await assertFails(saveRsvp('ana', rsvpData(), unauthenticated()))
  })
})

describe('rsvp · Privacidad de los RSVPs', () => {
  it('Lectura de la lista de asistentes: un no admin no puede consultar rsvps', async () => {
    await seedBase()
    await seed((db) => setDoc(doc(db, 'rsvps/ana'), rsvpData()))
    await assertFails(getDocs(collection(guest('bea'), 'rsvps')))
    await assertFails(getDocs(collection(unauthenticated(), 'rsvps')))
  })

  it('un invitado no puede leer ni su propio RSVP', async () => {
    await seedBase()
    await seed((db) => setDoc(doc(db, 'rsvps/ana'), rsvpData()))
    await assertFails(getDoc(doc(guest('ana'), 'rsvps/ana')))
  })

  it('un invitado no puede borrar RSVPs, ni el suyo', async () => {
    await seedBase()
    await seed((db) => setDoc(doc(db, 'rsvps/ana'), rsvpData()))
    await assertFails(deleteDoc(doc(guest('ana'), 'rsvps/ana')))
  })

  it('Escritura en el RSVP de otro: se rechaza', async () => {
    await seedBase()
    await assertFails(saveRsvp('bea', rsvpData(), guest('ana')))
  })

  it.each([
    ['un campo extra', { email: 'marta@example.com' }],
    ['un nombre de más de 80 caracteres', { name: 'x'.repeat(81) }],
    ['un nombre vacío', { name: '' }],
    ['unas alergias de más de 200 caracteres', { dietary: 'x'.repeat(201) }],
    ['un mensaje de más de 500 caracteres', { message: 'x'.repeat(501) }],
    ['más de 10 acompañantes', { companions: 11 }],
    ['acompañantes negativos', { companions: -1 }],
    ['acompañantes no enteros', { companions: 1.5 }],
    ['asistencia que no es booleana', { attending: 'sí' }],
  ])('Campos no permitidos: se rechaza %s', async (_desc, override) => {
    await seedBase()
    await assertFails(saveRsvp('ana', rsvpData(override)))
  })

  it('en el límite: nombre de 80, alergias de 200, mensaje de 500 y 10 acompañantes', async () => {
    await seedBase()
    await assertSucceeds(
      saveRsvp(
        'ana',
        rsvpData({
          name: 'x'.repeat(80),
          dietary: 'x'.repeat(200),
          message: 'x'.repeat(500),
          companions: 10,
        }),
      ),
    )
  })

  it('Acompañantes sin asistir: se rechaza', async () => {
    await seedBase()
    await assertFails(saveRsvp('ana', rsvpData({ attending: false, companions: 2 })))
  })

  it('Fecha manipulada: updatedAt distinto de la hora del servidor se rechaza', async () => {
    await seedBase()
    await assertFails(saveRsvp('ana', rsvpData({ updatedAt: Timestamp.now() })))
  })

  it('un merge parcial que deja el documento incompleto se rechaza', async () => {
    await seedBase()
    await assertFails(updateDoc(doc(guest('ana'), 'rsvps/ana'), { name: 'Ana' }))
  })

  it('los admins pueden leer y borrar RSVPs', async () => {
    await seedBase()
    await seed((db) => setDoc(doc(db, 'rsvps/ana'), rsvpData()))
    await assertSucceeds(getDocs(collection(admin(), 'rsvps')))
    await assertSucceeds(deleteDoc(doc(admin(), 'rsvps/ana')))
  })
})
