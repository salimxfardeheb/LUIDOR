import { describe, expect, it } from "vitest";
import type { BookingStatus } from "@prisma/client";
import {
  blockingBookingWhere,
  expiredHoldWhere,
  holdExpiryFrom,
  isBlockingBooking,
  isHoldActive,
  slotStatusOf,
  type BookingHold,
} from "@/lib/bookings/availability";

/**
 * Règles de disponibilité, testées sans base.
 *
 * Chaque cas porte le nom du scénario métier correspondant : ce sont ces
 * phrases-là qui doivent rester vraies, pas la forme actuelle du code.
 */

const NOW = new Date("2026-08-21T12:00:00.000Z");

function hold(
  status: BookingStatus,
  expiresAt: string | null = null
): BookingHold {
  return { status, expiresAt: expiresAt === null ? null : new Date(expiresAt) };
}

const ACTIVE_HOLD = "2026-08-21T18:00:00.000Z";
const LAPSED_HOLD = "2026-08-21T06:00:00.000Z";

describe("état d'une date", () => {
  it("cas 1 — aucune réservation : la date est disponible", () => {
    expect(slotStatusOf([], NOW)).toBe("available");
  });

  it("cas 2 — une demande en attente non expirée retient la date", () => {
    expect(slotStatusOf([hold("EN_ATTENTE", ACTIVE_HOLD)], NOW)).toBe("pending");
  });

  it("cas 3 — une demande en attente expirée ne retient plus rien", () => {
    expect(slotStatusOf([hold("EN_ATTENTE", LAPSED_HOLD)], NOW)).toBe(
      "available"
    );
  });

  it("cas 4 — une réservation confirmée rend la date indisponible", () => {
    expect(slotStatusOf([hold("CONFIRMEE")], NOW)).toBe("booked");
  });

  it("cas 5 — une réservation annulée libère la date", () => {
    expect(slotStatusOf([hold("ANNULEE")], NOW)).toBe("available");
  });

  it("une réservation expirée libère la date", () => {
    expect(slotStatusOf([hold("EXPIREE", LAPSED_HOLD)], NOW)).toBe("available");
  });

  it("une réservation clôturée ne bloque pas la date de nouveau", () => {
    expect(slotStatusOf([hold("CLOTUREE")], NOW)).toBe("available");
  });

  it("la vérification en cours retient la date sans limite de temps", () => {
    // L'équipe a la main sur le dossier : plus rien ne se rouvre tout seul.
    expect(slotStatusOf([hold("EN_COURS_VERIFICATION")], NOW)).toBe("pending");
  });

  it("une date confirmée l'emporte sur une demande en attente", () => {
    // L'ordre de lecture ne doit rien changer : « réservée » est plus fort.
    const holds = [hold("EN_ATTENTE", ACTIVE_HOLD), hold("CONFIRMEE")];
    expect(slotStatusOf(holds, NOW)).toBe("booked");
    expect(slotStatusOf([...holds].reverse(), NOW)).toBe("booked");
  });

  it("une confirmation annulée laisse la demande en attente décider", () => {
    const holds = [hold("ANNULEE"), hold("EN_ATTENTE", ACTIVE_HOLD)];
    expect(slotStatusOf(holds, NOW)).toBe("pending");
  });
});

describe("échéance du blocage", () => {
  it("expire exactement à l'heure dite, pas une seconde avant", () => {
    const deadline = new Date(NOW);
    expect(isHoldActive(deadline, NOW)).toBe(false);
    expect(isHoldActive(new Date(NOW.getTime() + 1), NOW)).toBe(true);
  });

  it("une échéance absente vaut blocage toujours actif", () => {
    // Cas conservateur : mieux vaut retenir une date à tort que la revendre.
    expect(isHoldActive(null, NOW)).toBe(true);
    expect(isBlockingBooking(hold("EN_ATTENTE"), NOW)).toBe(true);
  });

  it("se calcule à partir de la durée réglée, en heures", () => {
    expect(holdExpiryFrom(NOW, 48).toISOString()).toBe(
      "2026-08-23T12:00:00.000Z"
    );
    expect(holdExpiryFrom(NOW, 1).toISOString()).toBe(
      "2026-08-21T13:00:00.000Z"
    );
  });

  it("ne s'applique qu'à l'attente : les autres statuts l'ignorent", () => {
    // Une échéance résiduelle sur un statut ferme ne doit pas le faire tomber.
    expect(isBlockingBooking(hold("CONFIRMEE", LAPSED_HOLD), NOW)).toBe(true);
    expect(isBlockingBooking(hold("EN_COURS_VERIFICATION", LAPSED_HOLD), NOW)).toBe(
      true
    );
  });
});

describe("clauses Prisma", () => {
  /*
   * Les fragments partent en base : on ne vérifie pas leur mise en forme mais
   * les deux propriétés dont dépend la correction — que l'attente y soit
   * soumise à une échéance, et que les deux fragments soient complémentaires.
   */
  it("le blocage retient l'attente non échue et les statuts fermes", () => {
    const where = blockingBookingWhere(NOW);
    expect(where).toEqual({
      OR: [
        { status: { in: ["EN_COURS_VERIFICATION", "CONFIRMEE"] } },
        {
          status: "EN_ATTENTE",
          OR: [{ expiresAt: null }, { expiresAt: { gt: NOW } }],
        },
      ],
    });
  });

  it("la péremption ne vise que l'attente déjà échue", () => {
    expect(expiredHoldWhere(NOW)).toEqual({
      status: "EN_ATTENTE",
      expiresAt: { not: null, lte: NOW },
    });
  });

  it("les deux clauses ne peuvent pas viser la même ligne", () => {
    // `gt: NOW` d'un côté, `lte: NOW` de l'autre : aucune ligne ne satisfait
    // les deux, donc aucune demande n'est à la fois bloquante et périmée.
    const blocking = blockingBookingWhere(NOW).OR?.[1] as {
      OR: Array<{ expiresAt: unknown }>;
    };
    const expired = expiredHoldWhere(NOW) as { expiresAt: { lte: Date } };
    expect(blocking.OR[1]).toEqual({ expiresAt: { gt: NOW } });
    expect(expired.expiresAt.lte).toEqual(NOW);
  });
});
