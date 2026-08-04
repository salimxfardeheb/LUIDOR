"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RoomStatus } from "@prisma/client";
import { Eye, EyeOff, Pencil } from "lucide-react";
import { setRoomAvailability } from "@/actions/owner-rooms";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/**
 * Actions d'une salle : modifier, désactiver ou réactiver.
 *
 * La désactivation retire la salle du catalogue public : elle passe par une
 * confirmation, d'autant plus qu'elle peut concerner une salle ayant des
 * réservations en cours.
 *
 * « Réactiver » n'était pas demandé, mais sans elle la désactivation serait sans
 * retour depuis l'interface.
 */
export function RoomActions({
  roomId,
  roomName,
  status,
  activeBookingCount,
}: {
  roomId: string;
  roomName: string;
  status: RoomStatus;
  activeBookingCount: number;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Seule une salle en ligne se désactive, seule une salle désactivée se
  // réactive : PENDING et REJECTED ne sont pas publiées.
  const canDeactivate = status === "ACTIVE";
  const canReactivate = status === "SUSPENDED";

  async function apply(active: boolean) {
    setPending(true);
    setError(null);

    const result = await setRoomAvailability(roomId, active);

    if (!result.ok) {
      setPending(false);
      setError(result.message);
      return;
    }

    setConfirmOpen(false);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 sm:w-40">
      <Link href={`/owner/salles/${roomId}/modifier`}>
        <Button variant="outline" size="sm" className="w-full">
          <Pencil aria-hidden className="h-4 w-4" />
          Modifier
        </Button>
      </Link>

      {canDeactivate && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setConfirmOpen(true)}
        >
          <EyeOff aria-hidden className="h-4 w-4" />
          Désactiver
        </Button>
      )}

      {canReactivate && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          disabled={pending}
          onClick={() => apply(true)}
        >
          <Eye aria-hidden className="h-4 w-4" />
          {pending ? "Un instant…" : "Réactiver"}
        </Button>
      )}

      {error && !confirmOpen && (
        <Alert variant="error" className="text-xs">
          {error}
        </Alert>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => (pending ? undefined : setConfirmOpen(false))}
        title="Désactiver cette salle ?"
        description={`« ${roomName} » n'apparaîtra plus dans le catalogue et ne recevra plus de demandes.`}
      >
        <div className="flex flex-col gap-4">
          {activeBookingCount > 0 && (
            <Alert variant="warning" title="Réservations en cours">
              Cette salle a {activeBookingCount} réservation
              {activeBookingCount > 1 ? "s" : ""} en cours. La désactivation ne
              les annule pas : vous restez engagé auprès de{" "}
              {activeBookingCount > 1 ? "ces clients" : "ce client"}.
            </Alert>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          <p className="text-sm text-gray-500">
            Vous pourrez la remettre en ligne à tout moment depuis cette page.
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
              onClick={() => apply(false)}
            >
              {pending ? "Désactivation…" : "Désactiver la salle"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
