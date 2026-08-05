import type { BookingStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bookingAmount } from "@/lib/bookings/amount";
import type { BookingAdminFilters } from "@/lib/admin/bookings-params";

/**
 * Liste des réservations vue par l'administration.
 *
 * Contrairement au portail propriétaire, aucun périmètre n'est appliqué : la
 * plateforme voit toutes les réservations, avec le paiement en espèces
 * correspondant et qui l'a encaissé.
 */

export interface AdminBookingRow {
  id: string;
  status: BookingStatus;
  eventType: string;
  /** Date de l'événement, au format `YYYY-MM-DD`. */
  eventDate: string;
  guestsCount: number;
  /** Date de la demande, au format ISO. */
  createdAt: string;
  clientName: string;
  clientEmail: string;
  clientAvatarUrl: string | null;
  contactPhone: string;
  roomId: string;
  roomName: string;
  roomCity: string;
  ownerName: string;
  /** Montant encaissé si un paiement existe, sinon estimation au tarif. */
  amount: number;
  /** `true` tant qu'aucun paiement n'a été enregistré. */
  amountEstimated: boolean;
  paymentStatus: PaymentStatus | null;
  /** Date d'encaissement, au format ISO. */
  paidAt: string | null;
  recordedByName: string | null;
}

export interface AdminBookingCounts {
  total: number;
  toVerify: number;
  confirmed: number;
  cashCollected: number;
}

/** Options du sélecteur « administrateur ayant encaissé » de la modale. */
export interface AdminOption {
  id: string;
  fullName: string;
}

function whereFromFilters(
  filters: BookingAdminFilters
): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.ownerId) where.room = { ownerId: filters.ownerId };

  if (filters.payment === "PAID") where.payment = { status: "PAID" };
  if (filters.payment === "PENDING") where.payment = { status: "PENDING" };
  if (filters.payment === "NONE") where.payment = { is: null };

  if (filters.search) {
    const contains = { contains: filters.search, mode: "insensitive" } as const;
    where.OR = [
      { client: { fullName: contains } },
      { client: { email: contains } },
      { room: { name: contains } },
      { room: { city: contains } },
      { eventType: contains },
      { contactEmail: contains },
    ];
  }

  return where;
}

/**
 * Ordre demandé au moteur.
 *
 * Le tri par montant n'y figure pas : le montant d'une réservation sans
 * paiement est calculé à partir du tarif de la salle, il n'existe pas comme
 * colonne triable. Il est appliqué après lecture (voir `listAdminBookings`).
 */
function orderFromSort(
  sort: BookingAdminFilters["sort"]
): Prisma.BookingOrderByWithRelationInput {
  switch (sort) {
    case "anciennes":
      return { createdAt: "asc" };
    case "evenement":
      return { eventDate: "asc" };
    default:
      return { createdAt: "desc" };
  }
}

export async function listAdminBookings(
  filters: BookingAdminFilters
): Promise<AdminBookingRow[]> {
  const bookings = await prisma.booking.findMany({
    where: whereFromFilters(filters),
    orderBy: orderFromSort(filters.sort),
    select: {
      id: true,
      status: true,
      eventType: true,
      eventDate: true,
      guestsCount: true,
      contactPhone: true,
      createdAt: true,
      client: { select: { fullName: true, email: true, avatarUrl: true } },
      room: {
        select: {
          id: true,
          name: true,
          city: true,
          basePrice: true,
          cleaningFee: true,
          owner: { select: { fullName: true } },
        },
      },
      payment: {
        select: {
          amount: true,
          status: true,
          paidAt: true,
          recordedByUser: { select: { fullName: true } },
        },
      },
    },
  });

  const rows = bookings.map((booking) => ({
    id: booking.id,
    status: booking.status,
    eventType: booking.eventType,
    eventDate: booking.eventDate.toISOString().slice(0, 10),
    guestsCount: booking.guestsCount,
    createdAt: booking.createdAt.toISOString(),
    clientName: booking.client.fullName,
    clientEmail: booking.client.email,
    clientAvatarUrl: booking.client.avatarUrl,
    contactPhone: booking.contactPhone,
    roomId: booking.room.id,
    roomName: booking.room.name,
    roomCity: booking.room.city,
    ownerName: booking.room.owner.fullName,
    amount: bookingAmount(
      booking.payment?.amount,
      booking.room.basePrice,
      booking.room.cleaningFee
    ),
    amountEstimated: booking.payment == null,
    paymentStatus: booking.payment?.status ?? null,
    paidAt: booking.payment?.paidAt?.toISOString() ?? null,
    recordedByName: booking.payment?.recordedByUser?.fullName ?? null,
  }));

  if (filters.sort === "montant") {
    rows.sort((a, b) => b.amount - a.amount);
  }

  return rows;
}

/** Compteurs affichés au-dessus de la liste, sur l'ensemble des réservations. */
export async function getBookingCounts(): Promise<AdminBookingCounts> {
  const [total, toVerify, confirmed, cash] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "EN_COURS_VERIFICATION" } }),
    prisma.booking.count({ where: { status: "CONFIRMEE" } }),
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
  ]);

  return {
    total,
    toVerify,
    confirmed,
    cashCollected: Number(cash._sum.amount ?? 0),
  };
}

/** Comptes administrateur, pour désigner qui a encaissé les espèces. */
export async function listAdminOptions(): Promise<AdminOption[]> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", suspendedAt: null },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });

  return admins;
}

/** Montant attendu et état d'une réservation, relus avant d'encaisser. */
export async function getBookingForPayment(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      room: { select: { basePrice: true, cleaningFee: true } },
      payment: { select: { status: true } },
    },
  });

  if (!booking) return null;

  return {
    id: booking.id,
    status: booking.status,
    expectedAmount: bookingAmount(
      undefined,
      booking.room.basePrice,
      booking.room.cleaningFee
    ),
    paymentStatus: booking.payment?.status ?? null,
  };
}
