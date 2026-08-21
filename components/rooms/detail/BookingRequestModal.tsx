"use client";

import * as React from "react";
import { PhoneCall, Send } from "lucide-react";
import { submitBookingRequest } from "@/actions/bookings";
import { servicePriceLabel } from "@/components/rooms/detail/ChipGrid";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField, fieldAria } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { BOOKING_REQUEST_LIMITS } from "@/lib/bookings/schemas";
import type { FieldErrors } from "@/lib/forms";
import type { RoomDetail } from "@/lib/rooms/detail";

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
  services,
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
  /** Prestations de la salle : le client coche celles qui l'intéressent. */
  services: RoomDetail["services"];
  eventTypes: string[];
  defaults: BookingRequestDefaults;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  /**
   * Date prise ou retenue pendant la saisie. Distingué de `error` : ce n'est
   * pas une faute du client, et le ton du message n'est pas le même.
   */
  const [conflict, setConflict] = React.useState<"pending" | "booked" | null>(
    null
  );
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [sentDate, setSentDate] = React.useState<string | null>(null);

  // Chaque ouverture repart d'un formulaire propre : rouvrir après un envoi ne
  // doit pas réafficher la confirmation précédente.
  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setConflict(null);
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
    setConflict(null);
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

      /*
       * Le serveur a refusé parce que la date vient d'être prise, alors qu'elle
       * était libre à l'ouverture du formulaire. Rien à corriger dans la
       * saisie : le message est présenté comme une information sur la date, et
       * la saisie est conservée pour qu'il suffise d'en changer.
       */
      if (result.conflict) {
        setConflict(result.conflict);
        setError(result.message);
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

          {error &&
            (conflict ? (
              <Alert
                variant="warning"
                title={
                  conflict === "pending"
                    ? "En attente de confirmation"
                    : "Date déjà réservée"
                }
              >
                {error} Choisissez une autre date pour poursuivre.
              </Alert>
            ) : (
              <Alert variant="error">{error}</Alert>
            ))}

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

          {/*
            Lignes partagées (`subgrid`) : les deux champs alignent leur libellé,
            leur aide et leur champ. Sans cela, l'aide du nombre d'invités
            décalait sa saisie d'une ligne sous celle de la date.
          */}
          <div className="grid gap-4 sm:grid-cols-2 sm:grid-rows-[auto_auto_auto] sm:gap-y-1.5">
            <FormField
              id="resa-eventDate"
              label="Date de l'événement"
              hint="Une seule journée par demande."
              required
              error={fieldErrors.eventDate}
              className="sm:row-span-3 sm:grid sm:grid-rows-subgrid"
            >
              <Input
                id="resa-eventDate"
                name="eventDate"
                type="date"
                defaultValue={defaults.eventDate}
                onChange={clearFieldError}
                required
                {...fieldAria("resa-eventDate", {
                  hint: true,
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
              className="sm:row-span-3 sm:grid sm:grid-rows-subgrid"
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

          {/*
            Prestations souhaitées : une demande n'est pas un devis, le client
            dit ce qui l'intéresse et l'équipe chiffre au téléphone. D'où des
            cases à cocher facultatives et un rappel que rien n'est figé.

            `fieldset` et `legend` plutôt qu'un simple titre : le lecteur
            d'écran annonce alors le groupe avant chaque case, sans quoi
            « Traiteur » arriverait sans contexte.
          */}
          {services.length > 0 && (
            <fieldset>
              <legend className="mb-1.5 flex flex-wrap items-center gap-x-2 text-sm font-medium text-gray-700">
                Services souhaités
                <span className="text-xs font-normal text-gray-500">
                  facultatif
                </span>
              </legend>

              <ul className="grid gap-2 sm:grid-cols-2">
                {services.map((service) => (
                  <li key={service.id}>
                    <label className="flex h-full cursor-pointer items-start gap-2.5 rounded-lg border border-gray-200 bg-white p-2.5 transition-colors hover:border-secondary/60 has-[:checked]:border-secondary has-[:checked]:bg-secondary/5">
                      <input
                        type="checkbox"
                        name="serviceIds"
                        value={service.id}
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-sm border-gray-300 accent-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900">
                          {service.name}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {servicePriceLabel(service.price)}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              <p className="mt-2 text-xs text-gray-500">
                Ces prestations ne sont pas facturées à l&apos;envoi : nous les
                chiffrons avec vous lors de notre appel.
              </p>
            </fieldset>
          )}

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
