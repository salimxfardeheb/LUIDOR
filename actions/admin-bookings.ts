"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, type AdminRefusal } from "@/lib/admin/guards";
import { recordAudit } from "@/lib/admin/audit";
import { formatDate } from "@/lib/format";
import { fieldErrorsFrom, type FieldErrors } from "@/lib/forms";
import { sendBookingDecisionEmails } from "@/lib/mail";

/**
 * Suivi des réservations par l'administration : décision sur une demande en
 * cours de vérification, et enregistrement de l'encaissement en espèces.
 *
 * Les paiements de LIUDOR se règlent en liquide, hors ligne. `createPayment`
 * ne déclenche donc aucune transaction bancaire : elle consigne un encaissement
 * qui a déjà eu lieu, avec son montant et l'administrateur qui l'a reçu.
 */

export type BookingActionResult =
  | { ok: true; message: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: FieldErrors;
      status?: AdminRefusal["status"];
    };

const BOOKINGS_PATH = "/admin/reservations";

function revalidateBookings() {
  revalidatePath(BOOKINGS_PATH);
  revalidatePath("/admin/dashboard");
  revalidatePath("/reservations");
  revalidatePath("/historique");
}

/**
 * Surfaces qui affichent les disponibilités de la salle : elles changent en
 * même temps que la date se ferme.
 */
function revalidateRoomAvailability(roomId: string) {
  revalidatePath("/owner/disponibilites");
  revalidatePath("/owner/dashboard");
  revalidatePath(`/salles/${roomId}`);
  // La recherche par date filtre sur les disponibilités : sa liste change aussi.
  revalidatePath("/salles");
}

const idSchema = z.string().min(1);

/**
 * Montant encaissé.
 *
 * Positif et plafonné : une saisie à dix millions de dinars est une faute de
 * frappe, pas un encaissement, et elle fausserait tous les cumuls du tableau
 * de bord.
 */
const paymentSchema = z.object({
  bookingId: z.string().min(1),
  amount: z
    .number({ message: "Saisissez le montant encaissé, en dinars." })
    .positive("Le montant doit être supérieur à zéro.")
    .max(100_000_000, "Montant improbable : vérifiez la saisie."),
  recordedBy: z.string().min(1, "Indiquez qui a encaissé le paiement."),
});

/**
 * Confirme ou annule une réservation en cours de vérification.
 *
 * Seul ce statut est modifiable ici : une demande encore en attente appartient
 * au propriétaire, et une réservation déjà confirmée ou clôturée ne se rejoue
 * pas depuis une liste.
 *
 * Une confirmation ferme la date : la disponibilité de la salle passe à
 * `BLOCKED` dans la même transaction que le statut. Sans cette écriture, la
 * ligne `Availability` resterait `AVAILABLE` — les calendriers masquent bien la
 * date parce qu'ils superposent les réservations, mais tout ce qui lit la
 * disponibilité seule (compteur de dates ouvertes du propriétaire, recherche
 * par date) continuerait à la compter comme libre.
 *
 * L'annulation ne rouvre pas la date : le propriétaire l'avait peut-être fermée
 * avant la demande, et la rouvrir d'office déciderait à sa place. Un clic sur
 * son calendrier suffit à la libérer, plus aucune réservation confirmée ne la
 * verrouille.
 */
