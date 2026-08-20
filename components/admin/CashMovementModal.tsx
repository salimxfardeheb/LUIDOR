"use client";

import * as React from "react";
import { recordCashPayment, recordOwnerPayout } from "@/actions/admin-bookings";
import type { AdminOption } from "@/lib/admin/bookings";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { formatPrice } from "@/lib/format";

/**
 * Les deux mouvements d'espèces d'une réservation.
 *
 * `COLLECT` : le client remet la somme à LIUDOR.
 * `PAYOUT`  : LIUDOR la remet au propriétaire.
 */
export type CashMovement = "COLLECT" | "PAYOUT";

/**
 * Modale de saisie d'un mouvement d'espèces.
 *
 * Une seule modale pour les deux sens : le formulaire est le même — un montant,
 * l'administrateur qui a fait le geste, une confirmation explicite — et les
 * faire diverger ferait dériver deux formulaires qui doivent rester jumeaux.
 * Seuls les libellés et l'action serveur appelée changent.
 *
 * Aucun paiement en ligne n'est déclenché : la modale consigne un mouvement qui
 * a déjà eu lieu, hors de la plateforme. La case à cocher le rappelle avant
 * d'écrire en base.
 */
export function CashMovementModal({
  movement,
  open,
  onClose,
  onDone,
  bookingId,
  clientName,
  roomName,
  ownerName,
  /** Montant proposé par défaut : le tarif attendu, ou la somme encaissée. */
  defaultAmount,
  /** Un mouvement de ce sens est déjà enregistré : la saisie le remplace. */
  alreadyRecorded,
  admins,
  currentAdminId,
  confirmsBooking = false,
}: {
  movement: CashMovement;
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
  bookingId: string;
  clientName: string;
  roomName: string;
  ownerName: string;
  defaultAmount: number;
  alreadyRecorded: boolean;
  admins: AdminOption[];
  currentAdminId: string;
  /** Cet encaissement confirmera la réservation et fermera sa date. */
  confirmsBooking?: boolean;
}) {
  const [amount, setAmount] = React.useState(String(defaultAmount));
  const [recordedBy, setRecordedBy] = React.useState(currentAdminId);
  const [confirmed, setConfirmed] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {}
  );

  const collecting = movement === "COLLECT";
  const fieldId = `${movement.toLowerCase()}-${bookingId}`;

  // Chaque ouverture repart du montant proposé : une saisie abandonnée ne doit
  // pas se retrouver préremplie sur la réservation suivante.
  React.useEffect(() => {
    if (!open) return;
    setAmount(String(defaultAmount));
    setRecordedBy(currentAdminId);
    setConfirmed(false);
    setError(null);
    setFieldErrors({});
  }, [open, defaultAmount, currentAdminId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    const input = {
      bookingId,
      amount: amount.trim() === "" ? Number.NaN : Number(amount),
      recordedBy,
    };
    const result = collecting
      ? await recordCashPayment(input)
      : await recordOwnerPayout(input);

    setPending(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setError(result.fieldErrors ? null : result.message);
      return;
    }

    onDone(result.message);
  }

  return (
    <Modal
      open={open}
      onClose={() => (pending ? undefined : onClose())}
      title={
        collecting
          ? alreadyRecorded
            ? "Corriger l'encaissement"
            : "Enregistrer l'encaissement du client"
          : alreadyRecorded
            ? "Corriger le reversement"
            : "Enregistrer le reversement au propriétaire"
      }
      description={`${roomName} — ${collecting ? clientName : ownerName}`}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        {/*
          L'encaissement ne fait pas que consigner une somme : il confirme la
          réservation. L'administrateur doit le savoir avant de valider, pas le
          découvrir dans la liste.
        */}
        {collecting && confirmsBooking && (
          <Alert variant="info">
            Enregistrer cet encaissement <strong>confirme la réservation</strong>{" "}
            et ferme la date au calendrier de la salle. Le client et le
            propriétaire en sont informés par email.
          </Alert>
        )}

        {alreadyRecorded && (
          <Alert variant="warning">
            Un {collecting ? "encaissement" : "reversement"} est déjà enregistré
            pour cette réservation. Le valider à nouveau remplace le montant et
            la date précédents.
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`montant-${fieldId}`}
            className="text-sm font-medium text-gray-900"
          >
            {collecting ? "Montant encaissé (DA)" : "Montant reversé (DA)"}
          </label>
          <Input
            id={`montant-${fieldId}`}
            name="amount"
            type="number"
            min="0"
            step="100"
            required
            value={amount}
            aria-invalid={fieldErrors.amount ? true : undefined}
            aria-describedby={
              fieldErrors.amount
                ? `montant-${fieldId}-erreur`
                : `montant-${fieldId}-aide`
            }
            onChange={(event) => setAmount(event.target.value)}
          />
          {fieldErrors.amount ? (
            <p
              id={`montant-${fieldId}-erreur`}
              role="alert"
              className="text-sm text-error"
            >
              {fieldErrors.amount}
            </p>
          ) : (
            <p id={`montant-${fieldId}-aide`} className="text-xs text-gray-500">
              {collecting
                ? `Montant attendu au tarif de la salle : ${formatPrice(defaultAmount)}. Corrigez-le si la somme reçue diffère.`
                : `Somme encaissée auprès du client : ${formatPrice(defaultAmount)}. Corrigez-la si la somme remise diffère.`}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`par-${fieldId}`}
            className="text-sm font-medium text-gray-900"
          >
            {collecting
              ? "Administrateur ayant encaissé"
              : "Administrateur ayant remis les espèces"}
          </label>
          <Select
            id={`par-${fieldId}`}
            name="recordedBy"
            value={recordedBy}
            aria-invalid={fieldErrors.recordedBy ? true : undefined}
            onChange={(event) => setRecordedBy(event.target.value)}
          >
            {admins.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.fullName}
              </option>
            ))}
          </Select>
          {fieldErrors.recordedBy && (
            <p role="alert" className="text-sm text-error">
              {fieldErrors.recordedBy}
            </p>
          )}
        </div>

        <label className="flex items-start gap-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-gray-300 text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          />
          <span>
            {collecting
              ? `Je confirme que la somme a bien été reçue de ${clientName}, en espèces.`
              : `Je confirme que la somme a bien été remise à ${ownerName}, en espèces.`}
          </span>
        </label>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={pending || !confirmed}>
            {pending
              ? "Enregistrement…"
              : collecting
                ? "Enregistrer l'encaissement"
                : "Enregistrer le reversement"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
