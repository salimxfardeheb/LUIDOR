import { prisma } from "@/lib/prisma";

/**
 * Gestion des articles du blog.
 *
 * Un article est un brouillon tant que `publishedAt` est nul ; publier revient
 * à dater sa mise en ligne. Le contenu est stocké tel qu'il est saisi et rendu
 * en texte structuré côté public — aucun HTML n'est enregistré, ce qui écarte
 * l'injection de balises par l'éditeur.
 */

export interface AdminPostRow {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  /** Date de publication ISO, `null` pour un brouillon. */
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Nombre de caractères du contenu, pour situer l'avancement d'un brouillon. */
  contentLength: number;
}

export interface AdminPost extends AdminPostRow {
  content: string;
}

export interface PostCounts {
  total: number;
  published: number;
  drafts: number;
}

/** Slug lisible et stable : « Les 5 salles d'Alger » → « les-5-salles-d-alger ». */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    // Retire les diacritiques décomposés par NFD : « é » devient « e », et le
    // slug reste en ASCII, sûr dans une URL.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

/**
 * Slug libre, suffixé si le titre reprend celui d'un article existant.
 *
 * `excludeId` laisse un article conserver son propre slug lors d'une
 * modification, sans se considérer lui-même comme un doublon.
 */
export async function uniqueSlug(
  base: string,
  excludeId?: string
): Promise<string> {
  const root = slugify(base) || "article";

  for (let suffix = 0; suffix < 50; suffix++) {
    const candidate = suffix === 0 ? root : `${root}-${suffix + 1}`;
    const existing = await prisma.blogPost.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === excludeId) return candidate;
  }

  // Cinquante homonymes : on tranche avec un suffixe temporel plutôt que de
  // boucler indéfiniment.
  return `${root}-${Date.now().toString(36)}`;
}

export async function listBlogPosts(): Promise<AdminPostRow[]> {
  const posts = await prisma.blogPost.findMany({
    orderBy: [{ publishedAt: { sort: "desc", nulls: "first" } }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      coverImageUrl: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      content: true,
    },
  });

  return posts.map(({ content, ...post }) => ({
    ...post,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    contentLength: content.length,
  }));
}

export async function getBlogPost(id: string): Promise<AdminPost | null> {
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) return null;

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    coverImageUrl: post.coverImageUrl,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    contentLength: post.content.length,
  };
}

export async function getPostCounts(): Promise<PostCounts> {
  const [total, published] = await Promise.all([
    prisma.blogPost.count(),
    prisma.blogPost.count({ where: { publishedAt: { not: null } } }),
  ]);

  return { total, published, drafts: total - published };
}
