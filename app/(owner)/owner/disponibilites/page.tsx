import type { Metadata } from "next";
import { Building2, LayoutGrid } from "lucide-react";
import { AvailabilityCalendar } from "@/components/owner/AvailabilityCalendar";
import { OwnerEmptyState } from "@/components/owner/OwnerEmptyState";
import { OwnerFilterSelect } from "@/components/owner/OwnerFilterSelect";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { Alert } from "@/components/ui/Alert";
import { auth } from "@/lib/auth";
import { getOwnerRoomMonth } from "@/lib/owner/availability";
import {
  buildAvailabilityHref,
  resolveMonthWindow,
} from "@/lib/owner/availability-params";
import { listOwnerRoomOptions } from "@/lib/owner/rooms";

// Route /owner/disponibilites — protégée, rôle OWNER.
// La salle et le mois affichés vivent dans l'URL (`?salle=…&mois=YYYY-MM`).
export const metadata: Metadata = { title: "Disponibilités" };

interface PageProps {
  searchParams: { salle?: string; mois?: string };
}

export default async function Page({ searchParams }: PageProps) {
  const session = await auth();

  // Le middleware garantit déjà un compte OWNER : cette garde couvre le cas
  // limite d'une session expirée entre sa vérification et le rendu.
  if (!session?.user?.id) {
    return (
      <Alert variant="warning" title="Session expirée">
        Reconnectez-vous pour gérer vos disponibilités.
      </Alert>
    );
  }

  const rooms = await listOwnerRoomOptions(session.user.id);

  if (rooms.length === 0) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Header />
        <OwnerEmptyState
          icon={Building2}
          title="Aucune salle à gérer"
          description="Le calendrier s'ouvre dès qu'une salle est enregistrée sur votre compte. Vous pourrez préparer ses disponibilités avant même sa mise en ligne."
          action={{ href: "/owner/salles/nouvelle", label: "Ajouter une salle" }}
        />
      </div>
    );
  }

  // Une salle inconnue dans l'URL retombe sur la première : le calendrier
  // affiche toujours une salle du propriétaire, jamais une page vide.
  const selectedRoom =
    rooms.find((room) => room.id === searchParams.salle) ?? rooms[0];
  const monthWindow = resolveMonthWindow(searchParams.mois);

  const month = await getOwnerRoomMonth(
    session.user.id,
    selectedRoom.id,
    monthWindow.current
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Header />

      <OwnerFilterSelect
        id="salle"
        label="Salle"
        icon={<LayoutGrid aria-hidden className="h-4 w-4 text-secondary" />}
        value={selectedRoom.id}
        options={rooms.map((room) => ({
          value: room.id,
          label: `${room.name} — ${room.city}`,
          href: buildAvailabilityHref(room.id, monthWindow.current.key),
        }))}
        className="sm:max-w-sm"
      />

      {month ? (
        <AvailabilityCalendar
          // Remonter le composant à chaque changement de salle ou de mois : son
          // état local repart alors de la grille rendue par le serveur.
          key={`${selectedRoom.id}-${month.key}`}
          roomId={selectedRoom.id}
          roomName={selectedRoom.name}
          month={month}
          previousHref={
            monthWindow.previous
              ? buildAvailabilityHref(selectedRoom.id, monthWindow.previous.key)
              : null
          }
          nextHref={
            monthWindow.next
              ? buildAvailabilityHref(selectedRoom.id, monthWindow.next.key)
              : null
          }
        />
      ) : (
        <Alert variant="error" title="Salle indisponible">
          Le calendrier de cette salle n&apos;a pas pu être chargé. Réessayez
          dans un instant.
        </Alert>
      )}
    </div>
  );
}

function Header() {
  return (
    <OwnerPageHeader
      title="Disponibilités"
      description="Cliquez sur une date pour l'ouvrir ou la fermer à la réservation. Seules les dates ouvertes apparaissent réservables sur la fiche publique de la salle."
    />
  );
}
