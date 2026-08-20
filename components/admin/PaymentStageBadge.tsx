import { Badge, type BadgeProps } from "@/components/ui/Badge";
import type { AdminPaymentSummary } from "@/lib/admin/bookings";
import {
  PAYMENT_STAGE_SHORT_LABELS,
  paymentStageOf,
  type PaymentStage,
} from "@/lib/admin/payments-params";
import { formatDate } from "@/lib/format";

/** Couleur de chaque étape : l'argent en caisse est le point d'attention. */
const STAGE_VARIANTS: Record<PaymentStage, NonNullable<BadgeProps["variant"]>> =
  {
    TO_COLLECT: "neutral",
    TO_PAYOUT: "warning",
    PAID_OUT: "success",
  };

/**
 * État des espèces d'une réservation, en une pastille.
 *
 * « À reverser » est signalé en avertissement : c'est le seul état où LIUDOR
 * détient de l'argent qui revient à quelqu'un d'autre, et il ne doit pas se
 * confondre avec un dossier terminé.
 *
 * `detailed` ajoute les dates et les auteurs sous la pastille : utile dans la
 * page des paiements, superflu dans une liste de réservations.
 */
export function PaymentStageBadge({
  payment,
  detailed = false,
}: {
  payment: AdminPaymentSummary | null;
  detailed?: boolean;
}) {
  const stage = paymentStageOf(payment);

  return (
    <>
      <Badge variant={STAGE_VARIANTS[stage]}>
        {PAYMENT_STAGE_SHORT_LABELS[stage]}
      </Badge>

      {detailed && payment?.paidAt && (
        <span className="mt-1 block text-xs text-gray-400">
          Encaissé le {formatDate(payment.paidAt)}
          {payment.recordedByName ? ` par ${payment.recordedByName}` : ""}
        </span>
      )}
      {detailed && payment?.payoutAt && (
        <span className="block text-xs text-gray-400">
          Reversé le {formatDate(payment.payoutAt)}
          {payment.payoutRecordedByName
            ? ` par ${payment.payoutRecordedByName}`
            : ""}
        </span>
      )}
    </>
  );
}
