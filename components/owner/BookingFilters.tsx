import Link from "next/link";
import { LayoutGrid, RotateCcw, Tag } from "lucide-react";
import { BOOKING_STATUS_META } from "@/components/dashboard/BookingStatusBadge";
import { OwnerFilterSelect } from "@/components/owner/OwnerFilterSelect";
import type { OwnerRoomOption } from "@/lib/owner/rooms";
import {
  ALL_FILTER_VALUE,
  BOOKING_STATUSES,
  buildBookingsHref,
  hasActiveFilters,
  NO_BOOKING_FILTERS,
  type BookingFilters as Filters,
} from "@/lib/owner/bookings-params";

/**
 * Filtres de la liste des réservations : par salle et par statut.
 *
 * Composant serveur : il ne fait que préparer les destinations de chaque
 * option, les sélecteurs eux-mêmes sont interactifs. Les filtres restant dans
 * l'URL, la vue filtrée est partageable et survit à un rechargement.
 */
export function BookingFilters({
  rooms,
  filters,
}: {
  rooms: OwnerRoomOption[];
  filters: Filters;
}) {
  const roomOptions = [
    {
      value: ALL_FILTER_VALUE,
      label: "Toutes les salles",
      href: buildBookingsHref({ ...filters, roomId: null }),
    },
    ...rooms.map((room) => ({
      value: room.id,
      label: `${room.name} — ${room.city}`,
      href: buildBookingsHref({ ...filters, roomId: room.id }),
    })),
  ];

  const statusOptions = [
    {
      value: ALL_FILTER_VALUE,
      label: "Tous les statuts",
      href: buildBookingsHref({ ...filters, status: null }),
    },
    ...BOOKING_STATUSES.map((status) => ({
      value: status,
      label: BOOKING_STATUS_META[status].label,
      href: buildBookingsHref({ ...filters, status }),
    })),
  ];

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
      <OwnerFilterSelect
        id="filtre-salle"
        label="Salle"
        icon={<LayoutGrid aria-hidden className="h-4 w-4 text-secondary" />}
        value={filters.roomId ?? ALL_FILTER_VALUE}
        options={roomOptions}
        className="sm:flex-1"
      />
      <OwnerFilterSelect
        id="filtre-statut"
        label="Statut"
        icon={<Tag aria-hidden className="h-4 w-4 text-secondary" />}
        value={filters.status ?? ALL_FILTER_VALUE}
        options={statusOptions}
        className="sm:flex-1"
      />

      {hasActiveFilters(filters) && (
        <Link
          href={buildBookingsHref(NO_BOOKING_FILTERS)}
          scroll={false}
          className="inline-flex items-center gap-1.5 self-start rounded-md px-1 py-2 text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:self-auto sm:py-2.5"
        >
          <RotateCcw aria-hidden className="h-4 w-4" />
          Réinitialiser
        </Link>
      )}
    </div>
  );
}
