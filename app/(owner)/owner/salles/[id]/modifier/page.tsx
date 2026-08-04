import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ShieldX } from "lucide-react";
import { RoomForm } from "@/components/owner/RoomForm";
import { ROOM_STATUS, RoomStatusBadge } from "@/components/owner/RoomStatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/auth";
import { getOwnerRoomForEdit, getRoomFormOptions } from "@/lib/owner/rooms";

// Route /owner/salles/[id]/modifier — protégée, rôle OWNER.
export const metadata: Metadata = { title: "Modifier la salle" };

export default async function Page({ params }: { params: { id: string } }) {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <Alert variant="warning" title="Session expirée">
        Reconnectez-vous pour modifier vos salles.
      </Alert>
    );
  }

  const [access, options] = await Promise.all([
    getOwnerRoomForEdit(params.id, session.user.id),
    getRoomFormOptions(),
  ]);

  // Identifiant inconnu : 404, avec le vrai code HTTP.
  if (!access.ok && access.reason === "not-found") notFound();

  // Salle appartenant à un autre propriétaire : accès refusé.
  if (!access.ok) return <Forbidden />;

  const { room } = access;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/owner/salles"
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-gray-500 transition-colors hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2"
      >
        <ChevronLeft aria-hidden className="h-4 w-4" />
        Mes salles
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {room.name}
          </h1>
          <RoomStatusBadge status={room.status} />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {ROOM_STATUS[room.status].help}
        </p>
      </header>

      {room.status === "REJECTED" && (
        <Alert variant="error" title="Salle refusée" className="mt-5">
          Corrigez les informations signalées puis contactez le support pour
          demander un nouvel examen.
        </Alert>
      )}

      {room.status === "ACTIVE" && (
        <Alert variant="info" className="mt-5">
          Cette salle est en ligne : vos modifications seront visibles
          immédiatement dans le catalogue public.
        </Alert>
      )}

      <div className="mt-6">
        <RoomForm options={options} room={room} />
      </div>
    </div>
  );
}

/**
 * Accès refusé (403).
 *
 * Next 14 ne permet pas de fixer le code HTTP depuis le rendu d'une page : seul
 * `notFound()` (404) existe. La réponse porte donc un statut 200 avec ce contenu
 * explicite. Les mutations, elles, refusent réellement : `updateRoom` renvoie un
 * résultat `status: 403` si la salle n'appartient pas au compte connecté. La
 * fonction `forbidden()` de Next 15 permettra d'aligner le code HTTP.
 */
function Forbidden() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="flex flex-col items-center rounded-lg border border-error/30 bg-error/5 px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
          <ShieldX aria-hidden className="h-6 w-6 text-error" />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-error">
          Erreur 403
        </p>
        <h1 className="mt-1 text-lg font-semibold text-gray-900">
          Accès refusé
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Cette salle n&apos;appartient pas à votre compte. Vous ne pouvez
          modifier que les salles que vous avez publiées.
        </p>
        <Link href="/owner/salles" className="mt-6">
          <Button variant="outline">Retour à mes salles</Button>
        </Link>
      </div>
    </div>
  );
}
