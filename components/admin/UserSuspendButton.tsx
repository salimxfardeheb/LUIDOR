"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, RotateCcw } from "lucide-react";
import { setUserSuspended } from "@/actions/admin-users";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/**
 * Suspension et réactivation d'un compte.
 *
 * La suspension passe par une confirmation : elle coupe l'accès à la
 * plateforme, et la modale rappelle ce que le compte laisse derrière lui
 * (salles publiées, réservations). La réactivation est immédiate — remettre un
 * accès n'a pas à être protégé.
 */
export function UserSuspendButton({
  userId,
  fullName,
  suspended,
  roomsCount = 0,
  bookingsCount = 0,
}: {
  userId: string;
  fullName: string;
  suspended: boolean;
  /** Salles détenues, rappelées avant de suspendre un propriétaire. */
  roomsCount?: number;
  /** Réservations du compte, rappelées avant de le suspendre. */
  bookingsCount?: number;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function apply(nextSuspended: boolean) {
    setPending(true);
    setError(null);

    const result = await setUserSuspended(userId, nextSuspended);

    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setConfirmOpen(false);
    router.refresh();
  }

  if (suspended) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => apply(false)}
        >
          <RotateCcw aria-hidden className="h-4 w-4" />
          {pending ? "Un instant…" : "Réactiver"}
          <span className="sr-only"> le compte de {fullName}</span>
        </Button>
        {error && (
          <Alert variant="error" className="text-xs">
            {error}
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirmOpen(true)}
      >
        <Ban aria-hidden className="h-4 w-4" />
        Suspendre
        <span className="sr-only"> le compte de {fullName}</span>
      </Button>

      {error && !confirmOpen && (
        <Alert variant="error" className="text-xs">
          {error}
        </Alert>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => (pending ? undefined : setConfirmOpen(false))}
        title="Suspendre ce compte ?"
        description={`${fullName} ne pourra plus se connecter à LIUDOR tant que le compte n'aura pas été réactivé.`}
      >
        <div className="flex flex-col gap-4">
          {(roomsCount > 0 || bookingsCount > 0) && (
            <Alert variant="warning" title="Ce compte a de l'activité">
              {roomsCount > 0 && (
                <span className="block">
                  {roomsCount} salle{roomsCount > 1 ? "s" : ""} rattachée
                  {roomsCount > 1 ? "s" : ""} : elle
                  {roomsCount > 1 ? "s restent" : " reste"} en ligne, la
                  suspension ne les retire pas du catalogue.
                </span>
              )}
              {bookingsCount > 0 && (
                <span className="block">
                  {bookingsCount} réservation{bookingsCount > 1 ? "s" : ""} au
                  dossier : aucune n&apos;est annulée.
                </span>
              )}
            </Alert>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          <p className="text-sm text-gray-500">
            La suspension est réversible : vous pourrez rendre l&apos;accès à
            tout moment depuis cette liste.
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() => apply(true)}
            >
              {pending ? "Suspension…" : "Suspendre le compte"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
