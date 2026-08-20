import Link from "next/link";
import { RotateCcw, Search, ShieldCheck } from "lucide-react";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import {
  ACCOUNT_STATUSES,
  ACCOUNT_STATUS_LABELS,
  ALL_FILTER_VALUE,
  buildUsersHref,
  hasActiveUserFilters,
  NO_USER_FILTERS,
  USER_FILTER_PARAMS,
  type UserFilters as Filters,
} from "@/lib/admin/users-params";

/**
 * Barre de filtres des pages comptes : recherche et statut.
 *
 * Composant serveur : il ne fait que préparer les destinations de chaque
 * option, l'interactivité vit dans `FilterSelect`. La recherche est un vrai
 * formulaire `GET` — elle fonctionne sans JavaScript, et le statut actif
 * voyage en champ caché pour ne pas être perdu à la validation.
 */
export function UserFilters({
  path,
  filters,
  searchPlaceholder = "Rechercher un nom ou un email…",
}: {
  path: string;
  filters: Filters;
  searchPlaceholder?: string;
}) {
  const statusOptions = [
    {
      value: ALL_FILTER_VALUE,
      label: "Tous les statuts",
      href: buildUsersHref(path, { ...filters, status: null }),
    },
    ...ACCOUNT_STATUSES.map((status) => ({
      value: status,
      label: ACCOUNT_STATUS_LABELS[status],
      href: buildUsersHref(path, { ...filters, status }),
    })),
  ];

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end">
      <form
        action={path}
        method="get"
        role="search"
        className="flex flex-col gap-1.5 lg:flex-1"
      >
        <label
          htmlFor="filtre-recherche"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500"
        >
          <Search aria-hidden className="h-4 w-4 text-secondary" />
          Recherche
        </label>
        <Input
          id="filtre-recherche"
          name={USER_FILTER_PARAMS.search}
          type="search"
          defaultValue={filters.search ?? ""}
          placeholder={searchPlaceholder}
        />

        {/* Le statut suit la recherche : sans ce champ, valider le formulaire
            l'effacerait de l'URL. */}
        {filters.status && (
          <input
            type="hidden"
            name={USER_FILTER_PARAMS.status}
            value={filters.status === "SUSPENDED" ? "suspendu" : "actif"}
          />
        )}
        <button type="submit" className="sr-only">
          Lancer la recherche
        </button>
      </form>

      <FilterSelect
        id="filtre-statut-compte"
        label="Statut"
        icon={<ShieldCheck aria-hidden className="h-4 w-4 text-secondary" />}
        value={filters.status ?? ALL_FILTER_VALUE}
        options={statusOptions}
        className="lg:w-52"
      />

      {hasActiveUserFilters(filters) && (
        <Link
          href={buildUsersHref(path, NO_USER_FILTERS)}
          scroll={false}
          className="inline-flex items-center gap-1.5 self-start rounded-md px-1 py-2 text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 lg:self-auto lg:py-2.5"
        >
          <RotateCcw aria-hidden className="h-4 w-4" />
          Réinitialiser
        </Link>
      )}
    </div>
  );
}
