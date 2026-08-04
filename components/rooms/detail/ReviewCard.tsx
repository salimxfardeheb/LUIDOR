import Image from "next/image";
import { Stars } from "@/components/rooms/Stars";
import { formatDate } from "@/lib/format";
import type { RoomReview } from "@/lib/rooms/detail";

/**
 * Avis client : avatar, nom, contexte, note, commentaire et photo jointe.
 *
 * Le contexte est reconstitué à partir du type d'événement de la salle et de la
 * date de l'avis — la table `reviews` ne référence pas la réservation d'origine.
 */
export function ReviewCard({
  review,
  context,
}: {
  review: RoomReview;
  context: string;
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
      <div className="flex items-start gap-3">
        {review.authorAvatarUrl ? (
          <Image
            src={review.authorAvatarUrl}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-900 text-sm font-semibold text-white"
          >
            {review.authorInitials}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {review.authorName}
              </p>
              <p className="text-xs text-gray-500">{context}</p>
            </div>
            <Stars value={review.rating} size="h-3.5 w-3.5" />
          </div>

          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {review.comment}
          </p>

          {review.photoUrl && (
            <div className="relative mt-3 h-20 w-28 overflow-hidden rounded-md bg-primary-900">
              <Image
                src={review.photoUrl}
                alt={`Photo jointe par ${review.authorName}`}
                fill
                sizes="112px"
                className="object-cover"
              />
            </div>
          )}

          <p className="mt-3 text-xs text-gray-400">
            Publié le {formatDate(review.createdAt)}
          </p>
        </div>
      </div>
    </article>
  );
}
