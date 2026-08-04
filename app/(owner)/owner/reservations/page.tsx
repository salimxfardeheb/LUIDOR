import type { Metadata } from "next";
import { CalendarX, Building2 } from "lucide-react";
import { BookingFilters } from "@/components/owner/BookingFilters";
import { OwnerBookingsList } from "@/components/owner/OwnerBookingsList";
import { OwnerEmptyState } from "@/components/owner/OwnerEmptyState";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { Alert } from "@/components/ui/Alert";
import { auth } from "@/lib/auth";
import { listOwnerBookings } from "@/lib/owner/bookings";
import {
  buildBookingsHref,
  hasActiveFilters,
  NO_BOOKING_FILTERS,
  parseBookingFilters,
} from "@/lib/owner/bookings-params";
import { listOwnerRoomOptions } from "@/lib/owner/rooms";

// Route /owner/reservations — protégée, rôle OWNER.
// Page en lecture seule : le statut d'une réservation ne se change que depuis
// le portail administrateur, qui suit les paiements et les annulations.
export const metadata: Metadata = { title: "Réservations reçues" };

interface PageProps {
  searchParams: { salle?: string; statut?: string };
}

export default async function Page({ searchParams }: PageProps) {
  const session = await auth();

  // Le middleware garantit déjà un compte OWNER : cette garde couvre le cas
  // limite d'une session expirée entre sa vérification et le rendu.
  if (!session?.user?.id) {
    return (
      <Alert variant="warning" title="Session expirée">
        Reconnectez-vous pour consulter vos réservations.
      </Alert>
    );
  }

  const rooms = await listOwnerRoomOptions(session.user.id);
  const filters = parseBookingFilters(
    searchParams,
    rooms.map((room) => room.id)
  );
  const bookings = await listOwnerBookings(session.user.id, filters);

  const filtered = hasActiveFilters(filters);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <OwnerPageHeader
        title="Réservations reçues"
        description="Les demandes reçues sur vos salles, de la plus récente à la plus ancienne."
      />

      <Alert variant="info" title="Consultation uniquement">
        Le statut d&apos;une réservation est géré par l&apos;équipe LIUDOR, qui
        vérifie le paiement avant de la confirmer. Contactez le support pour
        signaler un problème sur une demande.
      </Alert>

      {rooms.length === 0 ? (
        <OwnerEmptyState
          icon={Building2}
          title="Aucune salle publiée"
          description="Les demandes de réservation arriveront ici dès qu'une de vos salles sera en ligne dans le catalogue."
          action={{ href: "/owner/salles/nouvelle", label: "Ajouter une salle" }}
        />
      ) : (
        <>
          <BookingFilters rooms={rooms} filters={filters} />

          <p className="text-sm text-gray-500" aria-live="polite">
            {bookings.length === 0
              ? "Aucune réservation à afficher."
              : `${bookings.length} réservation${bookings.length > 1 ? "s" : ""} affichée${bookings.length > 1 ? "s" : ""}${filtered ? " pour ces filtres" : ""}.`}
          </p>

          {bookings.length === 0 ? (
            <OwnerEmptyState
              icon={CalendarX}
              title={
                filtered
                  ? "Aucune réservation pour ces filtres"
                  : "Aucune réservation pour le moment"
              }
              description={
                filtered
                  ? "Aucune demande ne correspond à la salle ou au statut sélectionné."
                  : "Les demandes reçues sur vos salles apparaîtront ici, avec les coordonnées du client et le montant de la réservation."
              }
              action={
                filtered
                  ? {
                      href: buildBookingsHref(NO_BOOKING_FILTERS),
                      label: "Voir toutes les réservations",
                    }
                  : { href: "/owner/salles", label: "Voir mes salles" }
              }
            />
          ) : (
            <OwnerBookingsList bookings={bookings} />
          )}
        </>
      )}
    </div>
  );
}
