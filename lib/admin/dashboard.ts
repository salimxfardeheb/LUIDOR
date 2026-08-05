import type { BookingStatus, RoomStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  addMonths,
  lastMonths,
  longMonthLabel,
  monthKey,
  monthRange,
  monthStart,
} from "@/lib/months";

/**
 * Données du tableau de bord d'administration : chiffres globaux de la
 * plateforme pour un mois donné.
 *
 * Périmètre volontairement limité au fonctionnement actuel de LIUDOR — les
 * paiements se règlent en espèces, encaissés hors ligne puis enregistrés dans
 * `Payment`. Aucune notion de commission, de reversement ni d'abonnement
 * n'existe donc ici.
 */

/** Nombre de mois affichés par le graphique d'évolution et le sélecteur. */
export const SERIES_MONTHS = 12;

/** Lignes affichées par les deux tables du tableau de bord. */
const RECENT_ROOMS_COUNT = 5;
const PENDING_REQUESTS_COUNT = 5;
const ACTIVITY_COUNT = 8;
/** Villes affichées par le graphique en barres ; les autres sont regroupées. */
const TOP_CITIES_COUNT = 6;

export interface AdminMetric {
  value: number;
  /** Même mesure sur le mois précédent, base de comparaison. */
  previous: number;
  /**
   * Variation relative (`0.125` = +12,5 %), ou `null` quand le mois précédent
   * est à zéro : une hausse « infinie » ne veut rien dire, l'affichage bascule
   * alors sur une mention neutre.
   */
  change: number | null;
}

export interface AdminActivityItem {
  id: string;
  kind: "room" | "booking" | "user" | "review" | "payment" | "message";
  /** Phrase affichée, ex. « Nouvelle salle soumise ». */
  title: string;
  /** Précision : nom de la salle, du client, montant… */
  detail: string;
  /** Horodatage ISO, formaté en relatif à l'affichage. */
  at: string;
}

export interface AdminRoomRow {
  id: string;
  name: string;
  city: string;
  status: RoomStatus;
  /** Première photo de la salle, ou `null` si aucune n'a été fournie. */
  photoUrl: string | null;
  ownerName: string;
  ownerEmail: string;
  ownerAvatarUrl: string | null;
  /** Date d'inscription de la salle, au format ISO. */
  createdAt: string;
}

export interface AdminPendingRequestRow extends AdminRoomRow {
  /** Nombre de jours écoulés depuis la soumission. */
  waitingDays: number;
}

export interface AdminDashboardData {
  month: {
    key: string;
    label: string;
    previousLabel: string;
    /** Le mois consulté est-il le mois en cours ? */
    isCurrent: boolean;
  };
  kpis: {
    rooms: AdminMetric;
    bookings: AdminMetric;
    users: AdminMetric;
    cashRevenue: AdminMetric;
  };
  /** Réservations créées par mois, sur les 12 mois qui précèdent le mois consulté. */
  bookingsSeries: Array<{ key: string; label: string; value: number }>;
  bookingsByStatus: Array<{ status: BookingStatus; value: number }>;
  usersByRole: Array<{ role: UserRole; value: number }>;
  roomsByCity: Array<{ city: string; value: number }>;
  recentActivity: AdminActivityItem[];
  recentRooms: AdminRoomRow[];
  pendingRequests: AdminPendingRequestRow[];
  /** Compteurs affichés sur les icônes du header. */
  badges: {
    /** Salles en attente de validation. */
    pendingRooms: number;
    /** Messages de contact non traités. */
    unreadMessages: number;
  };
}

function metric(value: number, previous: number): AdminMetric {
  return {
    value,
    previous,
    change: previous === 0 ? null : (value - previous) / previous,
  };
}

/** Millisecondes dans une journée, pour l'ancienneté d'une demande. */
const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(date: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
}

/**
 * Sélection commune aux deux tables de salles : la vignette est la photo de
 * position 0, le propriétaire est joint pour éviter une seconde requête.
 */
const roomRowSelect = {
  id: true,
  name: true,
  city: true,
  status: true,
  createdAt: true,
  photos: {
    select: { url: true },
    orderBy: { position: "asc" },
    take: 1,
  },
  owner: { select: { fullName: true, email: true, avatarUrl: true } },
} as const;

type RoomRowRecord = {
  id: string;
  name: string;
  city: string;
  status: RoomStatus;
  createdAt: Date;
  photos: Array<{ url: string }>;
  owner: { fullName: string; email: string; avatarUrl: string | null };
};

