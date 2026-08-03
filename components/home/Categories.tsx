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

      <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
        {CATEGORIES.map(({ name, slug, icon: Icon }) => (
          <li key={slug}>
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
