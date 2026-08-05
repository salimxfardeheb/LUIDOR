import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareOff, RotateCcw, ShieldCheck, Star, Stars as StarsIcon } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guards";
import {
  ALL_FILTER_VALUE,
  buildReviewsHref,
  getReviewCounts,
  hasActiveReviewFilters,
  listAdminReviews,
  NO_REVIEW_FILTERS,
  parseReviewFilters,
  RATINGS,
  REVIEW_STATES,
  REVIEW_STATE_LABELS,
  REVIEWS_PATH,
  type ReviewSearchParams,
} from "@/lib/admin/reviews";
import { formatNumber, formatRating } from "@/lib/format";
import { ReviewCard } from "@/components/admin/ReviewCard";
import { StatTiles } from "@/components/admin/StatTiles";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

// Route /admin/avis — modération des avis, protégée (ADMIN).
export const metadata: Metadata = { title: "Avis & commentaires" };

interface PageProps {
  searchParams: ReviewSearchParams;
}

export default async function Page({ searchParams }: PageProps) {
  await requireAdminPage(REVIEWS_PATH);

  const filters = parseReviewFilters(searchParams);
  const [reviews, counts] = await Promise.all([
    listAdminReviews(filters),
    getReviewCounts(),
  ]);

  const filtered = hasActiveReviewFilters(filters);

  const ratingOptions = [
    {
      value: ALL_FILTER_VALUE,
      label: "Toutes les notes",
      href: buildReviewsHref({ ...filters, rating: null }),
    },
    ...RATINGS.map((rating) => ({
      value: String(rating),
      label: `${rating} étoile${rating > 1 ? "s" : ""}`,
      href: buildReviewsHref({ ...filters, rating }),
    })),
  ];

  const stateOptions = [
    {
      value: ALL_FILTER_VALUE,
      label: "Tous les états",
      href: buildReviewsHref({ ...filters, state: null }),
    },
    ...REVIEW_STATES.map((state) => ({
      value: state,
      label: REVIEW_STATE_LABELS[state],
      href: buildReviewsHref({ ...filters, state }),
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Avis & commentaires"
        description="Les avis déposés après un événement. Un avis publié paraît sur la fiche salle et compte dans sa note moyenne."
      />

      <StatTiles
        tiles={[
          {
            icon: StarsIcon,
            label: "Avis au total",
            value: formatNumber(counts.total),
            tone: "primary",
          },
          {
            icon: ShieldCheck,
            label: "En attente de modération",
            value: formatNumber(counts.pending),
            tone: counts.pending > 0 ? "warning" : "neutral",
          },
          {
            icon: StarsIcon,
            label: "Publiés",
            value: formatNumber(counts.published),
            tone: "accent",
          },
          {
            icon: Star,
            label: "Note moyenne publiée",
            value:
              counts.averageRating === null
                ? "—"
                : `${formatRating(counts.averageRating)} / 5`,
            tone: "secondary",
          },
        ]}
      />

      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <FilterSelect
          id="filtre-note"
          label="Note"
          icon={<Star aria-hidden className="h-4 w-4 text-secondary" />}
          value={filters.rating === null ? ALL_FILTER_VALUE : String(filters.rating)}
          options={ratingOptions}
          className="sm:w-52"
        />
        <FilterSelect
          id="filtre-etat-avis"
          label="État"
          icon={<ShieldCheck aria-hidden className="h-4 w-4 text-secondary" />}
          value={filters.state ?? ALL_FILTER_VALUE}
          options={stateOptions}
          className="sm:w-64"
        />

        {filtered && (
          <Link
            href={buildReviewsHref(NO_REVIEW_FILTERS)}
            scroll={false}
            className="inline-flex items-center gap-1.5 self-start rounded-md px-1 py-2 text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:self-auto sm:py-2.5"
          >
            <RotateCcw aria-hidden className="h-4 w-4" />
            Réinitialiser
          </Link>
        )}
      </div>

      <p className="text-sm text-gray-500" aria-live="polite">
        {reviews.length === 0
          ? "Aucun avis à afficher."
          : `${reviews.length} avis affiché${reviews.length > 1 ? "s" : ""}${
              filtered ? " pour ces filtres" : ""
            }.`}
      </p>

      {reviews.length === 0 ? (
        <EmptyState
          icon={MessageSquareOff}
          title={filtered ? "Aucun avis pour ces filtres" : "Aucun avis déposé"}
          description={
            filtered
              ? "Aucun avis ne correspond à la note ou à l'état sélectionné."
              : "Les avis laissés par les clients après un événement clôturé apparaîtront ici."
          }
          action={
            filtered
              ? { href: buildReviewsHref(NO_REVIEW_FILTERS), label: "Voir tous les avis" }
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
