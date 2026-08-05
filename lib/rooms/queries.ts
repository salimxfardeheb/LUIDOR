import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ROOM_SUMMARY_SELECT,
  toRoomSummary,
  type RoomSummary,
} from "@/lib/rooms/types";
import type { RoomFilters, SortKey } from "@/lib/rooms/search-params";

/** Salles affichées par page, sur le catalogue comme sur les résultats. */
export const ROOMS_PER_PAGE = 12;

export interface RoomsPage {
  rooms: RoomSummary[];
  /** Nombre total de salles correspondant aux critères, toutes pages confondues. */
  total: number;
  /** Page réellement servie : ramenée dans les bornes si l'URL dépasse. */
  page: number;
  pageCount: number;
}

const EMPTY_PAGE: RoomsPage = { rooms: [], total: 0, page: 1, pageCount: 0 };

/**
 * Réservations qui rendent une salle indisponible à une date donnée. Une demande
 * `EN_ATTENTE` ne bloque rien : elle n'est pas encore vérifiée par l'équipe.
 */
const BLOCKING_BOOKING_STATUSES = [
  "EN_COURS_VERIFICATION",
  "CONFIRMEE",
] satisfies Prisma.EnumBookingStatusFilter["in"];

const ORDER_BY: Record<SortKey, Prisma.RoomOrderByWithRelationInput[]> = {
  // À défaut de score de pertinence, les salles les plus récentes d'abord.
  pertinence: [{ createdAt: "desc" }],
  "prix-asc": [{ basePrice: "asc" }, { createdAt: "desc" }],
  "prix-desc": [{ basePrice: "desc" }, { createdAt: "desc" }],
  capacite: [{ capacityMax: "desc" }, { createdAt: "desc" }],
  // Le tri par note ne passe pas par `orderBy` : voir `findPageByRating`.
  note: [{ createdAt: "desc" }],
};

/** `@db.Date` est stocké à minuit UTC : la comparaison doit l'être aussi. */
function toUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/**
 * Clause `where` commune : seules les salles `ACTIVE` sont publiques, les
 * critères actifs s'ajoutent en `AND`.
 */
function buildWhere(filters: RoomFilters): Prisma.RoomWhereInput {
  const conditions: Prisma.RoomWhereInput[] = [];

  if (filters.ville) {
    conditions.push({ city: { contains: filters.ville, mode: "insensitive" } });
  }

  // Rattachement, et non catégorie principale : une salle proposée pour
  // plusieurs types d'événement doit ressortir sur chacun d'eux.
  if (filters.type) {
    conditions.push({ categories: { some: { category: { name: filters.type } } } });
  }

  // Nombre d'invités : la fourchette de la salle doit l'englober.
  if (filters.invites) {
    conditions.push({
      capacityMin: { lte: filters.invites },
      capacityMax: { gte: filters.invites },
    });
  }

  // Capacité : on garde les salles dont la fourchette croise celle demandée.
  if (filters.capaciteMin) {
    conditions.push({ capacityMax: { gte: filters.capaciteMin } });
  }
  if (filters.capaciteMax) {
    conditions.push({ capacityMin: { lte: filters.capaciteMax } });
  }

  if (filters.prixMin) {
    conditions.push({ basePrice: { gte: filters.prixMin } });
  }
  if (filters.prixMax) {
    conditions.push({ basePrice: { lte: filters.prixMax } });
  }

  // Équipements cumulatifs : une condition `some` par équipement coché.
  for (const name of filters.equipements) {
    conditions.push({ equipments: { some: { equipment: { name } } } });
  }

  if (filters.date) {
    const date = toUtcDate(filters.date);
    conditions.push({
      availabilities: { none: { date, status: "BLOCKED" } },
      bookings: {
        none: { eventDate: date, status: { in: BLOCKING_BOOKING_STATUSES } },
      },
    });
  }

  return conditions.length > 0
    ? { status: "ACTIVE", AND: conditions }
    : { status: "ACTIVE" };
}

/** Pagination SQL classique : `count` + `skip`/`take`. */
async function findPage(
  where: Prisma.RoomWhereInput,
  orderBy: Prisma.RoomOrderByWithRelationInput[],
  requestedPage: number,
  perPage: number
): Promise<RoomsPage> {
  const total = await prisma.room.count({ where });
  if (total === 0) return EMPTY_PAGE;

  const pageCount = Math.ceil(total / perPage);
  // Une page hors bornes (URL modifiée à la main) retombe sur la dernière.
  const page = Math.min(requestedPage, pageCount);

  const rows = await prisma.room.findMany({
    where,
    select: ROOM_SUMMARY_SELECT,
    orderBy,
    skip: (page - 1) * perPage,
    take: perPage,
  });

  return { rooms: rows.map(toRoomSummary), total, page, pageCount };
}

