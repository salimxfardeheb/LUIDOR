import { prisma } from "@/lib/prisma";

/**
 * Types d'événement proposés dans la demande de réservation.
 *
 * Ce sont les catégories de salles : `Booking.eventType` stocke déjà ce
 * libellé, et l'administration filtre dessus. Passer par la table évite
 * qu'une liste figée dans le code diverge du catalogue.
 */
export async function listEventTypes(): Promise<string[]> {
  const categories = await prisma.category.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });

  return categories.map((category) => category.name);
}
