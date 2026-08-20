import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ROOM_SUMMARY_SELECT,
  toRoomSummary,
  type RoomSummary,
} from "@/lib/rooms/types";

/** Avis chargés avec la fiche : les plus récents, le reste reste en base. */
const REVIEWS_LIMIT = 12;

/** Salles similaires affichées en bas de fiche. */
export const SIMILAR_ROOMS_COUNT = 4;

export interface RoomReview {
  id: string;
  rating: number;
  comment: string;
  /** Photo jointe par le client, affichée en vignette. */
  photoUrl: string | null;
  createdAt: Date;
  authorName: string;
  /** Initiales affichées à défaut d'avatar. */
  authorInitials: string;
  authorAvatarUrl: string | null;
}

export interface RoomOwner {
  id: string;
  fullName: string;
  initials: string;
  avatarUrl: string | null;
  role: "CLIENT" | "OWNER" | "ADMIN";
  memberSince: Date;
  responseTimeHours: number | null;
  languages: string[];
}

/** Répartition des notes, de 5 à 1 étoile. */
export interface RatingBucket {
  stars: number;
  count: number;
  /** Part des avis, arrondie à l'entier — 0 quand il n'y a aucun avis. */
  percent: number;
}

/**
 * Fiche salle complète, entièrement sérialisable : les `Decimal` de Prisma sont
 * convertis en nombres pour pouvoir traverser la frontière serveur → client.
 */
export interface RoomDetail {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  city: string;
  district: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  capacityMin: number;
  capacityMax: number;
  basePrice: number;
  surfaceM2: number | null;
  spacesCount: number | null;
  hasParking: boolean;
  hasAccommodation: boolean;
  /** Salle contrôlée par l'équipe LIUDOR : affiche le badge « Vérifiée ». */
  verified: boolean;
  videoUrl: string | null;
  openingHours: string | null;
  musicPolicy: string | null;
  cancellationPolicy: string | null;
  cancellationTerms: string | null;
  depositAmount: number | null;
  cleaningFee: number | null;
  petsAllowed: boolean;
  wheelchairAccess: boolean;
  photos: string[];
  /** Équipements de la salle, avec la précision saisie par le propriétaire. */
  equipments: { name: string; detail: string | null }[];
  services: { id: string; name: string; price: number }[];
  rating: number | null;
  reviewCount: number;
  ratingBreakdown: RatingBucket[];
  reviews: RoomReview[];
  owner: RoomOwner;
}

const ROOM_DETAIL_INCLUDE = {
  category: { select: { name: true } },
  owner: {
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      responseTimeHours: true,
      languages: true,
    },
  },
  photos: { select: { url: true }, orderBy: { position: "asc" } },
  equipments: {
    select: { detail: true, equipment: { select: { name: true } } },
    orderBy: { equipment: { name: "asc" } },
  },
  services: {
    select: { service: { select: { id: true, name: true, price: true } } },
    orderBy: { service: { name: "asc" } },
  },
  reviews: {
    // Seuls les avis publiés paraissent sur la fiche : un avis en attente de
    // modération existe en base sans être visible du public.
    where: { publishedAt: { not: null } },
    select: {
      id: true,
      rating: true,
      comment: true,
      photoUrl: true,
      createdAt: true,
      client: { select: { fullName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: REVIEWS_LIMIT,
  },
} satisfies Prisma.RoomInclude;

/** « Amina Belkacem » → « AB ». */
function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function decimal(value: Prisma.Decimal | null): number | null {
  return value === null ? null : Number(value);
}

/**
 * Fiche d'une salle publiée.
 *
 * Le segment d'URL est l'identifiant de la salle : c'est ce que produisent tous
 * les liens de l'application (`/salles/<id>`). Renvoie `null` si la salle
 * n'existe pas ou n'est pas `ACTIVE`, pour que la page rende un 404 — une salle
 * en attente de validation ou suspendue ne doit pas être visible publiquement.
 */
export async function getRoomDetail(id: string): Promise<RoomDetail | null> {
  const room = await prisma.room.findFirst({
    where: { id, status: "ACTIVE" },
    include: ROOM_DETAIL_INCLUDE,
  });

  if (!room) return null;

  // La répartition porte sur tous les avis *publiés*, pas seulement sur les
  // douze chargés ci-dessus.
  const grouped = await prisma.review.groupBy({
    by: ["rating"],
    where: { roomId: room.id, publishedAt: { not: null } },
    _count: { _all: true },
  });

  const countByRating = new Map(
    grouped.map((group) => [group.rating, group._count._all])
  );
  const reviewCount = grouped.reduce(
    (total, group) => total + group._count._all,
    0
  );
  const ratingTotal = grouped.reduce(
    (total, group) => total + group.rating * group._count._all,
    0
  );

  const ratingBreakdown: RatingBucket[] = [5, 4, 3, 2, 1].map((stars) => {
    const count = countByRating.get(stars) ?? 0;
    return {
      stars,
      count,
      percent: reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0,
    };
  });

  return {
    id: room.id,
    name: room.name,
    description: room.description,
    categoryName: room.category.name,
    city: room.city,
    district: room.district,
    address: room.address,
    latitude: room.latitude,
    longitude: room.longitude,
    capacityMin: room.capacityMin,
    capacityMax: room.capacityMax,
    basePrice: Number(room.basePrice),
    surfaceM2: room.surfaceM2,
    spacesCount: room.spacesCount,
    hasParking: room.hasParking,
    hasAccommodation: room.hasAccommodation,
    verified: room.verifiedAt !== null,
    videoUrl: room.videoUrl,
    openingHours: room.openingHours,
    musicPolicy: room.musicPolicy,
    cancellationPolicy: room.cancellationPolicy,
    cancellationTerms: room.cancellationTerms,
    depositAmount: decimal(room.depositAmount),
    cleaningFee: decimal(room.cleaningFee),
    petsAllowed: room.petsAllowed,
    wheelchairAccess: room.wheelchairAccess,
    photos: room.photos.map((photo) => photo.url),
    equipments: room.equipments.map((link) => ({
      name: link.equipment.name,
      detail: link.detail,
    })),
    services: room.services.map((link) => ({
      id: link.service.id,
      name: link.service.name,
      price: Number(link.service.price),
    })),
    rating: reviewCount > 0 ? ratingTotal / reviewCount : null,
    reviewCount,
    ratingBreakdown,
    reviews: room.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      photoUrl: review.photoUrl,
      createdAt: review.createdAt,
      authorName: review.client.fullName,
      authorInitials: initials(review.client.fullName),
      authorAvatarUrl: review.client.avatarUrl,
    })),
    owner: {
      id: room.owner.id,
      fullName: room.owner.fullName,
      initials: initials(room.owner.fullName),
      avatarUrl: room.owner.avatarUrl,
      role: room.owner.role,
      memberSince: room.owner.createdAt,
      responseTimeHours: room.owner.responseTimeHours,
      languages: room.owner.languages,
    },
  };
}

