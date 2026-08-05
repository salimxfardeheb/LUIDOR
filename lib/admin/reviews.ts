import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Modération des avis.
 *
 * Un avis existe dès son dépôt ; `publishedAt` décide s'il paraît sur la fiche
 * salle. La modération ne réécrit jamais un commentaire — elle le publie ou le
 * supprime, pour que l'avis affiché reste bien celui du client.
 */

export const REVIEW_STATES = ["PENDING", "PUBLISHED"] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

export const REVIEW_STATE_LABELS: Record<ReviewState, string> = {
  PENDING: "En attente de modération",
  PUBLISHED: "Publié",
};

export const RATINGS = [5, 4, 3, 2, 1] as const;

export interface ReviewFilters {
  /** Note exacte, `null` pour toutes. */
  rating: number | null;
  /** `null` = publiés et en attente. */
  state: ReviewState | null;
}

export const NO_REVIEW_FILTERS: ReviewFilters = { rating: null, state: null };

export const REVIEWS_PATH = "/admin/avis";

export const REVIEW_FILTER_PARAMS = { rating: "note", state: "etat" } as const;
export const ALL_FILTER_VALUE = "tous";

export interface AdminReviewRow {
  id: string;
  rating: number;
  comment: string;
  photoUrl: string | null;
  /** Date de dépôt, au format ISO. */
  createdAt: string;
  /** Date de publication au format ISO, `null` si l'avis attend la modération. */
  publishedAt: string | null;
  authorName: string;
  authorEmail: string;
  authorAvatarUrl: string | null;
  roomId: string;
  roomName: string;
  roomCity: string;
}

export interface ReviewCounts {
  total: number;
  pending: number;
  published: number;
  /** Note moyenne des avis publiés, `null` si aucun. */
  averageRating: number | null;
}

export interface ReviewSearchParams {
  note?: string;
  etat?: string;
}

function isState(value: string): value is ReviewState {
  return (REVIEW_STATES as readonly string[]).includes(value);
}

/** Filtres validés ; une valeur inconnue retombe sur « tous ». */
export function parseReviewFilters(
  searchParams: ReviewSearchParams
): ReviewFilters {
  const rating = Number(searchParams.note);

  return {
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
    state: searchParams.etat && isState(searchParams.etat) ? searchParams.etat : null,
  };
}

export function hasActiveReviewFilters(filters: ReviewFilters): boolean {
  return filters.rating !== null || filters.state !== null;
}

export function buildReviewsHref(filters: ReviewFilters): string {
  const params = new URLSearchParams();
  if (filters.rating) {
    params.set(REVIEW_FILTER_PARAMS.rating, String(filters.rating));
  }
  if (filters.state) params.set(REVIEW_FILTER_PARAMS.state, filters.state);

  const query = params.toString();
  return query ? `${REVIEWS_PATH}?${query}` : REVIEWS_PATH;
}

function whereFromFilters(filters: ReviewFilters): Prisma.ReviewWhereInput {
  const where: Prisma.ReviewWhereInput = {};

  if (filters.rating) where.rating = filters.rating;
  if (filters.state) {
    where.publishedAt = filters.state === "PUBLISHED" ? { not: null } : null;
  }

  return where;
}

/**
 * Avis correspondant aux filtres.
 *
 * Les avis en attente d'abord, puis les plus récents : ce qui demande une
 * décision se lit avant ce qui est déjà tranché.
 */
export async function listAdminReviews(
  filters: ReviewFilters
): Promise<AdminReviewRow[]> {
  const reviews = await prisma.review.findMany({
    where: whereFromFilters(filters),
    orderBy: [{ publishedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    select: {
      id: true,
      rating: true,
      comment: true,
      photoUrl: true,
      createdAt: true,
      publishedAt: true,
      client: { select: { fullName: true, email: true, avatarUrl: true } },
      room: { select: { id: true, name: true, city: true } },
    },
  });

  return reviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    photoUrl: review.photoUrl,
    createdAt: review.createdAt.toISOString(),
    publishedAt: review.publishedAt?.toISOString() ?? null,
    authorName: review.client.fullName,
    authorEmail: review.client.email,
    authorAvatarUrl: review.client.avatarUrl,
    roomId: review.room.id,
    roomName: review.room.name,
    roomCity: review.room.city,
  }));
}

export async function getReviewCounts(): Promise<ReviewCounts> {
  const [total, pending, aggregate] = await Promise.all([
    prisma.review.count(),
    prisma.review.count({ where: { publishedAt: null } }),
    prisma.review.aggregate({
      where: { publishedAt: { not: null } },
      _avg: { rating: true },
    }),
  ]);

  return {
    total,
    pending,
    published: total - pending,
    averageRating: aggregate._avg.rating,
  };
}
