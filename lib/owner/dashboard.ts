import type { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bookingAmount } from "@/lib/owner/bookings";

/**
 * Données du tableau de bord propriétaire, limitées aux salles dont il est
 * le propriétaire : aucun chiffre global de la plateforme ne lui est exposé.
 */

export interface OwnerDashboardData {
  kpis: {
    /** Somme des réservations confirmées/clôturées du mois en cours. */
    revenueMonth: number;
    /** Nombre de réservations dont l'événement a lieu ce mois-ci. */
    bookingsCount: number;
    /** Salles publiées (`ACTIVE`) appartenant au propriétaire. */
    activeRooms: number;
    /** Note moyenne des avis reçus sur ses salles, ou `null` sans avis. */
    avgRating: number | null;
  };
  /** Nombre de réservations par mois, sur les 12 derniers mois. */
  monthlySeries: Array<{ key: string; label: string; count: number }>;
  /** Dernières réservations, les plus récentes d'abord. */
  recentBookings: Array<{
    id: string;
    clientName: string;
    roomName: string;
    /** Date de l'événement au format `YYYY-MM-DD` (minuit UTC). */
    eventDate: string;
    amount: number;
    status: BookingStatus;
  }>;
}

/** Statuts dont les sommes comptent dans le revenu. */
const REVENUE_STATUSES: ReadonlyArray<BookingStatus> = [
  "CONFIRMEE",
  "CLOTUREE",
];

/** Clé de mois UTC « YYYY-MM », stable quel que soit le fuseau du visiteur. */
function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

const shortMonthFormatter = new Intl.DateTimeFormat("fr-DZ", {
  month: "short",
  timeZone: "UTC",
});

/** Les 12 derniers mois, du plus ancien au plus récent (mois courant inclus). */
function lastMonths(count: number): Array<{ key: string; label: string }> {
  const now = new Date();
  const result: Array<{ key: string; label: string }> = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const firstOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1)
    );
    result.push({
      key: monthKey(firstOfMonth),
      label: shortMonthFormatter.format(firstOfMonth),
    });
  }
  return result;
}

export async function getOwnerDashboard(
  ownerId: string
): Promise<OwnerDashboardData> {
  const [activeRooms, ratingAggregate, bookings] = await Promise.all([
    prisma.room.count({ where: { ownerId, status: "ACTIVE" } }),
    prisma.review.aggregate({
      where: { room: { ownerId } },
      _avg: { rating: true },
    }),
    prisma.booking.findMany({
      where: { room: { ownerId } },
      select: {
        id: true,
        status: true,
        eventDate: true,
        createdAt: true,
        client: { select: { fullName: true } },
        room: { select: { name: true, basePrice: true, cleaningFee: true } },
        payment: { select: { amount: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const currentMonth = monthKey(new Date());

  const monthlySeries = lastMonths(12).map(({ key, label }) => ({
    key,
    label,
    count: 0,
  }));
  const seriesByMonth = new Map(monthlySeries.map((point) => [point.key, point]));
  for (const booking of bookings) {
    const point = seriesByMonth.get(monthKey(booking.eventDate));
    if (point) point.count += 1;
  }

  const revenueMonth = bookings.reduce((sum, booking) => {
    if (monthKey(booking.eventDate) !== currentMonth) return sum;
    if (!REVENUE_STATUSES.includes(booking.status)) return sum;
    return (
      sum +
      bookingAmount(
        booking.payment?.amount,
        booking.room.basePrice,
        booking.room.cleaningFee
      )
    );
  }, 0);

  const bookingsCount = bookings.filter(
    (booking) => monthKey(booking.eventDate) === currentMonth
  ).length;

  const recentBookings = bookings.slice(0, 8).map((booking) => ({
    id: booking.id,
    clientName: booking.client.fullName,
    roomName: booking.room.name,
    eventDate: booking.eventDate.toISOString().slice(0, 10),
    amount: bookingAmount(
      booking.payment?.amount,
      booking.room.basePrice,
      booking.room.cleaningFee
    ),
    status: booking.status,
  }));

  return {
    kpis: {
      revenueMonth,
      bookingsCount,
      activeRooms,
      avgRating: ratingAggregate._avg.rating ?? null,
    },
    monthlySeries,
    recentBookings,
  };
}
