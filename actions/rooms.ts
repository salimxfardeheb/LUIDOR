"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  blockingBookingWhere,
  slotStatusOf,
  type BookingHold,
} from "@/lib/bookings/availability";
import { formatDate } from "@/lib/format";

/** Durée maximale d'une demande, en jours : au-delà, c'est du cas par cas. */
const MAX_DAYS = 30;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const checkSchema = z
  .object({
    roomId: z.string().min(1),
    arrivee: z.string().regex(ISO_DATE, "Choisissez la date de votre événement."),
    /**
     * Départ facultatif : une salle des fêtes se loue le plus souvent à la
     * journée, et le formulaire n'envoie alors que la date d'arrivée. Vide, la
     * vérification porte sur ce seul jour.
     */
    depart: z.union([
      z.literal(""),
      z.string().regex(ISO_DATE, "Choisissez une date de départ."),
    ]),
    invites: z.coerce
      .number()
      .int("Indiquez un nombre d'invités entier.")
      .positive("Indiquez un nombre d'invités."),
  })
  .transform((data) => ({
    ...data,
    depart: data.depart === "" ? data.arrivee : data.depart,
  }))
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
      /** Dates qui font échouer la vérification, formatées pour l'affichage. */
      unavailableDates: string[];
      /**
       * - `occupied` : réservation confirmée, ou date fermée par le propriétaire.
       * - `pending` : une demande retient la date, sans être encore confirmée.
       * - `not-open` : le propriétaire n'a pas ouvert la date à la réservation.
       *
       * `pending` est délibérément distinct d'`occupied` : le client doit
       * comprendre que la date peut se rouvrir, sans qu'on la lui promette.
       */
      reason: "occupied" | "pending" | "not-open";
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
 * `Availability` en `AVAILABLE`) *et* qu'aucune réservation vivante ne la
 * bloque, au sens de `lib/bookings/availability` — une demande en attente
 * comprise, tant que son blocage court.
 *
 * Cette vérification reste **indicative** : elle est vraie à l'instant où elle
 * est faite, et rien n'empêche un autre client de déposer sa demande la seconde
 * suivante. C'est la transaction de `submitBookingRequest` qui tranche.
 */
export async function checkRoomAvailability(
  formData: FormData
): Promise<AvailabilityResult> {
  const parsed = checkSchema.safeParse({
    roomId: formData.get("roomId"),
    arrivee: formData.get("arrivee"),
    // Absent du FormData en mode « une journée » : le champ n'est pas rendu.
    depart: formData.get("depart") ?? "",
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
    // `null` = la salle n'annonce aucun minimum, rien à opposer au client.
    if (room.capacityMin !== null && invites < room.capacityMin) {
      return {
        ok: false,
        message: `Cette salle se loue à partir de ${room.capacityMin} invités.`,
        field: "invites",
      };
    }

    const now = new Date();

    const [availabilities, conflicts] = await Promise.all([
      prisma.availability.findMany({
        where: { roomId, date: { gte: from, lte: to } },
        select: { date: true, status: true },
      }),
      prisma.booking.findMany({
        where: {
          roomId,
          eventDate: { gte: from, lte: to },
          ...blockingBookingWhere(now),
        },
        select: { eventDate: true, status: true, expiresAt: true },
      }),
    ]);

    const statusByDay = new Map(
      availabilities.map((day) => [day.date.toISOString(), day.status])
    );

    // Plusieurs réservations peuvent viser la même date — une confirmée et le
    // reliquat d'une demande, par exemple : c'est leur ensemble qui décide.
    const holdsByDay = new Map<string, BookingHold[]>();
    for (const booking of conflicts) {
      const key = booking.eventDate.toISOString();
      const holds = holdsByDay.get(key);
      if (holds) holds.push(booking);
      else holdsByDay.set(key, [booking]);
    }

    const slotOf = (day: Date) =>
      slotStatusOf(holdsByDay.get(day.toISOString()) ?? [], now);

    /*
     * Trois refus possibles, dans cet ordre de gravité : une date réservée ou
     * fermée par le propriétaire prime sur une date simplement retenue, qui
     * prime sur une date jamais ouverte. Annoncer le motif le plus faible
     * d'abord donnerait un faux espoir sur une plage qui contient un refus ferme.
     */
    const occupied = days.filter(
      (day) =>
        slotOf(day) === "booked" ||
        statusByDay.get(day.toISOString()) === "BLOCKED"
    );
    if (occupied.length > 0) {
      return {
        ok: true,
        available: false,
        reason: "occupied",
        unavailableDates: occupied.map((day) => formatDate(day)),
      };
    }

    const held = days.filter((day) => slotOf(day) === "pending");
    if (held.length > 0) {
      return {
        ok: true,
        available: false,
        reason: "pending",
        unavailableDates: held.map((day) => formatDate(day)),
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
