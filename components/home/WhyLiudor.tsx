import { FEATURES } from "@/lib/home/content";

/** Bloc « réassurance » : 5 arguments clés, sur fond gris clair. */
export function WhyLiudor() {
  return (
    <section aria-labelledby="pourquoi-titre" className="bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="text-center">
          <h2
            id="pourquoi-titre"
            className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
          >
            Pourquoi choisir LIUDOR ?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-balance text-sm text-gray-500">
            Une plateforme pensée pour sécuriser chaque étape, de la recherche à
            la confirmation de votre réservation.
          </p>
        </div>

        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map(({ title, description, icon: Icon }) => (
            <li key={title} className="text-center lg:text-left">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                <Icon aria-hidden className="h-6 w-6 text-secondary" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-gray-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
