"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { approveRoom, rejectRoom } from "@/actions/admin-rooms";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";

/**
 * Décision sur un dossier : valider ou rejeter.
 *
 * La validation publie la salle immédiatement — elle est réversible depuis la
 * gestion des salles. Le rejet, lui, passe par une modale : son motif est
 * obligatoire, c'est ce que le propriétaire lira pour corriger son dossier.
 */
export function RoomModerationActions({
  roomId,
  roomName,
}: {
  roomId: string;
  roomName: string;
}) {
  const router = useRouter();
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reasonError, setReasonError] = React.useState<string | null>(null);

  async function approve() {
    setPending(true);
    setError(null);

    const result = await approveRoom(roomId);
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.refresh();
  }

  async function reject() {
    setPending(true);
    setError(null);
    setReasonError(null);

    const result = await rejectRoom(roomId, reason);
    setPending(false);

    if (!result.ok) {
      setReasonError(result.fieldErrors?.reason ?? null);
      setError(result.fieldErrors?.reason ? null : result.message);
      return;
    }

    setRejectOpen(false);
    setReason("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 sm:w-44">
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="w-full"
        disabled={pending}
        onClick={approve}
      >
        <Check aria-hidden className="h-4 w-4" />
        {pending ? "Un instant…" : "Valider"}
        <span className="sr-only"> la salle {roomName}</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={pending}
        onClick={() => setRejectOpen(true)}
      >
        <X aria-hidden className="h-4 w-4" />
        Rejeter
        <span className="sr-only"> la salle {roomName}</span>
      </Button>

      {error && !rejectOpen && (
        <Alert variant="error" className="text-xs">
          {error}
        </Alert>
      )}

      <Modal
        open={rejectOpen}
        onClose={() => (pending ? undefined : setRejectOpen(false))}
        title="Rejeter ce dossier ?"
        description={`« ${roomName} » ne sera pas publiée. Le motif est transmis au propriétaire.`}
      >
        <div className="flex flex-col gap-4">
          {error && <Alert variant="error">{error}</Alert>}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`motif-${roomId}`}
              className="text-sm font-medium text-gray-900"
            >
              Motif du rejet <span aria-hidden>*</span>
              <span className="sr-only">(obligatoire)</span>
            </label>
            <Textarea
              id={`motif-${roomId}`}
              value={reason}
              required
              rows={4}
              maxLength={1000}
              aria-invalid={reasonError ? true : undefined}
              aria-describedby={
                reasonError ? `motif-${roomId}-erreur` : `motif-${roomId}-aide`
              }
              placeholder="Ex. : les photos ne montrent pas la salle principale, et l'adresse ne correspond pas à la ville renseignée."
              onChange={(event) => setReason(event.target.value)}
            />
            {reasonError ? (
              <p
                id={`motif-${roomId}-erreur`}
                role="alert"
                className="text-sm text-error"
              >
                {reasonError}
              </p>
            ) : (
              <p id={`motif-${roomId}-aide`} className="text-xs text-gray-500">
                Soyez précis : c&apos;est la seule indication dont dispose le
                propriétaire pour corriger et redéposer son dossier.
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setRejectOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={reject}
            >
              {pending ? "Envoi…" : "Rejeter la salle"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
