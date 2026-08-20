import { prisma } from "@/lib/prisma";
import { DESTINATIONS } from "@/lib/home/content";
import { formatInitials } from "@/lib/format";
import {
  ROOM_SUMMARY_SELECT,
  toRoomSummary,
  type RoomSummary,
} from "@/lib/rooms/types";

/** Nombre de salles affichées dans la section « Salles populaires ». */
export const POPULAR_ROOMS_COUNT = 8;

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
    select: ROOM_SUMMARY_SELECT,
  });

  return rooms
    .map(toRoomSummary)
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

/**
 * Nombre maximum de témoignages affichés sur l'accueil.
 *
 * Six, soit deux rangées de trois sur grand écran : au-delà, la section
 * prendrait plus de place que les salles qu'elle est censée mettre en valeur.
 * L'administration choisit lesquels remontent en jouant sur leur ordre.
 */
export const HOME_TESTIMONIALS_COUNT = 6;

export interface HomeTestimonial {
  id: string;
  name: string;
  role: string;
  rating: number;
  quote: string;
  /** Initiales affichées dans l'avatar, dérivées du nom (aucune photo à ce stade). */
  initials: string;
}

/**
 * Témoignages publiés, dans l'ordre choisi en administration.
 *
 * Renvoie une liste vide tant que rien n'est publié : l'accueil masque alors la
 * section entière plutôt que d'afficher un titre sans contenu.
 */
export async function getHomeTestimonials(
  take: number = HOME_TESTIMONIALS_COUNT
): Promise<HomeTestimonial[]> {
  const rows = await prisma.testimonial.findMany({
    where: { publishedAt: { not: null } },
    orderBy: [{ position: "asc" }, { publishedAt: "desc" }],
    take,
    select: {
      id: true,
      authorName: true,
      role: true,
      rating: true,
      quote: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.authorName,
    role: row.role,
    rating: row.rating,
    quote: row.quote,
    initials: formatInitials(row.authorName),
  }));
}
