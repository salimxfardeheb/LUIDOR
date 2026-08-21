"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/lib/admin/settings";
import {
  BOOKED_SLOT_MESSAGE,
  PENDING_SLOT_MESSAGE,
} from "@/lib/bookings/availability";
import { claimBookingSlot, type ClaimRefusal } from "@/lib/bookings/holds";
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
 *
 * **La demande retient la date.** Tant qu'elle n'a pas expiré, aucun autre
 * client ne peut en déposer une sur la même salle au même jour : c'est ce qui
 * empêche l'équipe de rappeler deux personnes pour la même date. Le blocage est
 * temporaire (`Booking.expiresAt`) — une demande jamais reprise rouvre la date
 * d'elle-même plutôt que de la geler indéfiniment.
 */

export type BookingRequestResult =
  | { ok: true; eventDate: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: FieldErrors;
      /** Session absente ou expirée : le formulaire renvoie vers /connexion. */
      needsSignIn?: boolean;
      /**
       * La date vient d'être prise ou retenue : le formulaire l'affiche
       * autrement qu'une erreur de saisie — le client n'a rien à corriger, il a
       * une autre date à choisir.
       */
      conflict?: "pending" | "booked";
    };

/** Minuit UTC du jour courant : `eventDate` est stocké en `@db.Date`. */
function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

/** Traduit le refus de la transaction en réponse affichable par le formulaire. */
function refusal(kind: ClaimRefusal): BookingRequestResult {
  if (kind === "duplicate") {
    return {
      ok: false,
      message:
        "Vous avez déjà une demande en attente sur cette salle à cette date. L'équipe LIUDOR vous rappelle sous 24 h ouvrées.",
    };
  }

  return {
    ok: false,
    conflict: kind,
    message: kind === "pending" ? PENDING_SLOT_MESSAGE : BOOKED_SLOT_MESSAGE,
  };
}

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
  const serviceIds = Array.from(new Set(parsed.data.serviceIds));

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

    /*
     * Seules les prestations réellement proposées par cette salle sont retenues.
     * Le filtre se fait en base, sur le rattachement : un identifiant forgé, ou
     * celui d'une prestation retirée depuis l'affichage de la page, est ignoré
     * plutôt que de faire échouer la demande — le client n'y peut rien.
     *
     * Lecture pure, sortie de la transaction : elle ne dispute la date à
     * personne et n'a donc pas à tenir le verrou pendant son aller-retour.
     */
    const offered =
      serviceIds.length === 0
        ? []
        : await prisma.roomService.findMany({
            where: { roomId: room.id, serviceId: { in: serviceIds } },
            select: { serviceId: true, service: { select: { name: true } } },
          });

    const outcome = await claimBookingSlot({
      roomId: room.id,
      eventDate,
      isoEventDate: parsed.data.eventDate,
      clientId: session.user.id,
      holdHours: settings.pendingHoldHours,
      data: {
        eventType,
        guestsCount,
        contactPhone,
        contactEmail,
        serviceIds: offered.map((link) => link.serviceId),
      },
    });

    if (!outcome.ok) return refusal(outcome.kind);

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
      services: offered.map((link) => link.service.name),
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