/**
 * Tri par note moyenne.
 *
 * Prisma ne sait pas trier sur la moyenne d'une relation : on récupère donc les
 * identifiants correspondants, on les classe à partir d'un `groupBy` sur les
 * avis, puis on ne charge que les 12 salles de la page. Le coût reste borné à
 * deux requêtes légères + une requête complète, sans jamais charger tout le
 * catalogue en mémoire. À remplacer par une colonne `rating` dénormalisée si le
 * volume de salles devient important.
 */
async function findPageByRating(
  where: Prisma.RoomWhereInput,
  requestedPage: number,
  perPage: number
): Promise<RoomsPage> {
  const matching = await prisma.room.findMany({
    where,
    select: { id: true, createdAt: true },
  });

  const total = matching.length;
  if (total === 0) return EMPTY_PAGE;

  const pageCount = Math.ceil(total / perPage);
  const page = Math.min(requestedPage, pageCount);

  const stats = await prisma.review.groupBy({
    by: ["roomId"],
    // Une note moyenne annoncée au catalogue ne compte que les avis publiés :
    // elle doit correspondre à ce que le visiteur lira sur la fiche.
    where: {
      roomId: { in: matching.map((room) => room.id) },
      publishedAt: { not: null },
    },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const statsByRoom = new Map(
    stats.map((stat) => [
      stat.roomId,
      { rating: stat._avg.rating ?? 0, count: stat._count._all },
    ])
  );

  // Les salles sans avis passent après les salles notées (note fictive -1),
  // et les ex æquo sont départagés par le nombre d'avis puis la date.
  const pageIds = matching
    .map((room) => {
      const stat = statsByRoom.get(room.id);
      return {
        id: room.id,
        createdAt: room.createdAt,
        rating: stat ? stat.rating : -1,
        reviewCount: stat?.count ?? 0,
      };
    })
    .sort(
      (a, b) =>
        b.rating - a.rating ||
        b.reviewCount - a.reviewCount ||
        b.createdAt.getTime() - a.createdAt.getTime()
    )
    .slice((page - 1) * perPage, page * perPage)
    .map((room) => room.id);

  const rows = await prisma.room.findMany({
    where: { id: { in: pageIds } },
    select: ROOM_SUMMARY_SELECT,
  });

  // `findMany` ne garantit pas l'ordre du `in` : on rétablit le classement.
  const byId = new Map(rows.map((row) => [row.id, row]));
  const rooms = pageIds
    .map((id) => byId.get(id))
    .filter((row): row is (typeof rows)[number] => row !== undefined)
    .map(toRoomSummary);

  return { rooms, total, page, pageCount };
}

/** Résultats de recherche filtrés, triés et paginés. */
export async function searchRooms(
  filters: RoomFilters,
  perPage: number = ROOMS_PER_PAGE
): Promise<RoomsPage> {
  const where = buildWhere(filters);

  return filters.tri === "note"
    ? findPageByRating(where, filters.page, perPage)
    : findPage(where, ORDER_BY[filters.tri], filters.page, perPage);
}

/**
 * Catalogue : toutes les salles `ACTIVE`, éventuellement restreintes à une
 * catégorie, les plus récentes en premier.
 */
export async function getCatalogRooms(
  categoryName: string | null,
  page: number,
  perPage: number = ROOMS_PER_PAGE
): Promise<RoomsPage> {
  const where: Prisma.RoomWhereInput = categoryName
    ? {
        status: "ACTIVE",
        categories: { some: { category: { name: categoryName } } },
      }
    : { status: "ACTIVE" };

  return findPage(where, ORDER_BY.pertinence, page, perPage);
}

export interface RoomFilterOptions {
  /** Villes ayant au moins une salle publiée. */
  cities: string[];
  /** Équipements référencés, pour les cases à cocher du panneau de filtres. */
  equipments: string[];
}

/** Valeurs proposées par le `FilterPanel`, lues en base plutôt que codées en dur. */
export async function getRoomFilterOptions(): Promise<RoomFilterOptions> {
  const [cities, equipments] = await Promise.all([
    prisma.room.findMany({
      where: { status: "ACTIVE" },
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
    }),
    prisma.equipment.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    cities: cities.map((room) => room.city),
    equipments: equipments.map((equipment) => equipment.name),
  };
}
