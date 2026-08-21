import { Clock, TimerOff } from "lucide-react";
import type { BookingStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

/**
 * Compte à rebours du blocage d'une demande en attente.
 *
 * Une demande retient sa date, mais pas indéfiniment : passé son échéance,
 * la date se rouvre aux autres clients. L'équipe a donc besoin de lire d'un
 * coup d'œil combien de temps il lui reste pour rappeler — et de voir tout de
 * suite les demandes déjà périmées, qui ne retiennent plus rien même si leur
 * statut n'a pas encore basculé.
 *
 * Rendu côté serveur à partir d'une date ISO : le calcul se fait à chaque rendu
 * de page, sans minuterie côté client. Une précision à l'heure suffit pour un
 * blocage qui se compte en dizaines d'heures.
 */
export function BookingHold({
  status,
  expiresAt,
  createdAt,
  className,
}: {
  status: BookingStatus;
  /** Échéance ISO du blocage, `null` hors attente. */
  expiresAt: string | null;
  /** Dépôt de la demande, ISO : sert à dire depuis combien de temps elle attend. */
  createdAt: string;
  className?: string;
}) {
  if (status !== "EN_ATTENTE" || !expiresAt) return null;

  const now = Date.now();
  const deadline = new Date(expiresAt).getTime();
  const waitingHours = hoursBetween(new Date(createdAt).getTime(), now);

  // Échéance dépassée sans traitement : la date est déjà rendue aux autres
  // clients, le premier qui la demande fera basculer la demande en `EXPIREE`.
  if (deadline <= now) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-error",
          className
        )}
      >
        <TimerOff aria-hidden className="h-3.5 w-3.5 shrink-0" />
        Blocage expiré — la date est rouverte
      </span>
    );
  }

  const remaining = hoursBetween(now, deadline);
  // Moins de six heures : c'est le moment de rappeler, pas demain.
  const urgent = remaining < 6;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        urgent ? "text-warning" : "text-gray-500",
        className
      )}
    >
      <Clock aria-hidden className="h-3.5 w-3.5 shrink-0" />
      {formatDelay(remaining)} avant réouverture
      <span className="sr-only">
        , demande déposée il y a {formatDelay(waitingHours)}
      </span>
    </span>
  );
}

/** Écart en heures, arrondi à l'heure supérieure — jamais négatif. */
function hoursBetween(from: number, to: number): number {
  return Math.max(0, Math.ceil((to - from) / (60 * 60 * 1000)));
}

/**
 * Délai lisible : en heures tant que c'est parlant, en jours au-delà. « 47 h »
 * se compte mal, « 2 j » se lit sans effort.
 */
function formatDelay(hours: number): string {
  if (hours < 1) return "moins d'une heure";
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} j`;
}
