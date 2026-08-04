/**
 * Squelette affiché pendant le rendu serveur des pages du compte.
 *
 * Même gabarit que les pages réelles — titre, bandeau, blocs empilés — pour
 * qu'aucun saut de mise en page ne survienne à l'arrivée des données.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Chargement de votre espace" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-52 animate-pulse rounded-md bg-gray-100" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-sm bg-gray-100" />
      </div>

      <div className="h-40 animate-pulse rounded-lg border border-gray-200 bg-gray-50" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-lg border border-gray-200 bg-gray-50"
          />
        ))}
      </div>
    </div>
  );
}
