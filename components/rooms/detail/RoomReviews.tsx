"use client";

import * as React from "react";
import { MessageSquareDashed } from "lucide-react";
import { ReviewCard } from "@/components/rooms/detail/ReviewCard";
import { Stars } from "@/components/rooms/Stars";
import { Button } from "@/components/ui/Button";
import { formatMonthYear, formatNumber, formatRating } from "@/lib/format";
import type { RatingBucket, RoomReview } from "@/lib/rooms/detail";

/** Avis visibles avant d'utiliser « Voir tous les avis ». */
const VISIBLE_REVIEWS = 3;

/**
 * Section avis : score global et répartition à gauche, liste des avis à droite.
 *
 * Les avis sont déjà chargés avec la fiche (les douze plus récents) : le bouton
 * « Voir tous les avis » déplie la liste sans requête supplémentaire.
 */
export function RoomReviews({
  categoryName,
  rating,
  reviewCount,
  breakdown,
  reviews,
}: {
  categoryName: string;
  rating: number | null;
  reviewCount: number;
  breakdown: RatingBucket[];
  reviews: RoomReview[];
}) {
  const [expanded, setExpanded] = React.useState(false);

  if (reviewCount === 0 || rating === null) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
          <MessageSquareDashed aria-hidden className="h-6 w-6 text-secondary" />
        </span>
        <h3 className="mt-4 text-base font-semibold text-gray-900">
          Aucun avis pour le moment
        </h3>
        <p className="mt-2 max-w-md text-sm text-gray-500">
          Seuls les clients ayant réellement réservé cette salle peuvent laisser
          une note. Soyez le premier à partager votre expérience.
        </p>
      </div>
    );
  }

  const visible = expanded ? reviews : reviews.slice(0, VISIBLE_REVIEWS);
  const hasMore = reviews.length > VISIBLE_REVIEWS;

  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      {/* Score global + répartition des notes */}
      <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-xs lg:self-start">
        <div className="text-center">
          <p className="text-4xl font-bold leading-none text-gray-900">
            {formatRating(rating)}
          </p>
          <Stars value={rating} className="mt-3" size="h-5 w-5" />
          <p className="mt-2 text-sm text-gray-500">
            Basé sur {formatNumber(reviewCount)}{" "}
            {reviewCount > 1 ? "avis" : "avis"}
          </p>
        </div>

        <ul className="space-y-2">
          {breakdown.map((bucket) => (
            <li key={bucket.stars} className="flex items-center gap-2.5">
              <span className="w-10 shrink-0 text-xs font-medium text-gray-600">
                {bucket.stars} ★
              </span>
              <span
                aria-hidden
                className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"
              >
                <span
                  className="block h-full rounded-full bg-secondary"
                  style={{ width: `${bucket.percent}%` }}
                />
              </span>
              <span className="w-9 shrink-0 text-right text-xs text-gray-500">
                {bucket.percent} %
              </span>
            </li>
          ))}
        </ul>

        {hasMore && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-controls="liste-avis"
          >
            {expanded
              ? "Réduire la liste"
              : `Voir tous les avis (${formatNumber(reviews.length)})`}
          </Button>
        )}
      </div>

      {/* Liste des avis */}
      <ul id="liste-avis" className="space-y-4">
        {visible.map((review) => (
          <li key={review.id}>
            <ReviewCard
              review={review}
              context={`${categoryName} · ${formatMonthYear(review.createdAt)}`}
            />
          </li>
        ))}

        {reviewCount > reviews.length && (
          <li className="text-sm text-gray-500">
            {formatNumber(reviewCount - reviews.length)} autres avis plus anciens
            ne sont pas affichés.
          </li>
        )}
      </ul>
    </div>
  );
}
