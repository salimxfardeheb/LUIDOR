"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, type AdminRefusal } from "@/lib/admin/guards";
import { recordAudit } from "@/lib/admin/audit";
import { formatDate } from "@/lib/format";
import { fieldErrorsFrom, type FieldErrors } from "@/lib/forms";
import { sendBookingDecisionEmails } from "@/lib/mail";

/**
 * Suivi des réservations par l'administration : décision sur une demande en
 * cours de vérification, et suivi des espèces.
 *
 * L'argent circule en liquide, hors ligne, et toujours dans le même sens : le
 * client remet la somme à LIUDOR (`recordCashPayment`), qui la reverse ensuite
 * au propriétaire (`recordOwnerPayout`). Aucune de ces actions ne déclenche de
 * transaction bancaire : elles consignent un mouvement qui a déjà eu lieu, avec
 * son montant et l'administrateur qui l'a fait.
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
const PAYMENTS_PATH = "/admin/paiements";

function revalidateBookings() {
  revalidatePath(BOOKINGS_PATH);
  // Le détail est une route dynamique : la revalider par son motif touche
  // toutes les réservations ouvertes, pas seulement la liste.
  revalidatePath(`${BOOKINGS_PATH}/[id]`, "page");
  revalidatePath(PAYMENTS_PATH);
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
 * Ferme la date d'une réservation confirmée dans le calendrier de la salle.
 *
 * Sans cette écriture, la ligne `Availability` resterait `AVAILABLE` : les
 * calendriers masquent bien la date parce qu'ils superposent les réservations,
 * mais tout ce qui lit la disponibilité seule — compteur de dates ouvertes du
 * propriétaire, recherche par date — continuerait à la compter comme libre.
 *
 * `eventDate` vient d'une colonne `@db.Date` : c'est déjà minuit UTC, la clé
 * composite `roomId_date` s'aligne sans conversion.
 */
async function closeRoomDate(
  tx: Prisma.TransactionClient,
  roomId: string,
  eventDate: Date
): Promise<void> {
  await tx.availability.upsert({
    where: { roomId_date: { roomId, date: eventDate } },
    create: { roomId, date: eventDate, status: "BLOCKED" },
    update: { status: "BLOCKED" },
  });
}

/** Statuts depuis lesquels une réservation peut encore basculer. */
const OPEN_STATUSES = ["EN_ATTENTE", "EN_COURS_VERIFICATION"] as const;

function isOpen(status: BookingStatus): boolean {
  return (OPEN_STATUSES as readonly BookingStatus[]).includes(status);
}

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
 * Confirme ou annule une réservation encore ouverte.
 *
 * Les deux statuts vivants sont acceptés — `EN_ATTENTE` et
 * `EN_COURS_VERIFICATION` : une demande fraîche doit pouvoir être annulée sans
 * passer d'abord par la vérification, et l'équipe peut confirmer une
 * réservation réglée autrement qu'en espèces. Une réservation déjà confirmée,
 * annulée ou clôturée ne se rejoue pas depuis une liste.
 *
 * Le cas courant ne passe pas par ici : encaisser confirme la réservation tout
 * seul (`recordCashPayment`). Ces boutons servent aux exceptions.
 *
 * Une confirmation ferme la date, dans la même transaction que le statut.
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

  if (!isOpen(booking.status)) {
    return {
      ok: false,
      status: 409,
      message:
        "Cette réservation n'est plus ouverte : elle est déjà confirmée, annulée ou clôturée. Actualisez la page.",
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

      await closeRoomDate(tx, booking.roomId, booking.eventDate);
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
 * Prend une demande en charge : `EN_ATTENTE` → `EN_COURS_VERIFICATION`.
 *
 * C'est l'étape que le statut décrit déjà — « l'équipe LIUDOR vérifie le
 * paiement » — et sans elle une demande restait bloquée en attente, aucune
 * action ne la faisant avancer. Elle ne ferme aucune date : tant que rien n'est
 * encaissé, la réservation n'est pas acquise.
 *
 * Pas de journal d'audit ici, contrairement à la confirmation et à
 * l'encaissement : c'est un geste de tri interne, il n'engage ni l'argent ni la
 * date.
 */
export async function startBookingVerification(
  bookingId: string
): Promise<BookingActionResult> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const parsed = idSchema.safeParse(bookingId);
  if (!parsed.success) return { ok: false, message: "Réservation inconnue." };

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data },
    select: { status: true },
  });

  if (!booking) {
    return { ok: false, status: 404, message: "Cette réservation n'existe plus." };
  }

  if (booking.status !== "EN_ATTENTE") {
    return {
      ok: false,
      status: 409,
      message:
        "Seule une demande en attente peut être prise en charge. Actualisez la page.",
    };
  }

  try {
    await prisma.booking.update({
      where: { id: parsed.data },
      data: { status: "EN_COURS_VERIFICATION" },
    });
  } catch (error) {
    console.error("startBookingVerification a échoué", error);
    return { ok: false, message: "La mise à jour a échoué. Réessayez." };
  }

  revalidateBookings();

  return {
    ok: true,
    message:
      "Demande prise en charge : elle passe en vérification, en attente de l'encaissement.",
  };
}

