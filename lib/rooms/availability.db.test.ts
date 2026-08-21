import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getRoomCalendar } from "@/lib/rooms/detail";
import { searchRooms } from "@/lib/rooms/queries";
import type { RoomFilters } from "@/lib/rooms/search-params";

/**
 * Cohérence des surfaces de lecture, vérifiée contre PostgreSQL.
 *
 * Le défaut d'origine n'était pas dans une fonction mais *entre* elles : le
 * calendrier montrait une date en attente comme occupée pendant que la
 * recherche la proposait encore. Ces tests interrogent donc les deux au même
 * moment, sur la même date, et vérifient qu'elles disent la même chose à chaque
 * état de la réservation.
 *
 * Suite d'intégration : `npm run test:db`.
 */

const RUN = `vitest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Date de test, dans le premier mois que le calendrier public charge. */
const EVENT_DATE = firstOpenDayOfNextMonth();
const EVENT_ISO = EVENT_DATE.toISOString().slice(0, 10);

let ownerId = "";
let clientId = "";
let roomId = "";
let categoryId = "";
let categoryIsOurs = false;

/**
 * Le 15 du mois prochain.
 *
 * `getRoomCalendar` ne charge que trois mois à partir du mois courant : une
 * date trop lointaine ne serait tout simplement pas dans la grille, et le test
 * passerait pour de mauvaises raisons. Le 15 évite les bords de mois.
 */
function firstOpenDayOfNextMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 15));
}

const NO_FILTERS: RoomFilters = {
  ville: null,
  date: null,
  dateFin: null,
  invites: null,
  type: null,
  capaciteMin: null,
  capaciteMax: null,
  prixMin: null,
  prixMax: null,
  equipements: [],
  tri: "pertinence",
  page: 1,
};

/** État de la date dans le mini calendrier de la fiche publique. */
async function calendarStatus(): Promise<string | undefined> {
  const months = await getRoomCalendar(roomId);
  for (const month of months) {
    const day = month.days.find((entry) => entry.date === EVENT_ISO);
    if (day) return day.status;
  }
  return undefined;
}

/** La salle ressort-elle d'une recherche portant sur cette date ? */
async function foundBySearch(): Promise<boolean> {
  const page = await searchRooms({
    ...NO_FILTERS,
    ville: RUN,
    date: EVENT_ISO,
  });
  return page.rooms.some((room) => room.id === roomId);
}

async function bookWith(
  status: "EN_ATTENTE" | "CONFIRMEE" | "ANNULEE" | "EXPIREE",
  expiresAt: Date | null
) {
  await prisma.booking.deleteMany({ where: { roomId } });
  await prisma.booking.create({
    data: {
      clientId,
      roomId,
      eventType: "Mariage",
      eventDate: EVENT_DATE,
      guestsCount: 150,
      contactPhone: "0770000000",
      contactEmail: "client@exemple.test",
      status,
      expiresAt,
    },
  });
}

beforeAll(async () => {
  const [owner, client] = await Promise.all([
    prisma.user.create({
      data: {
        email: `${RUN}-owner@exemple.test`,
        fullName: "Propriétaire de test",
        role: "OWNER",
      },
      select: { id: true },
    }),
    prisma.user.create({
      data: { email: `${RUN}-client@exemple.test`, fullName: "Client" },
      select: { id: true },
    }),
  ]);
  ownerId = owner.id;
  clientId = client.id;

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
      // La ville sert de filtre de recherche : elle isole ce test des salles
      // réelles de la base, dont la présence ferait varier les résultats.
      city: RUN,
      address: "1 rue de test",
      capacityMax: 300,
      basePrice: 100000,
      status: "ACTIVE",
      categories: { create: { categoryId } },
      // Le propriétaire a ouvert la date : sans ligne `Availability`, elle
      // serait `closed` et rien d'autre ne pourrait s'y observer.
      availabilities: { create: { date: EVENT_DATE, status: "AVAILABLE" } },
    },
    select: { id: true },
  });
  roomId = room.id;
});

afterAll(async () => {
  if (roomId) {
    await prisma.booking.deleteMany({ where: { roomId } });
    await prisma.availability.deleteMany({ where: { roomId } });
    await prisma.roomCategory.deleteMany({ where: { roomId } });
    await prisma.room.delete({ where: { id: roomId } });
  }
  if (categoryIsOurs && categoryId) {
    await prisma.category.delete({ where: { id: categoryId } });
  }
  await prisma.user.deleteMany({
    where: { id: { in: [ownerId, clientId].filter(Boolean) } },
  });
  await prisma.$disconnect();
});

describe("calendrier public et recherche", () => {
  it("cas 1 — sans réservation, la date est disponible et la salle sort en recherche", async () => {
    await prisma.booking.deleteMany({ where: { roomId } });

    expect(await calendarStatus()).toBe("available");
    expect(await foundBySearch()).toBe(true);
  });

  it("cas 2 — une demande en attente affiche « en attente » et retire la salle", async () => {
    // Le défaut historique : le calendrier disait « en attente », la recherche
    // proposait quand même la salle.
    await bookWith("EN_ATTENTE", new Date(Date.now() + 3_600_000));

    expect(await calendarStatus()).toBe("pending");
    expect(await foundBySearch()).toBe(false);
  });

  it("cas 3 — un blocage échu rend la date, sans attendre aucun traitement", async () => {
    await bookWith("EN_ATTENTE", new Date(Date.now() - 60_000));

    // Le statut en base est toujours `EN_ATTENTE` : c'est bien l'échéance, et
    // elle seule, qui décide.
    expect(await calendarStatus()).toBe("available");
    expect(await foundBySearch()).toBe(true);
  });

  it("cas 4 — une réservation confirmée verrouille la date", async () => {
    await bookWith("CONFIRMEE", null);

    expect(await calendarStatus()).toBe("booked");
    expect(await foundBySearch()).toBe(false);
  });

  it("cas 5 — une réservation annulée rend la date", async () => {
    await bookWith("ANNULEE", null);

    expect(await calendarStatus()).toBe("available");
    expect(await foundBySearch()).toBe(true);
  });

  it("une réservation expirée rend la date", async () => {
    await bookWith("EXPIREE", new Date(Date.now() - 60_000));

    expect(await calendarStatus()).toBe("available");
    expect(await foundBySearch()).toBe(true);
  });
});
