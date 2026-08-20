import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bookingAmount } from "@/lib/bookings/amount";
import {
  paymentSelect,
  toPaymentSummary,
  type AdminPaymentSummary,
} from "@/lib/admin/bookings";
import {
  paymentStageOf,
  type PaymentFilters,
  type PaymentStage,
} from "@/lib/admin/payments-params";

/**
 * Suivi de l'argent entre le client et le propriétaire.
 *
 * Tout se règle en espèces, en deux temps : le client remet la somme à LIUDOR,
 * puis LIUDOR la reverse au propriétaire. Ce module lit les réservations sous
 * cet angle — non pas « où en est la demande », mais « où en est l'argent ».
 *
 * Une réservation annulée est écartée : il n'y a rien à encaisser dessus. Elle
 * réapparaît si un encaissement lui reste rattaché (annulation après paiement),
 * parce que cette somme-là doit être rendue ou reversée, pas oubliée.
 */

export interface PaymentRow {
  bookingId: string;
  bookingStatus: BookingStatus;
  /** Date de l'événement, au format `YYYY-MM-DD`. */
  eventDate: string;
  eventType: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAvatarUrl: string | null;
  roomId: string;
  roomName: string;
  roomCity: string;
  ownerId: string;
  ownerName: string;
  /** Somme en jeu : encaissée si elle l'a été, sinon estimée au tarif. */
  amount: number;
  amountEstimated: boolean;
  stage: PaymentStage;
  payment: AdminPaymentSummary | null;
}

export interface PaymentTotals {
  /** Nombre de réservations dont les espèces restent à recevoir du client. */
  toCollectCount: number;
  /** Somme attendue de ces réservations, au tarif de la salle. */
  toCollectAmount: number;
  /** Encaissé mais pas encore reversé : ce que LIUDOR détient réellement. */
  inHandCount: number;
  inHandAmount: number;
  /** Total déjà remis aux propriétaires. */
  paidOutCount: number;
  paidOutAmount: number;
  /** Total encaissé auprès des clients, reversé ou non. */
  collectedAmount: number;
}

function whereFromFilters(filters: PaymentFilters): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = {
    // Voir l'en-tête : une annulation sans encaissement sort du suivi.
    OR: [{ status: { not: "ANNULEE" } }, { payment: { isNot: null } }],
  };

  if (filters.ownerId) where.room = { ownerId: filters.ownerId };

  if (filters.search) {
    const contains = { contains: filters.search, mode: "insensitive" } as const;
    where.AND = [
      {
        OR: [
          { client: { fullName: contains } },
          { client: { email: contains } },
          { room: { name: contains } },
          { room: { owner: { fullName: contains } } },
        ],
      },
    ];
  }

  return where;
}

/**
 * Réservations sous l'angle de l'argent, du plus urgent au plus ancien.
 *
 * L'étape est calculée après lecture, à partir du paiement : elle croise trois
 * colonnes (`status`, `paidAt`, `payoutAt`) et deux tables, ce qu'un `where`
 * Prisma exprimerait moins lisiblement qu'une fonction. Le filtre d'étape est
 * donc appliqué en mémoire — la liste d'une plateforme de salles se compte en
 * centaines de lignes, pas en millions.
 */
export async function listPayments(
  filters: PaymentFilters
): Promise<PaymentRow[]> {
  const bookings = await prisma.booking.findMany({
    where: whereFromFilters(filters),
    orderBy: { eventDate: "desc" },
    select: {
      id: true,
      status: true,
      eventDate: true,
      eventType: true,
      contactPhone: true,
      client: {
        select: { id: true, fullName: true, email: true, avatarUrl: true },
      },
      room: {
        select: {
          id: true,
          name: true,
          city: true,
          basePrice: true,
          cleaningFee: true,
          owner: { select: { id: true, fullName: true } },
        },
      },
      payment: { select: paymentSelect },
    },
  });

  const rows = bookings.map((booking) => ({
    bookingId: booking.id,
    bookingStatus: booking.status,
    eventDate: booking.eventDate.toISOString().slice(0, 10),
    eventType: booking.eventType,
    clientId: booking.client.id,
    clientName: booking.client.fullName,
    clientEmail: booking.client.email,
    clientPhone: booking.contactPhone,
    clientAvatarUrl: booking.client.avatarUrl,
    roomId: booking.room.id,
    roomName: booking.room.name,
    roomCity: booking.room.city,
    ownerId: booking.room.owner.id,
    ownerName: booking.room.owner.fullName,
    amount: bookingAmount(
      booking.payment?.amount,
      booking.room.basePrice,
      booking.room.cleaningFee
    ),
    amountEstimated: booking.payment == null,
    stage: paymentStageOf(booking.payment),
    payment: toPaymentSummary(booking.payment),
  }));

  return filters.stage
    ? rows.filter((row) => row.stage === filters.stage)
    : rows;
}

/**
 * Totaux de caisse, sur l'ensemble de la plateforme.
 *
 * Calculés hors filtres : ce sont les chiffres de la trésorerie, ils ne doivent
 * pas changer parce qu'une recherche est en cours.
 *
 * Les trois totaux qui portent sur des paiements existants sont agrégés par la
 * base. Le quatrième — ce qui reste à encaisser — ne le peut pas : son montant
 * vient du tarif de la salle, pas d'une ligne `Payment`, et se calcule donc
 * après lecture des réservations concernées.
 */
export async function getPaymentTotals(): Promise<PaymentTotals> {
  const [collected, inHand, paidOut, toCollect] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: "PAID", payoutAt: null },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { payoutAt: { not: null } },
      _count: { _all: true },
      _sum: { payoutAmount: true },
    }),
    prisma.booking.findMany({
      where: {
        status: { not: "ANNULEE" },
        OR: [{ payment: { is: null } }, { payment: { status: "PENDING" } }],
      },
      select: { room: { select: { basePrice: true, cleaningFee: true } } },
    }),
  ]);

  return {
    toCollectCount: toCollect.length,
    toCollectAmount: toCollect.reduce(
      (sum, booking) =>
        sum +
        bookingAmount(undefined, booking.room.basePrice, booking.room.cleaningFee),
      0
    ),
    inHandCount: inHand._count._all,
    inHandAmount: Number(inHand._sum.amount ?? 0),
    paidOutCount: paidOut._count._all,
    paidOutAmount: Number(paidOut._sum.payoutAmount ?? 0),
    collectedAmount: Number(collected._sum.amount ?? 0),
  };
}
