import type { BookingStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bookingAmount } from "@/lib/bookings/amount";
import type { BookingAdminFilters } from "@/lib/admin/bookings-params";

/**
 * Lectures des réservations vues par l'administration.
 *
 * Contrairement au portail propriétaire, aucun périmètre n'est appliqué : la
 * plateforme voit toutes les réservations, avec le paiement en espèces
 * correspondant — ce que le client a remis à LIUDOR, et ce que LIUDOR a reversé
 * au propriétaire.
 */

/** Les deux mouvements d'espèces d'une réservation, tels qu'affichés. */
export interface AdminPaymentSummary {
  /** Somme reçue du client, ou attendue tant que rien n'est encaissé. */
  amount: number;
  status: PaymentStatus | null;
  /** Date d'encaissement client → LIUDOR, au format ISO. */
  paidAt: string | null;
  recordedByName: string | null;
  /** Somme remise au propriétaire, `null` tant que rien n'est reversé. */
  payoutAmount: number | null;
  /** Date du reversement LIUDOR → propriétaire, au format ISO. */
  payoutAt: string | null;
  payoutRecordedByName: string | null;
}

export interface AdminBookingRow {
  id: string;
  status: BookingStatus;
  eventType: string;
  /** Date de l'événement, au format `YYYY-MM-DD`. */
  eventDate: string;
  guestsCount: number;
  /** Date de la demande, au format ISO. */
  createdAt: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientAvatarUrl: string | null;
  contactPhone: string;
  roomId: string;
  roomName: string;
  roomCity: string;
  ownerId: string;
  ownerName: string;
  /** Montant encaissé si un paiement existe, sinon estimation au tarif. */
  amount: number;
  /** `true` tant qu'aucun paiement n'a été enregistré. */
  amountEstimated: boolean;
  payment: AdminPaymentSummary | null;
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

/** Forme du paiement telle que sélectionnée par les requêtes de ce module. */
type PaymentSelection = {
  amount: Prisma.Decimal;
  status: PaymentStatus;
  paidAt: Date | null;
  payoutAmount: Prisma.Decimal | null;
  payoutAt: Date | null;
  recordedByUser: { fullName: string } | null;
  payoutRecordedByUser: { fullName: string } | null;
} | null;

/** Champs du paiement lus partout où il est affiché. */
export const paymentSelect = {
  amount: true,
  status: true,
  paidAt: true,
  payoutAmount: true,
  payoutAt: true,
  recordedByUser: { select: { fullName: true } },
  payoutRecordedByUser: { select: { fullName: true } },
} as const;

export function toPaymentSummary(
  payment: PaymentSelection
): AdminPaymentSummary | null {
  if (!payment) return null;

  return {
    amount: Number(payment.amount),
    status: payment.status,
    paidAt: payment.paidAt?.toISOString() ?? null,
    recordedByName: payment.recordedByUser?.fullName ?? null,
    payoutAmount:
      payment.payoutAmount == null ? null : Number(payment.payoutAmount),
    payoutAt: payment.payoutAt?.toISOString() ?? null,
    payoutRecordedByName: payment.payoutRecordedByUser?.fullName ?? null,
  };
}

function whereFromFilters(
  filters: BookingAdminFilters
): Prisma.BookingWhereInput {
  // Les critères s'empilent dans un `AND` : l'étape de paiement comme la
  // recherche s'expriment par un `OR`, et les écrire tous deux à la racine
  // ferait que le dernier posé effacerait l'autre.
  const conditions: Prisma.BookingWhereInput[] = [];

  if (filters.status) conditions.push({ status: filters.status });
  if (filters.ownerId) {
    conditions.push({ room: { ownerId: filters.ownerId } });
  }

  // Étapes du circuit des espèces (voir `paymentStageOf`) : rien d'encaissé,
  // encaissé mais pas reversé, ou reversé au propriétaire.
  if (filters.payment === "TO_COLLECT") {
    conditions.push({
      OR: [{ payment: { is: null } }, { payment: { status: { not: "PAID" } } }],
    });
  }
  if (filters.payment === "TO_PAYOUT") {
    conditions.push({ payment: { status: "PAID", payoutAt: null } });
  }
  if (filters.payment === "PAID_OUT") {
    conditions.push({ payment: { payoutAt: { not: null } } });
  }

  if (filters.search) {
    const contains = { contains: filters.search, mode: "insensitive" } as const;
    conditions.push({
      OR: [
        { client: { fullName: contains } },
        { client: { email: contains } },
        { room: { name: contains } },
        { room: { city: contains } },
        { eventType: contains },
        { contactEmail: contains },
      ],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
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
    id: booking.id,
    status: booking.status,
    eventType: booking.eventType,
    eventDate: booking.eventDate.toISOString().slice(0, 10),
    guestsCount: booking.guestsCount,
    createdAt: booking.createdAt.toISOString(),
    clientId: booking.client.id,
    clientName: booking.client.fullName,
    clientEmail: booking.client.email,
    clientAvatarUrl: booking.client.avatarUrl,
    contactPhone: booking.contactPhone,
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
    payment: toPaymentSummary(booking.payment),
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

/** Comptes administrateur, pour désigner qui a encaissé ou reversé les espèces. */
export async function listAdminOptions(): Promise<AdminOption[]> {
  return prisma.user.findMany({
    where: { role: "ADMIN", suspendedAt: null },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });
}

// ---------------------------------------------------------------------------
// Détail d'une réservation
// ---------------------------------------------------------------------------

/** Réservation du même client, listée dans son historique. */
export interface ClientBookingHistoryRow {
  id: string;
  roomName: string;
  eventDate: string;
  status: BookingStatus;
  amount: number;
}

export interface AdminBookingDetail {
  id: string;
  status: BookingStatus;
  eventType: string;
  eventDate: string;
  guestsCount: number;
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
  updatedAt: string;
  /** Montant attendu au tarif de la salle (base + ménage). */
  expectedAmount: number;
  payment: AdminPaymentSummary | null;
  room: {
    id: string;
    name: string;
    city: string;
    district: string | null;
    address: string;
    categoryName: string;
    /** `null` quand la salle n'annonce pas de minimum. */
    capacityMin: number | null;
    capacityMax: number;
    basePrice: number;
    cleaningFee: number | null;
    depositAmount: number | null;
    photoUrl: string | null;
  };
  owner: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    suspended: boolean;
    activeRoomsCount: number;
  };
  client: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    /** Date d'inscription, au format ISO. */
    createdAt: string;
    suspended: boolean;
    bookingsCount: number;
    confirmedBookingsCount: number;
    /** Total déjà encaissé en espèces sur l'ensemble de ses réservations. */
    paidTotal: number;
  };
  /** Autres réservations du même client, la plus récente d'abord. */
  clientHistory: ClientBookingHistoryRow[];
}

/**
 * Réservation complète : la demande, la salle, le propriétaire, le client et
 * l'argent.
 *
 * Le dossier client est lu ici plutôt que sur une page séparée : quand l'équipe
 * ouvre une réservation, la question suivante est toujours « c'est qui, ce
 * client ? » — combien de réservations, combien déjà payé, compte actif ou non.
 */
export async function getAdminBookingDetail(
  bookingId: string
): Promise<AdminBookingDetail | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      eventType: true,
      eventDate: true,
      guestsCount: true,
      contactPhone: true,
      contactEmail: true,
      createdAt: true,
      updatedAt: true,
      payment: { select: paymentSelect },
      room: {
        select: {
          id: true,
          name: true,
          city: true,
          district: true,
          address: true,
          capacityMin: true,
          capacityMax: true,
          basePrice: true,
          cleaningFee: true,
          depositAmount: true,
          category: { select: { name: true } },
          photos: {
            select: { url: true },
            orderBy: { position: "asc" },
            take: 1,
          },
          owner: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              avatarUrl: true,
              suspendedAt: true,
              rooms: { where: { status: "ACTIVE" }, select: { id: true } },
            },
          },
        },
      },
      client: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          createdAt: true,
          suspendedAt: true,
          bookings: {
            orderBy: { eventDate: "desc" },
            select: {
              id: true,
              status: true,
              eventDate: true,
              room: {
                select: { name: true, basePrice: true, cleaningFee: true },
              },
              payment: { select: { amount: true, status: true } },
            },
          },
        },
      },
    },
  });

  if (!booking) return null;

  const { client, room } = booking;

  return {
    id: booking.id,
    status: booking.status,
    eventType: booking.eventType,
    eventDate: booking.eventDate.toISOString().slice(0, 10),
    guestsCount: booking.guestsCount,
    contactPhone: booking.contactPhone,
    contactEmail: booking.contactEmail,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    expectedAmount: bookingAmount(
      undefined,
      room.basePrice,
      room.cleaningFee
    ),
    payment: toPaymentSummary(booking.payment),
    room: {
      id: room.id,
      name: room.name,
      city: room.city,
      district: room.district,
      address: room.address,
      categoryName: room.category.name,
      capacityMin: room.capacityMin,
      capacityMax: room.capacityMax,
      basePrice: Number(room.basePrice),
      cleaningFee: room.cleaningFee == null ? null : Number(room.cleaningFee),
      depositAmount:
        room.depositAmount == null ? null : Number(room.depositAmount),
      photoUrl: room.photos[0]?.url ?? null,
    },
    owner: {
      id: room.owner.id,
      fullName: room.owner.fullName,
      email: room.owner.email,
      phone: room.owner.phone,
      avatarUrl: room.owner.avatarUrl,
      suspended: room.owner.suspendedAt !== null,
      activeRoomsCount: room.owner.rooms.length,
    },
    client: {
      id: client.id,
      fullName: client.fullName,
      email: client.email,
      phone: client.phone,
      avatarUrl: client.avatarUrl,
      createdAt: client.createdAt.toISOString(),
      suspended: client.suspendedAt !== null,
      bookingsCount: client.bookings.length,
      confirmedBookingsCount: client.bookings.filter(
        (entry) => entry.status === "CONFIRMEE"
      ).length,
      paidTotal: client.bookings.reduce(
        (sum, entry) =>
          entry.payment?.status === "PAID"
            ? sum + Number(entry.payment.amount)
            : sum,
        0
      ),
    },
    // La réservation ouverte est retirée de son propre historique : elle est
    // déjà tout en haut de la page.
    clientHistory: client.bookings
      .filter((entry) => entry.id !== booking.id)
      .map((entry) => ({
        id: entry.id,
        roomName: entry.room.name,
        eventDate: entry.eventDate.toISOString().slice(0, 10),
        status: entry.status,
        amount: bookingAmount(
          entry.payment?.amount,
          entry.room.basePrice,
          entry.room.cleaningFee
        ),
      })),
  };
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
