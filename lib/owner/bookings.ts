import type { BookingStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { BookingFilters } from "@/lib/owner/bookings-params";
import { bookingAmount } from "@/lib/bookings/amount";

/**
 * Réservations reçues sur les salles du propriétaire.
 *
 * Lecture seule : le portail propriétaire n'expose aucune mutation sur une
 * réservation. Le changement de statut appartient au portail administrateur,
 * qui est le seul à contrôler les paiements et les annulations.
 */

export interface OwnerBookingRow {
  id: string;
  clientName: string;
  /** Coordonnées saisies à la réservation, pas celles du compte client. */
  contactEmail: string;
  contactPhone: string;
  roomId: string;
  roomName: string;
  roomCity: string;
  eventType: string;
  /** Date de l'événement au format `YYYY-MM-DD` (minuit UTC). */
  eventDate: string;
  guestsCount: number;
  amount: number;
  /** `true` quand aucun paiement n'est enregistré : le montant est une estimation. */
  amountEstimated: boolean;
  paymentStatus: PaymentStatus | null;
  status: BookingStatus;
  /** Date de réception de la demande. */
  createdAt: Date;
}

/**
 * Réservations reçues, les plus récentes d'abord.
 *
 * `room.ownerId` est toujours dans le `where` : les filtres d'URL viennent en
 * plus, jamais à la place du cloisonnement par propriétaire.
 */
export async function listOwnerBookings(
  ownerId: string,
  filters: BookingFilters
): Promise<OwnerBookingRow[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      room: { ownerId },
      ...(filters.roomId ? { roomId: filters.roomId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      eventType: true,
      eventDate: true,
      guestsCount: true,
      contactEmail: true,
      contactPhone: true,
      status: true,
      createdAt: true,
      client: { select: { fullName: true } },
      room: {
        select: {
          id: true,
          name: true,
          city: true,
          basePrice: true,
          cleaningFee: true,
        },
      },
      payment: { select: { amount: true, status: true } },
    },
  });

  return bookings.map((booking) => ({
    id: booking.id,
    clientName: booking.client.fullName,
    contactEmail: booking.contactEmail,
    contactPhone: booking.contactPhone,
    roomId: booking.room.id,
    roomName: booking.room.name,
    roomCity: booking.room.city,
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
  }));
}

/** Nombre total de réservations reçues, filtres ignorés. */
export async function countOwnerBookings(ownerId: string): Promise<number> {
  return prisma.booking.count({ where: { room: { ownerId } } });
}
