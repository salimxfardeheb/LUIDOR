"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import {
  deleteTestimonial,
  setTestimonialPublished,
} from "@/actions/admin-testimonials";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/**
 * Publication et suppression d'un témoignage.
 *
 * Publier et dépublier sont réversibles et s'appliquent directement ; la
 * suppression emporte le texte saisi, donc elle se confirme.
 */
export function TestimonialActions({
  testimonialId,
  authorName,
  published,
  /** `true` sur la page d'édition : la suppression y renvoie à la liste. */
  redirectOnDelete = false,
}: {
  testimonialId: string;
  authorName: string;
  published: boolean;
  redirectOnDelete?: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function togglePublished() {
    setPending(true);
    setError(null);

    const result = await setTestimonialPublished(testimonialId, !published);
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

    const result = await deleteTestimonial(testimonialId);
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setConfirmOpen(false);

    if (redirectOnDelete) {
      router.push("/admin/temoignages");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant={published ? "outline" : "primary"}
          size="sm"
          disabled={pending}
          onClick={togglePublished}
        >
          {published ? (
            <EyeOff aria-hidden className="h-4 w-4" />
          ) : (
            <Eye aria-hidden className="h-4 w-4" />
          )}
          {pending ? "Un instant…" : published ? "Dépublier" : "Publier"}
          <span className="sr-only"> le témoignage de {authorName}</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 aria-hidden className="h-4 w-4" />
          <span className="sr-only">
            Supprimer le témoignage de {authorName}
          </span>
        </Button>
      </div>

      {error && !confirmOpen && (
        <Alert variant="error" className="text-xs">
          {error}
        </Alert>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => (pending ? undefined : setConfirmOpen(false))}
        title="Supprimer ce témoignage ?"
        description={`Le témoignage attribué à ${authorName} sera définitivement supprimé.`}
      >
        <div className="flex flex-col gap-4">
          {error && <Alert variant="error">{error}</Alert>}

          {published && (
            <Alert variant="warning" title="Témoignage en ligne">
              Il est actuellement affiché sur la page d&apos;accueil et en
              disparaîtra immédiatement.
            </Alert>
          )}

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
              {pending ? "Suppression…" : "Supprimer le témoignage"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
