import { Suspense } from "react";
import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { CategoryChips } from "@/components/rooms/CategoryChips";
import { RoomsGrid, RoomsGridSkeleton } from "@/components/rooms/RoomsGrid";
import { RoomsPagination } from "@/components/rooms/RoomsPagination";
import {
  RoomsEmptyState,
  RoomsErrorState,
} from "@/components/rooms/RoomsStates";
import { getCatalogRooms, ROOMS_PER_PAGE } from "@/lib/rooms/queries";
import {
  buildCatalogQuery,
  parseCatalogPage,
  resolveCategorySlug,
  type SearchParamsInput,
} from "@/lib/rooms/search-params";
import { formatNumber } from "@/lib/format";

// Route /salles — catalogue général des salles publiées.

interface PageProps {
  searchParams: SearchParamsInput;
}

export function generateMetadata({ searchParams }: PageProps): Metadata {
  const category = resolveCategorySlug(searchParams);

  return {
    title: category
      ? `Salles pour ${category.name.toLowerCase()}`
      : "Catalogue des salles",
    description: category
      ? `Toutes les salles des fêtes disponibles pour un événement de type ${category.name.toLowerCase()} en Algérie.`
      : "Parcourez toutes les salles des fêtes publiées sur LIUDOR : capacités, prix d'appel et avis vérifiés.",
  };
}

export default function Page({ searchParams }: PageProps) {
  const category = resolveCategorySlug(searchParams);
  const page = parseCatalogPage(searchParams);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {category ? `Salles pour ${category.name.toLowerCase()}` : "Catalogue des salles"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Toutes les salles vérifiées et publiées sur LIUDOR. Filtrez par type
          d&apos;événement, puis affinez avec la recherche pour une date précise.
        </p>
      </header>

      <div className="mt-8">
        <CategoryChips activeSlug={category?.slug ?? null} />
      </div>

      {/*
        Le squelette est remonté à chaque changement de catégorie ou de page :
        la `key` recrée la frontière Suspense, donc l'utilisateur voit un état de
        chargement plutôt qu'une grille figée.
      */}
      <div className="mt-8">
        <Suspense
          key={buildCatalogQuery(category?.slug ?? null, page)}
          fallback={<RoomsGridSkeleton count={ROOMS_PER_PAGE} />}
        >
          <CatalogRooms categorySlug={category?.slug ?? null} categoryName={category?.name ?? null} page={page} />
        </Suspense>
      </div>
    </div>
  );
}

/** Section serveur : une page de 12 salles ACTIVE. */
async function CatalogRooms({
  categorySlug,
  categoryName,
  page: requestedPage,
}: {
  categorySlug: string | null;
  categoryName: string | null;
  page: number;
}) {
  try {
    const { rooms, total, page, pageCount } = await getCatalogRooms(
      categoryName,
      requestedPage
    );

    if (rooms.length === 0) {
      return categoryName ? (
        <RoomsEmptyState
          icon={Building2}
          title={`Aucune salle pour « ${categoryName} »`}
          description="Cette catégorie n'a pas encore de salle publiée. Explorez le catalogue complet ou choisissez un autre type d'événement."
          primaryAction={{ href: "/salles", label: "Voir toutes les salles" }}
        />
      ) : (
        <RoomsEmptyState
          icon={Building2}
          title="Aucune salle publiée pour le moment"
          description="Les premières salles arrivent bientôt. Vous êtes propriétaire ? Publiez la vôtre et soyez parmi les premiers référencés sur LIUDOR."
          primaryAction={{
            href: "/owner/salles/nouvelle",
            label: "Publier une salle",
          }}
        />
      );
    }

    return (
      <>
        <p aria-live="polite" className="mb-6 text-sm text-gray-500">
          <span className="font-semibold text-gray-900">
            {formatNumber(total)}
          </span>{" "}
          {total > 1 ? "salles disponibles" : "salle disponible"}
        </p>

        <RoomsGrid rooms={rooms} />

        <RoomsPagination
          page={page}
          pageCount={pageCount}
          buildHref={(target) => {
            const query = buildCatalogQuery(categorySlug, target);
            return query ? `/salles?${query}` : "/salles";
          }}
          label="Pagination du catalogue"
        />
      </>
    );
  } catch (error) {
    console.error("[catalogue] chargement des salles", error);
    return (
      <RoomsErrorState
        action={{ href: "/salles", label: "Réessayer" }}
        description="Le catalogue est momentanément indisponible. Réessayez dans quelques instants."
      />
    );
  }
}
