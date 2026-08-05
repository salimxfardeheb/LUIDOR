"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { deleteReview, publishReview } from "@/actions/admin-reviews";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/**
 * Décision sur un avis : publier ou supprimer.
 *
 * La suppression passe par une confirmation — elle est définitive, et l'avis
 * ne peut pas être remis en ligne ensuite. La publication, réversible par une
 * suppression, s'applique directement.
 */
export function ReviewModerationActions({
  reviewId,
  authorName,
  roomName,
  published,
}: {
  reviewId: string;
  authorName: string;
  roomName: string;
  published: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function publish() {
    setPending(true);
    setError(null);

    const result = await publishReview(reviewId);
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.refresh();
  }

  async function remove() {
    setPending(true);
    setError(null);

    const result = await deleteReview(reviewId);
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:w-44">
      {!published && (
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={pending}
          onClick={publish}
        >
          <Check aria-hidden className="h-4 w-4" />
          {pending ? "Un instant…" : "Publier"}
          <span className="sr-only"> l&apos;avis de {authorName}</span>
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 aria-hidden className="h-4 w-4" />
        Supprimer
        <span className="sr-only"> l&apos;avis de {authorName}</span>
      </Button>

      {error && !confirmOpen && (
        <Alert variant="error" className="text-xs">
          {error}
        </Alert>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => (pending ? undefined : setConfirmOpen(false))}
        title="Supprimer cet avis ?"
        description={`L'avis de ${authorName} sur « ${roomName} » sera définitivement retiré.`}
      >
        <div className="flex flex-col gap-4">
          {error && <Alert variant="error">{error}</Alert>}

          <p className="text-sm text-gray-500">
            {published
              ? "L'avis disparaîtra de la fiche salle et ne comptera plus dans la note moyenne. "
              : ""}
            Le client pourra déposer un nouvel avis sur cette salle.
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
              onClick={remove}
            >
              {pending ? "Suppression…" : "Supprimer l'avis"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
