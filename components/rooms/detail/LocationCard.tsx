import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Mini carte + adresse + itinéraire.
 *
 * La carte est un `<iframe>` OpenStreetMap : aucune clé d'API ni dépendance
 * supplémentaire. Sans coordonnées en base, on affiche un aplat de marque avec
 * un repère — la carte apparaîtra dès que la salle sera géolocalisée.
 * L'itinéraire part vers Google Maps, qui gère aussi bien les coordonnées que
 * l'adresse en texte libre.
 */
export function LocationCard({
  name,
  address,
  district,
  city,
  latitude,
  longitude,
}: {
  name: string;
  address: string;
  district: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
}) {
  const hasCoords = latitude !== null && longitude !== null;
  const fullAddress = [address, district, city].filter(Boolean).join(", ");

  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${fullAddress}, Algérie`
      )}`;

  // Cadrage serré autour du point (~1,5 km de côté).
  const delta = 0.008;
  const embedUrl = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta}%2C${
        latitude - delta
      }%2C${longitude + delta}%2C${latitude + delta}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : null;

  return (
    <section
      aria-labelledby="localisation-titre"
      id="localisation"
      className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h2
        id="localisation-titre"
        className="text-sm font-semibold text-gray-900"
      >
        Localisation
      </h2>

      <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-md border border-gray-200 bg-gray-100">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={`Carte de ${name}`}
            loading="lazy"
            className="h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-primary-900/5 text-center">
            <MapPin aria-hidden className="h-6 w-6 text-secondary" />
            <p className="px-4 text-xs text-gray-500">
              Position précise non renseignée par le propriétaire.
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 flex items-start gap-2 text-sm text-gray-600">
        <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        {fullAddress}
      </p>

      <a
        href={directionsUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-4 block"
      >
        <Button variant="outline" className="w-full">
          <Navigation aria-hidden className="h-4 w-4" />
          Itinéraire
        </Button>
      </a>
    </section>
  );
}
