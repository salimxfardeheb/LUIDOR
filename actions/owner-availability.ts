"use server";

import { revalidatePath } from "next/cache";
import type { AvailabilityStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AVAILABILITY_PATH,
  lastEditableDate,
} from "@/lib/owner/availability-params";
import { isoDay, todayIso } from "@/lib/owner/availability";
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

export type SetRangeActionResult =
  | {
      ok: true;
      /** Dates passées de fermée → ouverte. */
      opened: number;
      /** Dates passées d'ouverte → fermée. */
      closed: number;
      /** Dates déjà réservées ou déjà dans l'état demandé, laissées intactes. */
      skipped: number;
      /** Paires date → statut appliquées, pour synchroniser la grille affichée. */
      dates: Array<{ date: string; status: AvailabilityStatus }>;
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

/**
 * Applique le même état (ouverte ↔ fermée) à toute une période de dates.
 *
 * Gardes identiques à `toggleDateAvailability` : session, propriété, dates
 * valides. Le passé est ignoré (borne basse ramenée à aujourd'hui) et la fin
 * de période est bornée à la fenêtre gérable (+ 11 mois) : une URL forgée ne
 * peut donc pas créer des années de lignes.
 *
 * Une date déjà dans l'état demandé ou verrouillée par une réservation
 * confirmée est laissée intacte et comptée comme ignorée.
 */
export async function setDateRangeAvailability(
  roomId: string,
  from: string,
  to: string,
  open: boolean
): Promise<SetRangeActionResult> {
  const session = await requireOwnerSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const ownership = await requireRoomOwnership(roomId, session.ownerId);
  if (!ownership.ok) return { ok: false, ...ownership.refusal };

  if (!ISO_DAY.test(from) || !ISO_DAY.test(to)) {
    return { ok: false, message: "La période saisie est invalide." };
  }

  if (from > to) {
    return {
      ok: false,
      message: "La date « Du » doit précéder la date « Au ».",
    };
  }

  // Borne la période à la fenêtre gérable : le passé comme l'au-delà du
  // 12e mois sont hors de portée du propriétaire.
  const start = from < todayIso() ? todayIso() : from;
  const end = to > lastEditableDate() ? lastEditableDate() : to;

  if (start > end) {
    return {
      ok: false,
      message:
        "Cette période est entièrement passée ou hors de la fenêtre gérable.",
    };
  }

  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  // La période est inclusive : on itère jusqu'au lendemain du « Au ».
  const endInclusive = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate() + 1)
  );

  const [existing, confirmedBookings] = await Promise.all([
    prisma.availability.findMany({
      where: { roomId, date: { gte: startDate, lt: endInclusive } },
      select: { date: true, status: true },
    }),
    prisma.booking.findMany({
      where: {
        roomId,
        eventDate: { gte: startDate, lt: endInclusive },
        status: "CONFIRMEE",
      },
      select: { eventDate: true },
    }),
  ]);

  const statusByDay = new Map(
    existing.map((availability) => [isoDay(availability.date), availability.status])
  );
  const lockedDays = new Set(
    confirmedBookings.map((booking) => isoDay(booking.eventDate))
  );

  const targetStatus: AvailabilityStatus = open ? "AVAILABLE" : "BLOCKED";

  const toUpsert: Date[] = [];
  const applied: Array<{ date: string; status: AvailabilityStatus }> = [];
  let opened = 0;
  let closed = 0;
  let skipped = 0;

  for (
    let day = new Date(startDate.getTime());
    day < endInclusive;
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    const date = isoDay(day);

    if (lockedDays.has(date)) {
      skipped += 1;
      continue;
    }

    const current = statusByDay.get(date) ?? null;
    if (current === targetStatus) {
      skipped += 1;
      continue;
    }

    // Copie : l'itérateur mute `day` en fin de tour, Prisma lirait sinon
    // toujours la dernière valeur pour toutes les lignes de la transaction.
    toUpsert.push(new Date(day.getTime()));
    applied.push({ date, status: targetStatus });
    if (targetStatus === "AVAILABLE") opened += 1;
    else closed += 1;
  }

  if (toUpsert.length > 0) {
    try {
      await prisma.$transaction(
        toUpsert.map((date) =>
          prisma.availability.upsert({
            where: { roomId_date: { roomId, date } },
            create: { roomId, date, status: targetStatus },
            update: { status: targetStatus },
          })
        )
      );
    } catch (error) {
      console.error("[owner/disponibilites] mise à jour de période échouée", error);
      return {
        ok: false,
        message: "La mise à jour de cette période a échoué. Réessayez dans un instant.",
      };
    }
  }

  revalidatePath(AVAILABILITY_PATH);
  // La fiche publique affiche le même calendrier : elle doit suivre.
  revalidatePath(`/salles/${roomId}`);

  return { ok: true, opened, closed, skipped, dates: applied };
}
