import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CATEGORIES } from "@/lib/home/content";

/** Grille des catégories d'événement, chacune pointant vers /salles filtré. */
export function Categories() {
  return (
    <section
      aria-labelledby="categories-titre"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20"
    >
      <SectionHeading
        id="categories-titre"
        title="Catégories populaires"
        description="Choisissez le type d'événement : nous ne vous montrons que les salles adaptées."
        action={{ href: "/salles", label: "Voir toutes" }}
      />

      {/*
        Flex et non grid : une grille place les cartes de la dernière ligne dans
        ses premières colonnes, ce qui laisse un trou à droite dès que le nombre
        de catégories ne tombe pas juste. `justify-center` centre chaque ligne,
        complète ou non. Les largeurs reproduisent 2, 3, 5 puis 8 cartes par
        ligne, gouttière déduite.
      */}
      <ul className="mt-8 flex flex-wrap justify-center gap-4">
        {CATEGORIES.map(({ name, slug, icon: Icon }) => (
          <li
            key={slug}
            className="w-[calc(50%_-_0.5rem)] sm:w-[calc(33.333%_-_0.667rem)] lg:w-[calc(20%_-_0.8rem)] xl:w-[calc(12.5%_-_0.875rem)]"
          >
            <Link
              href={`/salles?categorie=${slug}`}
              className="group flex aspect-square flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 transition-colors group-hover:bg-secondary/20">
                <Icon aria-hidden className="h-6 w-6 text-secondary" />
              </span>
              <span className="text-sm font-medium leading-tight text-gray-900">
                {name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
