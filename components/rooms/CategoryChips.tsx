import Link from "next/link";
import { LayoutGrid, type LucideIcon } from "lucide-react";
import { CATEGORIES } from "@/lib/home/content";
import { cn } from "@/lib/utils";

/**
 * Bandeau de filtres par catégorie.
 *
 * De simples liens : la catégorie active vit dans l'URL (`?categorie=`), donc le
 * filtre est partageable, indexable et fonctionne sans JavaScript. Les libellés
 * viennent du même éditorial que la grille de l'accueil, les deux pointant vers
 * les mêmes slugs.
 */
export function CategoryChips({ activeSlug }: { activeSlug: string | null }) {
  return (
    <nav aria-label="Filtrer par catégorie">
      {/* Bandeau défilable en mobile, qui se replie sur plusieurs lignes ensuite. */}
      <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        <li className="snap-start">
          <Chip
            href="/salles"
            label="Toutes les salles"
            icon={LayoutGrid}
            active={activeSlug === null}
          />
        </li>
        {CATEGORIES.map(({ name, slug, icon }) => (
          <li key={slug} className="snap-start">
            <Chip
              href={`/salles?categorie=${slug}`}
              label={name}
              icon={icon}
              active={activeSlug === slug}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Chip({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2",
        active
          ? "border-secondary bg-secondary text-white shadow-sm"
          : "border-gray-200 bg-white text-gray-700 shadow-xs hover:border-secondary/50 hover:text-primary-900"
      )}
    >
      <Icon
        aria-hidden
        className={cn("h-4 w-4", active ? "text-white" : "text-secondary")}
      />
      {label}
    </Link>
  );
}
