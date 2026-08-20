import type { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Journal des actions sensibles de l'administration.
 *
 * Écrit par les actions serveur elles-mêmes : une décision ne peut pas être
 * prise sans laisser de trace, quel que soit l'écran qui l'a déclenchée.
 * L'écriture est volontairement silencieuse en cas d'échec — perdre une ligne
 * de journal ne doit pas faire échouer une validation de salle ni un
 * encaissement déjà enregistré.
 *
 * Aucune lecture n'est exposée : le journal est une archive consultée en base
 * quand une question se pose, pas un écran de l'administration.
 */

export interface RecordAuditInput {
  userId: string;
  action: AuditAction;
  /** Objet concerné, tel qu'il s'appelle au moment de l'action. */
  target?: string | null;
  detail?: string | null;
}

/** Ajoute une entrée au journal. N'échoue jamais bruyamment (voir en-tête). */
export async function recordAudit({
  userId,
  action,
  target = null,
  detail = null,
}: RecordAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { userId, action, target, detail },
    });
  } catch (error) {
    console.error("recordAudit a échoué", { action, target, error });
  }
}
