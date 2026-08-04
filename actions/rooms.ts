"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

/** Durée maximale d'une demande, en jours : au-delà, c'est du cas par cas. */
const MAX_DAYS = 30;

const checkSchema = z
  .object({
    roomId: z.string().min(1),
    arrivee: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choisissez une date d'arrivée."),
    depart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choisissez une date de départ."),
    invites: z.coerce
      .number()
      .int("Indiquez un nombre d'invités entier.")
      .positive("Indiquez un nombre d'invités."),
  })
  .refine((data) => data.depart >= data.arrivee, {
    path: ["depart"],
    message: "La date de départ doit suivre la date d'arrivée.",
  });

export type AvailabilityResult =
  | {
      ok: true;
      available: true;
      /** Nombre de jours réservés, bornes incluses. */
      days: number;
      /** Estimation : prix d'appel × jours, frais de ménage inclus. */
      estimate: number;
    }
  | {
      ok: true;
      available: false;
      /** Dates déjà prises, formatées pour l'affichage. */
      unavailableDates: string[];
      reason: "occupied" | "not-open";
    }
  | { ok: false; message: string; field?: string };

/** Minuit UTC, comme les colonnes `@db.Date`. */
function toUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function eachDay(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  for (
    let day = new Date(from);
    day.getTime() <= to.getTime();
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    days.push(new Date(day));
  }
  return days;
}

/**
 * Vérifie qu'une salle est libre sur une plage de dates.
 *
 * Une date est disponible si elle est ouverte à la réservation (ligne
 * `Availability` en `AVAILABLE`) *et* qu'aucune réservation en cours ne la
 * bloque. Une demande `EN_ATTENTE` ne bloque rien : elle n'est pas encore
 * vérifiée par l'équipe, comme dans la recherche.
 */
export async function checkRoomAvailability(
  formData: FormData
): Promise<AvailabilityResult> {
  const parsed = checkSchema.safeParse({
    roomId: formData.get("roomId"),
    arrivee: formData.get("arrivee"),
    depart: formData.get("depart"),
    invites: formData.get("invites"),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      message: issue.message,
      field: typeof issue.path[0] === "string" ? issue.path[0] : undefined,
    };
  }

  const { roomId, arrivee, depart, invites } = parsed.data;
  const from = toUtcDate(arrivee);
  const to = toUtcDate(depart);

  const today = new Date();
  const startOfToday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  if (from.getTime() < startOfToday.getTime()) {
    return {
      ok: false,
      message: "La date d'arrivée est déjà passée.",
      field: "arrivee",
    };
  }

  const days = eachDay(from, to);
  if (days.length > MAX_DAYS) {
    return {
      ok: false,
      message: `Une demande ne peut pas dépasser ${MAX_DAYS} jours. Contactez le propriétaire pour une location plus longue.`,
      field: "depart",
    };
  }

  try {
    const room = await prisma.room.findFirst({
      where: { id: roomId, status: "ACTIVE" },
      select: {
        basePrice: true,
        cleaningFee: true,
        capacityMin: true,
        capacityMax: true,
      },
    });

    if (!room) {
      return { ok: false, message: "Cette salle n'est plus disponible." };
    }

    if (invites > room.capacityMax) {
      return {
        ok: false,
        message: `Cette salle accueille au maximum ${room.capacityMax} invités.`,
        field: "invites",
      };
    }
    if (invites < room.capacityMin) {
      return {
        ok: false,
        message: `Cette salle se loue à partir de ${room.capacityMin} invités.`,
        field: "invites",
      };
    }

    const [availabilities, conflicts] = await Promise.all([
      prisma.availability.findMany({
        where: { roomId, date: { gte: from, lte: to } },
        select: { date: true, status: true },
      }),
      prisma.booking.findMany({
        where: {
          roomId,
          eventDate: { gte: from, lte: to },
          status: { in: ["EN_COURS_VERIFICATION", "CONFIRMEE"] },
        },
        select: { eventDate: true },
      }),
    ]);

    const statusByDay = new Map(
      availabilities.map((day) => [day.date.toISOString(), day.status])
    );
    const bookedSet = new Set(
      conflicts.map((booking) => booking.eventDate.toISOString())
    );

    // Jour indisponible : bloqué par le propriétaire, ou déjà réservé.
    const unavailable = days.filter(
      (day) =>
        bookedSet.has(day.toISOString()) ||
        statusByDay.get(day.toISOString()) === "BLOCKED"
    );
    if (unavailable.length > 0) {
      return {
        ok: true,
        available: false,
        reason: "occupied",
        unavailableDates: unavailable.map((day) => formatDate(day)),
      };
    }

    // Jour sans ligne `Availability` : la période n'est pas encore ouverte.
    const closed = days.filter((day) => !statusByDay.has(day.toISOString()));
    if (closed.length > 0) {
      return {
        ok: true,
        available: false,
        reason: "not-open",
        unavailableDates: closed.map((day) => formatDate(day)),
      };
    }

    return {
      ok: true,
      available: true,
      days: days.length,
      estimate:
        Number(room.basePrice) * days.length + Number(room.cleaningFee ?? 0),
    };
  } catch (error) {
    console.error("[fiche salle] vérification de disponibilité", error);
    return {
      ok: false,
      message: "La vérification a échoué. Réessayez dans un instant.",
    };
  }
}
