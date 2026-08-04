import type { BookingStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bookingAmount } from "@/lib/bookings/amount";
import { PAST_BOOKING_STATUSES } from "@/lib/bookings/status";

/**
 * Réservations du compte connecté.
 *
 * `clientId` est toujours dans le `where` : un utilisateur ne voit que ses
 * propres réservations, y compris s'il est propriétaire ou administrateur —
 * les réservations reçues sur ses salles relèvent du portail propriétaire.
 */

export interface AccountBooking {
  id: string;
  roomId: string;
  roomName: string;
  roomCity: string;
  /** Première photo de la salle, ou `null` : la carte affiche alors le visuel de remplacement. */
  photoUrl: string | null;
  eventType: string;
  /** Date de l'événement au format `YYYY-MM-DD` (minuit UTC). */
  eventDate: string;
  guestsCount: number;
  amount: number;
  /** `true` quand aucun paiement n'est enregistré : le montant est une estimation. */
  amountEstimated: boolean;
  paymentStatus: PaymentStatus | null;
  status: BookingStatus;
  createdAt: Date;
}

const BOOKING_SELECT = {
  id: true,
  eventType: true,
  eventDate: true,
  guestsCount: true,
  status: true,
  createdAt: true,
  room: {
    select: {
      id: true,
      name: true,
      city: true,
      basePrice: true,
      cleaningFee: true,
      photos: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
    },
  },
  payment: { select: { amount: true, status: true } },
} satisfies Prisma.BookingSelect;

type BookingRow = Prisma.BookingGetPayload<{ select: typeof BOOKING_SELECT }>;

function toAccountBooking(booking: BookingRow): AccountBooking {
  return {
    id: booking.id,
    roomId: booking.room.id,
    roomName: booking.room.name,
    roomCity: booking.room.city,
    photoUrl: booking.room.photos[0]?.url ?? null,
    eventType: booking.eventType,
    eventDate: booking.eventDate.toISOString().slice(0, 10),
    guestsCount: booking.guestsCount,
    amount: bookingAmount(
      booking.payment?.amount,
      booking.room.basePrice,
      booking.room.cleaningFee
    ),
    amountEstimated: booking.payment == null,
    paymentStatus: booking.payment?.status ?? null,
    status: booking.status,
    createdAt: booking.createdAt,
  };
}

/**
 * Réservations de l'utilisateur, date d'événement décroissante : les échéances
 * les plus proches — et les demandes tout juste envoyées — arrivent en tête.
 */
export async function listAccountBookings(
  userId: string,
  status: BookingStatus | null
): Promise<AccountBooking[]> {
  const bookings = await prisma.booking.findMany({
    where: { clientId: userId, ...(status ? { status } : {}) },
    orderBy: { eventDate: "desc" },
    select: BOOKING_SELECT,
  });

  return bookings.map(toAccountBooking);
}

export interface AccountHistoryEntry extends AccountBooking {
  /** Un avis a déjà été publié par ce client sur cette salle. */
  reviewed: boolean;
  /** Événement passé et non encore noté : l'action « laisser un avis » est proposée. */
  canReview: boolean;
}

/**
 * Historique : réservations clôturées ou annulées.
 *
 * Un avis se rattache à une salle, pas à une réservation (`Review` est unique
 * par salle et par client) : deux événements dans la même salle ne donnent donc
 * droit qu'à un seul avis, et le second n'affiche plus l'action.
 */
export async function listAccountHistory(
  userId: string
): Promise<AccountHistoryEntry[]> {
  const bookings = await prisma.booking.findMany({
    where: { clientId: userId, status: { in: [...PAST_BOOKING_STATUSES] } },
    orderBy: { eventDate: "desc" },
    select: BOOKING_SELECT,
  });

  const reviews = await prisma.review.findMany({
    where: {
      clientId: userId,
      roomId: { in: bookings.map((booking) => booking.room.id) },
    },
    select: { roomId: true },
  });

  const reviewedRooms = new Set(reviews.map((review) => review.roomId));

  return bookings.map((booking) => {
    const entry = toAccountBooking(booking);
    const reviewed = reviewedRooms.has(entry.roomId);

    return {
      ...entry,
      reviewed,
      canReview: entry.status === "CLOTUREE" && !reviewed,
    };
  });
}
