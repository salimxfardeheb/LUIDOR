import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { OwnerRoomCard } from "@/components/owner/OwnerRoomCard";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/auth";
import { listOwnerRooms } from "@/lib/owner/rooms";

// Route /owner/salles — protégée, rôle OWNER.
// Liste uniquement les salles du propriétaire connecté.
export const metadata: Metadata = { title: "Mes salles" };

interface PageProps {
  searchParams: { cree?: string; maj?: string };
}

export default async function Page({ searchParams }: PageProps) {
  const session = await auth();

  // Le middleware garantit déjà un compte OWNER : cette garde couvre le cas
  // limite d'une session expirée entre sa vérification et le rendu.
  if (!session?.user?.id) {
    return (
      <Alert variant="warning" title="Session expirée">
        Reconnectez-vous pour accéder à vos salles.
      </Alert>
    );
  }

  const rooms = await listOwnerRooms(session.user.id);

  // Les bandeaux de confirmation ne s'affichent que pour une salle réellement
  // présente dans la liste du propriétaire : un identifiant forgé dans l'URL ne
  // produit aucun message.
  const created = searchParams.cree
    ? rooms.find((room) => room.id === searchParams.cree)
    : undefined;
  const updated = searchParams.maj
    ? rooms.find((room) => room.id === searchParams.maj)
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Mes salles
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {rooms.length === 0
              ? "Vous n'avez encore publié aucune salle."
              : `${rooms.length} salle${rooms.length > 1 ? "s" : ""} enregistrée${rooms.length > 1 ? "s" : ""} sur votre compte.`}
          </p>
        </div>

        <Link href="/owner/salles/nouvelle" className="shrink-0">
          <Button className="w-full sm:w-auto">
            <Plus aria-hidden className="h-4 w-4" />
            Ajouter une salle
          </Button>
        </Link>
      </header>

      {created && (
        <Alert variant="success" title="Salle enregistrée">
          « {created.name} » attend la validation de l&apos;équipe LIUDOR. Elle
          apparaîtra dans le catalogue public dès qu&apos;elle sera validée.
        </Alert>
      )}

      {updated && (
        <Alert variant="success" title="Modifications enregistrées">
          Les informations de « {updated.name} » ont été mises à jour.
        </Alert>
      )}

      {rooms.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-4">
          {rooms.map((room) => (
            <li key={room.id}>
              <OwnerRoomCard room={room} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
        <Building2 aria-hidden className="h-6 w-6 text-secondary" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-gray-900">
        Publiez votre première salle
      </h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Décrivez votre salle, ajoutez des photos et indiquez votre tarif :
        l&apos;équipe LIUDOR la validera avant sa mise en ligne dans le
        catalogue.
      </p>
      <Link href="/owner/salles/nouvelle" className="mt-6">
        <Button>
          <Plus aria-hidden className="h-4 w-4" />
          Ajouter une salle
        </Button>
      </Link>
    </div>
  );
}
