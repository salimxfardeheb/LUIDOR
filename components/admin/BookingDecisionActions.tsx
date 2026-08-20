"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { setBookingDecision } from "@/actions/admin-bookings";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Décision de l'équipe sur une réservation : confirmer ou annuler.
 *
 * Proposée uniquement sur une demande en cours de vérification — c'est le seul
 * moment où la décision appartient à l'administration. Une demande encore en
 * attente appartient au propriétaire, et une réservation déjà confirmée ou
 * clôturée ne se rejoue pas depuis une liste.
 *
 * Confirmer ferme la date au calendrier de la salle : c'est l'action serveur
 * qui s'en charge, dans la même transaction que le changement de statut.
 */
export function BookingDecisionActions({
  bookingId,
  clientName,
  status,
  className,
}: {
  bookingId: string;
  clientName: string;
  status: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (status !== "EN_COURS_VERIFICATION") return null;

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
    <div className={cn("flex flex-col items-end gap-2", className)}>
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

      {error && (
        <Alert variant="error" className="text-xs">
          {error}
        </Alert>
      )}
    </div>
  );
}
