import { Banknote, Check, HandCoins } from "lucide-react";
import type { AdminPaymentSummary } from "@/lib/admin/bookings";
import { formatDateTime, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Circuit des espèces d'une réservation, en deux étapes.
 *
 * Le chemin de l'argent est toujours le même — le client remet la somme à
 * LIUDOR, qui la reverse au propriétaire — et se lit ici dans cet ordre, qu'il
 * soit terminé ou non. Une étape non franchie reste affichée en attente plutôt
 * que masquée : c'est justement ce qui reste à faire.
 */
export function PaymentTimeline({
  payment,
  expectedAmount,
  clientName,
  ownerName,
}: {
  payment: AdminPaymentSummary | null;
  /** Montant attendu au tarif de la salle, affiché tant que rien n'est reçu. */
  expectedAmount: number;
  clientName: string;
  ownerName: string;
}) {
  const collected = payment?.status === "PAID";
  const paidOut = payment?.payoutAt != null;

  return (
    <ol className="flex flex-col gap-4">
      <Step
        done={collected}
        icon={<Banknote aria-hidden className="h-4 w-4" />}
        title={`${clientName} → LIUDOR`}
        amount={collected ? (payment?.amount ?? 0) : expectedAmount}
        estimated={!collected}
        detail={
          collected && payment?.paidAt
            ? `Encaissé le ${formatDateTime(payment.paidAt)}${
                payment.recordedByName ? ` par ${payment.recordedByName}` : ""
              }`
            : "En attente de l'encaissement des espèces."
        }
      />
      <Step
        done={paidOut}
        icon={<HandCoins aria-hidden className="h-4 w-4" />}
        title={`LIUDOR → ${ownerName}`}
        amount={paidOut ? (payment?.payoutAmount ?? 0) : (payment?.amount ?? expectedAmount)}
        estimated={!paidOut}
        detail={
          paidOut && payment?.payoutAt
            ? `Reversé le ${formatDateTime(payment.payoutAt)}${
                payment.payoutRecordedByName
                  ? ` par ${payment.payoutRecordedByName}`
                  : ""
              }`
            : collected
              ? "Somme détenue par LIUDOR : elle reste à reverser au propriétaire."
              : "Rien à reverser tant que le client n'a pas payé."
        }
      />
    </ol>
  );
}

function Step({
  done,
  icon,
  title,
  amount,
  estimated,
  detail,
}: {
  done: boolean;
  icon: React.ReactNode;
  title: string;
  amount: number;
  /** Le montant n'est pas encore constaté : c'est une somme attendue. */
  estimated: boolean;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          done ? "bg-success/15 text-success" : "bg-gray-100 text-gray-400"
        )}
      >
        {done ? <Check aria-hidden className="h-4 w-4" /> : icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p
            className={cn(
              "text-sm font-semibold tabular-nums",
              done ? "text-gray-900" : "text-gray-400"
            )}
          >
            {formatPrice(amount)}
            {estimated && (
              <span className="ml-1 text-xs font-normal">(attendu)</span>
            )}
          </p>
        </div>
        <p className="mt-0.5 text-sm text-gray-500">{detail}</p>
      </div>
    </li>
  );
}
