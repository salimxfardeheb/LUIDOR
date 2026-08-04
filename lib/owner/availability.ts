import { prisma } from "@/lib/prisma";
import {
  type CalendarMonthRef,
  type OwnerCalendarDay,
  type OwnerCalendarMonth,
} from "@/lib/owner/availability-params";

/**
 * Lecture du calendrier de disponibilités d'une salle du propriétaire.
 *
 * Les dates sont stockées en `@db.Date` (minuit UTC) : tous les calculs de ce
 * module restent en UTC, comme le formatage de `lib/format`. Un décalage de
 * fuseau ferait glisser une journée entière.
 */

/** Réservations qui occupent réellement une date dans le calendrier. */
const ACTIVE_BOOKING_STATUSES = [
  "EN_ATTENTE",
  "EN_COURS_VERIFICATION",
  "CONFIRMEE",
] as const;

export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Aujourd'hui au format `YYYY-MM-DD`, en UTC. */
export function todayIso(): string {
  return isoDay(new Date());
}

/**
 * Grille d'un mois pour une salle donnée, ou `null` si la salle n'appartient
 * pas au propriétaire. Le filtre sur `ownerId` est dans la requête : le
 * cloisonnement ne dépend jamais de l'appelant.
 */
export async function getOwnerRoomMonth(
  ownerId: string,
  roomId: string,
  { year, month, key }: CalendarMonthRef
): Promise<OwnerCalendarMonth | null> {
  const room = await prisma.room.findFirst({
    where: { id: roomId, ownerId },
    select: { id: true },
  });

  if (!room) return null;

  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));

  const [availabilities, bookings] = await Promise.all([
    prisma.availability.findMany({
      where: { roomId, date: { gte: from, lt: to } },
      select: { date: true, status: true },
    }),
    prisma.booking.findMany({
      where: {
        roomId,
        eventDate: { gte: from, lt: to },
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
      select: { eventDate: true, status: true },
    }),
  ]);

  const statusByDay = new Map(
    availabilities.map((availability) => [
      isoDay(availability.date),
      availability.status,
    ])
  );

  // Une réservation confirmée verrouille la date ; une demande encore en
  // instruction est seulement signalée, le propriétaire garde la main dessus.
  const bookedDays = new Set<string>();
  const requestedDays = new Set<string>();
  for (const booking of bookings) {
    const date = isoDay(booking.eventDate);
    if (booking.status === "CONFIRMEE") bookedDays.add(date);
    else requestedDays.add(date);
  }

  const today = todayIso();
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const days: OwnerCalendarDay[] = Array.from(
    { length: dayCount },
    (_, index) => {
      const date = isoDay(new Date(Date.UTC(year, month - 1, index + 1)));
      return {
        date,
        status: statusByDay.get(date) ?? null,
        booked: bookedDays.has(date),
        requested: requestedDays.has(date),
        past: date < today,
      };
    }
  );

  return { year, month, key, days };
}
