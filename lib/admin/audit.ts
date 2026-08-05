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
 */

export interface AuditEntry {
  id: string;
  action: AuditAction;
  target: string | null;
  detail: string | null;
  /** Horodatage ISO. */
  at: string;
  authorName: string | null;
  authorEmail: string | null;
}

export interface AuditActionConfig {
  label: string;
  /** Variante du `Badge` du Design System. */
  variant: "neutral" | "success" | "warning" | "error" | "info" | "primary" | "secondary";
}

/** Vocabulaire du journal : une seule source pour les libellés et couleurs. */
export const AUDIT_ACTIONS: Record<AuditAction, AuditActionConfig> = {
  SIGN_IN: { label: "Connexion", variant: "neutral" },
  ROOM_APPROVED: { label: "Salle validée", variant: "success" },
  ROOM_REJECTED: { label: "Salle rejetée", variant: "error" },
  USER_SUSPENDED: { label: "Compte suspendu", variant: "error" },
  USER_REACTIVATED: { label: "Compte réactivé", variant: "success" },
  BOOKING_CONFIRMED: { label: "Réservation confirmée", variant: "success" },
  BOOKING_CANCELLED: { label: "Réservation annulée", variant: "error" },
  PAYMENT_RECORDED: { label: "Paiement encaissé", variant: "secondary" },
  REVIEW_PUBLISHED: { label: "Avis publié", variant: "success" },
  REVIEW_DELETED: { label: "Avis supprimé", variant: "error" },
  POST_PUBLISHED: { label: "Article publié", variant: "success" },
  POST_UNPUBLISHED: { label: "Article dépublié", variant: "warning" },
  POST_SAVED: { label: "Article enregistré", variant: "info" },
  CATALOG_UPDATED: { label: "Catalogue modifié", variant: "info" },
  SETTINGS_UPDATED: { label: "Réglages modifiés", variant: "info" },
  PASSWORD_CHANGED: { label: "Mot de passe changé", variant: "warning" },
};

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

/** Dernières actions enregistrées, toutes catégories confondues. */
export async function listAuditLog(limit: number = 25): Promise<AuditEntry[]> {
  const entries = await prisma.auditLog.findMany({
    where: { action: { not: "SIGN_IN" } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      target: true,
      detail: true,
      createdAt: true,
      user: { select: { fullName: true, email: true } },
    },
  });

  return entries.map(toEntry);
}

/**
 * Dernières connexions des comptes administrateur.
 *
 * Séparé du journal des actions : c'est une lecture de sécurité — repérer une
 * connexion inattendue, à une heure ou depuis un compte qui n'a rien à faire là.
 */
export async function listAdminSignIns(limit: number = 10): Promise<AuditEntry[]> {
  const entries = await prisma.auditLog.findMany({
    where: { action: "SIGN_IN", user: { role: "ADMIN" } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      target: true,
      detail: true,
      createdAt: true,
      user: { select: { fullName: true, email: true } },
    },
  });

  return entries.map(toEntry);
}

function toEntry(entry: {
  id: string;
  action: AuditAction;
  target: string | null;
  detail: string | null;
  createdAt: Date;
  user: { fullName: string; email: string } | null;
}): AuditEntry {
  return {
    id: entry.id,
    action: entry.action,
    target: entry.target,
    detail: entry.detail,
    at: entry.createdAt.toISOString(),
    authorName: entry.user?.fullName ?? null,
    authorEmail: entry.user?.email ?? null,
  };
}
