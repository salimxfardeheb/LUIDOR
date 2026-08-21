import type { BookingStatus, Prisma } from "@prisma/client";

/**
 * Règle de disponibilité d'une salle à une date : source de vérité unique.
 *
 * Avant ce module, trois endroits décidaient séparément ce qui « occupe » une
 * date — la recherche, la vérification de la fiche salle et le calendrier — et
 * ils ne disaient pas la même chose : le calendrier affichait une demande en
 * attente comme occupée, les deux autres la considéraient comme libre. Deux
 * clients pouvaient donc déposer une demande sur la même date.
 *
 * Tout ce qui lit ou écrit une disponibilité passe désormais par ici.
 *
 * Import *type-only* de Prisma : le module reste utilisable côté client, où il
 * sert à traduire un statut de journée en libellé.
 */

/**
 * Durée du blocage d'une demande en attente, en heures.
 *
 * Une demande `EN_ATTENTE` retient la date le temps que l'équipe rappelle le
 * client. Sans limite, une demande jamais traitée gèlerait la date pour
 * toujours ; avec une limite, la date se rouvre d'elle-même.
 *
 * Cette constante n'est que la valeur par défaut : le réglage effectif vit
 * dans `PlatformSettings.pendingHoldHours`, modifiable en base sans
 * redéploiement. Elle n'est lue **qu'à la création** de la demande, qui fige
 * son échéance dans `Booking.expiresAt` — allonger le délai ne prolonge donc
 * pas rétroactivement les demandes déjà déposées, et tous les chemins de
 * lecture n'ont qu'une colonne à regarder.
 */
export const DEFAULT_PENDING_HOLD_HOURS = 48;

/** Bornes acceptées pour le réglage, garde-fou contre une saisie aberrante. */
export const PENDING_HOLD_HOURS_RANGE = { min: 1, max: 720 } as const;

/**
 * Statuts qui occupent une date sans condition de délai.
 *
 * `EN_COURS_VERIFICATION` en fait partie : une fois la demande prise en charge
 * par l'équipe, un humain la suit et la date lui reste acquise le temps qu'il
 * faut. Seul `EN_ATTENTE` est un blocage à durée limitée.
 */
export const FIRM_BLOCKING_STATUSES = [
  "EN_COURS_VERIFICATION",
  "CONFIRMEE",
] as const satisfies readonly BookingStatus[];

/** Le seul statut dont le blocage expire tout seul. */
export const HELD_STATUS = "EN_ATTENTE" as const satisfies BookingStatus;

/** État d'une date, du point de vue d'un client qui veut réserver. */
export type SlotStatus = "available" | "pending" | "booked";

/** Ce qu'il faut connaître d'une réservation pour trancher sa disponibilité. */
export interface BookingHold {
  status: BookingStatus;
  /** Échéance du blocage `EN_ATTENTE` ; `null` sur les autres statuts. */
  expiresAt: Date | null;
}

/** Échéance d'un blocage ouvert maintenant, pour la durée de réglage donnée. */
export function holdExpiryFrom(createdAt: Date, holdHours: number): Date {
  return new Date(createdAt.getTime() + holdHours * 60 * 60 * 1000);
}

/**
 * Le blocage d'une demande en attente court-il encore ?
 *
 * `null` vaut « toujours actif » : c'est le cas conservateur. Une demande sans
 * échéance est une demande que rien n'a jamais fait expirer — la traiter comme
 * périmée libérerait une date que l'équipe croit tenue. La migration a rempli
 * la colonne pour l'existant, et la création la remplit systématiquement : ce
 * cas ne devrait plus se présenter.
 */
export function isHoldActive(expiresAt: Date | null, now: Date): boolean {
  return expiresAt === null || expiresAt.getTime() > now.getTime();
}

/** Cette réservation occupe-t-elle sa date à l'instant `now` ? */
export function isBlockingBooking(booking: BookingHold, now: Date): boolean {
  if ((FIRM_BLOCKING_STATUSES as readonly BookingStatus[]).includes(booking.status)) {
    return true;
  }
  if (booking.status !== HELD_STATUS) return false;
  return isHoldActive(booking.expiresAt, now);
}

/**
 * État d'une date au vu des réservations qui la visent.
 *
 * `booked` l'emporte sur `pending` : une date confirmée est définitivement
 * prise, quel qu'ait été le sort des demandes concurrentes.
 */
export function slotStatusOf(
  bookings: readonly BookingHold[],
  now: Date
): SlotStatus {
  let held = false;

  for (const booking of bookings) {
    if (!isBlockingBooking(booking, now)) continue;
    if (booking.status === "CONFIRMEE") return "booked";
    // Reste `EN_ATTENTE` et `EN_COURS_VERIFICATION` : la date est retenue mais
    // rien n'est acquis — pour un visiteur, elle est en cours de confirmation.
    held = true;
  }

  return held ? "pending" : "available";
}

/**
 * Fragment `where` des réservations qui occupent leur date.
 *
 * À composer avec `roomId` / `eventDate` selon l'appelant. `now` est passé en
 * paramètre plutôt que lu ici : une requête et les tests qui la vérifient
 * doivent pouvoir se placer à un instant choisi.
 */
export function blockingBookingWhere(now: Date): Prisma.BookingWhereInput {
  return {
    OR: [
      { status: { in: [...FIRM_BLOCKING_STATUSES] } },
      {
        status: HELD_STATUS,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    ],
  };
}

/**
 * Fragment `where` des blocages échus, à basculer en `EXPIREE`.
 *
 * Complémentaire strict de `blockingBookingWhere` sur le statut `EN_ATTENTE` :
 * une demande y entre exactement quand elle cesse de bloquer.
 */
export function expiredHoldWhere(now: Date): Prisma.BookingWhereInput {
  return { status: HELD_STATUS, expiresAt: { not: null, lte: now } };
}

/**
 * Message affiché quand une date est retenue par la demande d'un autre client.
 *
 * Centralisé ici pour que la fiche salle, le formulaire et le refus du serveur
 * disent la même chose. Aucune promesse de disponibilité future : la demande en
 * cours *peut* être confirmée.
 */
export const PENDING_SLOT_MESSAGE =
  "Cette date est actuellement en cours de confirmation par LIUDOR. Revenez vérifier sa disponibilité ultérieurement : elle redeviendra disponible si la demande en cours n'est pas confirmée.";

export const BOOKED_SLOT_MESSAGE =
  "Cette date est déjà réservée sur cette salle. Choisissez-en une autre.";

/** Libellés courts des trois états, pour les calendriers et les légendes. */
export const SLOT_STATUS_LABELS: Record<SlotStatus, string> = {
  available: "disponible",
  pending: "en attente de confirmation",
  booked: "réservée",
};
