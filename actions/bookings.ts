"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/lib/admin/settings";
import { parseBookingRequestForm } from "@/lib/bookings/schemas";
import { formatDate } from "@/lib/format";
import type { FieldErrors } from "@/lib/forms";
import { sendBookingRequestEmails } from "@/lib/mail";

/**
 * Demande de réservation déposée depuis la fiche salle.
 *
 * Aucune réservation ne se conclut en ligne : l'action crée une demande
 * `EN_ATTENTE` que l'équipe LIUDOR reprend depuis /admin/reservations, puis
 * confirme par téléphone. Le propriétaire n'a rien à traiter — son portail ne
 * montre plus les réservations — d'où l'absence de revalidation côté owner.
 */

export type BookingRequestResult =
  | { ok: true; eventDate: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: FieldErrors;
      /** Session absente ou expirée : le formulaire renvoie vers /connexion. */
      needsSignIn?: boolean;
    };

/** Minuit UTC du jour courant : `eventDate` est stocké en `@db.Date`. */
function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

/** Dates qui occupent réellement un créneau ; une demande n'y suffit pas. */
const BLOCKING_STATUSES = ["EN_COURS_VERIFICATION", "CONFIRMEE"] as const;

export async function submitBookingRequest(
  formData: FormData
): Promise<BookingRequestResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      needsSignIn: true,
      message: "Connectez-vous pour envoyer votre demande.",
    };
  }

  const parsed = parseBookingRequestForm(formData);
  if (!parsed.ok) {
    return {
      ok: false,
      message: parsed.message,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const { roomId, eventType, guestsCount, contactPhone, contactEmail } =
    parsed.data;

  const eventDate = new Date(`${parsed.data.eventDate}T00:00:00.000Z`);
  if (Number.isNaN(eventDate.getTime())) {
    return {
      ok: false,
      message: "Vérifiez les informations saisies.",
      fieldErrors: { eventDate: "Cette date n'existe pas." },
    };
  }

  try {
    const [settings, room, client] = await Promise.all([
      getPlatformSettings(),
      prisma.room.findFirst({
        where: { id: roomId, status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          city: true,
          ownerId: true,
          capacityMin: true,
          capacityMax: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { fullName: true },
      }),
    ]);

    if (settings.maintenanceMode) {
      return {
        ok: false,
        message:
          "Les demandes sont momentanément suspendues, le temps d'une intervention. Réessayez plus tard.",
      };
    }

    if (!room) {
      return { ok: false, message: "Cette salle n'est plus disponible." };
    }

    if (room.ownerId === session.user.id) {
      return {
        ok: false,
        message: "Vous ne pouvez pas déposer une demande sur votre propre salle.",
      };
    }

    if (guestsCount > room.capacityMax) {
      return {
        ok: false,
        message: "Vérifiez les informations saisies.",
        fieldErrors: {
          guestsCount: `Cette salle accueille au maximum ${room.capacityMax} invités.`,
        },
      };
    }
    // `null` = la salle n'annonce aucun minimum, rien à opposer au client.
    if (room.capacityMin !== null && guestsCount < room.capacityMin) {
      return {
        ok: false,
        message: "Vérifiez les informations saisies.",
        fieldErrors: {
          guestsCount: `Cette salle se loue à partir de ${room.capacityMin} invités.`,
        },
      };
    }

    // Délai minimum de préparation, réglé en base (`PlatformSettings`) : l'équipe doit
    // avoir le temps de rappeler le client avant l'événement.
    const earliest = startOfTodayUtc();
    earliest.setUTCDate(earliest.getUTCDate() + settings.bookingLeadTimeDays);
    if (eventDate < earliest) {
      return {
        ok: false,
        message: "Vérifiez les informations saisies.",
        fieldErrors: {
          eventDate: `Comptez au moins ${settings.bookingLeadTimeDays} jour${
            settings.bookingLeadTimeDays > 1 ? "s" : ""
          } avant l'événement : la première date possible est le ${formatDate(
            earliest
          )}.`,
        },
      };
    }

    const [blocking, duplicate] = await Promise.all([
      prisma.booking.findFirst({
        where: {
          roomId: room.id,
          eventDate,
          status: { in: [...BLOCKING_STATUSES] },
        },
        select: { id: true },
      }),
      prisma.booking.findFirst({
        where: {
          roomId: room.id,
          eventDate,
          clientId: session.user.id,
          status: "EN_ATTENTE",
        },
        select: { id: true },
      }),
    ]);

    if (blocking) {
      return {
        ok: false,
        message: "Vérifiez les informations saisies.",
        fieldErrors: {
          eventDate:
            "Cette date est déjà retenue sur cette salle. Choisissez-en une autre.",
        },
      };
    }

    if (duplicate) {
      return {
        ok: false,
        message:
          "Vous avez déjà une demande en attente sur cette salle à cette date. L'équipe LIUDOR vous rappelle sous 24 h ouvrées.",
      };
    }

    await prisma.booking.create({
      data: {
        clientId: session.user.id,
        roomId: room.id,
        eventType,
        eventDate,
        guestsCount,
        contactPhone,
        contactEmail,
        status: "EN_ATTENTE",
      },
    });

    // Best-effort : un SMTP absent ou en échec est loggé, jamais bloquant — la
    // demande est déjà en base, l'équipe la voit dans son tableau de bord.
    await sendBookingRequestEmails({
      clientName: client?.fullName ?? session.user.name ?? "Client LIUDOR",
      clientEmail: contactEmail,
      contactPhone,
      roomName: room.name,
      roomCity: room.city,
      eventType,
      eventDate: formatDate(eventDate),
      guestsCount,
    });

    revalidatePath("/admin/reservations");
    revalidatePath("/admin/paiements");
    revalidatePath("/admin/dashboard");
    revalidatePath("/reservations");
    revalidatePath("/historique");

    return { ok: true, eventDate: formatDate(eventDate) };
  } catch (error) {
    console.error("submitBookingRequest a échoué", error);
    return {
      ok: false,
      message: "L'envoi a échoué. Réessayez dans un instant.",
    };
  }
}
