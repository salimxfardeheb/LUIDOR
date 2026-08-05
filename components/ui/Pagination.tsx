import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Nombre de pages voisines affichées de chaque côté de la page courante. */
const SIBLINGS = 1;

/**
 * Pagination par liens : chaque page a sa propre URL, ce qui la rend
 * partageable, indexable et navigable au clavier ou sans JavaScript.
 *
 * Aucune dépendance au contenu paginé : le catalogue de salles, les résultats
 * de recherche et le blog s'en servent en fournissant leur propre `buildHref`.
 */
export function Pagination({
  page,
  pageCount,
  buildHref,
  label = "Pagination",
}: {
  page: number;
  pageCount: number;
  /** Construit l'URL d'une page (les autres critères sont conservés). */
  buildHref: (page: number) => string;
  label?: string;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label={label} className="mt-10 flex flex-col items-center gap-3">
      <ul className="flex items-center gap-1.5">
        <li>
          <Arrow
            href={buildHref(page - 1)}
            direction="prev"
            disabled={page === 1}
          />
        </li>

        {pageRange(page, pageCount).map((item, index) =>
          item === "…" ? (
            <li
              key={`gap-${index}`}
              aria-hidden
              className="px-1 text-sm text-gray-400"
            >
              …
            </li>
          ) : (
            <li key={item}>
              <PageLink
                href={buildHref(item)}
                page={item}
                current={item === page}
              />
            </li>
          )
        )}

        <li>
          <Arrow
            href={buildHref(page + 1)}
            direction="next"
            disabled={page === pageCount}
          />
        </li>
      </ul>

      <p className="text-sm text-gray-500">
        Page {page} sur {pageCount}
      </p>
    </nav>
  );
}

function PageLink({
  href,
  page,
  current,
}: {
  href: string;
  page: number;
  current: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      aria-label={`Page ${page}`}
      className={cn(
        "inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2",
        current
          ? "border-secondary bg-secondary text-white shadow-sm"
          : "border-gray-300 bg-white text-gray-700 shadow-xs hover:bg-gray-100"
      )}
    >
      {page}
    </Link>
  );
}

function Arrow({
  href,
  direction,
  disabled,
}: {
  href: string;
  direction: "prev" | "next";
  disabled: boolean;
}) {
  const isPrev = direction === "prev";
  const Icon = isPrev ? ChevronLeft : ChevronRight;
  const label = isPrev ? "Page précédente" : "Page suivante";

  const classes =
    "inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 shadow-xs transition-colors";

  // En bout de liste, un <span> plutôt qu'un lien mort.
  if (disabled) {
    return (
      <span
        aria-hidden
        className={cn(classes, "cursor-not-allowed text-gray-300 shadow-none")}
      >
        <Icon className="h-4 w-4" />
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        classes,
        "hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
      )}
    >
      <Icon aria-hidden className="h-4 w-4" />
    </Link>
  );
}

/**
 * Fenêtre de pages : toujours la première et la dernière, la page courante et
 * ses voisines, séparées par des ellipses.
 */
function pageRange(page: number, pageCount: number): (number | "…")[] {
  const pages = new Set<number>([1, pageCount]);
  for (let offset = -SIBLINGS; offset <= SIBLINGS; offset++) {
    const candidate = page + offset;
    if (candidate >= 1 && candidate <= pageCount) pages.add(candidate);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | "…")[] = [];

  sorted.forEach((current, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && current - previous > 1) result.push("…");
    result.push(current);
  });

  return result;
}
