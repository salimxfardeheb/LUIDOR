import Image from "next/image";
import Link from "next/link";
import { Clock3, MapPin } from "lucide-react";
import type { AdminReviewRow } from "@/lib/admin/reviews";
import { ReviewModerationActions } from "@/components/admin/ReviewModerationActions";
import { Stars } from "@/components/rooms/Stars";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDate, formatDateTime, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Avis présenté à la modération.
 *
 * Le commentaire est affiché en entier, jamais tronqué : la décision porte sur
 * ce que le client a écrit, et un extrait pourrait cacher précisément le
 * passage qui pose problème.
 */
export function ReviewCard({ review }: { review: AdminReviewRow }) {
  const published = review.publishedAt !== null;

  return (
    <Card
      className={cn(
        "p-5",
        !published && "border-warning/40 bg-warning/[0.03]"
      )}
    >
      <article className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                name={review.authorName}
                src={review.authorAvatarUrl}
                role="CLIENT"
                size="sm"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {review.authorName}
                </p>
                <p className="truncate text-xs text-gray-500">
                  <a
                    href={`mailto:${review.authorEmail}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {review.authorEmail}
                  </a>
                </p>
              </div>
            </div>

            <Badge variant={published ? "success" : "warning"}>
              {published ? "Publié" : "En attente"}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Stars value={review.rating} />
            <span className="text-sm font-semibold text-gray-900">
              {review.rating}/5
            </span>
            <span aria-hidden className="text-gray-300">
              ·
            </span>
            <Link
              href={`/salles/${review.roomId}`}
              className="inline-flex min-w-0 items-center gap-1.5 text-sm text-gray-600 underline-offset-2 hover:text-primary-900 hover:underline"
            >
              <MapPin aria-hidden className="h-4 w-4 text-secondary" />
              <span className="truncate">
                {review.roomName} — {review.roomCity}
              </span>
            </Link>
          </div>

          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
            {review.comment}
          </p>

          {review.photoUrl && (
            <div className="relative mt-3 h-28 w-40 overflow-hidden rounded-md bg-gray-100">
              <Image
                src={review.photoUrl}
                alt={`Photo jointe à l'avis de ${review.authorName}`}
                fill
                sizes="160px"
                className="object-cover"
              />
            </div>
          )}

          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
            <Clock3 aria-hidden className="h-3.5 w-3.5" />
            <time dateTime={review.createdAt} title={formatDateTime(review.createdAt)}>
              Déposé {formatRelativeTime(review.createdAt)}
            </time>
            {published && review.publishedAt && (
              <>
                <span aria-hidden>·</span>
                <span>Publié le {formatDate(review.publishedAt)}</span>
              </>
            )}
          </p>
        </div>

        <div className="lg:border-l lg:border-gray-200 lg:pl-5">
          <ReviewModerationActions
            reviewId={review.id}
            authorName={review.authorName}
            roomName={review.roomName}
            published={published}
          />
        </div>
      </article>
    </Card>
  );
}
