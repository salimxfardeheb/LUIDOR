"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { Send, Star } from "lucide-react";
import { submitReview, type ReviewFormState } from "@/actions/reviews";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { fieldAria, FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Textarea } from "@/components/ui/Textarea";
import { PROFILE_LIMITS } from "@/lib/account/schemas";
import { cn } from "@/lib/utils";

const RATINGS = [1, 2, 3, 4, 5] as const;

/**
 * Action « laisser un avis » d'une ligne d'historique.
 *
 * Le formulaire vit dans une modale : l'historique reste lisible, et l'avis
 * n'est proposé que sur les réservations clôturées non encore notées. Le
 * serveur revérifie ces deux conditions — l'interface ne protège rien.
 */
export function ReviewDialog({
  roomId,
  roomName,
}: {
  roomId: string;
  roomName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useFormState<ReviewFormState, FormData>(
    submitReview,
    null
  );
  const router = useRouter();

  React.useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  const fieldError = (field: string) =>
    state && !state.ok ? state.fieldErrors?.[field] : undefined;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Star aria-hidden className="h-4 w-4" />
        Laisser un avis
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Laisser un avis"
        description={`Votre expérience dans « ${roomName} », visible sur la fiche de la salle.`}
      >
        <form action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="roomId" value={roomId} />

          {state && !state.ok && (
            <Alert variant="error">{state.message}</Alert>
          )}

          <RatingInput error={fieldError("rating")} />

          <FormField
            id="comment"
            label="Votre avis"
            required
            error={fieldError("comment")}
            hint={`${PROFILE_LIMITS.comment.min} caractères minimum : ce qui vous a plu, ce qui peut être amélioré.`}
          >
            <Textarea
              id="comment"
              name="comment"
              rows={5}
              minLength={PROFILE_LIMITS.comment.min}
              maxLength={PROFILE_LIMITS.comment.max}
              placeholder="L'accueil, les espaces, la propreté, le rapport qualité-prix…"
              required
              {...fieldAria("comment", {
                hint: true,
                error: fieldError("comment"),
              })}
            />
          </FormField>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <SubmitButton label="Publier mon avis" pendingLabel="Publication…">
              <Send aria-hidden className="h-4 w-4" />
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}

/**
 * Note en étoiles : cinq boutons radio, l'étoile n'étant que l'habillage. La
 * saisie reste donc native — navigable au clavier et soumise dans le FormData.
 */
function RatingInput({ error }: { error?: string }) {
  const [rating, setRating] = React.useState(0);

  return (
    <fieldset>
      <legend className="text-sm font-medium text-gray-700">
        Votre note
        <span aria-hidden className="ml-0.5 text-error">
          *
        </span>
        <span className="sr-only"> (obligatoire)</span>
      </legend>

      <div className="mt-2 flex items-center gap-1">
        {RATINGS.map((value) => (
          <label
            key={value}
            className="cursor-pointer rounded-md p-0.5 focus-within:ring-2 focus-within:ring-accent/60"
          >
            <input
              type="radio"
              name="rating"
              value={value}
              required
              checked={rating === value}
              onChange={() => setRating(value)}
              className="sr-only"
            />
            <span className="sr-only">
              {value} étoile{value > 1 ? "s" : ""}
            </span>
            <Star
              aria-hidden
              className={cn(
                "h-7 w-7 transition-colors",
                value <= rating
                  ? "fill-secondary text-secondary"
                  : "text-gray-300"
              )}
            />
          </label>
        ))}

        <span className="ml-2 text-sm text-gray-500">
          {rating === 0 ? "Aucune note" : `${rating} / 5`}
        </span>
      </div>

      {error && <p className="mt-1.5 text-xs font-medium text-error">{error}</p>}
    </fieldset>
  );
}
