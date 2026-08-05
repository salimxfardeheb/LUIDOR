"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banknote, Check, X } from "lucide-react";
import { createPayment, setBookingDecision } from "@/actions/admin-bookings";
import type { AdminOption } from "@/lib/admin/bookings";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { formatPrice } from "@/lib/format";

/**
 * Actions d'une réservation : décision de l'équipe et encaissement.
 *
 * Confirmer et annuler ne sont proposés que sur une demande en cours de
 * vérification — c'est le seul moment où la décision appartient à
 * l'administration. L'encaissement, lui, reste possible tant que la
 * réservation n'est pas annulée : les espèces peuvent arriver avant comme après
 * la confirmation.
 */
export function BookingRowActions({
  bookingId,
  clientName,
  roomName,
  status,
  expectedAmount,
  alreadyPaid,
  admins,
  currentAdminId,
}: {
  bookingId: string;
  clientName: string;
  roomName: string;
  status: string;
  /** Montant attendu, proposé par défaut dans la modale. */
  expectedAmount: number;
  alreadyPaid: boolean;
  /** Comptes pouvant être désignés comme encaisseurs. */
  admins: AdminOption[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const canDecide = status === "EN_COURS_VERIFICATION";
  const canRecordPayment = status !== "ANNULEE";

  async function decide(decision: "CONFIRMEE" | "ANNULEE") {
    setPending(true);
    setError(null);

    const result = await setBookingDecision(bookingId, decision);
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {canDecide && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={pending}
            onClick={() => decide("CONFIRMEE")}
          >
            <Check aria-hidden className="h-4 w-4" />
            Confirmer
            <span className="sr-only"> la réservation de {clientName}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => decide("ANNULEE")}
          >
            <X aria-hidden className="h-4 w-4" />
            Annuler
            <span className="sr-only"> la réservation de {clientName}</span>
          </Button>
        </div>
      )}

      {canRecordPayment && (
        <Button
          type="button"
          variant={alreadyPaid ? "ghost" : "secondary"}
          size="sm"
          onClick={() => {
            setSuccess(null);
            setPaymentOpen(true);
          }}
        >
          <Banknote aria-hidden className="h-4 w-4" />
          {alreadyPaid ? "Corriger le paiement" : "Enregistrer le paiement cash"}
        </Button>
      )}

      {error && !paymentOpen && (
        <Alert variant="error" className="text-xs">
          {error}
        </Alert>
      )}

      {success && (
        <p role="status" className="text-xs font-medium text-success">
          {success}
        </p>
      )}

      <RecordPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        bookingId={bookingId}
        clientName={clientName}
        roomName={roomName}
        expectedAmount={expectedAmount}
        alreadyPaid={alreadyPaid}
        admins={admins}
        currentAdminId={currentAdminId}
        onDone={(message) => {
          setSuccess(message);
          setPaymentOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

/**
 * Modale d'encaissement : montant, administrateur ayant reçu les espèces, et
 * confirmation explicite.
 *
 * Le paiement se règle en liquide, hors ligne : cette modale ne déclenche
 * aucune transaction, elle consigne ce qui a déjà eu lieu. La case de
 * confirmation le rappelle avant d'écrire en base.
 */
function RecordPaymentModal({
  open,
  onClose,
  bookingId,
  clientName,
  roomName,
  expectedAmount,
  alreadyPaid,
  admins,
  currentAdminId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  clientName: string;
  roomName: string;
  expectedAmount: number;
  alreadyPaid: boolean;
  admins: AdminOption[];
  currentAdminId: string;
  onDone: (message: string) => void;
}) {
  const [amount, setAmount] = React.useState(String(expectedAmount));
  const [recordedBy, setRecordedBy] = React.useState(currentAdminId);
  const [confirmed, setConfirmed] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  // Chaque ouverture repart du montant attendu : une saisie abandonnée ne doit
  // pas se retrouver préremplie sur la réservation suivante.
  React.useEffect(() => {
    if (!open) return;
    setAmount(String(expectedAmount));
    setRecordedBy(currentAdminId);
    setConfirmed(false);
    setError(null);
    setFieldErrors({});
  }, [open, expectedAmount, currentAdminId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    const result = await createPayment({
      bookingId,
      amount: amount.trim() === "" ? Number.NaN : Number(amount),
      recordedBy,
    });

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
      title={alreadyPaid ? "Corriger le paiement" : "Enregistrer le paiement cash"}
      description={`${roomName} — ${clientName}`}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        {alreadyPaid && (
          <Alert variant="warning">
            Un encaissement est déjà enregistré pour cette réservation. Le
            valider à nouveau remplace le montant et la date précédents.
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`montant-${bookingId}`}
            className="text-sm font-medium text-gray-900"
          >
            Montant encaissé (DA)
          </label>
          <Input
            id={`montant-${bookingId}`}
            name="amount"
            type="number"
            min="0"
            step="100"
            required
            value={amount}
            aria-invalid={fieldErrors.amount ? true : undefined}
            aria-describedby={
              fieldErrors.amount
                ? `montant-${bookingId}-erreur`
                : `montant-${bookingId}-aide`
            }
            onChange={(event) => setAmount(event.target.value)}
          />
          {fieldErrors.amount ? (
            <p
              id={`montant-${bookingId}-erreur`}
              role="alert"
              className="text-sm text-error"
            >
              {fieldErrors.amount}
            </p>
          ) : (
            <p id={`montant-${bookingId}-aide`} className="text-xs text-gray-500">
              Montant attendu au tarif de la salle : {formatPrice(expectedAmount)}.
              Corrigez-le si la somme reçue diffère.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`encaisse-par-${bookingId}`}
            className="text-sm font-medium text-gray-900"
          >
            Administrateur ayant encaissé
          </label>
          <Select
            id={`encaisse-par-${bookingId}`}
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
            Je confirme que la somme a bien été reçue en espèces. Le paiement
            passera au statut « encaissé ».
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
            {pending ? "Enregistrement…" : "Enregistrer le paiement"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
