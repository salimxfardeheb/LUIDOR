import { MapPin, Maximize2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatRoomAddress, type RoomLocation } from "@/lib/rooms/geocode";

/**
 * Mini carte + adresse + itinéraire.
 *
 * La carte est un `<iframe>` OpenStreetMap : gratuite, sans clé d'API ni
 * bibliothèque de rendu à embarquer. Les coordonnées viennent de
 * `resolveRoomLocation` (lib/rooms/geocode.ts), qui garantit une position même
 * quand la salle n'est pas géolocalisée en base — au pire le centre de sa
 * commune ou de sa wilaya. Dans ce cas la carte l'annonce et ne pose aucun
 * repère : un point planté au hasard vaudrait promesse d'exactitude.
 */
export function LocationCard({
  name,
  address,
  district,
  city,
  location,
}: {
  name: string;
  address: string;
  district: string | null;
  city: string;
  location: RoomLocation | null;
}) {
  const fullAddress = formatRoomAddress({ address, district, city });
  const located = location !== null && location.precision !== "area";

  // L'itinéraire part vers Google Maps, installé sur la quasi-totalité des
  // téléphones. Sur une position seulement approximative, on lui passe
  // l'adresse en toutes lettres : son moteur fera mieux qu'un centre-ville.
  const directionsUrl = located
    ? `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${fullAddress}, Algérie`
      )}`;

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
        {location ? (
          <>
            <iframe
              src={embedUrl(location)}
              title={`Carte de ${name}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full w-full border-0"
            />
            {/* À gauche : OpenStreetMap pose ses boutons de zoom à droite. */}
            <a
              href={viewerUrl(location)}
              target="_blank"
              rel="noreferrer noopener"
              className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <Maximize2 aria-hidden className="h-3.5 w-3.5" />
              Agrandir
            </a>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-primary-900/5 text-center">
            <MapPin aria-hidden className="h-6 w-6 text-secondary" />
            <p className="px-4 text-xs text-gray-500">
              Position non disponible pour cette adresse.
            </p>
          </div>
        )}
      </div>

      {location !== null && !located && (
        <p className="mt-2 text-xs text-gray-500">
          Emplacement approximatif : la carte est centrée sur{" "}
          {location.label ?? city}, l&apos;accès exact vous est confirmé avec la
          réservation.
        </p>
      )}

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

/** Squelette de la carte, le temps que la position soit résolue. */
export function LocationCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Chargement de la localisation"
      className="h-80 animate-pulse rounded-lg border border-gray-200 bg-white shadow-sm"
    />
  );
}

/**
 * Cadrage de l'iframe : `span` est le demi-côté conseillé par le géocodage, de
 * la rue au centre de wilaya. Le repère n'est posé que sur une position
 * réellement située.
 */
function embedUrl({ latitude, longitude, precision, span }: RoomLocation) {
  // 6 décimales : la précision d'un mètre, et une URL sans traînée de
  // flottant (« 36.755091199999995 ») dans le HTML de la fiche.
  const params = new URLSearchParams({
    bbox: [
      longitude - span,
      latitude - span,
      longitude + span,
      latitude + span,
    ]
      .map((value) => value.toFixed(6))
      .join(","),
    layer: "mapnik",
  });

  if (precision !== "area") {
    params.set("marker", `${latitude},${longitude}`);
  }

  return `https://www.openstreetmap.org/export/embed.html?${params}`;
}

/** Même point, en plein écran sur openstreetmap.org. */
function viewerUrl({ latitude, longitude, precision, span }: RoomLocation) {
  // Le zoom OSM double la surface visible à chaque cran : partir du cadrage
  // évite de rouvrir la commune sur une rue, ou l'inverse.
  const zoom = Math.round(Math.log2(360 / (span * 2)));
  const map = `#map=${zoom}/${latitude}/${longitude}`;

  return precision === "area"
    ? `https://www.openstreetmap.org/${map}`
    : `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}${map}`;
}
