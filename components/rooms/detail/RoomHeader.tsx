import { BadgeCheck, MapPin, Map } from "lucide-react";
import { Stars } from "@/components/rooms/Stars";
import { formatRating } from "@/lib/format";

/**
 * Titre de la fiche : nom + badge vérifié, ligne de note renvoyant aux avis, et
 * ligne de localisation avec un raccourci vers la carte en bas de page.
 */
export function RoomHeader({
  name,
  categoryName,
  verified,
  rating,
  reviewCount,
  city,
  district,
  address,
}: {
  name: string;
  categoryName: string;
  verified: boolean;
  rating: number | null;
  reviewCount: number;
  city: string;
  district: string | null;
  address: string;
}) {
  const location = [address, district, city].filter(Boolean).join(", ");

  return (
    <header className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
        {categoryName}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {name}
        </h1>
        {verified && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
            <BadgeCheck aria-hidden className="h-4 w-4" />
            Salle vérifiée
          </span>
        )}
      </div>

      {/* Ligne note : étoiles + valeur + lien vers la section avis. */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {rating === null ? (
          <>
            <Stars value={0} label="Aucun avis pour le moment" />
            <span className="text-gray-500">Aucun avis pour le moment</span>
          </>
        ) : (
          <>
            <Stars value={rating} />
            <span className="font-semibold text-gray-900">
              {formatRating(rating)}
            </span>
            <a
              href="#avis"
              className="rounded-sm font-medium text-secondary underline-offset-4 transition-colors hover:text-primary-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
            >
              {reviewCount} {reviewCount > 1 ? "avis" : "avis"}
            </a>
          </>
        )}
      </div>

      {/* Ligne localisation + raccourci carte. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-600">
        <p className="flex items-center gap-1.5">
          <MapPin aria-hidden className="h-4 w-4 shrink-0 text-gray-400" />
          {location}
        </p>
        <a
          href="#localisation"
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-xs transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
        >
          <Map aria-hidden className="h-4 w-4 text-secondary" />
          Voir sur la carte
        </a>
      </div>
    </header>
  );
}
