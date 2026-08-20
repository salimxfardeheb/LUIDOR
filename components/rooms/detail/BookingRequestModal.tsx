"use client";

import * as React from "react";
import { PhoneCall, Send } from "lucide-react";
import { submitBookingRequest } from "@/actions/bookings";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField, fieldAria } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { BOOKING_REQUEST_LIMITS } from "@/lib/bookings/schemas";
import type { FieldErrors } from "@/lib/forms";

export interface BookingRequestDefaults {
  eventType: string;
  /** `YYYY-MM-DD`, repris du champ « Arrivée » de la carte. */
  eventDate: string;
  guestsCount: string;
  email: string;
}

/**
 * Formulaire « Réserver chez nous ».
 *
 * La demande part à l'équipe LIUDOR, pas au propriétaire : elle est enregistrée
 * en attente dans /admin/reservations, et c'est l'équipe qui rappelle le client
 * pour confirmer. Le formulaire le dit avant l'envoi et le répète après, pour
 * qu'aucun visiteur ne reparte en croyant sa date bloquée.
 */
export function BookingRequestModal({
  open,
  onClose,
  onSent,
  roomId,
  roomName,
  capacityMin,
  capacityMax,
  eventTypes,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  /** Remonte la confirmation à la carte, qui la garde affichée après fermeture. */
  onSent: (eventDate: string) => void;
  roomId: string;
  roomName: string;
  /** `null` quand la salle n'annonce pas de minimum. */
  capacityMin: number | null;
  capacityMax: number;
  eventTypes: string[];
  defaults: BookingRequestDefaults;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [sentDate, setSentDate] = React.useState<string | null>(null);

  // Chaque ouverture repart d'un formulaire propre : rouvrir après un envoi ne
  // doit pas réafficher la confirmation précédente.
  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setFieldErrors({});
    setSentDate(null);
  }, [open]);

  function clearFieldError(event: React.ChangeEvent<HTMLElement>) {
    const { name } = event.currentTarget as { name?: string };
    if (!name) return;
    setFieldErrors((previous) => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    formData.set("roomId", roomId);

    try {
      const result = await submitBookingRequest(formData);

      if (result.ok) {
        setSentDate(result.eventDate);
        onSent(result.eventDate);
        return;
      }

      // Session expirée pendant la saisie : on renvoie vers la connexion en
      // gardant la fiche en destination de retour.
      if (result.needsSignIn) {
        window.location.href = `/connexion?callbackUrl=${encodeURIComponent(
          `/salles/${roomId}`
        )}`;
        return;
      }

      setError(result.message);
      setFieldErrors(result.fieldErrors ?? {});
    } catch (caught) {
      console.error("[fiche salle] demande de réservation", caught);
      setError("L'envoi a échoué. Réessayez dans un instant.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={sentDate ? "Demande envoyée" : "Réserver chez nous"}
      description={
        sentDate
          ? undefined
          : `Votre demande part à l'équipe LIUDOR, qui vous rappelle pour confirmer ${roomName}.`
      }
    >
      {sentDate ? (
        <div className="flex flex-col gap-4">
          <Alert variant="success" title="Nous vous contactons sous 24 h">
            Votre demande pour le {sentDate} est bien enregistrée. Elle n&apos;est
            pas encore confirmée : l&apos;équipe LIUDOR vous appelle au numéro
            indiqué pour valider la date, le montant et le règlement. Un accusé
            de réception vous a été envoyé par email.
          </Alert>

          <p className="flex items-start gap-2 text-sm text-gray-500">
            <PhoneCall aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
            <span>
              Vous retrouvez cette demande, et son statut, dans votre espace
              client à la page « Mes réservations ».
            </span>
          </p>

          <Button type="button" onClick={onClose} className="w-full">
            Fermer
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Alert variant="info">
            Aucune réservation n&apos;est prise en ligne : cet envoi est une
            demande. Rien n&apos;est retenu tant que notre équipe ne vous a pas
            confirmé la date.
          </Alert>

          {error && <Alert variant="error">{error}</Alert>}

          <FormField
            id="resa-eventType"
            label="Type d'événement"
            required
            error={fieldErrors.eventType}
          >
            <Select
              id="resa-eventType"
              name="eventType"
              defaultValue={defaults.eventType}
              onChange={clearFieldError}
              required
              {...fieldAria("resa-eventType", { error: fieldErrors.eventType })}
            >
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="resa-eventDate"
              label="Date de l'événement"
              required
              error={fieldErrors.eventDate}
            >
              <Input
                id="resa-eventDate"
                name="eventDate"
                type="date"
                defaultValue={defaults.eventDate}
                onChange={clearFieldError}
                required
                {...fieldAria("resa-eventDate", {
                  error: fieldErrors.eventDate,
                })}
              />
            </FormField>

            <FormField
              id="resa-guestsCount"
              label="Nombre d'invités"
              hint={
                capacityMin === null
                  ? `${capacityMax} au maximum`
                  : `${capacityMin} à ${capacityMax}`
              }
              required
              error={fieldErrors.guestsCount}
            >
              <Input
                id="resa-guestsCount"
                name="guestsCount"
                type="number"
                inputMode="numeric"
                min={capacityMin ?? 1}
                max={capacityMax}
                step={1}
                defaultValue={defaults.guestsCount}
                onChange={clearFieldError}
                required
                {...fieldAria("resa-guestsCount", {
                  hint: true,
                  error: fieldErrors.guestsCount,
                })}
              />
            </FormField>
          </div>

          <FormField
            id="resa-contactPhone"
            label="Téléphone"
            hint="C'est le numéro sur lequel nous vous rappelons."
            required
            error={fieldErrors.contactPhone}
          >
            <Input
              id="resa-contactPhone"
              name="contactPhone"
              type="tel"
              autoComplete="tel"
              placeholder="0X XX XX XX XX"
              minLength={BOOKING_REQUEST_LIMITS.phone.min}
              maxLength={BOOKING_REQUEST_LIMITS.phone.max}
              onChange={clearFieldError}
              required
              {...fieldAria("resa-contactPhone", {
                hint: true,
                error: fieldErrors.contactPhone,
              })}
            />
          </FormField>

          <FormField
            id="resa-contactEmail"
            label="Email"
            required
            error={fieldErrors.contactEmail}
          >
            <Input
              id="resa-contactEmail"
              name="contactEmail"
              type="email"
              autoComplete="email"
              defaultValue={defaults.email}
              onChange={clearFieldError}
              required
              {...fieldAria("resa-contactEmail", {
                error: fieldErrors.contactEmail,
              })}
            />
          </FormField>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                "Envoi…"
              ) : (
                <>
                  <Send aria-hidden className="h-4 w-4" />
                  Envoyer ma demande
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
