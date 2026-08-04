"use server";

import { revalidatePath } from "next/cache";
import type { AvailabilityStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AVAILABILITY_PATH } from "@/lib/owner/availability-params";
import { todayIso } from "@/lib/owner/availability";
import { requireOwnerSession, requireRoomOwnership } from "@/lib/owner/guards";

/**
 * Mutations du calendrier de disponibilités.
 *
 * L'action revérifie session, propriété de la salle et verrous métier : elle
 * est appelable directement en HTTP, le fait que l'interface grise une date ne
 * protège rien.
 */

export type AvailabilityActionResult =
  | {
      ok: true;
      /** Date modifiée, au format `YYYY-MM-DD`. */
      date: string;
      /** Nouvel état, à appliquer par l'appelant. */
      status: AvailabilityStatus;
    }
  | { ok: false; message: string; status?: 401 | 403 | 404 };

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Alterne l'état d'une date : ouverte ↔ fermée.
 *
 * Une date sans ligne `Availability` est considérée fermée — c'est déjà ainsi
 * que la fiche publique la traite — et le premier clic l'ouvre donc.
 *
 * Deux refus sont volontairement définitifs :
 * - une date portant une réservation **confirmée** : le propriétaire s'est
 *   engagé, la libérer ou la bloquer n'aurait aucun sens vis-à-vis du client ;
 * - une date passée : elle n'est plus réservable, la modifier ne changerait
 *   que l'historique.
 */
export async function toggleDateAvailability(
  roomId: string,
  date: string
): Promise<AvailabilityActionResult> {
  const session = await requireOwnerSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const ownership = await requireRoomOwnership(roomId, session.ownerId);
  if (!ownership.ok) return { ok: false, ...ownership.refusal };

  if (!ISO_DAY.test(date)) {
    return { ok: false, message: "Cette date est invalide." };
  }

  const day = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(day.getTime())) {
    return { ok: false, message: "Cette date est invalide." };
  }

  if (date < todayIso()) {
    return {
      ok: false,
      message: "Une date passée ne peut plus être modifiée.",
    };
  }

  const confirmed = await prisma.booking.findFirst({
    where: { roomId, eventDate: day, status: "CONFIRMEE" },
    select: { id: true },
  });

  if (confirmed) {
    return {
      ok: false,
      message:
        "Cette date porte une réservation confirmée : elle ne peut pas être modifiée.",
    };
  }

  try {
    const existing = await prisma.availability.findUnique({
      where: { roomId_date: { roomId, date: day } },
      select: { status: true },
    });

    const status: AvailabilityStatus =
      existing?.status === "AVAILABLE" ? "BLOCKED" : "AVAILABLE";

    await prisma.availability.upsert({
      where: { roomId_date: { roomId, date: day } },
      create: { roomId, date: day, status },
      update: { status },
    });

    revalidatePath(AVAILABILITY_PATH);
    // La fiche publique affiche le même calendrier : elle doit suivre.
    revalidatePath(`/salles/${roomId}`);

    return { ok: true, date, status };
  } catch (error) {
    console.error("[owner/disponibilites] mise à jour échouée", error);
    return {
      ok: false,
      message: "La mise à jour de cette date a échoué. Réessayez dans un instant.",
    };
  }
}