function toRoomRow(room: RoomRowRecord): AdminRoomRow {
  return {
    id: room.id,
    name: room.name,
    city: room.city,
    status: room.status,
    photoUrl: room.photos[0]?.url ?? null,
    ownerName: room.owner.fullName,
    ownerEmail: room.owner.email,
    ownerAvatarUrl: room.owner.avatarUrl,
    createdAt: room.createdAt.toISOString(),
  };
}

/**
 * Agrège le tableau de bord pour le mois demandé (mois en cours par défaut).
 *
 * Toutes les lectures partent en parallèle : elles sont indépendantes, et la
 * page ne s'affiche qu'une fois la plus lente terminée.
 */
export async function getAdminDashboard(
  month: Date = new Date()
): Promise<AdminDashboardData> {
  const current = monthStart(month);
  const { start, end } = monthRange(current);
  const previous = monthRange(addMonths(current, -1));
  const seriesStart = monthStart(addMonths(current, -(SERIES_MONTHS - 1)));

  const [
    roomsTotal,
    roomsPreviousTotal,
    bookingsMonth,
    bookingsPrevious,
    usersTotal,
    usersPreviousTotal,
    cashMonth,
    cashPrevious,
  ] = await Promise.all([
    prisma.room.count({ where: { createdAt: { lt: end } } }),
    prisma.room.count({ where: { createdAt: { lt: previous.end } } }),
    prisma.booking.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.booking.count({
      where: { createdAt: { gte: previous.start, lt: previous.end } },
    }),
    prisma.user.count({ where: { createdAt: { lt: end } } }),
    prisma.user.count({ where: { createdAt: { lt: previous.end } } }),
    prisma.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: previous.start, lt: previous.end } },
      _sum: { amount: true },
    }),
  ]);

  const [
    seriesBookings,
    statusGroups,
    roleGroups,
    cityGroups,
    recentRoomRecords,
    pendingRoomRecords,
    pendingRooms,
    unreadMessages,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: { createdAt: { gte: seriesStart, lt: end } },
      select: { createdAt: true },
    }),
    prisma.booking.groupBy({
      by: ["status"],
      where: { createdAt: { gte: start, lt: end } },
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ["role"],
      where: { createdAt: { lt: end } },
      _count: { _all: true },
    }),
    prisma.room.groupBy({
      by: ["city"],
      where: { createdAt: { lt: end } },
      _count: { _all: true },
    }),
    prisma.room.findMany({
      where: { createdAt: { lt: end } },
      select: roomRowSelect,
      orderBy: { createdAt: "desc" },
      take: RECENT_ROOMS_COUNT,
    }),
    prisma.room.findMany({
      where: { status: "PENDING", createdAt: { lt: end } },
      select: roomRowSelect,
      // Les dossiers qui attendent depuis le plus longtemps d'abord : c'est
      // l'ordre dans lequel ils doivent être traités.
      orderBy: { createdAt: "asc" },
      take: PENDING_REQUESTS_COUNT,
    }),
    prisma.room.count({ where: { status: "PENDING" } }),
    prisma.contactMessage.count({ where: { readAt: null } }),
  ]);

  const recentActivity = await getRecentActivity(end);

  const series = lastMonths(SERIES_MONTHS, current).map(({ key, label }) => ({
    key,
    label,
    value: 0,
  }));
  const seriesByMonth = new Map(series.map((point) => [point.key, point]));
  for (const booking of seriesBookings) {
    const point = seriesByMonth.get(monthKey(booking.createdAt));
    if (point) point.value += 1;
  }

  const sortedCities = cityGroups
    .map((group) => ({ city: group.city, value: group._count._all }))
    .sort((a, b) => b.value - a.value);
  const topCities = sortedCities.slice(0, TOP_CITIES_COUNT);
  const otherCities = sortedCities.slice(TOP_CITIES_COUNT);
  if (otherCities.length > 0) {
    topCities.push({
      city: "Autres villes",
      value: otherCities.reduce((sum, city) => sum + city.value, 0),
    });
  }

  const now = new Date();

  return {
    month: {
      key: monthKey(current),
      label: longMonthLabel(current),
      previousLabel: longMonthLabel(addMonths(current, -1)),
      isCurrent: monthKey(current) === monthKey(now),
    },
    kpis: {
      rooms: metric(roomsTotal, roomsPreviousTotal),
      bookings: metric(bookingsMonth, bookingsPrevious),
      users: metric(usersTotal, usersPreviousTotal),
      cashRevenue: metric(
        Number(cashMonth._sum.amount ?? 0),
        Number(cashPrevious._sum.amount ?? 0)
      ),
    },
    bookingsSeries: series,
    bookingsByStatus: statusGroups.map((group) => ({
      status: group.status,
      value: group._count._all,
    })),
    usersByRole: roleGroups.map((group) => ({
      role: group.role,
      value: group._count._all,
    })),
    roomsByCity: topCities,
    recentActivity,
    recentRooms: recentRoomRecords.map(toRoomRow),
    pendingRequests: pendingRoomRecords.map((room) => ({
      ...toRoomRow(room),
      waitingDays: daysSince(room.createdAt, now),
    })),
    badges: { pendingRooms, unreadMessages },
  };
}

