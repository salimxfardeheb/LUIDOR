const currencyFormatter = new Intl.NumberFormat("fr-DZ", {
  style: "currency",
  currency: "DZD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("fr-DZ");

/** Prix en dinars, sans décimales : « 120 000 DA ». */
export function formatPrice(value: number): string {
  return currencyFormatter.format(value);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Note moyenne sur 5, une décimale : « 4,8 ». */
export function formatRating(value: number): string {
  return value.toLocaleString("fr-DZ", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

const dateFormatter = new Intl.DateTimeFormat("fr-DZ", {
  day: "numeric",
  month: "long",
  year: "numeric",
  // Les dates d'événement sont stockées en `@db.Date` (minuit UTC) : formater
  // en UTC évite de basculer sur la veille selon le fuseau du visiteur.
  timeZone: "UTC",
});

/** Chaîne de date seule, sans heure : « 2026-06-12 ». */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Date : « 12 juin 2026 ».
 *
 * Accepte une date seule (`YYYY-MM-DD`, comme les `@db.Date` du modèle) aussi
 * bien qu'un horodatage ISO complet : les deux circulent dans l'application —
 * la première pour les dates d'événement, le second pour les `createdAt` — et
 * une seule fonction doit savoir les afficher.
 */
export function formatDate(value: string | Date): string {
  if (typeof value !== "string") return dateFormatter.format(value);

  return dateFormatter.format(
    new Date(DATE_ONLY.test(value) ? `${value}T00:00:00.000Z` : value)
  );
}

const monthYearFormatter = new Intl.DateTimeFormat("fr-DZ", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Mois et année : « juin 2026 ». */
export function formatMonthYear(value: Date): string {
  return monthYearFormatter.format(value);
}

/** Initiales affichées à défaut d'avatar : « Amina Belkacem » → « AB ». */
export function formatInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Capacité d'une salle : « 150 – 400 invités », ou « Jusqu'à 400 invités »
 * quand elle n'annonce pas de minimum — le cas le plus courant, une salle
 * n'imposant en général qu'un plafond.
 */
export function formatCapacity(min: number | null, max: number): string {
  if (min === null) return `Jusqu'à ${formatNumber(max)} invités`;

  return min === max
    ? `${formatNumber(max)} invités`
    : `${formatNumber(min)} – ${formatNumber(max)} invités`;
}

const percentFormatter = new Intl.NumberFormat("fr-DZ", {
  style: "percent",
  maximumFractionDigits: 1,
});

/**
 * Variation d'un indicateur, signe compris : « +12,5 % », « −8 % ».
 * Reçoit un ratio (0,125), pas un pourcentage déjà multiplié.
 */
export function formatChange(ratio: number): string {
  const formatted = percentFormatter.format(Math.abs(ratio));
  if (ratio === 0) return formatted;
  return `${ratio > 0 ? "+" : "−"}${formatted}`;
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat("fr", {
  numeric: "auto",
});

const RELATIVE_UNITS: ReadonlyArray<{
  unit: Intl.RelativeTimeFormatUnit;
  seconds: number;
}> = [
  { unit: "year", seconds: 60 * 60 * 24 * 365 },
  { unit: "month", seconds: 60 * 60 * 24 * 30 },
  { unit: "day", seconds: 60 * 60 * 24 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
];

/**
 * Ancienneté d'un événement : « il y a 3 heures », « hier ».
 *
 * Accepte une chaîne ISO pour traverser la frontière serveur → client sans
 * sérialisation manuelle d'un `Date`.
 */
export function formatRelativeTime(
  value: string | Date,
  now: Date = new Date()
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const elapsedSeconds = (date.getTime() - now.getTime()) / 1000;

  for (const { unit, seconds } of RELATIVE_UNITS) {
    if (Math.abs(elapsedSeconds) >= seconds) {
      return relativeTimeFormatter.format(
        Math.round(elapsedSeconds / seconds),
        unit
      );
    }
  }

  return "à l'instant";
}

const dateTimeFormatter = new Intl.DateTimeFormat("fr-DZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

/** Horodatage complet, affiché en infobulle d'une date relative. */
export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(
    typeof value === "string" ? new Date(value) : value
  );
}
