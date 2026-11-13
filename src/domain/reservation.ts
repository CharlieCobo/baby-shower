export interface Reservation {
  giftId: string
  uid: string
  createdAt: Date
}

/** Id determinista: 1 reserva por regalo y dispositivo (design.md § 2). */
export const reservationId = (giftId: string, uid: string): string => `${giftId}_${uid}`
