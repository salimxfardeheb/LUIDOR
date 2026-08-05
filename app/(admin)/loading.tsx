/**
 * Squelette affiché pendant le rendu serveur des pages d'administration.
 *
 * Même gabarit que le tableau de bord — barre d'en-tête, quatre indicateurs,
 * graphiques puis tableaux — pour qu'aucun bloc ne saute à l'arrivée des
 * données.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Chargement de l'administration"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-10 min-w-0 flex-1 animate-pulse rounded-md bg-gray-100 sm:max-w-md" />
          <div className="h-9 w-9 animate-pulse rounded-md bg-gray-100" />
          <div className="h-9 w-9 animate-pulse rounded-md bg-gray-100" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-7 w-56 animate-pulse rounded-md bg-gray-100" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-sm bg-gray-100" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-lg border border-gray-200 bg-white"
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-lg border border-gray-200 bg-white lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-lg border border-gray-200 bg-white" />
        <div className="h-64 animate-pulse rounded-lg border border-gray-200 bg-white" />
        <div className="h-64 animate-pulse rounded-lg border border-gray-200 bg-white" />
      </div>

      <div className="h-72 animate-pulse rounded-lg border border-gray-200 bg-white" />
    </div>
  );
}
