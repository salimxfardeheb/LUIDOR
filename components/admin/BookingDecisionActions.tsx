"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, PlayCircle, X } from "lucide-react";
import {
  setBookingDecision,
  startBookingVerification,
} from "@/actions/admin-bookings";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Ce que l'équipe peut faire avancer sur une réservation.
 *
 * Le parcours suit l'argent : une demande est **prise en charge**, puis
 * l'encaissement du client la **confirme tout seul** (`recordCashPayment`) et
 * ferme la date. Le bouton « Confirmer » reste là pour les exceptions — une
 * réservation réglée autrement, une faveur — et « Annuler » pour refermer une
 * demande sans suite.
 *
 * Rien n'est proposé sur une réservation confirmée, annulée ou clôturée : ces
 * états ne se rejouent pas depuis une liste.
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

  const waiting = status === "EN_ATTENTE";
  const verifying = status === "EN_COURS_VERIFICATION";

  if (!waiting && !verifying) return null;

  async function run(action: () => Promise<{ ok: boolean; message: string }>) {
    setPending(true);
    setError(null);

    const result = await action();
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
        {waiting ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={pending}
            onClick={() => run(() => startBookingVerification(bookingId))}
          >
            <PlayCircle aria-hidden className="h-4 w-4" />
            Prendre en charge
            <span className="sr-only"> la demande de {clientName}</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={pending}
            onClick={() => run(() => setBookingDecision(bookingId, "CONFIRMEE"))}
          >
            <Check aria-hidden className="h-4 w-4" />
            Confirmer
            <span className="sr-only"> la réservation de {clientName}</span>
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => setBookingDecision(bookingId, "ANNULEE"))}
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
