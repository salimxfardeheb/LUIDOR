/**
 * État de chargement de l'article, affiché pendant la requête Prisma.
 *
 * Reprend le gabarit de la page — couverture pleine largeur, titre, lignes de
 * texte — pour qu'aucun élément ne se déplace à l'arrivée du contenu.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Chargement de l'article" className="pb-16">
      <div className="aspect-[16/9] w-full animate-pulse bg-gray-100 sm:aspect-[21/9]" />

      <div className="mx-auto mt-8 max-w-3xl px-4 sm:mt-10 sm:px-6">
        <div className="h-8 w-40 animate-pulse rounded-md bg-gray-100" />

        <div className="mt-6 space-y-3">
          <div className="h-8 w-3/4 animate-pulse rounded-md bg-gray-100" />
          <div className="h-8 w-1/2 animate-pulse rounded-md bg-gray-100" />
        </div>

        <div className="mt-6 h-4 w-56 animate-pulse rounded-sm bg-gray-100" />

        <div className="mt-8 space-y-3 border-t border-gray-200 pt-8">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-4 animate-pulse rounded-sm bg-gray-100"
              style={{ width: `${index % 4 === 3 ? 60 : 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