/**
 * Salles similaires : même catégorie en priorité, complétées par des salles de
 * la même ville si la catégorie n'en fournit pas assez.
 */
export async function getSimilarRooms(
  room: Pick<RoomDetail, "id" | "categoryName" | "city">,
  take: number = SIMILAR_ROOMS_COUNT
): Promise<RoomSummary[]> {
  const sameCategory = await prisma.room.findMany({
    where: {
      status: "ACTIVE",
      id: { not: room.id },
      // Au moins une catégorie en commun, principale ou secondaire.
      categories: { some: { category: { name: room.categoryName } } },
    },
    select: ROOM_SUMMARY_SELECT,
    orderBy: { createdAt: "desc" },
    take,
  });

  if (sameCategory.length >= take) {
    return sameCategory.map(toRoomSummary);
  }

  const fallback = await prisma.room.findMany({
    where: {
      status: "ACTIVE",
      id: { not: room.id, notIn: sameCategory.map((item) => item.id) },
      city: room.city,
    },
    select: ROOM_SUMMARY_SELECT,
    orderBy: { createdAt: "desc" },
    take: take - sameCategory.length,
  });

  return [...sameCategory, ...fallback].map(toRoomSummary);
}

export type DayStatus = "available" | "booked" | "pending" | "closed";

export interface CalendarDay {
  /** Date au format `YYYY-MM-DD`. */
  date: string;
  status: DayStatus;
}

export interface CalendarMonth {
  year: number;
  /** Mois sur 1-12. */
  month: number;
  days: CalendarDay[];
}

/** Nombre de mois préchargés par le mini calendrier de la sidebar. */
export const CALENDAR_MONTHS = 3;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Disponibilités du mois courant et des mois suivants.
 *
 * Les trois mois sont chargés d'un coup : la navigation du mini calendrier est
 * alors instantanée et ne déclenche aucune requête supplémentaire. Un jour sans
 * ligne `Availability` est `closed` — le propriétaire n'a pas encore ouvert
 * cette période à la réservation.
 */
export async function getRoomCalendar(
  roomId: string,
  monthCount: number = CALENDAR_MONTHS
): Promise<CalendarMonth[]> {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthCount, 1)
  );

  const [availabilities, bookings] = await Promise.all([
    prisma.availability.findMany({
      where: { roomId, date: { gte: from, lt: to } },
      select: { date: true, status: true },
    }),
    prisma.booking.findMany({
      where: {
        roomId,
        eventDate: { gte: from, lt: to },
        status: { in: ["EN_ATTENTE", "EN_COURS_VERIFICATION", "CONFIRMEE"] },
      },
      select: { eventDate: true, status: true },
    }),
  ]);

  const statusByDay = new Map<string, DayStatus>();

  for (const availability of availabilities) {
    statusByDay.set(
      isoDay(availability.date),
      availability.status === "BLOCKED" ? "booked" : "available"
    );
  }

  // Une réservation prime sur la disponibilité : confirmée = réservé, en cours
  // de vérification ou en attente = en attente.
  for (const booking of bookings) {
    statusByDay.set(
      isoDay(booking.eventDate),
      booking.status === "CONFIRMEE" ? "booked" : "pending"
    );
  }

  return Array.from({ length: monthCount }, (_, offset) => {
    const first = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)
    );
    const dayCount = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)
    ).getUTCDate();

    return {
      year: first.getUTCFullYear(),
      month: first.getUTCMonth() + 1,
      days: Array.from({ length: dayCount }, (_, index) => {
        const date = isoDay(
          new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), index + 1))
        );
        return { date, status: statusByDay.get(date) ?? "closed" };
      }),
    };
  });
}
