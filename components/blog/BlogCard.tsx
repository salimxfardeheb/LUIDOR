import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import { PhotoFallback } from "@/components/ui/PhotoFallback";
import type { BlogPostSummary } from "@/lib/blog/queries";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Carte article : couverture, titre, extrait, date et lien de lecture.
 *
 * Même gabarit que `RoomCard` — bordure, ombre au survol, lien étendu à toute
 * la carte via `after:absolute` — pour que la liste du blog se lise comme le
 * reste du site public.
 */
export function BlogCard({
  post,
  /** `true` sur les premières cartes visibles : la couverture est préchargée. */
  priority = false,
}: {
  post: BlogPostSummary;
  priority?: boolean;
}) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/10] overflow-hidden bg-primary-900">
        {/* Couverture décorative : le titre qui suit porte déjà l'information,
            un texte alternatif ne ferait que la répéter aux lecteurs d'écran. */}
        {post.coverImageUrl ? (
          <Image
            src={post.coverImageUrl}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <PhotoFallback />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <PostMeta
          publishedAt={post.publishedAt}
          readingMinutes={post.readingMinutes}
        />

        <h3 className="text-base font-semibold leading-snug text-gray-900">
          <Link
            href={`/blog/${post.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
          >
            {post.title}
          </Link>
        </h3>

        <p className="line-clamp-3 text-sm leading-relaxed text-gray-500">
          {post.excerpt}
        </p>

        <p className="mt-auto inline-flex items-center gap-1.5 border-t border-gray-100 pt-3 text-sm font-semibold text-secondary transition-colors group-hover:text-primary-900">
          Lire l&apos;article
          <ArrowRight
            aria-hidden
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          />
        </p>
      </div>
    </article>
  );
}

/** Date de publication et durée de lecture, partagées carte et article. */
export function PostMeta({
  publishedAt,
  readingMinutes,
  className,
}: {
  publishedAt: string;
  readingMinutes: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500",
        className
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays aria-hidden className="h-4 w-4 shrink-0 opacity-70" />
        <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock aria-hidden className="h-4 w-4 shrink-0 opacity-70" />
        {readingMinutes} min de lecture
      </span>
    </div>
  );
}

/** Squelette affiché pendant le chargement des articles. */
export function BlogCardSkeleton() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
    >
      <div className="aspect-[16/10] animate-pulse bg-gray-100" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-32 animate-pulse rounded-sm bg-gray-100" />
        <div className="h-4 w-3/4 animate-pulse rounded-sm bg-gray-100" />
        <div className="h-3 w-full animate-pulse rounded-sm bg-gray-100" />
        <div className="h-3 w-2/3 animate-pulse rounded-sm bg-gray-100" />
      </div>
    </div>
  );
}