/**
 * Fil d'activité : les dernières écritures de chaque table, fusionnées puis
 * triées. Chaque source est plafonnée à la taille du fil — inutile de remonter
 * plus de lignes que le nombre affiché après fusion.
 */
async function getRecentActivity(before: Date): Promise<AdminActivityItem[]> {
  const take = ACTIVITY_COUNT;

  const [rooms, bookings, users, reviews, payments, messages] =
    await Promise.all([
      prisma.room.findMany({
        where: { createdAt: { lt: before } },
        select: { id: true, name: true, city: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.booking.findMany({
        where: { createdAt: { lt: before } },
        select: {
          id: true,
          createdAt: true,
          client: { select: { fullName: true } },
          room: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.user.findMany({
        where: { createdAt: { lt: before } },
        select: { id: true, fullName: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.review.findMany({
        where: { createdAt: { lt: before } },
        select: {
          id: true,
          rating: true,
          createdAt: true,
          room: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.payment.findMany({
        where: { status: "PAID", paidAt: { lt: before, not: null } },
        select: {
          id: true,
          amount: true,
          paidAt: true,
          booking: { select: { room: { select: { name: true } } } },
        },
        orderBy: { paidAt: "desc" },
        take,
      }),
      prisma.contactMessage.findMany({
        where: { createdAt: { lt: before } },
        select: { id: true, fullName: true, subject: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take,
      }),
    ]);

  const items: AdminActivityItem[] = [
    ...rooms.map((room) => ({
      id: `room-${room.id}`,
      kind: "room" as const,
      title: "Nouvelle salle inscrite",
      detail: `${room.name} — ${room.city}`,
      at: room.createdAt.toISOString(),
    })),
    ...bookings.map((booking) => ({
      id: `booking-${booking.id}`,
      kind: "booking" as const,
      title: "Nouvelle réservation",
      detail: `${booking.client.fullName} — ${booking.room.name}`,
      at: booking.createdAt.toISOString(),
    })),
    ...users.map((user) => ({
      id: `user-${user.id}`,
      kind: "user" as const,
      title: "Nouvel utilisateur inscrit",
      detail: `${user.fullName} — ${ACTIVITY_ROLE_LABELS[user.role]}`,
      at: user.createdAt.toISOString(),
    })),
    ...reviews.map((review) => ({
      id: `review-${review.id}`,
      kind: "review" as const,
      title: "Nouvel avis publié",
      detail: `${review.rating}/5 — ${review.room.name}`,
      at: review.createdAt.toISOString(),
    })),
    ...payments.map((payment) => ({
      id: `payment-${payment.id}`,
      kind: "payment" as const,
      title: "Paiement en espèces enregistré",
      detail: `${Number(payment.amount).toLocaleString("fr-DZ")} DA — ${
        payment.booking.room.name
      }`,
      // `paidAt` est non nul : la requête filtre déjà les paiements réglés.
      at: (payment.paidAt as Date).toISOString(),
    })),
    ...messages.map((message) => ({
      id: `message-${message.id}`,
      kind: "message" as const,
      title: "Nouveau message de contact",
      detail: `${message.fullName} — ${message.subject}`,
      at: message.createdAt.toISOString(),
    })),
  ];

  return items
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, ACTIVITY_COUNT);
}

/** Libellé du rôle dans le fil d'activité, au masculin générique court. */
const ACTIVITY_ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: "client",
  OWNER: "propriétaire",
  ADMIN: "administrateur",
};
