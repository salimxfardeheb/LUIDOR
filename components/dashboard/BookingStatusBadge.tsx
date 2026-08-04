import type { BookingStatus } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";
import { BOOKING_STATUS_MAP } from "@/lib/bookings/status";

/**
 * Badge de statut d'une réservation.
 *
 * Libellés et couleurs viennent de `BOOKING_STATUS_MAP` : ce composant n'est
 * que le rendu, le vocabulaire est partagé avec les filtres et l'espace compte.
 */
export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const { label, variant } = BOOKING_STATUS_MAP[status];
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
