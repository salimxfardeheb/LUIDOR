import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  blockingBookingWhere,
  expiredHoldWhere,
  holdExpiryFrom,
  slotStatusOf,
} from "@/lib/bookings/availability";

/**
 * Prise d'une date par une demande de réservation.
 *
 * Module à part, et non dans l'action serveur : un fichier `"use server"`
 * n'exporte que des actions, c'est-à-dire des points d'entrée HTTP appelables
 * depuis le navigateur. La fonction critique de la réservation n'a rien à faire
 * dans cette catégorie — et ici, elle est directement testable.
 */

/** Motif du refus, tel que le distingue la transaction de réservation. */
export type ClaimRefusal = "pending" | "booked" | "duplicate";

export type ClaimOutcome =
  | { ok: true; bookingId: string }
  | { ok: false; kind: ClaimRefusal };

export interface ClaimSlotInput {
  roomId: string;
  /** Minuit UTC, comme la colonne `@db.Date`. */
  eventDate: Date;
  /** La même date en `YYYY-MM-DD`, pour la clé de verrou. */
  isoEventDate: string;
  clientId: string;
  /** Durée du blocage, en heures, telle que réglée au moment du dépôt. */
  holdHours: number;
  data: {
    eventType: string;
    guestsCount: number;
    contactPhone: string;
    contactEmail: string;
    serviceIds: string[];
  };
}

/**
 * Dépose la demande **si et seulement si** la date est encore libre.
 *
 * Le contrôle applicatif seul ne suffit pas : entre le moment où il lit la base
 * et celui où il écrit, une autre requête peut avoir déposé sa demande. Trois
 * mécanismes se superposent donc, du plus large au plus strict :
 *
 * 1. `pg_advisory_xact_lock` sérialise toutes les tentatives visant *cette*
 *    salle à *cette* date. Les autres dates ne sont pas ralenties, et le verrou
 *    tombe au `COMMIT` comme au `ROLLBACK` — sa version transactionnelle est
 *    aussi la seule compatible avec le pooler en mode transaction de Neon.
 * 2. Sous verrou, les blocages échus passent en `EXPIREE` puis la disponibilité
 *    est relue. C'est cette lecture-là qui fait foi, pas celle de la page.
 * 3. L'index unique partiel `bookings_active_slot_key` tranche en dernier
 *    ressort : même si les deux points précédents étaient contournés par un
 *    autre chemin de code, la base refuserait la seconde ligne (23505 → P2002).
 *
 * Rien n'est écrit hors de cette transaction : un refus laisse la base
 * exactement dans l'état où il l'a trouvée, à la péremption des blocages échus
 * près — qui est un constat, pas un effet de bord de la demande.
 */
export async function claimBookingSlot(
  input: ClaimSlotInput
): Promise<ClaimOutcome> {
  const { roomId, eventDate, isoEventDate, clientId, holdHours, data } = input;

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Verrou : deux requêtes simultanées sur la même salle et la même date
      //    passent ici l'une après l'autre, jamais ensemble.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${roomId}), hashtext(${isoEventDate}))`;

      // L'instant est figé après le verrou : tout ce qui suit juge la même date
      // à la même seconde.
      const now = new Date();

      // 2. Les blocages échus sortent de l'index avant qu'on tente d'y entrer.
      //    Sans cela, une demande périmée depuis trois jours interdirait encore
      //    la date à tout le monde.
      await tx.booking.updateMany({
        where: { roomId, eventDate, ...expiredHoldWhere(now) },
        data: { status: "EXPIREE" },
      });

      // 3. Relecture sous verrou : c'est elle qui décide, pas la page du client.
      const rivals = await tx.booking.findMany({
        where: { roomId, eventDate, ...blockingBookingWhere(now) },
        select: { status: true, expiresAt: true, clientId: true },
      });

      if (rivals.length > 0) {
        // Sa propre demande n'est pas un conflit à expliquer comme les autres :
        // le client n'a pas d'autre date à choisir, il a déjà la sienne.
        const mine = rivals.some(
          (rival) => rival.clientId === clientId && rival.status === "EN_ATTENTE"
        );
        if (mine) return { ok: false, kind: "duplicate" } as const;

        const slot = slotStatusOf(rivals, now);
        return {
          ok: false,
          kind: slot === "booked" ? "booked" : "pending",
        } as const;
      }

      const booking = await tx.booking.create({
        data: {
          clientId,
          roomId,
          eventType: data.eventType,
          eventDate,
          guestsCount: data.guestsCount,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
          status: "EN_ATTENTE",
          // La demande retient la date, mais pas indéfiniment : l'échéance est
          // figée ici, à partir du réglage en vigueur au dépôt.
          expiresAt: holdExpiryFrom(now, holdHours),
          services: {
            create: data.serviceIds.map((serviceId) => ({ serviceId })),
          },
        },
        select: { id: true },
      });

      return { ok: true, bookingId: booking.id } as const;
    });
  } catch (error) {
    /*
     * Dernier filet : l'index unique a refusé la ligne. On ne sait pas qui a
     * gagné la course, seulement qu'on l'a perdue — « en cours de confirmation »
     * est la formulation juste, elle ne promet rien et n'affirme rien de faux.
     */
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, kind: "pending" };
    }
    throw error;
  }
}

/**
 * Bascule en `EXPIREE` les blocages dont l'échéance est passée.
 *
 * Aucune disponibilité n'en dépend : les lectures traitent déjà un blocage échu
 * comme inexistant, et la transaction de réservation fait elle-même le ménage
 * sur la date qu'elle vise. Sans cron dans l'infrastructure du projet, une
 * demande jamais reprise resterait pourtant affichée « en attente » indéfiniment
 * dans le tableau de bord — ce balayage la remet au bon statut.
 *
 * Un seul `UPDATE`, idempotent, sans lecture préalable : appelé au chargement
 * d'une liste, il ne coûte rien quand il n'y a rien à faire. Le jour où un cron
 * existera, il appellera cette même fonction sans rien changer d'autre.
 *
 * @returns le nombre de demandes basculées.
 */
export async function expireStaleHolds(now: Date = new Date()): Promise<number> {
  const { count } = await prisma.booking.updateMany({
    where: expiredHoldWhere(now),
    data: { status: "EXPIREE" },
  });
  return count;
}
