import type { RoomStatus } from "@prisma/client";
import { Badge, type BadgeProps } from "@/components/ui/Badge";

interface StatusConfig {
  label: string;
  variant: NonNullable<BadgeProps["variant"]>;
  /** Ce que le statut implique concrètement pour le propriétaire. */
  help: string;
}

/**
 * Signification des quatre statuts du modèle `RoomStatus`, du point de vue du
 * propriétaire. Centralisé ici pour que la liste et le formulaire d'édition
 * disent exactement la même chose.
 */
export const ROOM_STATUS: Record<RoomStatus, StatusConfig> = {
  PENDING: {
    label: "En attente de validation",
    variant: "warning",
    help: "L'équipe LIUDOR contrôle votre salle avant sa mise en ligne.",
  },
  ACTIVE: {
    label: "En ligne",
    variant: "success",
    help: "Votre salle est visible dans le catalogue et peut recevoir des demandes.",
  },
  REJECTED: {
    label: "Refusée",
    variant: "error",
    help: "La salle n'a pas été validée. Corrigez les informations puis contactez le support.",
  },
  SUSPENDED: {
    label: "Désactivée",
    variant: "neutral",
    help: "La salle n'apparaît plus dans le catalogue public.",
  },
};

export function RoomStatusBadge({
  status,
  className,
}: {
  status: RoomStatus;
  className?: string;
}) {
  const config = ROOM_STATUS[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
