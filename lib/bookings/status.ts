import type { BookingStatus, PaymentStatus } from "@prisma/client";

/**
 * Vocabulaire commun des statuts de réservation.
 *
 * Une seule source de vérité pour les libellés, les couleurs et le sens de
 * chaque statut : le tableau de bord propriétaire, la liste des réservations
 * reçues et l'espace client disent exactement la même chose.
 *
 * Import *type-only* de Prisma : ce module est utilisable côté client.
 */

export interface BookingStatusConfig {
  label: string;
  /** Variante du `Badge` du Design System. */
  variant: "neutral" | "success" | "warning" | "error" | "info";
  /** Ce que le statut signifie pour l'utilisateur, en une phrase. */
  description: string;
}

export const BOOKING_STATUS_MAP: Record<BookingStatus, BookingStatusConfig> = {
  EN_ATTENTE: {
    label: "En attente",
    variant: "warning",
    description: "Votre demande a été transmise au propriétaire.",
  },
  EN_COURS_VERIFICATION: {
    label: "En vérification",
    variant: "info",
    description: "L'équipe LIUDOR vérifie le paiement de la réservation.",
  },
  CONFIRMEE: {
    label: "Confirmée",
    variant: "success",
    description: "La salle est réservée à votre nom pour cette date.",
  },
  ANNULEE: {
    label: "Annulée",
    variant: "error",
    description: "Cette réservation a été annulée.",
  },
  CLOTUREE: {
    label: "Clôturée",
    variant: "neutral",
    description: "L'événement a eu lieu : vous pouvez laisser un avis.",
  },
};

/** Ordre d'affichage des statuts dans les filtres. */
export const BOOKING_STATUSES = [
  "EN_ATTENTE",
  "EN_COURS_VERIFICATION",
  "CONFIRMEE",
  "ANNULEE",
  "CLOTUREE",
] as const satisfies readonly BookingStatus[];

/** Réservations encore vivantes : elles occupent une date au calendrier. */
export const ACTIVE_BOOKING_STATUSES = [
  "EN_ATTENTE",
  "EN_COURS_VERIFICATION",
  "CONFIRMEE",
] as const satisfies readonly BookingStatus[];

/** Réservations terminées : celles que présente l'historique. */
export const PAST_BOOKING_STATUSES = [
  "CLOTUREE",
  "ANNULEE",
] as const satisfies readonly BookingStatus[];

export function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as readonly string[]).includes(value);
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "paiement en attente",
  PAID: "payé",
  REFUNDED: "remboursé",
};

/**
 * Précision affichée sous un montant.
 *
 * Sans paiement enregistré, le montant est une estimation au tarif de la salle :
 * le dire évite qu'il soit lu comme une somme due ou déjà réglée.
 */
export function paymentNote(status: PaymentStatus | null): string {
  return status === null ? "estimation" : PAYMENT_STATUS_LABELS[status];
}
