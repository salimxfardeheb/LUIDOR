import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ABOUT_INTRO, ABOUT_STATS } from "@/lib/about/content";

/**
 * En-tête de la page « À propos » : fond marine de la charte, promesse et
 * chiffres d'ancrage. Les statistiques débordent en bas du bloc pour venir à
 * cheval sur la section suivante, comme la carte de recherche de l'accueil.
 */
export function AboutHero() {
  return (
    <section aria-labelledby="a-propos-titre" className="relative">
      <div className="relative isolate overflow-hidden bg-primary-900">
        {/* Halo doré : rappelle le dégradé de marque sans photo à charger. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgb(var(--color-secondary)/0.30),transparent_60%),linear-gradient(160deg,rgb(var(--color-primary-700)/0.55),transparent_65%)]"
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-28 pt-16 text-center sm:px-6 sm:pb-32 sm:pt-20 lg:pt-24">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary-400">
            {ABOUT_INTRO.eyebrow}
          </p>
          <h1
            id="a-propos-titre"
            className="mx-auto mt-5 max-w-4xl text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            {ABOUT_INTRO.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-gray-300">
            {ABOUT_INTRO.description}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/salles">
              <Button size="lg">Découvrir les salles</Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline-light" size="lg">
                Nous contacter
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-16 max-w-7xl px-4 sm:px-6">
        <dl className="relative z-10 grid gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 shadow-md sm:grid-cols-2 lg:grid-cols-4">
          {ABOUT_STATS.map(({ value, label }) => (
            <div key={label} className="bg-white px-6 py-6 text-center">
              <dt className="text-2xl font-bold tracking-tight text-primary-900">
                {value}
              </dt>
              <dd className="mt-1 text-sm text-gray-500">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
