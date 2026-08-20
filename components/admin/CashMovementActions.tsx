"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banknote, HandCoins } from "lucide-react";
import type { AdminOption, AdminPaymentSummary } from "@/lib/admin/bookings";
import { CashMovementModal, type CashMovement } from "@/components/admin/CashMovementModal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Boutons d'encaissement et de reversement d'une réservation.
 *
 * L'ordre des gestes est celui de l'argent : on ne peut reverser au
 * propriétaire qu'après avoir encaissé le client, et le bouton de reversement
 * n'apparaît donc pas avant. La règle est aussi appliquée côté serveur — ici,
 * elle évite surtout de proposer un geste qui sera refusé.
 *
 * Une réservation annulée ne propose plus rien : ce qui a été encaissé se règle
 * avec le client, hors de ce circuit.
 */
export function CashMovementActions({
  bookingId,
  clientName,
  roomName,
  ownerName,
  bookingStatus,
  expectedAmount,
  payment,
  admins,
  currentAdminId,
  compact = false,
  className,
}: {
  bookingId: string;
  clientName: string;
  roomName: string;
  ownerName: string;
  bookingStatus: string;
  /** Montant attendu au tarif de la salle, proposé à l'encaissement. */
  expectedAmount: number;
  payment: AdminPaymentSummary | null;
  admins: AdminOption[];
  currentAdminId: string;
  /**
   * Rendu resserré, pour une ligne de tableau : le geste qui reste à faire
   * garde son libellé, une étape déjà franchie se réduit à son icône. Sans
   * cela, quatre libellés complets font à eux seuls le tiers de la largeur du
   * tableau, et les autres colonnes se compriment jusqu'à casser.
   */
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [movement, setMovement] = React.useState<CashMovement | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const cancelled = bookingStatus === "ANNULEE";
  const collected = payment?.status === "PAID";
  const paidOut = payment?.payoutAt != null;
  const collectedAmount = payment?.amount ?? expectedAmount;
  // Corriger un reversement repart de la somme déjà remise ; un premier
  // reversement repart de ce qui a été encaissé, qui est la somme due.
  const payoutAmount = payment?.payoutAmount ?? collectedAmount;

  if (cancelled) {
    return (
      <p className={cn("text-xs text-gray-400", className)}>
        Réservation annulée
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col items-end gap-2", className)}>
      <div className="flex flex-wrap justify-end gap-2">
        <MovementButton
          done={collected}
          compact={compact}
          tone="secondary"
          doneLabel="Corriger l'encaissement"
          todoLabel={compact ? "Encaisser" : "Encaisser le client"}
          icon={<Banknote aria-hidden className="h-4 w-4" />}
          onClick={() => {
            setSuccess(null);
            setMovement("COLLECT");
          }}
        />

        {collected && (
          <MovementButton
            done={paidOut}
            compact={compact}
            tone="primary"
            doneLabel="Corriger le reversement"
            todoLabel={compact ? "Reverser" : "Reverser au propriétaire"}
            icon={<HandCoins aria-hidden className="h-4 w-4" />}
            onClick={() => {
              setSuccess(null);
              setMovement("PAYOUT");
            }}
          />
        )}
      </div>

      {success && (
        <p role="status" className="text-xs font-medium text-success">
          {success}
        </p>
      )}

      {movement && (
        <CashMovementModal
          movement={movement}
          open
          onClose={() => setMovement(null)}
          onDone={(message) => {
            setSuccess(message);
            setMovement(null);
            router.refresh();
          }}
          bookingId={bookingId}
          clientName={clientName}
          roomName={roomName}
          ownerName={ownerName}
          defaultAmount={
            movement === "COLLECT" ? collectedAmount : payoutAmount
          }
          alreadyRecorded={movement === "COLLECT" ? collected : paidOut}
          admins={admins}
          currentAdminId={currentAdminId}
        />
      )}
    </div>
  );
}

/**
 * Bouton d'un mouvement d'espèces.
 *
 * En mode resserré, une étape déjà franchie tombe à l'icône seule : la
 * correction est un geste rare, elle n'a pas à occuper la largeur d'un libellé
 * dans chaque ligne. Le texte complet reste porté par `title` et par le nom
 * accessible du bouton — rien ne disparaît, seul l'encombrement change.
 */
function MovementButton({
  done,
  compact,
  tone,
  doneLabel,
  todoLabel,
  icon,
  onClick,
}: {
  done: boolean;
  compact: boolean;
  /** Marine pour l'encaissement, or pour le reversement : les deux jambes du
   *  circuit ne se confondent pas d'un coup d'œil. */
  tone: "secondary" | "primary";
  doneLabel: string;
  todoLabel: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const iconOnly = compact && done;

  return (
    <Button
      type="button"
      variant={done ? "ghost" : tone}
      size="sm"
      title={done ? doneLabel : undefined}
      className={iconOnly ? "px-2" : undefined}
      onClick={onClick}
    >
      {icon}
      {iconOnly ? (
        <span className="sr-only">{doneLabel}</span>
      ) : (
        <>{done ? doneLabel : todoLabel}</>
      )}
    </Button>
  );
}
