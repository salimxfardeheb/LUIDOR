import Link from "next/link";
import { ArrowUpDown, Banknote, RotateCcw, Search, Tag } from "lucide-react";
import { BOOKING_STATUSES, BOOKING_STATUS_MAP } from "@/lib/bookings/status";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import {
  ALL_FILTER_VALUE,
  BOOKING_FILTER_PARAMS,
  buildBookingsHref,
  DEFAULT_SORT,
  hasActiveBookingFilters,
  NO_BOOKING_FILTERS,
  PAYMENT_FILTERS,
  PAYMENT_FILTER_LABELS,
  SORT_LABELS,
  SORTS,
  ADMIN_BOOKINGS_PATH,
  type BookingAdminFilters,
} from "@/lib/admin/bookings-params";

/**
 * Recherche, filtres et tri des réservations.
 *
 * Composant serveur : il prépare les destinations, l'interactivité vit dans
 * `FilterSelect`. La recherche est un formulaire `GET` — elle fonctionne sans
 * JavaScript, et les critères déjà actifs voyagent en champs cachés pour ne pas
 * disparaître à la validation.
 */
export function BookingFilters({
  filters,
}: {
  filters: BookingAdminFilters;
}) {
  const statusOptions = [
    {
      value: ALL_FILTER_VALUE,
      label: "Tous les statuts",
      href: buildBookingsHref({ ...filters, status: null }),
    },
    ...BOOKING_STATUSES.map((status) => ({
      value: status,
      label: BOOKING_STATUS_MAP[status].label,
      href: buildBookingsHref({ ...filters, status }),
    })),
  ];

  const paymentOptions = [
    {
      value: ALL_FILTER_VALUE,
      label: "Tous les paiements",
      href: buildBookingsHref({ ...filters, payment: null }),
    },
    ...PAYMENT_FILTERS.map((payment) => ({
      value: payment,
      label: PAYMENT_FILTER_LABELS[payment],
      href: buildBookingsHref({ ...filters, payment }),
    })),
  ];

  const sortOptions = SORTS.map((sort) => ({
    value: sort,
    label: SORT_LABELS[sort],
    href: buildBookingsHref({ ...filters, sort }),
  }));

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm xl:flex-row xl:items-end">
      <form
        action={ADMIN_BOOKINGS_PATH}
        method="get"
        role="search"
        className="flex flex-col gap-1.5 xl:flex-1"
      >
        <label
          htmlFor="filtre-reservations"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500"
        >
          <Search aria-hidden className="h-4 w-4 text-secondary" />
          Recherche
        </label>
        <Input
          id="filtre-reservations"
          name={BOOKING_FILTER_PARAMS.search}
          type="search"
          defaultValue={filters.search ?? ""}
          placeholder="Client, email, salle, ville ou type d'événement…"
        />

        {filters.status && (
          <input
            type="hidden"
            name={BOOKING_FILTER_PARAMS.status}
            value={filters.status}
          />
        )}
        {filters.payment && (
          <input
            type="hidden"
            name={BOOKING_FILTER_PARAMS.payment}
            value={filters.payment}
          />
        )}
        {filters.ownerId && (
          <input
            type="hidden"
            name={BOOKING_FILTER_PARAMS.owner}
            value={filters.ownerId}
          />
        )}
        {filters.sort !== DEFAULT_SORT && (
          <input
            type="hidden"
            name={BOOKING_FILTER_PARAMS.sort}
            value={filters.sort}
          />
        )}
        <button type="submit" className="sr-only">
          Lancer la recherche
        </button>
      </form>

      <FilterSelect
        id="filtre-statut-reservation"
        label="Statut"
        icon={<Tag aria-hidden className="h-4 w-4 text-secondary" />}
        value={filters.status ?? ALL_FILTER_VALUE}
        options={statusOptions}
        className="xl:w-52"
      />

      <FilterSelect
        id="filtre-paiement"
        label="Paiement"
        icon={<Banknote aria-hidden className="h-4 w-4 text-secondary" />}
        value={filters.payment ?? ALL_FILTER_VALUE}
        options={paymentOptions}
        className="xl:w-56"
      />

      <FilterSelect
        id="tri-reservations"
        label="Trier par"
        icon={<ArrowUpDown aria-hidden className="h-4 w-4 text-secondary" />}
        value={filters.sort}
        options={sortOptions}
        className="xl:w-56"
      />

      {hasActiveBookingFilters(filters) && (
        <Link
          href={buildBookingsHref(NO_BOOKING_FILTERS)}
          scroll={false}
          className="inline-flex items-center gap-1.5 self-start rounded-md px-1 py-2 text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 xl:self-auto xl:py-2.5"
        >
          <RotateCcw aria-hidden className="h-4 w-4" />
          Réinitialiser
        </Link>
      )}
    </div>
  );
}
