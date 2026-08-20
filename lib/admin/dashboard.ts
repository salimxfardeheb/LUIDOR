import { prisma } from "@/lib/prisma";

/**
 * Chiffres de la page d'accueil de l'administration.
 *
 * Volontairement court : le tableau de bord n'est pas un outil d'analyse, c'est
 * le point d'entrée qui dit s'il y a du travail en attente et vers quelle
 * section aller. Tout le reste se lit dans la section concernée.
 */

export interface AdminOverview {
  clientsCount: number;
  ownersCount: number;
  /** Dossiers de salles en attente de validation. */
  pendingRoomsCount: number;
  /** Réservations déposées depuis le premier jour du mois en cours. */
  monthBookingsCount: number;
  /** Espèces encaissées mais pas encore reversées aux propriétaires. */
  cashToPayout: number;
}

/** Premier jour du mois courant, en UTC (les dates sont stockées en UTC). */
function startOfMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const monthStart = startOfMonth(new Date());

  const [clients, owners, pendingRooms, monthBookings, toPayout] =
    await Promise.all([
      prisma.user.count({ where: { role: "CLIENT" } }),
      prisma.user.count({ where: { role: "OWNER" } }),
      prisma.room.count({ where: { status: "PENDING" } }),
      prisma.booking.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.payment.aggregate({
        where: { status: "PAID", payoutAt: null },
        _sum: { amount: true },
      }),
    ]);

  return {
    clientsCount: clients,
    ownersCount: owners,
    pendingRoomsCount: pendingRooms,
    monthBookingsCount: monthBookings,
    cashToPayout: Number(toPayout._sum.amount ?? 0),
  };
}
