import type { Metadata } from "next";
import Link from "next/link";
import {
  Banknote,
  CalendarCheck,
  CalendarX,
  RotateCcw,
  ShieldQuestion,
} from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guards";
import {
  getBookingCounts,
  listAdminBookings,
  listAdminOptions,
} from "@/lib/admin/bookings";
import {
  ADMIN_BOOKINGS_PATH,
  buildBookingsHref,
  hasActiveBookingFilters,
  NO_BOOKING_FILTERS,
  parseBookingAdminFilters,
  type BookingSearchParams,
} from "@/lib/admin/bookings-params";
import { getOwnerName } from "@/lib/admin/rooms";
import { formatNumber, formatPrice } from "@/lib/format";
import { BookingFilters } from "@/components/admin/BookingFilters";
import { BookingsTable } from "@/components/admin/BookingsTable";
import { StatTiles } from "@/components/admin/StatTiles";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

// Route /admin/reservations — toutes les réservations, protégée (ADMIN).
export const metadata: Metadata = { title: "Réservations" };

interface PageProps {
  searchParams: BookingSearchParams;
}

export default async function Page({ searchParams }: PageProps) {
  const session = await requireAdminPage(ADMIN_BOOKINGS_PATH);

  const requested = parseBookingAdminFilters(searchParams);

  // Un propriétaire inconnu retombe sur la liste complète plutôt que sur une
  // page vide sous un filtre fantôme.
  const ownerName = requested.ownerId
    ? await getOwnerName(requested.ownerId)
    : null;
  const filters = ownerName ? requested : { ...requested, ownerId: null };

  const [bookings, counts, admins] = await Promise.all([
    listAdminBookings(filters),
    getBookingCounts(),
    listAdminOptions(),
  ]);

  const filtered = hasActiveBookingFilters(filters);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Toutes les réservations"
        description="Les demandes reçues sur l'ensemble des salles. Les paiements se règlent en espèces : ils sont enregistrés ici une fois encaissés."
      />

      {filters.ownerId && ownerName && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3">
          <p className="text-sm text-gray-700">
            Liste filtrée sur les salles de{" "}
            <span className="font-semibold text-gray-900">{ownerName}</span>.
          </p>
          <Link
            href={ADMIN_BOOKINGS_PATH}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <RotateCcw aria-hidden className="h-4 w-4" />
            Voir toutes les réservations
          </Link>
        </div>
      )}

      <StatTiles
        tiles={[
          {
            icon: CalendarCheck,
            label: "Réservations au total",
            value: formatNumber(counts.total),
            tone: "primary",
          },
          {
            icon: ShieldQuestion,
            label: "En cours de vérification",
            value: formatNumber(counts.toVerify),
            tone: counts.toVerify > 0 ? "warning" : "neutral",
          },
          {
            icon: CalendarCheck,
            label: "Confirmées",
            value: formatNumber(counts.confirmed),
            tone: "accent",
          },
          {
            icon: Banknote,
            label: "Espèces encaissées",
            value: formatPrice(counts.cashCollected),
            tone: "secondary",
          },
        ]}
      />

      <BookingFilters filters={filters} />

      <p className="text-sm text-gray-500" aria-live="polite">
        {bookings.length === 0
          ? "Aucune réservation à afficher."
          : `${bookings.length} réservation${bookings.length > 1 ? "s" : ""} affichée${
              bookings.length > 1 ? "s" : ""
            }${filtered ? " pour ces critères" : ""}.`}
      </p>

      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title={
            filtered
              ? "Aucune réservation pour ces critères"
              : "Aucune réservation enregistrée"
          }
          description={
            filtered
              ? "Aucune demande ne correspond à la recherche, au statut ou au paiement sélectionné."
              : "Les demandes déposées par les clients sur les salles publiées apparaîtront ici."
          }
          action={
            filtered
              ? {
                  href: buildBookingsHref(NO_BOOKING_FILTERS),
                  label: "Voir toutes les réservations",
                }
              : { href: "/admin/salles", label: "Voir les salles" }
          }
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <BookingsTable
              bookings={bookings}
              admins={admins}
              currentAdminId={session.adminId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
