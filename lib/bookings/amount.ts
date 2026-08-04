import type { Prisma } from "@prisma/client";

/**
 * Montant d'une réservation : le paiement réel quand il existe, sinon une
 * estimation au prix d'appel de la salle + frais de ménage. `Booking` ne porte
 * pas de prix propre : la copie en base sert tant que le paiement n'a pas été
 * enregistré.
 *
 * Partagé par le portail propriétaire et l'espace compte : les deux doivent
 * annoncer le même montant pour une même réservation.
 */
export function bookingAmount(
  paidAmount: Prisma.Decimal | null | undefined,
  basePrice: Prisma.Decimal,
  cleaningFee: Prisma.Decimal | null
): number {
  if (paidAmount != null) return Number(paidAmount);
  return Number(basePrice) + Number(cleaningFee ?? 0);
}
