import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { claimBookingSlot } from "@/lib/bookings/holds";
import { DEFAULT_PENDING_HOLD_HOURS } from "@/lib/bookings/availability";

/**
 * Prise de date, vérifiée contre PostgreSQL.
 *
 * Ce que ces tests prouvent et qu'aucun test en mémoire ne peut prouver : deux
 * demandes réellement simultanées sur la même salle et la même date sont
 * départagées — l'une passe, l'autre est refusée proprement. Le verrou
 * consultatif et l'index unique partiel n'existent que dans la base ; les
 * simuler reviendrait à tester la simulation.
 *
 * Suite exclue du `npm test` : elle demande une base accessible. Elle se lance
 * par `npm run test:db`.
 *
 * Chaque exécution crée son propre jeu de données, préfixé par un identifiant
 * unique, et le supprime intégralement à la fin. Rien n'est lu ni modifié en
 * dehors de ce préfixe.
 */

const RUN = `vitest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Date d'événement propre à l'exécution, loin de toute donnée réelle. */
const EVENT_ISO = "2031-08-25";
const EVENT_DATE = new Date(`${EVENT_ISO}T00:00:00.000Z`);

let ownerId = "";
let clientAId = "";
let clientBId = "";
let roomId = "";
let categoryId = "";
/** `true` si la catégorie a été créée ici : elle seule doit être supprimée. */
let categoryIsOurs = false;

function claim(clientId: string) {
  return claimBookingSlot({
    roomId,
    eventDate: EVENT_DATE,
    isoEventDate: EVENT_ISO,
    clientId,
    holdHours: DEFAULT_PENDING_HOLD_HOURS,
    data: {
      eventType: "Mariage",
      guestsCount: 150,
      contactPhone: "0770000000",
      contactEmail: `${clientId}@exemple.test`,
      serviceIds: [],
    },
  });
}

/** Remet la date à zéro entre deux scénarios, sans toucher au reste. */
async function resetBookings() {
  await prisma.booking.deleteMany({ where: { roomId } });
}

beforeAll(async () => {
  const [owner, clientA, clientB] = await Promise.all([
    prisma.user.create({
      data: {
        email: `${RUN}-owner@exemple.test`,
        fullName: "Propriétaire de test",
        role: "OWNER",
      },
      select: { id: true },
    }),
    prisma.user.create({
      data: { email: `${RUN}-a@exemple.test`, fullName: "Client A" },
      select: { id: true },
    }),
    prisma.user.create({
      data: { email: `${RUN}-b@exemple.test`, fullName: "Client B" },
      select: { id: true },
    }),
  ]);

  ownerId = owner.id;
  clientAId = clientA.id;
  clientBId = clientB.id;

  // Une catégorie existante fait l'affaire ; on n'en crée une que si la base
  // est vide, pour ne pas laisser de trace dans un référentiel partagé.
  const existing = await prisma.category.findFirst({ select: { id: true } });
  if (existing) {
    categoryId = existing.id;
  } else {
    const created = await prisma.category.create({
      data: { name: `${RUN}-categorie`, iconSlug: "sparkles" },
      select: { id: true },
    });
    categoryId = created.id;
    categoryIsOurs = true;
  }

  const room = await prisma.room.create({
    data: {
      ownerId,
      categoryId,
      name: `${RUN} — salle de test`,
      description: "Salle créée par la suite d'intégration, supprimée après.",
      city: "Alger",
      address: "1 rue de test",
      capacityMax: 300,
      basePrice: 100000,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  roomId = room.id;
});

afterAll(async () => {
  // L'ordre suit les dépendances : les réservations d'abord, la salle ensuite.
  if (roomId) {
    await prisma.booking.deleteMany({ where: { roomId } });
    await prisma.room.delete({ where: { id: roomId } });
  }
  if (categoryIsOurs && categoryId) {
    await prisma.category.delete({ where: { id: categoryId } });
  }
  await prisma.user.deleteMany({
    where: { id: { in: [ownerId, clientAId, clientBId].filter(Boolean) } },
  });
  await prisma.$disconnect();
});

describe("prise d'une date", () => {
  it("cas 2 — une demande en attente ferme la date au client suivant", async () => {
    await resetBookings();

    const first = await claim(clientAId);
    expect(first.ok).toBe(true);

    const second = await claim(clientBId);
    expect(second).toEqual({ ok: false, kind: "pending" });

    // L'invariant qui compte : une seule demande vivante sur la date.
    const count = await prisma.booking.count({
      where: { roomId, eventDate: EVENT_DATE, status: "EN_ATTENTE" },
    });
    expect(count).toBe(1);
  });

  it("le même client retrouve sa demande, pas un conflit", async () => {
    await resetBookings();

    expect((await claim(clientAId)).ok).toBe(true);
    expect(await claim(clientAId)).toEqual({ ok: false, kind: "duplicate" });
  });

  it("cas 6 — deux demandes simultanées : une seule passe", async () => {
    await resetBookings();

    /*
     * Le cœur du sujet. Les deux transactions partent ensemble et se disputent
     * la même date : sans le verrou et l'index, les deux réussiraient — c'est
     * exactement le défaut que cette suite doit interdire de réintroduire.
     */
    const results = await Promise.all([claim(clientAId), claim(clientBId)]);

    const accepted = results.filter((result) => result.ok);
    const refused = results.filter((result) => !result.ok);

    expect(accepted).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect(refused[0]).toEqual({ ok: false, kind: "pending" });

    const bookings = await prisma.booking.findMany({
      where: { roomId, eventDate: EVENT_DATE },
      select: { status: true },
    });
    expect(bookings).toHaveLength(1);
    expect(bookings[0].status).toBe("EN_ATTENTE");
  });

  it("dix demandes simultanées : une seule passe, neuf refus propres", async () => {
    await resetBookings();

    // Même course, plus large : on veut voir un refus métier, jamais une
    // exception qui remonterait telle quelle au client.
    const rivals = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        claim(index % 2 === 0 ? clientAId : clientBId)
      )
    );

    expect(rivals.filter((result) => result.ok)).toHaveLength(1);
    for (const refusal of rivals.filter((result) => !result.ok)) {
      expect(refusal).toMatchObject({ ok: false });
      expect(["pending", "duplicate"]).toContain(
        (refusal as { kind: string }).kind
      );
    }

    const count = await prisma.booking.count({
      where: {
        roomId,
        eventDate: EVENT_DATE,
        status: { in: ["EN_ATTENTE", "EN_COURS_VERIFICATION", "CONFIRMEE"] },
      },
    });
    expect(count).toBe(1);
  });

  it("cas 7 — une réservation confirmée refuse toute nouvelle demande", async () => {
    await resetBookings();

    const first = await claim(clientAId);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    await prisma.booking.update({
      where: { id: first.bookingId },
      data: { status: "CONFIRMEE", expiresAt: null },
    });

    expect(await claim(clientBId)).toEqual({ ok: false, kind: "booked" });
  });

  it("cas 8 — une demande annulée rouvre la date", async () => {
    await resetBookings();

    const first = await claim(clientAId);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    await prisma.booking.update({
      where: { id: first.bookingId },
      data: { status: "ANNULEE", expiresAt: null },
    });

    const second = await claim(clientBId);
    expect(second.ok).toBe(true);
  });

  it("cas 9 — un blocage échu rouvre la date et bascule en EXPIREE", async () => {
    await resetBookings();

    const first = await claim(clientAId);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    // On antidate l'échéance : le blocage est périmé, sans qu'aucun traitement
    // ne soit passé le constater. C'est le cas que le cron ne couvre pas.
    await prisma.booking.update({
      where: { id: first.bookingId },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const second = await claim(clientBId);
    expect(second.ok).toBe(true);

    const lapsed = await prisma.booking.findUnique({
      where: { id: first.bookingId },
      select: { status: true },
    });
    expect(lapsed?.status).toBe("EXPIREE");
  });

  it("la demande acceptée porte une échéance, jamais nulle", async () => {
    await resetBookings();

    const first = await claim(clientAId);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const created = await prisma.booking.findUnique({
      where: { id: first.bookingId },
      select: { expiresAt: true, createdAt: true },
    });

    expect(created?.expiresAt).toBeInstanceOf(Date);
    const heldFor =
      (created!.expiresAt!.getTime() - created!.createdAt.getTime()) /
      (60 * 60 * 1000);
    // Tolérance d'une minute : `createdAt` vient de la base, l'échéance du code.
    expect(heldFor).toBeGreaterThan(DEFAULT_PENDING_HOLD_HOURS - 0.02);
    expect(heldFor).toBeLessThan(DEFAULT_PENDING_HOLD_HOURS + 0.02);
  });
});
