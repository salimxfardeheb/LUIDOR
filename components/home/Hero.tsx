import { HeroSlideshow } from "@/components/home/HeroSlideshow";
import { SearchCard } from "@/components/home/SearchCard";

/**
 * Hero pleine largeur. La carte de recherche déborde volontairement en bas du
 * bloc (`-mb-*`) pour venir à cheval sur la section suivante.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-titre" className="relative">
      <div className="relative isolate overflow-hidden bg-primary-900">
        <HeroSlideshow />
        {/* Dégradé sombre : garantit le contraste du texte sur la photo. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-primary-900/80 via-primary-900/70 to-primary-900/90"
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-40 pt-20 text-center sm:px-6 sm:pb-44 sm:pt-28 lg:pb-48 lg:pt-32">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary-400">
            Lieux d&apos;Or
          </p>
          <h1
            id="hero-titre"
            className="mx-auto mt-5 max-w-4xl text-balance text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Trouvez la salle parfaite
            <span className="block">
              pour votre <span className="text-secondary">événement</span>
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-gray-300 sm:text-lg">
            Des centaines de salles des fêtes vérifiées à travers l&apos;Algérie.
            Comparez les capacités, les prix et les avis, puis réservez en toute
            confiance.
          </p>
        </div>
      </div>

      <div className="mx-auto -mt-28 max-w-7xl px-4 sm:-mt-24 sm:px-6">
        <SearchCard className="relative z-10" />
      </div>
    </section>
  );
}
