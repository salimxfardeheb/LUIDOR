import { prisma } from "@/lib/prisma";
import { DESTINATIONS } from "@/lib/home/content";

/** Nombre de salles affichées dans la section « Salles populaires ». */
export const POPULAR_ROOMS_COUNT = 8;

/**
 * Salle telle que consommée par l'UI : uniquement des types sérialisables,
 * pour pouvoir traverser la frontière serveur → composant client
 * (`Decimal` de Prisma ne l'est pas).
 */
export interface RoomSummary {
  id: string;
  name: string;
  city: string;
  categoryName: string;
  capacityMin: number;
  capacityMax: number;
  basePrice: number;
  /** Moyenne des avis, ou `null` si la salle n'a encore aucun avis. */
  rating: number | null;
  reviewCount: number;
  photoUrl: string | null;
}

/**
 * Les 8 salles ACTIVE les mieux notées.
 *
 * Le tri se fait en mémoire : Prisma ne sait pas trier une relation par
 * moyenne d'agrégat, et le classement doit rester déterministe même pour les
 * salles sans avis (placées après les salles notées). À passer sur une colonne
 * `rating` dénormalisée le jour où le catalogue dépasse quelques centaines de
 * salles.
 */
export async function getPopularRooms(
  take: number = POPULAR_ROOMS_COUNT
): Promise<RoomSummary[]> {
  const rooms = await prisma.room.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      city: true,
      capacityMin: true,
      capacityMax: true,
      basePrice: true,
      category: { select: { name: true } },
      photos: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
      reviews: { select: { rating: true } },
    },
  });

  return rooms
    .map((room): RoomSummary => {
      const reviewCount = room.reviews.length;
      const total = room.reviews.reduce((sum, r) => sum + r.rating, 0);

      return {
        id: room.id,
        name: room.name,
        city: room.city,
        categoryName: room.category.name,
        capacityMin: room.capacityMin,
        capacityMax: room.capacityMax,
        basePrice: Number(room.basePrice),
        rating: reviewCount > 0 ? total / reviewCount : null,
        reviewCount,
        photoUrl: room.photos[0]?.url ?? null,
      };
    })
    .sort(
      (a, b) =>
        (b.rating ?? -1) - (a.rating ?? -1) || b.reviewCount - a.reviewCount
    )
    .slice(0, take);
}

export interface DestinationSummary {
  city: string;
  image: string | null;
  roomCount: number;
}

/**
 * Villes mises en avant, avec leur nombre réel de salles ACTIVE.
 * La liste et l'ordre viennent de l'éditorial ; seul le compteur vient de la base.
 */
export async function getPopularDestinations(): Promise<DestinationSummary[]> {
  const counts = await prisma.room.groupBy({
    by: ["city"],
    where: {
      status: "ACTIVE",
      city: { in: DESTINATIONS.map((d) => d.city) },
    },
    _count: { _all: true },
  });

  const countByCity = new Map(counts.map((c) => [c.city, c._count._all]));

  return DESTINATIONS.map((destination) => ({
    ...destination,
    roomCount: countByCity.get(destination.city) ?? 0,
  }));
}
