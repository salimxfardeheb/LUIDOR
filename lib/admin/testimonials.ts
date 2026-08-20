import { prisma } from "@/lib/prisma";

/**
 * Témoignages mis en avant sur la page d'accueil.
 *
 * Même cycle de vie qu'un article de blog : un témoignage reste un brouillon
 * tant que `publishedAt` est nul, ce qui laisse le temps de le relire avant
 * qu'il n'apparaisse sur la vitrine.
 *
 * Les initiales de l'avatar ne sont pas stockées : `formatInitials` les dérive
 * du nom au rendu. Un champ de plus se serait désynchronisé à la première
 * correction d'orthographe.
 */

export const RATING_MIN = 1;
export const RATING_MAX = 5;

/** Longueurs retenues côté serveur comme côté formulaire. */
export const QUOTE_MIN_LENGTH = 40;
export const QUOTE_MAX_LENGTH = 400;

export interface AdminTestimonial {
  id: string;
  authorName: string;
  /** Contexte affiché sous le nom, ex. « Mariage · Alger ». */
  role: string;
  rating: number;
  quote: string;
  position: number;
  /** Date de publication ISO, `null` pour un brouillon. */
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type TestimonialRow = Awaited<
  ReturnType<typeof prisma.testimonial.findFirstOrThrow>
>;

function toAdminTestimonial(row: TestimonialRow): AdminTestimonial {
  return {
    id: row.id,
    authorName: row.authorName,
    role: row.role,
    rating: row.rating,
    quote: row.quote,
    position: row.position,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Liste d'administration, dans l'ordre d'affichage de l'accueil.
 *
 * Les brouillons suivent la même règle de tri que les témoignages publiés : ils
 * se placent donc là où ils apparaîtront une fois en ligne, ce qui rend la
 * colonne « Ordre » lisible sans avoir à publier pour vérifier.
 */
export async function listTestimonials(): Promise<AdminTestimonial[]> {
  const rows = await prisma.testimonial.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
  });

  return rows.map(toAdminTestimonial);
}

export async function getTestimonial(
  id: string
): Promise<AdminTestimonial | null> {
  const row = await prisma.testimonial.findUnique({ where: { id } });
  return row ? toAdminTestimonial(row) : null;
}

export interface TestimonialCounts {
  total: number;
  published: number;
  drafts: number;
}

export async function getTestimonialCounts(): Promise<TestimonialCounts> {
  const [total, published] = await Promise.all([
    prisma.testimonial.count(),
    prisma.testimonial.count({ where: { publishedAt: { not: null } } }),
  ]);

  return { total, published, drafts: total - published };
}

/**
 * Position proposée à la création : après le dernier témoignage existant.
 *
 * Un nouveau témoignage arrive ainsi en fin de liste plutôt que de s'insérer en
 * tête à égalité avec les autres — l'ordre déjà en place n'est pas bousculé.
 */
export async function nextPosition(): Promise<number> {
  const last = await prisma.testimonial.findFirst({
    orderBy: { position: "desc" },
    select: { position: true },
  });

  return (last?.position ?? 0) + 1;
}
