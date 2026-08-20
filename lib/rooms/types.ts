import type { Prisma } from "@prisma/client";

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
  /** `null` quand la salle n'annonce pas de minimum. */
  capacityMin: number | null;
  capacityMax: number;
  basePrice: number;
  /** Moyenne des avis, ou `null` si la salle n'a encore aucun avis. */
  rating: number | null;
  reviewCount: number;
  photoUrl: string | null;
}

/**
 * Projection minimale nécessaire à `RoomCard`. Partagée par l'accueil, le
 * catalogue et la recherche pour que les trois grilles affichent exactement
 * les mêmes informations.
 */
export const ROOM_SUMMARY_SELECT = {
  id: true,
  name: true,
  city: true,
  capacityMin: true,
  capacityMax: true,
  basePrice: true,
  category: { select: { name: true } },
  photos: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
  reviews: { select: { rating: true } },
} satisfies Prisma.RoomSelect;

export type RoomSummaryRow = Prisma.RoomGetPayload<{
  select: typeof ROOM_SUMMARY_SELECT;
}>;

/** Convertit une ligne Prisma en `RoomSummary` (note moyenne incluse). */
export function toRoomSummary(room: RoomSummaryRow): RoomSummary {
  const reviewCount = room.reviews.length;
  const total = room.reviews.reduce((sum, review) => sum + review.rating, 0);

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
}