export async function setBookingDecision(
  bookingId: string,
  decision: "CONFIRMEE" | "ANNULEE"
): Promise<BookingActionResult> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const parsed = idSchema.safeParse(bookingId);
  if (!parsed.success) return { ok: false, message: "Réservation inconnue." };

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data },
    select: {
      status: true,
      roomId: true,
      eventDate: true,
      eventType: true,
      guestsCount: true,
      contactEmail: true,
      client: { select: { fullName: true } },
      room: {
        select: {
          name: true,
          city: true,
          owner: { select: { fullName: true, email: true } },
        },
      },
    },
  });

  if (!booking) {
    return { ok: false, status: 404, message: "Cette réservation n'existe plus." };
  }

  if (booking.status !== "EN_COURS_VERIFICATION") {
    return {
      ok: false,
      status: 409,
      message:
        "Seule une réservation en cours de vérification peut être confirmée ou annulée ici. Actualisez la page.",
    };
  }

  const confirmed = decision === "CONFIRMEE";

  try {
    // Transaction : une date confirmée mais restée ouverte serait réservable
    // deux fois. Les deux écritures passent ensemble ou pas du tout.
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: parsed.data },
        data: { status: decision },
      });

      if (!confirmed) return;

      // `eventDate` vient d'une colonne `@db.Date` : c'est déjà minuit UTC, la
      // clé composite `roomId_date` s'aligne sans conversion.
      await tx.availability.upsert({
        where: {
          roomId_date: { roomId: booking.roomId, date: booking.eventDate },
        },
        create: {
          roomId: booking.roomId,
          date: booking.eventDate,
          status: "BLOCKED",
        },
        update: { status: "BLOCKED" },
      });
    });
  } catch (error) {
    console.error("setBookingDecision a échoué", error);
    return { ok: false, message: "La mise à jour a échoué. Réessayez." };
  }

  await recordAudit({
    userId: session.adminId,
    action: confirmed ? "BOOKING_CONFIRMED" : "BOOKING_CANCELLED",
    target: `${booking.room.name} — ${booking.client.fullName}`,
  });

  // Best-effort : un transport absent ou en échec est loggé, jamais bloquant —
  // la décision est déjà en base et visible des deux côtés de la plateforme.
  await sendBookingDecisionEmails({
    decision,
    clientName: booking.client.fullName,
    clientEmail: booking.contactEmail,
    roomName: booking.room.name,
    roomCity: booking.room.city,
    eventType: booking.eventType,
    eventDate: formatDate(booking.eventDate),
    guestsCount: booking.guestsCount,
    ownerName: booking.room.owner.fullName,
    ownerEmail: booking.room.owner.email,
  });

  revalidateBookings();
  if (confirmed) revalidateRoomAvailability(booking.roomId);

  return {
    ok: true,
    message: confirmed
      ? "Réservation confirmée : la date est fermée dans le calendrier de la salle."
      : "Réservation annulée.",
  };
}

/**
 * Enregistre un encaissement en espèces sur une réservation.
 *
 * `Payment.bookingId` est unique : un second enregistrement met à jour la ligne
 * existante plutôt que d'échouer sur la contrainte — c'est le cas d'une
 * correction de montant après une saisie erronée.
 */
export async function createPayment(input: {
  bookingId: string;
  amount: number;
  /** Compte administrateur ayant reçu les espèces. */
  recordedBy: string;
}): Promise<BookingActionResult> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Vérifiez les informations du paiement.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { bookingId, amount, recordedBy } = parsed.data;

  const [booking, recorder] = await Promise.all([
    prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        status: true,
        client: { select: { fullName: true } },
        room: { select: { name: true } },
      },
    }),
    prisma.user.findFirst({
      where: { id: recordedBy, role: "ADMIN" },
      select: { id: true, fullName: true },
    }),
  ]);

  if (!booking) {
    return { ok: false, status: 404, message: "Cette réservation n'existe plus." };
  }

  // Encaisser sur une réservation annulée n'a pas de sens : c'est le signe
  // d'une ligne cliquée par erreur dans la liste.
  if (booking.status === "ANNULEE") {
    return {
      ok: false,
      status: 409,
      message: "Cette réservation est annulée : aucun encaissement ne peut y être rattaché.",
    };
  }

  if (!recorder) {
    return {
      ok: false,
      status: 404,
      message: "Le compte administrateur indiqué est introuvable.",
      fieldErrors: { recordedBy: "Choisissez un administrateur de la liste." },
    };
  }

  try {
    await prisma.payment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        amount,
        status: "PAID",
        paidAt: new Date(),
        recordedBy: recorder.id,
      },
      update: {
        amount,
        status: "PAID",
        paidAt: new Date(),
        recordedBy: recorder.id,
      },
    });
  } catch (error) {
    console.error("createPayment a échoué", error);
    return { ok: false, message: "L'enregistrement du paiement a échoué. Réessayez." };
  }

  await recordAudit({
    userId: session.adminId,
    action: "PAYMENT_RECORDED",
    target: `${booking.room.name} — ${booking.client.fullName}`,
    detail: `${amount.toLocaleString("fr-DZ")} DA en espèces, encaissés par ${recorder.fullName}`,
  });

  revalidateBookings();

  return { ok: true, message: "Paiement en espèces enregistré." };
}
