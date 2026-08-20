import Link from "next/link";
import { Coins, RotateCcw, Search } from "lucide-react";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import {
  ALL_FILTER_VALUE,
  buildPaymentsHref,
  hasActivePaymentFilters,
  NO_PAYMENT_FILTERS,
  PAYMENT_FILTER_PARAMS,
  PAYMENT_STAGES,
  PAYMENT_STAGE_LABELS,
  PAYMENTS_PATH,
  stageParam,
  type PaymentFilters as Filters,
} from "@/lib/admin/payments-params";

/**
 * Barre de filtres du suivi des paiements : recherche et étape du circuit.
 *
 * Composant serveur : il prépare les destinations, l'interactivité vit dans
 * `FilterSelect`. La recherche est un vrai formulaire `GET` — elle fonctionne
 * sans JavaScript, et les autres critères actifs voyagent en champs cachés pour
 * ne pas être perdus à la validation.
 */
export function PaymentFilters({ filters }: { filters: Filters }) {
  const stageOptions = [
    {
      value: ALL_FILTER_VALUE,
      label: "Toutes les étapes",
      href: buildPaymentsHref({ ...filters, stage: null }),
    },
    ...PAYMENT_STAGES.map((stage) => ({
      value: stage,
      label: PAYMENT_STAGE_LABELS[stage],
      href: buildPaymentsHref({ ...filters, stage }),
    })),
  ];

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end">
      <form
        action={PAYMENTS_PATH}
        method="get"
        role="search"
        className="flex flex-col gap-1.5 lg:flex-1"
      >
        <label
          htmlFor="filtre-paiement-recherche"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500"
        >
          <Search aria-hidden className="h-4 w-4 text-secondary" />
          Recherche
        </label>
        <Input
          id="filtre-paiement-recherche"
          name={PAYMENT_FILTER_PARAMS.search}
          type="search"
          defaultValue={filters.search ?? ""}
          placeholder="Rechercher un client, une salle ou un propriétaire…"
        />

        {filters.stage && (
          <input
            type="hidden"
            name={PAYMENT_FILTER_PARAMS.stage}
            value={stageParam(filters.stage)}
          />
        )}
        {filters.ownerId && (
          <input
            type="hidden"
            name={PAYMENT_FILTER_PARAMS.owner}
            value={filters.ownerId}
          />
        )}
        <button type="submit" className="sr-only">
          Lancer la recherche
        </button>
      </form>

      <FilterSelect
        id="filtre-paiement-etape"
        label="Étape"
        icon={<Coins aria-hidden className="h-4 w-4 text-secondary" />}
        value={filters.stage ?? ALL_FILTER_VALUE}
        options={stageOptions}
        className="lg:w-72"
      />

      {hasActivePaymentFilters(filters) && (
        <Link
          href={buildPaymentsHref(NO_PAYMENT_FILTERS)}
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
