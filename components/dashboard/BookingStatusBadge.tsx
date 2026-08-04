import type { ComponentProps } from "react";
import type { BookingStatus } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";

type BadgeVariant = ComponentProps<typeof Badge>["variant"];

/** Libellé et variante de couleur du badge, par statut de réservation. */
export const BOOKING_STATUS_META: Record<
  BookingStatus,
  { label: string; variant: Exclude<BadgeVariant, null | undefined> }
> = {
  EN_ATTENTE: { label: "En attente", variant: "warning" },
  EN_COURS_VERIFICATION: { label: "En vérification", variant: "info" },
  CONFIRMEE: { label: "Confirmée", variant: "success" },
  ANNULEE: { label: "Annulée", variant: "error" },
  CLOTUREE: { label: "Clôturée", variant: "neutral" },
};

/** Badge de statut d'une réservation, cohérent avec les couleurs du site. */
export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, variant } = BOOKING_STATUS_META[status];
  return <Badge variant={variant}>{label}</Badge>;
}
