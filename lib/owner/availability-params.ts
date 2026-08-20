import type { AvailabilityStatus } from "@prisma/client";

/**
 * Types et helpers du calendrier de disponibilités, sans aucune dépendance au
 * client Prisma : ce module est importé aussi bien par la page serveur que par
 * le calendrier interactif, qui tourne dans le navigateur.
 *
 * L'import de `AvailabilityStatus` est *type-only* : il disparaît à la
 * compilation et n'embarque donc pas Prisma dans le bundle client.
 */

/** Chemin de la page, base des liens de navigation entre les mois. */
export const AVAILABILITY_PATH = "/owner/disponibilites";

/** La salle et le mois affichés vivent dans l'URL : la vue est partageable. */
export const AVAILABILITY_PARAMS = { room: "salle", month: "mois" } as const;

/** Nombre de mois ouverts à la gestion, mois courant inclus. */
export const CALENDAR_MONTH_SPAN = 12;

/**
 * Dernière date modifiable : dernier jour du mois courant + 11 mois.
 *
 * Bornes l'entrée « Du / Au » côté client (attribut `max`) comme côté serveur
 * (gardé dans l'action de période) : au-delà, le propriétaire n'a rien à
 * gérer, la fenêtre gérable s'arrête là.
 */
export function lastEditableDate(): string {
  const now = new Date();
  const lastMonth = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + CALENDAR_MONTH_SPAN - 1,
      1
    )
  );
  const lastDay = new Date(
    Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() + 1, 0)
  );
  return lastDay.toISOString().slice(0, 10);
}

/** Initiales des jours, semaine démarrant le lundi. */
export const WEEKDAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"] as const;

export interface CalendarMonthRef {
  year: number;
  /** Mois sur 1-12. */
  month: number;
  /** Clé « YYYY-MM », telle qu'elle apparaît dans l'URL. */
  key: string;
}

export interface OwnerCalendarDay {
  /** Date au format `YYYY-MM-DD`. */
  date: string;
  /**
   * Ligne `Availability` existante, ou `null` quand la salle n'a jamais été
   * ouverte sur cette date. L'absence de ligne vaut fermeture : c'est déjà
   * ainsi que la fiche publique traite une date sans disponibilité.
   */
  status: AvailabilityStatus | null;
  /** Réservation confirmée : la date est verrouillée, jamais modifiable. */
  booked: boolean;
  /** Demande en attente ou en cours de vérification sur cette date. */
  requested: boolean;
  /** Date déjà passée : conservée pour l'historique, non modifiable. */
  past: boolean;
}

export interface OwnerCalendarMonth extends CalendarMonthRef {
  days: OwnerCalendarDay[];
}

/**
 * État affiché d'une date. `booked` prime sur tout le reste : une réservation
 * confirmée verrouille la date quelle que soit la disponibilité enregistrée.
 */
export type OwnerDayState = "booked" | "past" | "open" | "closed";

export function dayState(day: OwnerCalendarDay): OwnerDayState {
  if (day.booked) return "booked";
  if (day.past) return "past";
  return day.status === "AVAILABLE" ? "open" : "closed";
}

/** Une date est modifiable tant qu'elle n'est ni réservée ni passée. */
export function isDayEditable(day: OwnerCalendarDay): boolean {
  return !day.booked && !day.past;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function toRef(date: Date): CalendarMonthRef {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return { year, month, key: monthKey(year, month) };
}

/** Mois décalé de `offset` mois, en repartant du 1er (UTC). */
function shiftMonth(ref: CalendarMonthRef, offset: number): CalendarMonthRef {
  return toRef(new Date(Date.UTC(ref.year, ref.month - 1 + offset, 1)));
}

/** Rang absolu d'un mois, pour comparer deux références sans passer par Date. */
function rank(ref: { year: number; month: number }): number {
  return ref.year * 12 + ref.month;
}

function parseMonthKey(value: string | undefined): CalendarMonthRef | null {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  return { year, month, key: monthKey(year, month) };
}

export interface MonthWindow {
  current: CalendarMonthRef;
  /** `null` sur le premier mois gérable : on ne bloque pas le passé. */
  previous: CalendarMonthRef | null;
  /** `null` sur le dernier mois gérable. */
  next: CalendarMonthRef | null;
}

/**
 * Mois affiché, borné à la fenêtre gérable (mois courant → + 11 mois).
 *
 * Un paramètre absent, malformé ou hors fenêtre retombe sur le mois courant :
 * une URL forgée ne peut donc pas afficher un mois que le propriétaire n'a pas
 * à gérer, et la navigation reste finie.
 */
export function resolveMonthWindow(value?: string): MonthWindow {
  const now = new Date();
  const first = toRef(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const last = shiftMonth(first, CALENDAR_MONTH_SPAN - 1);

  const requested = parseMonthKey(value);
  const current =
    requested && rank(requested) >= rank(first) && rank(requested) <= rank(last)
      ? requested
      : first;

  return {
    current,
    previous: rank(current) > rank(first) ? shiftMonth(current, -1) : null,
    next: rank(current) < rank(last) ? shiftMonth(current, 1) : null,
  };
}

/** Lien vers le calendrier d'une salle sur un mois donné. */
export function buildAvailabilityHref(roomId: string, month: string): string {
  const params = new URLSearchParams({
    [AVAILABILITY_PARAMS.room]: roomId,
    [AVAILABILITY_PARAMS.month]: month,
  });
  return `${AVAILABILITY_PATH}?${params.toString()}`;
}

/**
 * Nombre de cases vides avant le 1er du mois, pour une semaine démarrant le
 * lundi (`getUTCDay()` renvoie 0 pour dimanche).
 */
export function leadingBlanks(year: number, month: number): number {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return (firstWeekday + 6) % 7;
}
