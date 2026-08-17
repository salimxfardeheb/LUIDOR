import type { RoomStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Données du tableau de bord propriétaire, limitées aux salles dont il est
 * le propriétaire : aucun chiffre global de la plateforme ne lui est exposé.
 *
 * Aucune réservation n'est prise en ligne : les clients contactent directement
 * le propriétaire depuis la fiche salle. Le tableau de bord suit donc ce dont
 * le propriétaire a la main — ses salles, ses dates ouvertes, ses avis — et
 * ne montre ni chiffre d'affaires ni demande de réservation.
 */

/** Fenêtre, en jours, sur laquelle sont comptées les dates ouvertes. */
const OPEN_DAYS_WINDOW = 30;

export interface OwnerDashboardData {
  kpis: {
    /** Salles publiées (`ACTIVE`) appartenant au propriétaire. */
    activeRooms: number;
    /** Salles déposées mais pas encore validées par l'équipe LIUDOR. */
    pendingRooms: number;
    /** Dates ouvertes à la location sur les 30 prochains jours, toutes salles confondues. */
    openDays: number;
    /** Note moyenne des avis reçus sur ses salles, ou `null` sans avis. */
    avgRating: number | null;
    /** Nombre d'avis publiés sur ses salles. */
    reviewCount: number;
  };
  /** Dernières salles déposées, les plus récentes d'abord. */
  recentRooms: Array<{
    id: string;
    name: string;
    city: string;
    status: RoomStatus;
    /** Date de dépôt au format `YYYY-MM-DD` (minuit UTC). */
    createdAt: string;
  }>;
}

/** Minuit UTC du jour courant : les dates de disponibilité sont en `@db.Date`. */
function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

export async function getOwnerDashboard(
  ownerId: string
): Promise<OwnerDashboardData> {
  const from = startOfTodayUtc();
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + OPEN_DAYS_WINDOW);

  const [activeRooms, pendingRooms, openDays, reviewAggregate, recentRooms] =
    await Promise.all([
      prisma.room.count({ where: { ownerId, status: "ACTIVE" } }),
      prisma.room.count({ where: { ownerId, status: "PENDING" } }),
      prisma.availability.count({
        where: {
          room: { ownerId },
          status: "AVAILABLE",
          date: { gte: from, lt: to },
        },
      }),
      prisma.review.aggregate({
        // Même périmètre que la note affichée au public : les avis en attente de
        // modération ne comptent pas encore.
        where: { room: { ownerId }, publishedAt: { not: null } },
        _avg: { rating: true },
        _count: true,
      }),
      prisma.room.findMany({
        where: { ownerId },
        select: { id: true, name: true, city: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return {
    kpis: {
      activeRooms,
      pendingRooms,
      openDays,
      avgRating: reviewAggregate._avg.rating ?? null,
      reviewCount: reviewAggregate._count,
    },
    recentRooms: recentRooms.map((room) => ({
      id: room.id,
      name: room.name,
      city: room.city,
      status: room.status,
      createdAt: room.createdAt.toISOString().slice(0, 10),
    })),
  };
}
