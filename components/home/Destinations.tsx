import Image from "next/image";
import Link from "next/link";
import { PhotoFallback } from "@/components/ui/PhotoFallback";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getPopularDestinations } from "@/lib/home/queries";
import { DESTINATIONS } from "@/lib/home/content";
import { formatNumber } from "@/lib/format";

const HEADING_ID = "destinations-titre";

/**
 * Villes mises en avant. Le compteur vient de la base ; en cas d'erreur on
 * dégrade sur la liste éditoriale sans compteur plutôt que de masquer le bloc.
 */
export async function Destinations() {
  let destinations: Array<{
    city: string;
    image: string | null;
    roomCount: number | null;
  }>;

  try {
    destinations = await getPopularDestinations();
  } catch (error) {
    console.error("[accueil] chargement des destinations", error);
    destinations = DESTINATIONS.map((d) => ({ ...d, roomCount: null }));
  }

  return (
    <section
      aria-labelledby={HEADING_ID}
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20"
    >
      <SectionHeading
        id={HEADING_ID}
        title="Destinations populaires"
        description="Les villes où nos clients réservent le plus souvent."
        action={{ href: "/salles", label: "Voir toutes" }}
      />

      <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {destinations.map(({ city, image, roomCount }) => (
          <li key={city}>
            <Link
              // Le catalogue ne filtre que par catégorie : une ville passe par
              // la page de résultats, qui sait traiter le paramètre `ville`.
              href={`/salles/resultats?ville=${encodeURIComponent(city)}`}
              className="group relative block aspect-[3/4] overflow-hidden rounded-lg shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
            >
              {image ? (
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <PhotoFallback />
              )}
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-primary-900/90 via-primary-900/25 to-transparent"
              />
              <span className="absolute inset-x-0 bottom-0 p-4">
                <span className="block text-lg font-semibold text-white">
                  {city}
                </span>
                <span className="mt-0.5 block text-sm text-gray-300">
                  {roomCount === null
                    ? "Voir les salles"
                    : roomCount === 0
                      ? "Bientôt disponible"
                      : `${formatNumber(roomCount)}+ salles`}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
