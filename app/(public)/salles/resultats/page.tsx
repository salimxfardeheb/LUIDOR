import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchCard } from "@/components/home/SearchCard";
import { FilterPanel } from "@/components/rooms/FilterPanel";
import { RoomsGrid, RoomsGridSkeleton } from "@/components/rooms/RoomsGrid";
import { Pagination } from "@/components/ui/Pagination";
import { SortSelect } from "@/components/rooms/SortSelect";
import {
  RoomsEmptyState,
  RoomsErrorState,
} from "@/components/rooms/RoomsStates";
import {
  getRoomFilterOptions,
  ROOMS_PER_PAGE,
  searchRooms,
} from "@/lib/rooms/queries";
import {
  buildRoomsQuery,
  describeRoomFilters,
  parseRoomFilters,
  type RoomFilters,
  type SearchParamsInput,
} from "@/lib/rooms/search-params";
import { formatNumber } from "@/lib/format";

// Route /salles/resultats — salles correspondant aux critères de recherche.
export const metadata: Metadata = {
  title: "Résultats de recherche",
  description:
    "Salles des fêtes correspondant à votre ville, votre date, votre nombre d'invités et votre type d'événement.",
  // Une page de résultats filtrés n'a pas d'intérêt dans un index.
  robots: { index: false, follow: true },
};

/** Grille plus étroite qu'à l'accueil : la colonne de filtres occupe la gauche. */
const RESULTS_GRID = "lg:grid-cols-2 xl:grid-cols-3";

function resultsHref(filters: RoomFilters, page: number): string {
  const query = buildRoomsQuery(filters, { page });
  return query ? `/salles/resultats?${query}` : "/salles/resultats";
}

export default function Page({
  searchParams,
}: {
  searchParams: SearchParamsInput;
}) {
  const filters = parseRoomFilters(searchParams);
  const criteria = describeRoomFilters(filters);

  /*
   * Signature de la recherche en cours. Elle sert de `key` aux trois éléments
   * non contrôlés de la page : elle relance les frontières Suspense (donc le
   * squelette) et remonte les formulaires pour que leurs champs reflètent l'URL
   * après une navigation client.
   */
  const query = buildRoomsQuery(filters, { page: 1 });

  return (
    <>
      {/* Barre de recherche identique à l'accueil, collée sous l'en-tête (h-16). */}
      <div className="sticky top-16 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <SearchCard
            key={query}
            values={{
              ville: filters.ville,
              date: filters.date,
              invites: filters.invites,
              type: filters.type,
            }}
            className="p-4 shadow-sm sm:p-4"
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Résultats de recherche
          </h1>
          {criteria.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {criteria.map((label) => (
                <li
                  key={label}
                  className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-xs"
                >
                  {label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Aucun critère : voici toutes les salles publiées. Affinez avec la
              barre de recherche ou les filtres.
            </p>
          )}
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside aria-label="Filtres de recherche">
            <Suspense fallback={<FilterPanelSkeleton />}>
              <FilterPanelSection key={query} filters={filters} />
            </Suspense>
          </aside>

          <section aria-label="Salles correspondantes">
            <div className="flex flex-wrap items-center justify-end gap-3">
              <SortSelect filters={filters} />
            </div>

            <div className="mt-6">
              <Suspense
                key={buildRoomsQuery(filters)}
                fallback={
                  <RoomsGridSkeleton
                    count={6}
                    label="Recherche des salles"
                    className={RESULTS_GRID}
                  />
                }
              >
                <SearchResults filters={filters} />
              </Suspense>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

/** Charge en base les valeurs proposées par le panneau (villes, équipements). */
async function FilterPanelSection({ filters }: { filters: RoomFilters }) {
  try {
    const options = await getRoomFilterOptions();
    return <FilterPanel filters={filters} options={options} />;
  } catch (error) {
    console.error("[résultats] chargement des options de filtres", error);
    // Sans les options, le panneau n'a plus rien à proposer : la barre de
    // recherche reste utilisable, on n'affiche donc pas de second message d'erreur.
    return null;
  }
}

async function SearchResults({ filters }: { filters: RoomFilters }) {
  try {
    const { rooms, total, page, pageCount } = await searchRooms(
      filters,
      ROOMS_PER_PAGE
    );

    if (rooms.length === 0) {
      return <NoResults filters={filters} />;
    }

    return (
      <>
        <p aria-live="polite" className="mb-6 text-sm text-gray-500">
          <span className="font-semibold text-gray-900">
            {formatNumber(total)}
          </span>{" "}
          {total > 1
            ? "salles correspondent à votre recherche"
            : "salle correspond à votre recherche"}
        </p>

        <RoomsGrid rooms={rooms} className={RESULTS_GRID} />

        <Pagination
          page={page}
          pageCount={pageCount}
          buildHref={(target) => resultsHref(filters, target)}
          label="Pagination des résultats"
        />
      </>
    );
  } catch (error) {
    console.error("[résultats] recherche de salles", error);
    return (
      <RoomsErrorState
        description="La recherche est momentanément indisponible. Réessayez dans quelques instants."
        action={{ href: "/salles", label: "Voir le catalogue" }}
      />
    );
  }
}

/** État vide explicite : on rappelle les critères qui n'ont rien donné. */
function NoResults({ filters }: { filters: RoomFilters }) {
  const criteria = describeRoomFilters(filters);

  return (
    <RoomsEmptyState
      title="Aucune salle ne correspond à votre recherche"
      description="Essayez d'élargir la fourchette de capacité ou de budget, de retirer quelques équipements, ou de changer de ville ou de date."
      primaryAction={{ href: "/salles/resultats", label: "Effacer les filtres" }}
      secondaryAction={{ href: "/salles", label: "Voir tout le catalogue" }}
    >
      {criteria.length > 0 && (
        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {criteria.map((label) => (
            <li
              key={label}
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600"
            >
              {label}
            </li>
          ))}
        </ul>
      )}
    </RoomsEmptyState>
  );
}

/** Fallback du panneau : même gabarit de cartes blanches à bordure fine. */
function FilterPanelSkeleton() {
  return (
    <div
      role="status"
      aria-label="Chargement des filtres"
      className="space-y-4"
    >
      <div className="h-6 w-24 animate-pulse rounded-sm bg-gray-100" />
      {[64, 64, 96, 96, 160].map((height, index) => (
        <div
          key={index}
          style={{ height }}
          className="animate-pulse rounded-lg border border-gray-200 bg-white shadow-xs"
        />
      ))}
    </div>
  );
}
