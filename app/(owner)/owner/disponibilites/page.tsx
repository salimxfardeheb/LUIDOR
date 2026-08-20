import type { Metadata } from "next";
import { Building2, LayoutGrid } from "lucide-react";
import { AvailabilityCalendar } from "@/components/owner/AvailabilityCalendar";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { auth } from "@/lib/auth";
import { getOwnerRoomWindow, todayIso } from "@/lib/owner/availability";
import {
  buildAvailabilityHref,
  editableMonths,
  lastEditableDate,
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
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Header />
        <EmptyState
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
  // Le mois de l'URL ne sert plus qu'à choisir celui affiché en premier : les
  // douze mois gérables sont chargés d'un coup, et les flèches passent de l'un
  // à l'autre dans le navigateur, sans repasser par le serveur.
  const initialMonthKey = resolveMonthWindow(searchParams.mois).current.key;
  const months = await getOwnerRoomWindow(
    session.user.id,
    selectedRoom.id,
    editableMonths()
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Header />

      <FilterSelect
        id="salle"
        label="Salle"
        icon={<LayoutGrid aria-hidden className="h-4 w-4 text-secondary" />}
        value={selectedRoom.id}
        options={rooms.map((room) => ({
          value: room.id,
          label: `${room.name} — ${room.city}`,
          href: buildAvailabilityHref(room.id, initialMonthKey),
        }))}
        className="sm:max-w-sm"
      />

      {months && months.length > 0 ? (
        <AvailabilityCalendar
          // Remonter le composant à chaque changement de salle : son état local
          // repart alors des grilles rendues par le serveur. Le mois, lui, est
          // désormais un état interne — en changer ne remonte rien.
          key={selectedRoom.id}
          roomId={selectedRoom.id}
          roomName={selectedRoom.name}
          months={months}
          initialMonthKey={initialMonthKey}
          // Bornes de la fenêtre gérable calculées ici : le calendrier tourne
          // dans le navigateur, mais ce n'est pas à l'horloge du visiteur de
          // décider quelles dates sont modifiables.
          today={todayIso()}
          maxDate={lastEditableDate()}
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
    <PageHeader
      title="Disponibilités"
      description="Cliquez sur une date pour l'ouvrir ou la fermer à la réservation. Seules les dates ouvertes apparaissent réservables sur la fiche publique de la salle."
    />
  );
}
