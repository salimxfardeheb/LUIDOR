import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { excerptFrom, readingMinutes } from "@/lib/blog/content";

/**
 * Lecture publique du blog.
 *
 * Un article n'est visible que s'il est publié : `publishedAt` renseigné *et*
 * déjà passé. La date, et non un simple booléen, permet de dater une mise en
 * ligne — cette même condition est donc la seule porte d'entrée du site public,
 * l'administration passant par lib/admin/blog.ts.
 */

/** Articles affichés par page sur `/blog` — 3 lignes de 3 en desktop. */
export const POSTS_PER_PAGE = 9;

/** Nombre d'articles suggérés en fin d'article. */
export const RELATED_POSTS_COUNT = 3;

export interface BlogPostSummary {
  id: string;
  title: string;
  slug: string;
  /** Début du contenu, coupé sur un mot entier. */
  excerpt: string;
  coverImageUrl: string | null;
  /** Date de publication ISO — toujours renseignée côté public. */
  publishedAt: string;
  readingMinutes: number;
}

export interface BlogPostDetail extends BlogPostSummary {
  /** Contenu brut, mis en forme par `parseBlogContent`. */
  content: string;
}

export interface BlogPostsPage {
  posts: BlogPostSummary[];
  /** Nombre total d'articles publiés, toutes pages confondues. */
  total: number;
  /** Page réellement servie : ramenée dans les bornes si l'URL dépasse. */
  page: number;
  pageCount: number;
}

const EMPTY_PAGE: BlogPostsPage = { posts: [], total: 0, page: 1, pageCount: 0 };

const SUMMARY_SELECT = {
  id: true,
  title: true,
  slug: true,
  coverImageUrl: true,
  publishedAt: true,
  content: true,
} satisfies Prisma.BlogPostSelect;

type SummaryRow = Prisma.BlogPostGetPayload<{ select: typeof SUMMARY_SELECT }>;

/** Seuls les articles déjà en ligne sont exposés au public. */
function publishedWhere(): Prisma.BlogPostWhereInput {
  return { publishedAt: { not: null, lte: new Date() } };
}

function toSummary(row: SummaryRow): BlogPostSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: excerptFrom(row.content),
    coverImageUrl: row.coverImageUrl,
    // `publishedWhere` garantit la date : le repli ne sert qu'au typage.
    publishedAt: (row.publishedAt ?? new Date()).toISOString(),
    readingMinutes: readingMinutes(row.content),
  };
}

/** Une page d'articles publiés, du plus récent au plus ancien. */
export async function getPublishedPosts(
  requestedPage: number,
  perPage: number = POSTS_PER_PAGE
): Promise<BlogPostsPage> {
  const where = publishedWhere();

  const total = await prisma.blogPost.count({ where });
  if (total === 0) return EMPTY_PAGE;

  const pageCount = Math.ceil(total / perPage);
  // Une page hors bornes (URL modifiée à la main) retombe sur la dernière.
  const page = Math.min(Math.max(requestedPage, 1), pageCount);

  const rows = await prisma.blogPost.findMany({
    where,
    select: SUMMARY_SELECT,
    orderBy: { publishedAt: "desc" },
    skip: (page - 1) * perPage,
    take: perPage,
  });

  return { posts: rows.map(toSummary), total, page, pageCount };
}

/** Article publié désigné par son slug, `null` s'il n'existe pas ou est en brouillon. */
export async function getPublishedPost(
  slug: string
): Promise<BlogPostDetail | null> {
  const row = await prisma.blogPost.findFirst({
    where: { slug, ...publishedWhere() },
    select: SUMMARY_SELECT,
  });

  if (!row) return null;

  return { ...toSummary(row), content: row.content };
}

/**
 * Articles suggérés en fin de lecture : les plus récents, hors article courant.
 *
 * Le modèle ne porte ni catégorie ni étiquette : la fraîcheur est le seul
 * critère de proximité disponible aujourd'hui.
 */
export async function getRelatedPosts(
  excludeId: string,
  limit: number = RELATED_POSTS_COUNT
): Promise<BlogPostSummary[]> {
  const rows = await prisma.blogPost.findMany({
    where: { id: { not: excludeId }, ...publishedWhere() },
    select: SUMMARY_SELECT,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  return rows.map(toSummary);
}
