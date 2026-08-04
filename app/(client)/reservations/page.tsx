import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarX, Tag } from "lucide-react";
import { BookingCard } from "@/components/account/BookingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { PageHeader } from "@/components/ui/PageHeader";
import { auth } from "@/lib/auth";
import { listAccountBookings } from "@/lib/account/bookings";
import {
  ALL_STATUS_VALUE,
  buildAccountBookingsHref,
  parseBookingStatusParam,
} from "@/lib/account/bookings-params";
import { BOOKING_STATUS_MAP, BOOKING_STATUSES } from "@/lib/bookings/status";
import { SIGN_IN_PATH } from "@/lib/roles";

// Route /reservations — protégée. `clientId` est filtré en base : la page ne
// peut afficher que les réservations du compte connecté.
export const metadata: Metadata = { title: "Mes réservations" };

interface PageProps {
  searchParams: { statut?: string };
}

export default async function Page({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect(`${SIGN_IN_PATH}?callbackUrl=/reservations`);

  const status = parseBookingStatusParam(searchParams.statut);
  const bookings = await listAccountBookings(session.user.id, status);

  const statusOptions = [
    {
      value: ALL_STATUS_VALUE,
      label: "Tous les statuts",
      href: buildAccountBookingsHref(null),
    },
    ...BOOKING_STATUSES.map((value) => ({
      value,
      label: BOOKING_STATUS_MAP[value].label,
      href: buildAccountBookingsHref(value),
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mes réservations"
        description="Vos demandes de réservation, de l'événement le plus récent au plus ancien."
      />

      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <FilterSelect
          id="filtre-statut"
          label="Statut"
          icon={<Tag aria-hidden className="h-4 w-4 text-secondary" />}
          value={status ?? ALL_STATUS_VALUE}
          options={statusOptions}
          className="sm:max-w-xs sm:flex-1"
        />

        <p className="text-sm text-gray-500" aria-live="polite">
          {bookings.length === 0
            ? "Aucune réservation à afficher."
            : `${bookings.length} réservation${bookings.length > 1 ? "s" : ""} affichée${bookings.length > 1 ? "s" : ""}.`}
        </p>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title={
            status
              ? "Aucune réservation avec ce statut"
              : "Aucune réservation pour le moment"
          }
          description={
            status
              ? "Aucune de vos réservations n'est dans cet état. Retirez le filtre pour retrouver toutes vos demandes."
              : "Parcourez le catalogue et envoyez votre première demande : elle apparaîtra ici avec son statut."
          }
          action={
            status
              ? {
                  href: buildAccountBookingsHref(null),
                  label: "Voir toutes mes réservations",
                }
              : { href: "/salles", label: "Découvrir les salles" }
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <BookingCard booking={booking} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