/**
 * Enregistre un encaissement en espèces sur une réservation.
 *
 * `Payment.bookingId` est unique : un second enregistrement met à jour la ligne
 * existante plutôt que d'échouer sur la contrainte — c'est le cas d'une
 * correction de montant après une saisie erronée.
 *
 * **L'encaissement confirme la réservation.** C'est l'argent qui décide, pas un
 * clic de plus : une fois la somme reçue, la date est acquise au client et elle
 * se ferme au calendrier, dans la même transaction que le paiement. Sans cela,
 * une réservation encaissée pouvait rester « en attente » et sa date être
 * revendue à quelqu'un d'autre.
 *
 * Le geste reste sans effet sur le statut d'une réservation déjà confirmée ou
 * clôturée : corriger un montant ne doit pas rejouer une décision.
 */
export async function recordCashPayment(input: {
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

  // Une réservation encore ouverte est confirmée par l'encaissement lui-même.
  const confirms = isOpen(booking.status);
  const paidAt = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.upsert({
        where: { bookingId },
        create: {
          bookingId,
          amount,
          status: "PAID",
          paidAt,
          recordedBy: recorder.id,
        },
        update: {
          amount,
          status: "PAID",
          paidAt,
          recordedBy: recorder.id,
        },
      });

      if (!confirms) return;

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMEE" },
      });
      await closeRoomDate(tx, booking.roomId, booking.eventDate);
    });
  } catch (error) {
    console.error("recordCashPayment a échoué", error);
    return { ok: false, message: "L'enregistrement du paiement a échoué. Réessayez." };
  }

  const target = `${booking.room.name} — ${booking.client.fullName}`;

  await recordAudit({
    userId: session.adminId,
    action: "PAYMENT_RECORDED",
    target,
    detail: `${amount.toLocaleString("fr-DZ")} DA en espèces, encaissés par ${recorder.fullName}`,
  });

  if (confirms) {
    // Deux entrées au journal, et c'est voulu : l'argent reçu et la décision
    // qu'il emporte se relisent séparément lors d'un contrôle de caisse.
    await recordAudit({
      userId: session.adminId,
      action: "BOOKING_CONFIRMED",
      target,
      detail: "Confirmée automatiquement par l'encaissement du client",
    });

    // Best-effort : le client et le propriétaire apprennent la confirmation
    // exactement comme si elle avait été prise à la main.
    await sendBookingDecisionEmails({
      decision: "CONFIRMEE",
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
  }

  revalidateBookings();
  if (confirms) revalidateRoomAvailability(booking.roomId);

  return {
    ok: true,
    message: confirms
      ? "Paiement enregistré : la réservation est confirmée et la date fermée au calendrier."
      : "Paiement en espèces enregistré.",
  };
}

/**
 * Montant reversé au propriétaire.
 *
 * Mêmes bornes que l'encaissement : le reversement n'est pas un champ libre de
 * comptabilité, c'est la contrepartie d'une somme déjà reçue.
 */
const payoutSchema = z.object({
  bookingId: z.string().min(1),
  amount: z
    .number({ message: "Saisissez le montant reversé, en dinars." })
    .positive("Le montant doit être supérieur à zéro.")
    .max(100_000_000, "Montant improbable : vérifiez la saisie."),
  recordedBy: z.string().min(1, "Indiquez qui a remis les espèces."),
});

/**
 * Enregistre le reversement en espèces au propriétaire.
 *
 * Deuxième et dernier mouvement du circuit : LIUDOR rend au propriétaire ce
 * qu'elle a reçu du client. Le reversement exige donc un encaissement au
 * préalable — la plateforme ne reverse pas ce qu'elle n'a pas reçu, et une
 * ligne « reversé » sans encaissement rendrait la caisse illisible.
 *
 * Comme l'encaissement, un second enregistrement corrige le précédent plutôt
 * que d'en créer un autre : une réservation n'a qu'un reversement.
 */
export async function recordOwnerPayout(input: {
  bookingId: string;
  amount: number;
  /** Compte administrateur ayant remis les espèces au propriétaire. */
  recordedBy: string;
}): Promise<BookingActionResult> {
  const session = await requireAdminSession();
  if (!session.ok) return { ok: false, ...session.refusal };

  const parsed = payoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Vérifiez les informations du reversement.",
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
        payment: { select: { status: true } },
        room: {
          select: { name: true, owner: { select: { fullName: true } } },
        },
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

  if (booking.payment?.status !== "PAID") {
    return {
      ok: false,
      status: 409,
      message:
        "Aucun encaissement n'est enregistré sur cette réservation : commencez par enregistrer le paiement du client.",
    };
  }

  // Une réservation annulée après encaissement se règle avec le client, pas
  // avec le propriétaire : la somme lui revient.
  if (booking.status === "ANNULEE") {
    return {
      ok: false,
      status: 409,
      message:
        "Cette réservation est annulée : la somme encaissée doit être rendue au client, pas reversée au propriétaire.",
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
    await prisma.payment.update({
      where: { bookingId },
      data: {
        payoutAmount: amount,
        payoutAt: new Date(),
        payoutRecordedBy: recorder.id,
      },
    });
  } catch (error) {
    console.error("recordOwnerPayout a échoué", error);
    return {
      ok: false,
      message: "L'enregistrement du reversement a échoué. Réessayez.",
    };
  }

  await recordAudit({
    userId: session.adminId,
    action: "PAYMENT_PAID_OUT",
    target: `${booking.room.name} — ${booking.client.fullName}`,
    detail: `${amount.toLocaleString("fr-DZ")} DA remis à ${booking.room.owner.fullName} par ${recorder.fullName}`,
  });

  revalidateBookings();

  return { ok: true, message: "Reversement au propriétaire enregistré." };
}
