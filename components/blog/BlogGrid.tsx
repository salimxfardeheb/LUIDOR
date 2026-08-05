import { BlogCard, BlogCardSkeleton } from "@/components/blog/BlogCard";
import type { BlogPostSummary } from "@/lib/blog/queries";
import { cn } from "@/lib/utils";

/**
 * Grille d'articles : 1 colonne en mobile, 2 à partir de `sm`, 3 à partir de
 * `lg`. Les articles suggérés en fin de lecture réutilisent la même grille.
 */
export const BLOG_GRID_CLASSES = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

/** Cartes dont la couverture est préchargée : la première ligne en desktop. */
const PRIORITY_COUNT = 3;

export function BlogGrid({
  posts,
  className,
}: {
  posts: BlogPostSummary[];
  className?: string;
}) {
  return (
    <ul className={cn(BLOG_GRID_CLASSES, className)}>
      {posts.map((post, index) => (
        <li key={post.id}>
          <BlogCard post={post} priority={index < PRIORITY_COUNT} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Fallback de `<Suspense>` pendant la requête Prisma : même gabarit que la
 * grille réelle, donc aucun saut de mise en page à l'arrivée des données.
 */
export function BlogGridSkeleton({
  count = 6,
  label = "Chargement des articles",
  className,
}: {
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(BLOG_GRID_CLASSES, className)}
    >
      {Array.from({ length: count }, (_, index) => (
        <BlogCardSkeleton key={index} />
      ))}
    </div>
  );
}
