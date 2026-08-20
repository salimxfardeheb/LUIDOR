"use server";

import { revalidatePath } from "next/cache";
import type { AvailabilityStatus, Prisma } from "@prisma/client";
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

    revalidateAvailability(roomId);

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

  // Deux listes plutôt qu'une : les dates déjà enregistrées se mettent à jour
  // en une requête, les autres se créent en une seconde. Une période d'un an
  // ferait sinon 366 allers-retours `upsert` dans la même transaction.
  const toUpdate: Date[] = [];
  const toCreate: Date[] = [];
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
    const value = new Date(day.getTime());
    if (current === null) toCreate.push(value);
    else toUpdate.push(value);

    applied.push({ date, status: targetStatus });
    if (targetStatus === "AVAILABLE") opened += 1;
    else closed += 1;
  }

  if (applied.length > 0) {
    // Typé explicitement : un tableau vide serait sinon inféré `any[]`.
    const operations: Prisma.PrismaPromise<unknown>[] = [];

    if (toUpdate.length > 0) {
      operations.push(
        prisma.availability.updateMany({
          where: { roomId, date: { in: toUpdate } },
          data: { status: targetStatus },
        })
      );
    }

    if (toCreate.length > 0) {
      operations.push(
        prisma.availability.createMany({
          data: toCreate.map((date) => ({ roomId, date, status: targetStatus })),
          // Une ligne créée entre-temps par un autre onglet ne doit pas faire
          // échouer toute la période : elle est simplement laissée telle quelle.
          skipDuplicates: true,
        })
      );
    }

    try {
      await prisma.$transaction(operations);
    } catch (error) {
      console.error("[owner/disponibilites] mise à jour de période échouée", error);
      return {
        ok: false,
        message: "La mise à jour de cette période a échoué. Réessayez dans un instant.",
      };
    }
  }

  revalidateAvailability(roomId);

  return { ok: true, opened, closed, skipped, dates: applied };
}

/**
 * Pages à rafraîchir après une modification de disponibilité.
 *
 * La fiche publique affiche le même calendrier et le tableau de bord compte
 * les dates ouvertes des trente prochains jours : les trois vues dépendent de
 * la même donnée, elles sont invalidées ensemble plutôt qu'au cas par cas.
 */
function revalidateAvailability(roomId: string): void {
  revalidatePath(AVAILABILITY_PATH);
  revalidatePath(`/salles/${roomId}`);
  revalidatePath("/owner/dashboard");
}
